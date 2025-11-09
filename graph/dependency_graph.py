from __future__ import annotations

import json
import logging
import re
from dataclasses import dataclass, field
from typing import Any, Dict, Optional, Iterator
from copy import deepcopy

import networkx as nx
from utils.arn import ARN

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------
# Helper: recursive ARN replacement
# ---------------------------------------------------------------------
def _replace_arns(obj: Any, arn_map: dict[str, str]) -> Any:
    """Recursively replace ARN strings (including embedded JSON text) with __REF_<LogicalID>__ placeholders."""
    if isinstance(obj, str):
        # 1️⃣ Direct ARN replacement
        if obj.startswith("arn:"):
            lid = arn_map.get(obj)
            return f"__REF_{lid}__" if lid else obj

        # 2️⃣ Embedded JSON (like Connect ContactFlow.Content)
        if "arn:aws:" in obj and obj.strip().startswith("{"):
            try:
                parsed = json.loads(obj)
                replaced = _replace_arns(parsed, arn_map)
                return json.dumps(replaced)
            except Exception:
                # Fallback regex substitution if not valid JSON
                return re.sub(
                    r"arn:aws:[a-z0-9\-]+:[a-z0-9\-]*:\d{0,12}:[^\"'\s]+",
                    lambda m: f"__REF_{arn_map.get(m.group(0))}__" if m.group(0) in arn_map else m.group(0),
                    obj,
                )
        return obj

    elif isinstance(obj, dict):
        return {k: _replace_arns(v, arn_map) for k, v in obj.items()}

    elif isinstance(obj, list):
        return [_replace_arns(v, arn_map) for v in obj]

    return obj


# ---------------------------------------------------------------------
# Node definition
# ---------------------------------------------------------------------
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


# ---------------------------------------------------------------------
# DependencyGraph core
# ---------------------------------------------------------------------
class DependencyGraph:
    """Generic dependency graph of AWS resources."""

    def __init__(self) -> None:
        self._g = nx.DiGraph()
        self._nodes: dict[str, ResourceNode] = {}
        self._arn_index: dict[ARN, str] = {}
        self._pending_links: list[tuple[str, ARN]] = []
        self.metadata: dict[str, Any] = {}

    # ------------------------------------------------------------------
    # Basic API
    # ------------------------------------------------------------------
    def __iter__(self) -> Iterator[ResourceNode]:
        return iter(self._nodes.values())

    def add_node(self, node: ResourceNode) -> None:
        """Add a node and index its ARNs."""
        self._nodes[node.logical_id] = node
        self._g.add_node(node.logical_id)
        for arn in node.arns.values():
            self._arn_index[arn] = node.logical_id

    def defer_link(self, source_id: str, target_arn: ARN) -> None:
        """Store edges that reference unresolved ARNs until all nodes are added."""
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

    def topological_sort(self) -> list[str]:
        return list(nx.topological_sort(self._g))

    def resolve_links(self) -> None:
        """Resolve deferred edges once all nodes are registered."""
        for src, arn in list(self._pending_links):
            target_id = self._arn_index.get(arn)
            if target_id:
                self.add_edge(src, target_id)
        self._pending_links.clear()

    # ------------------------------------------------------------------
    # Lambda environment inference
    # ------------------------------------------------------------------
    def infer_lambda_env_links(self) -> None:
        """Infer cross-resource references in Lambda environment variables by matching known resource names.

        Adds dashed (inferred) edges between functions and their inferred dependencies.
        """
        name_index: dict[str, str] = {}
        for lid, node in self._nodes.items():
            for key in ("Name", "TableName", "BucketName"):
                val = node.properties.get(key)
                if isinstance(val, str):
                    name_index[val.lower()] = lid

        inferred_total = 0
        inferred_edges: list[dict[str, str]] = []

        for node in self._nodes.values():
            if node.service != "lambda":
                continue

            env = node.properties.get("Environment", {}).get("Variables", {})
            if not isinstance(env, dict):
                continue

            inferred = {}
            for k, v in list(env.items()):
                if not isinstance(v, str):
                    continue

                val_lower = v.lower()
                found_lid = None

                # 1️⃣ Exact match
                if val_lower in name_index:
                    found_lid = name_index[val_lower]

                # 2️⃣ JSON-encoded env var containing resource names
                elif val_lower.strip().startswith("{") and any(n in val_lower for n in name_index):
                    try:
                        parsed = json.loads(v)
                        for res_name, lid in name_index.items():
                            if res_name in json.dumps(parsed).lower():
                                found_lid = lid
                                break
                    except Exception:
                        pass

                # 3️⃣ Partial substring match (like "my-bucket/uploads")
                elif any(res_name in val_lower for res_name in name_index):
                    matches = [lid for res_name, lid in name_index.items() if res_name in val_lower]
                    if matches:
                        found_lid = matches[0]  # deterministic first match

                if found_lid:
                    inferred[k] = found_lid
                    env[k] = f"__REF_{found_lid}__"
                    inferred_edges.append({
                        "from": node.logical_id,
                        "to": found_lid,
                        "inferred": True
                    })

            if inferred:
                node.metadata.setdefault("InferredRefs", {}).update(inferred)
                inferred_total += 1

        # store inferred edges in metadata for visualizer
        if inferred_edges:
            self.metadata.setdefault("InferredEdges", []).extend(inferred_edges)

        logger.info("[Graph] Inferred Lambda env variable links for %d functions (%d edges total)", inferred_total, len(inferred_edges))


    # ------------------------------------------------------------------
    # Graph lifecycle
    # ------------------------------------------------------------------
    def freeze_to_portable(self) -> dict[str, str]:
        """
        Convert ARN-based graph into a logical-ID-based portable graph.

        - Replaces all ARN strings with __REF_<Logical_ID>__ placeholders.
        - Clears ARN/index fields.
        - Returns ARN→LogicalID map.
        """
        arn_to_id = {str(a): lid for a, lid in self._arn_index.items()}
        logger.info("[Graph] Freezing graph to portable mode (%d mappings)", len(arn_to_id))

        for lid, node in self._nodes.items():
            node.properties = _replace_arns(deepcopy(node.properties), arn_to_id)
            node.metadata["Portable"] = True
            node.metadata["FrozenFrom"] = [str(a) for a in node.arns.values()]
            node.arns.clear()
            node.referenced_arns.clear()

        self._arn_index.clear()
        self.metadata["Frozen"] = True
        self.metadata["ARNMap"] = arn_to_id

        # 🔁 Optional: infer cross-resource links in Lambda env vars post-freeze
        self.infer_lambda_env_links()

        return arn_to_id

    # ------------------------------------------------------------------
    # Introspection
    # ------------------------------------------------------------------
    def summary(self) -> str:
        return f"Graph: {len(self._nodes)} nodes, {self._g.number_of_edges()} edges"

    def print_summary(self) -> None:
        logger.info(self.summary())
        for lid in self.topological_sort():
            deps = list(self._g.predecessors(lid))
            logger.debug("  %s <- %s", lid, deps)

    # ------------------------------------------------------------------
    # Serialization
    # ------------------------------------------------------------------
    def to_dict(self) -> dict:
        """Return JSON-safe graph representation."""
        nodes = {}
        for lid, node in self._nodes.items():
            nodes[lid] = {
                "service": node.service,
                "cfn_type": node.cfn_type,
                "reference_only": node.reference_only,
                "properties": node.properties,
                "metadata": node.metadata,
            }

        edges = [{"from": s, "to": t} for s, t in self._g.edges()]
        return {
            "summary": self.summary(),
            "nodes": nodes,
            "edges": edges,
            "metadata": self.metadata,
        }
