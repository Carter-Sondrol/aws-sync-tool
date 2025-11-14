from __future__ import annotations
import json
from pathlib import Path

from graph.dependency_graph import DependencyGraph
from graph.resource_node import ResourceNode
from graph.visualizer import render_interactive_graph


def register(subparsers):
    parser = subparsers.add_parser(
        "display",
        help="Display a saved graph (text or interactive HTML)",
    )

    parser.add_argument(
        "--file",
        "-f",
        required=True,
        help="Graph JSON file produced by 'build'",
    )

    parser.add_argument(
        "--tree",
        action="store_true",
        help="Print a simple dependency tree",
    )

    parser.add_argument(
        "--visual",
        action="store_true",
        help="Open the interactive graph visualizer",
    )

    parser.add_argument(
        "--out",
        default="graph.html",
        help="Output HTML file when using --visual",
    )

    parser.set_defaults(handler=handler)


def handler(args):
    with open(args.file) as f:
        data = json.load(f)

    graph = _rebuild_graph(data)

    print(f"Loaded graph with {len(graph)} nodes\n")

    if args.visual:
        _visualize(graph, args.out)
        return

    if args.tree:
        _print_tree(graph)
    else:
        _print_nodes(graph)


# -------------------------------------------------------
# Visualizer integration
# -------------------------------------------------------
def _visualize(graph: DependencyGraph, out_path: str):
    out_file = Path(out_path)
    render_interactive_graph(
        graph,
        out_path=out_file,
        open_browser=True,
    )
    print(f"[OK] Visualization written to {out_file.resolve()}")


# -------------------------------------------------------
# Build minimal in-memory graph from portable JSON
# -------------------------------------------------------
def _rebuild_graph(data) -> DependencyGraph:
    g = DependencyGraph()

    # Create nodes
    for lid, entry in data["nodes"].items():
        node = ResourceNode(
            logical_id=lid,
            service=entry["service"],
            cfn_type=entry.get("cfn_type", ""),
            properties=entry.get("properties", {}),
            reference_only=entry.get("reference_only", False),
            metadata=entry.get("metadata", {}),
            arns={},  # portable graphs do not include ARNs
        )
        g.add_node(node)

    # Create edges
    for e in data.get("edges", []):
        g.add_edge(e["from"], e["to"])

    g.metadata = data.get("metadata", {})
    return g


# -------------------------------------------------------
# Text display modes
# -------------------------------------------------------
def _print_nodes(graph):
    for n in graph:
        print(f"- {n.logical_id} ({n.service})")


def _print_tree(graph):
    # basic parent → child listing
    for lid in graph._nodes:
        children = [t for _, t in graph._g.edges(lid)]
        print(f"{lid}:")
        for c in children:
            print(f"  → {c}")
