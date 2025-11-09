from __future__ import annotations
import logging
from typing import Any
from graph.dependency_graph import DependencyGraph

logger = logging.getLogger(__name__)


def print_link_summary(graph: DependencyGraph) -> None:
    """Print all cross-resource edges and detected environment/flow links."""
    edges = list(graph._g.edges())
    print("\n📊  LINK SUMMARY")
    print("=" * 60)
    print(f"Total nodes: {len(graph._nodes)}")
    print(f"Total edges: {len(edges)}\n")

    for parent, child in edges:
        parent_node = graph.get_node(parent)
        child_node = graph.get_node(child)
        print(f"  {parent_node.logical_id:<40} → {child_node.logical_id:<40}")

    # Show pending parameterized env vars, if any
    pending_params: dict[str, Any] = graph.metadata.get("PendingParams", {})
    if pending_params:
        print("\n🧩  PENDING PARAMETERS")
        print("=" * 60)
        for k, v in pending_params.items():
            print(f"  {k:<25} = {v}")

    print("\n✅  End of link summary\n")
