from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Any, Dict, Optional, Iterator

import networkx as nx
from utils.arn import ARN

logger = logging.getLogger(__name__)


@dataclass
class ResourceNode:
    logical_id: str
    service: str
    cfn_type: str
    properties: dict
    reference_only: bool = False
    metadata: dict = field(default_factory=dict)
    arns: dict[str, ARN] = field(default_factory=dict)
    referenced_arns: set[ARN] = field(default_factory=set)

class DependencyGraph:
    """Generic dependency graph of AWS resources."""

    def __init__(self) -> None:
        self._g = nx.DiGraph()
        self._nodes: dict[str, ResourceNode] = {}
        self._arn_index: dict[ARN, str] = {}
        self._pending_links: list[tuple[str, ARN]] = []      
        self.metadata: dict[str, Any] = {}
    
    def __iter__(self) -> Iterator[ResourceNode]:
        return iter(self._nodes.values())

    def add_node(self, node: ResourceNode) -> None:
        self._nodes[node.logical_id] = node
        self._g.add_node(node.logical_id)
        for arn in node.arns.values():
            self._arn_index[arn] = node.logical_id # For get_node_by_arn

    def defer_link(self, source_id: str, target_arn: ARN) -> None:
        self._pending_links.append((source_id, target_arn))

    def add_edge(self, parent: str, child: str) -> None:
        if parent != child and not self._g.has_edge(parent, child):
            self._g.add_edge(parent, child)

    def get_node(self, logical_id: str) -> ResourceNode:
        return self._nodes[logical_id]

    def get_node_by_arn(self, arn: ARN) -> Optional[ResourceNode]:
        lid = self._arn_index.get(arn)
        if lid:
            return self._nodes.get(lid)
        return None

    def topological_sort(self) -> list[str]:
        return list(nx.topological_sort(self._g))

    def resolve_links(self) -> None:
        for src, arn in list(self._pending_links):
            target_id = self._arn_index.get(arn)
            if target_id:
                self.add_edge(src, target_id)
        self._pending_links.clear()

    def find_by_property(
        self,
        service: str | None = None,
        property_name: str = "",
        value: Any = None,
    ) -> Optional[ResourceNode]:
        """Return the first node matching a given service/property/value trio."""

        for node in self._nodes.values():
            if service and node.service != service:
                continue
            if node.properties.get(property_name) == value:
                return node
        return None

    def summary(self) -> str:
        return f"Graph: {len(self._nodes)} nodes, {self._g.number_of_edges()} edges"

    def print_summary(self) -> None:
        logger.info(self.summary())
        for lid in self.topological_sort():
            deps = list(self._g.predecessors(lid))
            logger.debug("  %s <- %s", lid, deps)

    def to_dict(self) -> dict:
        """Return a JSON-serializable representation of the graph."""
        nodes = {}
        for lid, node in self._nodes.items():
            nodes[lid] = {
                "service": node.service,
                "cfn_type": node.cfn_type,
                "reference_only": node.reference_only,
                "properties": node.properties,
                "metadata": node.metadata,
                "arns": {k: str(v) for k, v in node.arns.items()},
                "referenced_arns": [str(a) for a in node.referenced_arns],
            }

        edges = [
            {"from": src, "to": dst}
            for src, dst in self._g.edges()
        ]

        return {
            "summary": self.summary(),
            "nodes": nodes,
            "edges": edges,
            "metadata": self.metadata,
        }