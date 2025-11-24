from __future__ import annotations
import json
from pathlib import Path

from graph.dependency_graph import DependencyGraph

def register(subparsers):
    parser = subparsers.add_parser(
        "display",
        help="Display a saved graph",
    )

    parser.add_argument("--file", "-f", required=True, help="Graph JSON file")
    parser.add_argument("--tree", action="store_true", help="Print a dependency tree")
    parser.add_argument("--visual", action="store_true", help="Visualize in HTML")
    parser.add_argument("--out", default="graph.html", help="HTML output path for visual")

    parser.set_defaults(handler=handler)

def handler(args):
    data = json.loads(Path(args.file).read_text())
    graph = DependencyGraph.from_dict(data)
    print(f"Loaded graph with {len(graph)} nodes")

    if args.visual:
        from graph.visualizer import render_interactive_graph
        render_interactive_graph(graph, out_path=args.out, open_browser=True)
        print(f"[OK] Visualization → {args.out}")
        return

    if args.tree:
        _print_tree(graph)
    else:
        _print_nodes(graph)

def _print_nodes(graph):
    for n in graph:
        print(f"- {n.logical_id} ({n.service})")

def _print_tree(graph):
    for lid in graph._nodes:
        children = [t for _, t in graph._g.edges(lid)]
        print(f"{lid}:")
        for c in children:
            print(f"  → {c}")
