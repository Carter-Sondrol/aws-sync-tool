from __future__ import annotations
import json
from pathlib import Path
import logging

logger = logging.getLogger(__name__)


def run(ctx, args) -> int:
    """Render an existing graph.json in the interactive visualizer."""
    from graph.dependency_graph import DependencyGraph
    from graph.visualizer import render_interactive_graph

    graph_path = Path(args.graph)
    if not graph_path.exists():
        raise SystemExit(f"Graph file not found: {graph_path}")

    graph_data = json.loads(graph_path.read_text())
    graph = DependencyGraph.from_dict(graph_data)
    render_interactive_graph(graph)
    return 0
