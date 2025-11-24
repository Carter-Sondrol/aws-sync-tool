from __future__ import annotations

import datetime
import json
import logging
from copy import deepcopy
from typing import Any, Callable, Dict, Iterator, Mapping, Optional

import networkx as nx

from graph.resource_node import NodeClassification, ResourceNode
from utils.arn import ARN

logger = logging.getLogger(__name__)


class DependencyGraph:
    """
    Stores ResourceNodes, manages ARN→logical-ID mapping,
    handles edges, deferred edges, wildcard placeholders, and orphans.

    NOTE:
      - Resolvers do NOT modify the graph.
      - ResourceGraphBuilder orchestrates traversal + node insertion.
      - All structural logic (edges, pending links) lives here.
    """

    def __init__(self) -> None:
        self._g = nx.DiGraph()
        self._nodes: dict[str, ResourceNode] = {}
        self._arn_index: dict[ARN, str] = {}
        # Normalized lookups allow connecting resources that share the same
        # service/resource path across regions/accounts (e.g., IAM/global).
        self._normalized_index: dict[tuple[str, str, str], str] = {}
        self._pending_links: list[tuple[str, ARN, Optional[str]]] = []
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
        lid = self._lookup_lid(ARN.parse(arn))
        return self._nodes.get(lid) if lid else None

    def services(self) -> set[str]:
        return {n.service for n in self._nodes.values()}

    def known_bucket_names(self) -> set[str]:
        """
        Return bucket names already present in the graph (by ARN).
        """
        names: set[str] = set()
        for arn in self._arn_index:
            if arn.service == "s3" and arn.resource_type == "bucket":
                names.add(arn.resource_parts[0] if arn.resource_parts else arn.resource)
        return names

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

        # Overwrite-safe: if re-adding same logical_id, just replace node
        self._nodes[lid] = node
        self._g.add_node(lid, data=node)

        # Register ARNs
        for arn in node.arns.values():
            arn = ARN.parse(arn)
            self._register_arn(arn, lid)

        # Handle referenced ARNs → edges
        for ref in node.referenced_arns:
            self.defer_link(lid, ref, label="referenced_arn")

    def add_edge(self, parent: str, child: str, *, label: str | None = None) -> None:
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

        if self._g.has_edge(parent, child):
            if label and not self._g[parent][child].get("label"):
                self._g[parent][child]["label"] = label
            return

        data = {}
        if label:
            data["label"] = label
        self._g.add_edge(parent, child, **data)

    # ============================================================
    # Deferred links
    # ============================================================
    def resolve_deferred_links(self) -> None:
        """
        Resolve edges where the referenced ARN was unknown at node insertion time.
        """
        remaining: list[tuple[str, ARN]] = []
        resolved = 0

        for src_lid, ref, label in self._pending_links:
            ref = ARN.parse(ref)
            target_lid = self._lookup_lid(ref)

            if not target_lid:
                # Try fuzzy match (same service/resource, different account/region)
                for cand_arn, lid in self._arn_index.items():
                    if ref.same_resource(cand_arn):
                        target_lid = lid
                        break

            if target_lid:
                self.add_edge(src_lid, target_lid, label=label)
                resolved += 1
            else:
                remaining.append((src_lid, ref, label))

        self._pending_links = remaining

        logger.info(
            "[Graph] Deferred links: %d resolved, %d remain",
            resolved,
            len(remaining),
        )

    # Backwards-compatible alias for builder
    def resolve_links(self) -> None:
        """Alias used by older builder code."""
        self.resolve_deferred_links()

    # ============================================================
    # ARN indexing helpers
    # ============================================================
    def defer_link(self, lid: str, arn: ARN, label: str | None = None) -> None:
        """
        Queue an edge resolution for a later pass, normalizing the ARN.
        """
        self._pending_links.append((lid, ARN.parse(arn), label))

    def _register_arn(self, arn: ARN, logical_id: str) -> None:
        """
        Track both the full ARN and a normalized (service, resource) key so
        edges can still connect when region/account differs.
        """
        if arn in self._arn_index and self._arn_index[arn] != logical_id:
            logger.warning(
                "[Graph] ARN %s already mapped to %s (conflict with %s)",
                arn,
                self._arn_index[arn],
                logical_id,
            )
        self._arn_index[arn] = logical_id

        norm_key = (arn.service, arn.resource_type, arn.resource_id)
        existing = self._normalized_index.get(norm_key)
        if existing and existing != logical_id:
            logger.debug(
                "[Graph] Normalized ARN %s/%s/%s already mapped to %s (conflict with %s)",
                arn.service,
                arn.resource_type,
                arn.resource_id,
                existing,
                logical_id,
            )
        else:
            self._normalized_index[norm_key] = logical_id

    def _lookup_lid(self, arn: ARN) -> Optional[str]:
        """
        Prefer exact ARN match; fall back to normalized (service, resource).
        """
        lid = self._arn_index.get(arn)
        if lid:
            return lid
        return self._normalized_index.get((arn.service, arn.resource_type, arn.resource_id))

    # ============================================================
    # Wildcard reference handling
    # ============================================================
    def capture_wildcard_references(self) -> None:
        """
        Detect wildcard ARN strings embedded in node properties and materialize
        reference-only placeholder nodes so they can be tracked and remapped in
        the portable graph (e.g., S3 policy paths like arn:aws:s3:::bucket/*).
        """

        def _collect_wildcard_arns(obj: object, found: set[ARN]) -> None:
            if obj is None:
                return
            if isinstance(obj, str):
                if "*" in obj and obj.startswith("arn:") and ARN.is_valid(obj):
                    try:
                        found.add(ARN.parse(obj))
                    except Exception:
                        pass
                return
            if isinstance(obj, Mapping):
                for v in obj.values():
                    _collect_wildcard_arns(v, found)
                return
            if isinstance(obj, (list, tuple, set, frozenset)):
                for v in obj:
                    _collect_wildcard_arns(v, found)

        for lid, node in list(self._nodes.items()):
            wildcard_arns: set[ARN] = set()
            _collect_wildcard_arns(node.properties, wildcard_arns)
            if not wildcard_arns:
                continue

            for arn in wildcard_arns:
                existing = self.get_node_by_arn(arn)
                if not existing:
                    pattern_lid = f"Pattern_{arn.resource.replace('*', 'Star')[:40]}"
                    placeholder = ResourceNode(
                        logical_id=pattern_lid,
                        service=arn.service or "unknown",
                        cfn_type="Pattern::WildcardReference",
                        properties={"Pattern": arn.raw},
                        reference_only=True,
                        metadata={
                            "Wildcard": True,
                            "Generated": "pattern",
                        },
                        arns={"Primary": arn},
                        referenced_arns=set(),
                        classification=NodeClassification.ARTIFACT,
                    )
                    self.add_node(placeholder)

                target_lid = self._arn_index.get(arn)
                if target_lid:
                    self.add_edge(lid, target_lid, label="wildcard")

    # ============================================================
    # Orphan resolvers
    # ============================================================
    def generate_orphans(
        self,
        resolvable: Optional[Callable[[ARN], bool]] = None,
        mapping_store: object | None = None,
    ) -> None:
        """
        For unresolved references, create placeholder nodes.
        """
        if not self._pending_links:
            return

        unresolved_arns = {ARN.parse(arn) for _, arn, _ in self._pending_links}
        self._pending_links.clear()

        logger.info(
            "[Graph] Generating %d orphan placeholders", len(unresolved_arns)
        )

        hint_fn = getattr(mapping_store, "get_hint_for_arn", None)

        for arn in sorted(unresolved_arns, key=lambda a: a.raw):
            if resolvable and resolvable(arn):
                # Skip placeholders for resources that should be resolved later.
                continue
            # Lightweight logical ID; purely internal
            lid = f"Ref_{arn.resource_id.replace('-', '')[:30]}"
            if callable(hint_fn):
                try:
                    hint = hint_fn(arn)
                    if hint:
                        lid = hint
                except Exception:
                    logger.debug("[Graph] mapping_store hint failed for %s", arn)

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
                classification=NodeClassification.EXTERNAL,
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
            stripped = obj.strip()
            if stripped and stripped[0] in ("{", "[") and stripped[-1] in ("}", "]"):
                try:
                    parsed = json.loads(stripped)
                    replaced = DependencyGraph._replace_arns_in_obj(parsed, arn_map)
                    return json.dumps(replaced, separators=(",", ":"))
                except Exception:
                    pass

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
                "classification": node.classification.name,
                "properties": self._replace_arns_in_obj(
                    deepcopy(node.properties), arn_map
                ),
                "metadata": deepcopy(node.metadata),
            }

        edges = [
            {
                "from": s,
                "to": t,
                "inferred": d.get("inferred", False),
                "label": d.get("label"),
            }
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
                "classification": n.classification.name,
                "properties": deepcopy(n.properties),
                "metadata": deepcopy(n.metadata),
            }
            for lid, n in self._nodes.items()
        }

        edges = [
            {
                "from": s,
                "to": t,
                "inferred": d.get("inferred", False),
                "label": d.get("label"),
            }
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
            order = list(nx.topological_sort(self._g))
            # order is already stable; just return it
            return order
        except nx.NetworkXUnfeasible:
            cycles = list(nx.simple_cycles(self._g))
            raise RuntimeError(f"Dependency cycle detected: {cycles}")

    # ============================================================
    # Reconstruction helpers
    # ============================================================
    @classmethod
    def from_dict(cls, data: Mapping[str, Any]) -> "DependencyGraph":
        """
        Rehydrate a DependencyGraph from serialized JSON (raw or portable).
        ARNs are not restored (portable graphs only have arn_map).
        """
        g = cls()

        for lid, entry in (data.get("nodes") or {}).items():
            classification_name = entry.get("classification") or "RESOURCE"
            try:
                classification = NodeClassification[classification_name]
            except Exception:
                classification = NodeClassification.RESOURCE

            node = ResourceNode(
                logical_id=lid,
                service=entry.get("service", ""),
                cfn_type=entry.get("cfn_type", ""),
                properties=entry.get("properties", {}) or {},
                reference_only=bool(entry.get("reference_only", False)),
                metadata=entry.get("metadata", {}) or {},
                classification=classification,
                arns={},  # Portable graphs drop ARN details
            )
            g.add_node(node)

        for edge in data.get("edges") or []:
            src = edge.get("from") or edge.get("source")
            tgt = edge.get("to") or edge.get("target")
            if src and tgt:
                g.add_edge(src, tgt, label=edge.get("label"))

        g.metadata = deepcopy(data.get("metadata", {}))
        if "arn_map" in data and "ArnMap" not in g.metadata:
            g.metadata["ArnMap"] = deepcopy(data["arn_map"])

        return g
