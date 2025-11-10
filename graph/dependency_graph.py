from __future__ import annotations

import json
import logging
from dataclasses import dataclass, field
from typing import Any, Dict, Optional, Iterator, Iterable, Set
from copy import deepcopy
import networkx as nx

from utils.arn import ARN, extract_dependencies

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------
# Node definition
# ---------------------------------------------------------------------
@dataclass
class ResourceNode:
    """
    Representation of a resource in the dependency graph.

    logical_id: CloudFormation-style logical ID
    service: AWS service namespace (e.g. "lambda", "connect", "s3")
    cfn_type: CloudFormation resource type
    properties: Resource configuration or definition
    reference_only: True if node represents a reference/parameter
    metadata: Additional diagnostic metadata
    arns: Named ARN map (Primary, Artifact, etc.)
    referenced_arns: Set of ARNs this resource depends on
    """

    logical_id: str
    service: str
    cfn_type: str
    properties: dict
    reference_only: bool = False
    metadata: dict = field(default_factory=dict)
    arns: dict[str, ARN] = field(default_factory=dict)
    referenced_arns: set[ARN] = field(default_factory=set)


# ---------------------------------------------------------------------
# DependencyGraph
# ---------------------------------------------------------------------
class DependencyGraph:
    """Generic dependency graph of AWS resources with ARN-aware linkage."""

    def __init__(self) -> None:
        self._g: nx.DiGraph = nx.DiGraph()
        self._nodes: dict[str, ResourceNode] = {}
        self._arn_index: dict[ARN, str] = {}
        self._pending_links: list[tuple[str, ARN]] = []
        self.metadata: dict[str, Any] = {}

    # ------------------------------------------------------------------
    # Basic iteration
    # ------------------------------------------------------------------
    def __iter__(self) -> Iterator[ResourceNode]:
        return iter(self._nodes.values())

    def __len__(self) -> int:
        return len(self._nodes)

    # ------------------------------------------------------------------
    # Node / Edge Management
    # ------------------------------------------------------------------
    def add_node(self, node: ResourceNode) -> None:
        """Add a node, extract dependencies, and index ARNs."""
        if node.logical_id in self._nodes:
            logger.debug("[Graph] Updating existing node: %s", node.logical_id)

        # Extract dependencies if not already provided
        if not node.referenced_arns and node.properties:
            try:
                node.referenced_arns = extract_dependencies(node.properties)
            except Exception as e:
                logger.debug("ARN extraction failed for %s: %s", node.logical_id, e)

        # Register node
        self._nodes[node.logical_id] = node
        self._g.add_node(node.logical_id, data=node)

        # Index its ARNs
        for arn in node.arns.values():
            if arn in self._arn_index and self._arn_index[arn] != node.logical_id:
                logger.warning(
                    "[Graph] ARN %s already mapped to %s (conflict with %s)",
                    arn, self._arn_index[arn], node.logical_id,
                )
            self._arn_index[arn] = node.logical_id

        # Defer or resolve edges
        for ref in node.referenced_arns:
            target_id = self._arn_index.get(ref)
            if target_id:
                self.add_edge(node.logical_id, target_id)
            else:
                self.defer_link(node.logical_id, ref)

    def add_edge(self, parent: str, child: str, inferred: bool = False) -> None:
        """Create a directed dependency edge (parent → child)."""
        if parent not in self._nodes or child not in self._nodes:
            logger.debug("[Graph] Skipping unknown edge %s -> %s", parent, child)
            return
        if parent == child:
            return
        if not self._g.has_edge(parent, child):
            self._g.add_edge(parent, child, inferred=inferred)

    def defer_link(self, source_id: str, target_arn: ARN) -> None:
        """Queue a reference to resolve once all nodes are known."""
        self._pending_links.append((source_id, target_arn))

    def resolve_links(self) -> None:
        """Resolve deferred links by ARN and fuzzy same_resource match."""
        resolved = 0
        still_pending: list[tuple[str, ARN]] = []

        for src, arn in self._pending_links:
            target_id = self._arn_index.get(arn)

            if not target_id:
                # Fuzzy match: same resource ignoring region/account
                for candidate, lid in self._arn_index.items():
                    if arn.same_resource(candidate):
                        target_id = lid
                        break

            if target_id:
                self.add_edge(src, target_id)
                resolved += 1
            else:
                still_pending.append((src, arn))

        self._pending_links = still_pending
        logger.info("[Graph] Resolved %d deferred links (%d remaining)", resolved, len(still_pending))

    def resolve_orphans(self) -> None:
        """Create reference-only placeholder nodes for unresolved ARNs."""
        if not self._pending_links:
            return

        unresolved_arns = {arn for _, arn in self._pending_links}
        self._pending_links.clear()

        for arn in unresolved_arns:
            if arn not in self._arn_index:
                lid = f"Ref{arn.resource_id.replace('-', '')[:32]}"
                placeholder = ResourceNode(
                    logical_id=lid,
                    service=arn.service,
                    cfn_type=f"AWS::{arn.service.title()}::ExternalReference",
                    properties={},
                    reference_only=True,
                    arns={"External": arn},
                    metadata={"Generated": "resolve_orphans"},
                )
                self.add_node(placeholder)
        logger.info("[Graph] Created %d placeholder nodes for unresolved references", len(unresolved_arns))

    # ------------------------------------------------------------------
    # Lookup
    # ------------------------------------------------------------------
    def get_node(self, logical_id: str) -> ResourceNode:
        return self._nodes[logical_id]

    def get_node_by_arn(self, arn: ARN) -> Optional[ResourceNode]:
        lid = self._arn_index.get(arn)
        return self._nodes.get(lid) if lid else None

    # ------------------------------------------------------------------
    # Merge / Clone
    # ------------------------------------------------------------------
    def merge(self, other: DependencyGraph) -> None:
        """Merge another DependencyGraph into this one."""
        added = 0
        for lid, node in other._nodes.items():
            if lid not in self._nodes:
                self.add_node(deepcopy(node))
                added += 1

        for s, t, attrs in other._g.edges(data=True):
            self.add_edge(s, t, inferred=attrs.get("inferred", False))

        self.resolve_links()
        logger.info("[Graph] Merged %d nodes and resolved links from other graph", added)

    def clone_subgraph(self, service: str) -> DependencyGraph:
        """Clone only nodes and edges from a given AWS service."""
        sub = DependencyGraph()
        for lid, node in self._nodes.items():
            if node.service == service:
                sub.add_node(deepcopy(node))
        for s, t, attrs in self._g.edges(data=True):
            if s in sub._nodes and t in sub._nodes:
                sub.add_edge(s, t, inferred=attrs.get("inferred", False))
        return sub

    # ------------------------------------------------------------------
    # Portable freeze
    # ------------------------------------------------------------------
    def freeze_to_portable(self) -> dict[str, str]:
        """
        Convert ARN-based graph into portable logical-ID-based references.
        """
        arn_to_id = {str(a): lid for a, lid in self._arn_index.items()}
        logger.info("[Graph] Freezing graph (%d ARN mappings)", len(arn_to_id))

        for node in self._nodes.values():
            node.properties = self.replace_arns_in_obj(deepcopy(node.properties), arn_to_id)
            node.metadata["Portable"] = True
            node.metadata["FrozenFrom"] = [str(a) for a in node.arns.values()]
            node.arns.clear()
            node.referenced_arns.clear()

        self._arn_index.clear()
        self.metadata["Frozen"] = True
        self.metadata["ARNMap"] = arn_to_id
        return arn_to_id

    # ------------------------------------------------------------------
    # Serialization
    # ------------------------------------------------------------------
    def to_dict(self, visualizer: bool = False) -> dict:
        """
        Serialize the graph.

        If visualizer=True, emit a ForceGraph-compatible JSON structure:
        {
            "nodes": [{"id": "LogicalId", "service": "connect", ...}],
            "links": [{"source": "A", "target": "B"}]
        }
        Otherwise, produce backend structure with dict-style nodes.
        """
        if visualizer:
            nodes = [
                {
                    "id": lid,
                    "service": n.service,
                    "cfn_type": n.cfn_type,
                    "reference_only": n.reference_only,
                    "properties": n.properties,
                    "metadata": n.metadata,
                }
                for lid, n in self._nodes.items()
            ]
            links = [
                {"source": s, "target": t, "inferred": d.get("inferred", False)}
                for s, t, d in self._g.edges(data=True)
            ]
            return {"nodes": nodes, "links": links, "metadata": self.metadata}

        # Default (backend) representation
        nodes = {
            lid: {
                "service": n.service,
                "cfn_type": n.cfn_type,
                "reference_only": n.reference_only,
                "properties": n.properties,
                "metadata": n.metadata,
            }
            for lid, n in self._nodes.items()
        }

        edges = [
            {"from": s, "to": t, "inferred": d.get("inferred", False)}
            for s, t, d in self._g.edges(data=True)
        ]

        return {
            "summary": self.summary(),
            "nodes": nodes,
            "edges": edges,
            "metadata": self.metadata,
        }
        
    @classmethod
    def from_dict(cls, data: dict) -> "DependencyGraph":
        """
        Reconstruct a DependencyGraph from either backend or visualizer JSON.

        Supports:
        - Backend: { "nodes": { "id": {...} }, "edges": [...] }
        - Visualizer: { "nodes": [ {...} ], "links": [ {"source": "A", "target": "B"} ] }
        - Visualizer (expanded): { "source": {"id": "A"}, "target": {"id": "B"} }
        """
        g = cls()

        nodes_obj = data.get("nodes", {})
        edges_obj = data.get("edges", data.get("links", []))

        # --- Case 1: visualizer-style nodes (list)
        if isinstance(nodes_obj, list):
            for node_data in nodes_obj:
                n = cls.from_json_node(node_data)
                g._nodes[n.logical_id] = n
                g._g.add_node(n.logical_id)

        # --- Case 2: backend-style nodes (dict)
        elif isinstance(nodes_obj, dict):
            for lid, node_data in nodes_obj.items():
                n = ResourceNode(
                    logical_id=lid,
                    service=node_data.get("service", "unknown"),
                    cfn_type=node_data.get("cfn_type", ""),
                    properties=node_data.get("properties", {}),
                    reference_only=node_data.get("reference_only", False),
                    metadata=node_data.get("metadata", {}),
                )
                g._nodes[lid] = n
                g._g.add_node(lid)

        # --- Edges / Links (normalize nested {"id": "..."} forms)
        for edge in edges_obj:
            src = edge.get("from") or edge.get("source")
            tgt = edge.get("to") or edge.get("target")

            # Unwrap dicts: {"id": "..."} → "..."
            if isinstance(src, dict):
                src = src.get("id") or src.get("logical_id")
            if isinstance(tgt, dict):
                tgt = tgt.get("id") or tgt.get("logical_id")

            if not isinstance(src, str) or not isinstance(tgt, str):
                logger.warning("[Graph] Skipping invalid edge with non-string IDs: %r → %r", src, tgt)
                continue

            g._g.add_edge(src, tgt)

        g.metadata = data.get("metadata", {})
        return g


    def to_json(self, indent: int = 2) -> str:
        return json.dumps(self.to_dict(), indent=indent, default=str)

    # ------------------------------------------------------------------
    # Summaries / Stats
    # ------------------------------------------------------------------
    def summary(self) -> str:
        return f"Graph: {len(self._nodes)} nodes, {self._g.number_of_edges()} edges"

    def stats(self) -> dict[str, Any]:
        return {
            "nodes": len(self._nodes),
            "edges": self._g.number_of_edges(),
            "services": {s: sum(1 for n in self._nodes.values() if n.service == s)
                         for s in {n.service for n in self._nodes.values()}},
            "orphans": len(self.orphan_nodes()),
            "leaves": len(self.leaf_nodes()),
        }

    # ------------------------------------------------------------------
    # Subgraph / Analysis utilities
    # ------------------------------------------------------------------
    def orphan_nodes(self) -> list[str]:
        return [n for n in self._nodes if self._g.in_degree(n) == 0]

    def leaf_nodes(self) -> list[str]:
        return [n for n in self._nodes if self._g.out_degree(n) == 0]

    def edges_summary(self) -> dict[str, int]:
        return {lid: self._g.out_degree(lid) for lid in self._nodes}

    # ------------------------------------------------------------------
    # ARN Replacement Helper
    # ------------------------------------------------------------------
    @staticmethod
    def replace_arns_in_obj(obj: Any, arn_map: dict[str, str]) -> Any:
        """Recursively replace ARNs with __REF_<LogicalID>__ placeholders."""
        if obj is None:
            return None

        if isinstance(obj, str):
            # Direct ARN string
            if ARN.is_valid(obj):
                return f"__REF_{arn_map.get(obj, obj)}__"
            # Embedded JSON or blob with ARN patterns
            if "arn:aws:" in obj:
                for ref in extract_dependencies(obj):
                    ref_str = str(ref)
                    if ref_str in arn_map:
                        obj = obj.replace(ref_str, f"__REF_{arn_map[ref_str]}__")
            return obj

        if isinstance(obj, dict):
            return {k: DependencyGraph.replace_arns_in_obj(v, arn_map) for k, v in obj.items()}

        if isinstance(obj, list):
            return [DependencyGraph.replace_arns_in_obj(v, arn_map) for v in obj]

        return obj
    
    def find_by_property(
        self,
        service: str | None = None,
        property_name: str = "",
        value: Any = None,
    ) -> Optional[ResourceNode]:
        """
        Return the first node matching a given service/property/value trio.
        Used by link resolvers (e.g., ConnectLinkResolver) for name-based linking.
        """
        for node in self._nodes.values():
            if service and node.service != service:
                continue
            if node.properties.get(property_name) == value:
                return node
        return None

    # ------------------------------------------------------------------
    # Graph ordering utilities
    # ------------------------------------------------------------------
    def topological_sort(self) -> list[str]:
        """
        Return nodes in dependency order (parents before dependents).
        Raises if cycles exist in the dependency graph.
        """
        try:
            return list(nx.topological_sort(self._g))
        except nx.NetworkXUnfeasible as e:
            logger.error("[Graph] Cycle detected in dependency graph: %s", e)
            raise
    
    def topological_layers(self) -> list[list[str]]:
        """
        Return nodes grouped by dependency layer (topological generations).
        Each inner list contains nodes that can be processed in parallel.
        """
        try:
            return [list(gen) for gen in nx.topological_generations(self._g)]
        except nx.NetworkXUnfeasible as e:
            logger.error("[Graph] Cycle detected in dependency graph: %s", e)
            raise
    @staticmethod
    def from_json_node(node_data: dict) -> ResourceNode:
        """
        Convert a visualizer-exported node dict into a ResourceNode.

        This allows edited graph JSON (from the UI) to be rehydrated into
        a fully functional ResourceNode instance for template generation.

        Expected structure (from visualizer.js export):
        {
            "id": "MyLambda",
            "service": "lambda",
            "subtype": "function",
            "cfn_type": "AWS::Lambda::Function",
            "properties": { ... },
            "metadata": { ... },
            "is_error": false,
            "is_seed": true,
            "color_key": "lambda:function"
        }
        """
        return ResourceNode(
            logical_id=node_data.get("id", ""),
            service=node_data.get("service", "unknown"),
            cfn_type=node_data.get("cfn_type", ""),
            properties=node_data.get("properties", {}),
            metadata=node_data.get("metadata", {}),
            reference_only=False,
            arns={},
            referenced_arns=set(),
        )