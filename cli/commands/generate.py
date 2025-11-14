from __future__ import annotations
import json
from pathlib import Path

from graph.dependency_graph import DependencyGraph
from graph.resource_node import ResourceNode
from builder.cdk.cdk_builder import generate_cdk_code


def register(subparsers):
    parser = subparsers.add_parser(
        "generate",
        help="Generate a CDK app from a saved portable graph",
    )

    parser.add_argument(
        "--graph",
        "-g",
        required=True,
        help="Portable graph JSON file (output of `build`)",
    )

    parser.add_argument(
        "--output",
        "-o",
        default="cdk-out",
        help="Destination directory for generated CDK app",
    )

    parser.add_argument(
        "--stack-name",
        default="GraphStack",
        help="Name to use for the generated CDK Stack class",
    )

    parser.set_defaults(handler=handler)


def handler(args):
    graph_path = Path(args.graph)
    out_dir = Path(args.output)

    if not graph_path.exists():
        raise RuntimeError(f"Graph file not found: {graph_path}")

    # ------------------------------------------------------------
    # Load + rebuild graph
    # ------------------------------------------------------------
    with open(graph_path) as f:
        data = json.load(f)

    graph = _rebuild_graph(data)

    # ------------------------------------------------------------
    # Run CDK generator
    # ------------------------------------------------------------
    cdk_source = generate_cdk_code(graph, args.stack_name)

    out_dir.mkdir(parents=True, exist_ok=True)

    # Write stack file
    (out_dir / "stack.py").write_text(cdk_source)

    # Write App entrypoint
    (out_dir / "app.py").write_text(
        f"""\
#!/usr/bin/env python3
import aws_cdk as cdk
from stack import {args.stack_name}

app = cdk.App()
{args.stack_name}(app, "{args.stack_name}")
app.synth()
"""
    )

    # CDK config
    (out_dir / "cdk.json").write_text(
        json.dumps(
            {
                "app": "python3 app.py",
                "requireApproval": "never",
                "versionReporting": False,
            },
            indent=2,
        )
    )

    # Minimal CDK requirements
    (out_dir / "requirements.txt").write_text(
        "aws-cdk-lib\nconstructs>=10.0.0\n"
    )

    print(f"[OK] CDK app generated → {out_dir.resolve()}")
    print("Next steps:")
    print(f"  cd {out_dir}")
    print("  pip install -r requirements.txt")
    print("  cdk synth")
    print("  cdk deploy")


# ------------------------------------------------------------
# Graph reconstruction (same style as display.py)
# ------------------------------------------------------------
def _rebuild_graph(data) -> DependencyGraph:
    g = DependencyGraph()

    # Recreate nodes
    for lid, entry in data["nodes"].items():
        node = ResourceNode(
            logical_id=lid,
            service=entry["service"],
            cfn_type=entry.get("cfn_type", ""),
            properties=entry.get("properties", {}),
            reference_only=entry.get("reference_only", False),
            metadata=entry.get("metadata", {}),
            arns={},  # not stored in portable graphs
        )
        g.add_node(node)

    # Recreate edges
    for e in data.get("edges", []):
        g.add_edge(e["from"], e["to"])

    # Carry over metadata (important: PendingParams)
    g.metadata = data.get("metadata", {})

    return g
