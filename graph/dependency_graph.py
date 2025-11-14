from __future__ import annotations

import datetime
import json
import logging
from typing import Any, Dict, Optional, Iterator
from copy import deepcopy

import networkx as nx

from graph.resource_node import ResourceNode
from utils.arn import ARN

logger = logging.getLogger(__name__)


class DependencyGraph:
    """
    Stores ResourceNodes, manages ARN→logical-ID mapping,
    handles edges, deferred edges, and orphan generation.

    NOTE:
      - Resolvers do NOT modify the graph.
      - ResourceGraphBuilder orchestrates traversal + node insertion.
      - All structural logic (edges, pending links) lives here.
    """

    def __init__(self) -> None:
        self._g = nx.DiGraph()
        self._nodes: dict[str, ResourceNode] = {}
        self._arn_index: dict[ARN, str] = {}
        self._pending_links: list[tuple[str, ARN]] = []
        self.metadata: dict[str, Any] = {}

    # ============================================================
    # Basic API
    # ============================================================
    def __iter__(self) -> Iterator[ResourceNode]:
        return iter(self._nodes.values())

    def __len__(self) -> int:
        return len(self._nodes)

    def get_node(self, logical_id: str) -> Optional[ResourceNode]:
        return self._nodes.get(logical_id)

    def get_node_by_arn(self, arn: ARN) -> Optional[ResourceNode]:
        lid = self._arn_index.get(arn)
        return self._nodes.get(lid) if lid else None

    def services(self) -> set[str]:
        return {n.service for n in self._nodes.values()}

    def find_by_property(
        self,
        service: Optional[str],
        prop: str,
        value: Any,
    ) -> Optional[ResourceNode]:
        """
        Search existing graph nodes for a given service/property/value.

        IMPORTANT: this only searches the in-memory graph – it does not
        do any AWS lookups. This keeps us strictly seed-based.
        """
        for node in self._nodes.values():
            if service and node.service != service:
                continue
            props = getattr(node, "properties", None)
            if isinstance(props, dict) and props.get(prop) == value:
                return node
        return None

    # ============================================================
    # Node insertion + edge management
    # ============================================================
    def add_node(self, node: ResourceNode) -> None:
        """
        Insert a node and register:
          - logical ID
          - ARNs
          - referenced edges (resolve now if possible, defer if not)
        """
        lid = node.logical_id

        # Add to internal store
        self._nodes[lid] = node
        self._g.add_node(lid, data=node)

        # Register ARNs
        for arn in node.arns.values():
            if arn in self._arn_index and self._arn_index[arn] != lid:
                logger.warning(
                    "[Graph] ARN %s already mapped to %s (conflict with %s)",
                    arn,
                    self._arn_index[arn],
                    lid,
                )
            self._arn_index[arn] = lid

        # Handle referenced ARNs → edges
        for ref in node.referenced_arns:
            target_lid = self._arn_index.get(ref)

            if target_lid:
                self.add_edge(lid, target_lid)
            else:
                # Defer until target ARN shows up
                self._pending_links.append((lid, ref))

    def add_edge(self, parent: str, child: str) -> None:
        """
        Parent → child means “parent depends on child”.
        """
        if parent == child:
            return

        if parent not in self._nodes or child not in self._nodes:
            # Should be impossible if builder is correct
            logger.debug(
                "[Graph] Skipping edge %s → %s (missing nodes)",
                parent,
                child,
            )
            return

        if not self._g.has_edge(parent, child):
            self._g.add_edge(parent, child)

    # ============================================================
    # Deferred links
    # ============================================================
    def resolve_deferred_links(self) -> None:
        """
        Resolve edges where the referenced ARN was unknown at node insertion time.
        """
        remaining: list[tuple[str, ARN]] = []
        resolved = 0

        for src_lid, ref in self._pending_links:
            target_lid = self._arn_index.get(ref)

            if not target_lid:
                # Try fuzzy match (same resource, diff account/region)
                for cand_arn, lid in self._arn_index.items():
                    if ref.same_resource(cand_arn):
                        target_lid = lid
                        break

            if target_lid:
                self.add_edge(src_lid, target_lid)
                resolved += 1
            else:
                remaining.append((src_lid, ref))

        self._pending_links = remaining

        logger.info(
            "[Graph] Deferred links: %d resolved, %d remain",
            resolved,
            len(remaining),
        )

    # Backwards-compatible aliases for builder
    def resolve_links(self) -> None:
        """Alias used by older builder code."""
        self.resolve_deferred_links()

    # ============================================================
    # Orphan resolvers
    # ============================================================
    def generate_orphans(self) -> None:
        """
        For unresolved references, create placeholder nodes.
        """
        if not self._pending_links:
            return

        unresolved_arns = {arn for _, arn in self._pending_links}
        self._pending_links.clear()

        logger.info(
            "[Graph] Generating %d orphan placeholders", len(unresolved_arns)
        )

        for arn in unresolved_arns:
            # Lightweight logical ID; purely internal
            lid = f"Ref_{arn.resource_id.replace('-', '')[:30]}"

            node = ResourceNode(
                logical_id=lid,
                service=arn.service,
                cfn_type=f"AWS::{arn.service.title()}::ExternalReference",
                properties={},
                reference_only=True,
                metadata={
                    "OriginalARN": arn.raw,
                    "Generated": "orphan",
                    "Timestamp": datetime.datetime.utcnow().isoformat(),
                },
                arns={"Primary": arn, arn.account_id: arn},
                referenced_arns=set(),
            )

            self.add_node(node)

    # Backwards-compatible alias
    def resolve_orphans(self) -> None:
        """Alias used by older builder code."""
        self.generate_orphans()

    # ============================================================
    # Finalization / freezing
    # ============================================================
    def finalize(self) -> None:
        """
        Complete the graph:
          - resolve deferred edges
          - capture referenced ARNs in metadata
          - clear referenced_arns (edges are canonical now)
        """
        self.resolve_deferred_links()

        for node in self._nodes.values():
            if node.referenced_arns:
                node.metadata["OriginalReferencedARNs"] = [
                    str(a) for a in node.referenced_arns
                ]
            node.referenced_arns.clear()

        self.metadata["finalized"] = True

    def _build_arn_map(self) -> dict[str, str]:
        """
        ARN string → logical ID mapping.
        """
        return {str(arn): lid for arn, lid in self._arn_index.items()}

    @staticmethod
    def _replace_arns_in_obj(obj: Any, arn_map: dict[str, str]) -> Any:
        """
        Pure, safe recursive ARN replacer.
        """
        if isinstance(obj, str):
            if ARN.is_valid(obj) and obj in arn_map:
                return f"__REF_{arn_map[obj]}__"
            return obj

        if isinstance(obj, dict):
            return {
                k: DependencyGraph._replace_arns_in_obj(v, arn_map)
                for k, v in obj.items()
            }

        if isinstance(obj, (list, tuple)):
            return [
                DependencyGraph._replace_arns_in_obj(v, arn_map) for v in obj
            ]

        return obj

    def freeze_to_portable(self) -> None:
        """
        Mutate the in-memory graph into a 'portable' state:

          - finalize structural links
          - replace embedded ARN strings in properties with logical-ID markers
          - mark graph as Frozen and persist arn_map into metadata

        NOTE: This does *not* remove ARNs from node.arns or the internal
        ARN index; it only rewrites arbitrary property payloads.
        """
        # Ensure links are in a stable, canonical state
        self.finalize()

        arn_map = self._build_arn_map()

        for node in self._nodes.values():
            node.properties = self._replace_arns_in_obj(
                deepcopy(node.properties), arn_map
            )

        self.metadata["Frozen"] = True
        self.metadata["ArnMap"] = arn_map

    # ============================================================
    # Portable serialization
    # ============================================================
    def to_portable(self) -> dict[str, Any]:
        """
        Produce a portable form:
          - logical IDs as identity
          - ARNs removed/replaced
          - orphans fully represented
          - reversible via arn_map
        """
        arn_map = self._build_arn_map()

        nodes: dict[str, dict[str, Any]] = {}
        for lid, node in self._nodes.items():
            nodes[lid] = {
                "service": node.service,
                "cfn_type": node.cfn_type,
                "reference_only": node.reference_only,
                "properties": self._replace_arns_in_obj(
                    deepcopy(node.properties), arn_map
                ),
                "metadata": deepcopy(node.metadata),
            }

        edges = [
            {"from": s, "to": t, "inferred": d.get("inferred", False)}
            for s, t, d in self._g.edges(data=True)
        ]

        return {
            "summary": self.summary(detailed=True),
            "nodes": nodes,
            "edges": edges,
            "arn_map": arn_map,
            "metadata": deepcopy(self.metadata),
        }

    # ============================================================
    # Raw serialization
    # ============================================================
    def to_dict(self) -> dict[str, Any]:
        """
        Raw graph (ARNS intact).
        """
        nodes = {
            lid: {
                "service": n.service,
                "cfn_type": n.cfn_type,
                "reference_only": n.reference_only,
                "properties": deepcopy(n.properties),
                "metadata": deepcopy(n.metadata),
            }
            for lid, n in self._nodes.items()
        }

        edges = [
            {"from": s, "to": t, "inferred": d.get("inferred", False)}
            for s, t, d in self._g.edges(data=True)
        ]

        return {
            "summary": self.summary(detailed=True),
            "nodes": nodes,
            "edges": edges,
            "metadata": deepcopy(self.metadata),
        }

    # ============================================================
    # JSON
    # ============================================================
    def to_json(self, *, portable: bool = False, indent: int = 2) -> str:
        data = self.to_portable() if portable else self.to_dict()
        return json.dumps(data, indent=indent, sort_keys=True, default=str)

    # ============================================================
    # Summary helper
    # ============================================================
    def summary(self, detailed: bool = False) -> dict[str, Any]:
        return {
            "node_count": len(self._nodes),
            "edge_count": self._g.number_of_edges(),
            "services": sorted({n.service for n in self._nodes.values()}),
            "detailed_nodes": sorted(self._nodes.keys()) if detailed else None,
        }
    
    def topological_sort(self) -> list[str]:
        """
        Return nodes in dependency order (parents depend on children).

        If cycles exist, raise a clear error so the CDK generator can fall back
        to heuristic ordering.
        """
        try:
            # `networkx` topo sort returns a generator of logical IDs
            order = list(nx.topological_sort(self._g))

            # Make output stable: if graph contains disconnected components,
            # networkx does NOT guarantee lexicographic ordering.
            return sorted(order, key=lambda lid: order.index(lid))

        except nx.NetworkXUnfeasible:
            # Cycle detected
            cycles = list(nx.simple_cycles(self._g))
            raise RuntimeError(f"Dependency cycle detected: {cycles}")