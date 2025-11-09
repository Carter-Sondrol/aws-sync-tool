from __future__ import annotations
from typing import Any, Dict, Iterable

def serialize_graph(graph) -> Dict[str, Any]:
    """Convert a DependencyGraph into a minimal JSON-safe representation."""
    nodes: list[dict[str, Any]] = []
    try:
        lids: Iterable[str] = graph.topological_sort()
    except Exception:
        lids = getattr(graph, "_nodes", {}).keys()

    for lid in lids:
        node = graph.get_node(lid)
        nodes.append({
            "logical_id": lid,
            "service": getattr(node, "service", "unknown"),
            "cfn_type": getattr(node, "cfn_type", None),
            "reference_only": getattr(node, "reference_only", False),
            "metadata": getattr(node, "metadata", {}) or {},  # ✅ Add this line
            "properties": getattr(node, "properties", {}) or {},
            "arns": [str(v) for v in getattr(node, "arns", {}).values()],
            "references": [str(a) for a in getattr(node, "referenced_arns", [])],
        })


    edges = []
    try:
        for src, dst in graph._g.edges():
            edges.append({"from": src, "to": dst})
    except Exception:
        pass

    metadata = {}
    try:
        metadata = dict(getattr(graph, "metadata", {}) or {})
    except Exception:
        metadata = {}

    return {"nodes": nodes, "edges": edges, "metadata": metadata}