from __future__ import annotations
import json
from pathlib import Path

from poc.builder.cdk.export_cdk import export_cdk
from poc.graph.dependency_graph import DependencyGraph


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
    parser.add_argument(
        "--plan",
        help="Deployment plan JSON (limits CDK generation to CFN-eligible resources)",
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
    
    graph = DependencyGraph.from_dict(data)
    plan = None
    if args.plan:
        with open(args.plan) as pf:
            from poc.planner.deployment_plan import DeploymentPlan

            plan = DeploymentPlan.from_dict(json.load(pf))

    # ------------------------------------------------------------
    # Run CDK generator (L2 when possible)
    # ------------------------------------------------------------
    export_cdk(graph, output_dir=str(out_dir), stack_name=args.stack_name, plan=plan)

    print(f"[OK] CDK app generated → {out_dir.resolve()}")
    print("Next steps:")
    print(f"  cd {out_dir}")
    print("  pip install -r requirements.txt")
    print("  cdk synth")
    print("  cdk deploy")


# ------------------------------------------------------------
# Graph reconstruction (raw or portable)
# ------------------------------------------------------------
def _rebuild_graph(data) -> DependencyGraph:
    if "nodes" not in data:
        raise RuntimeError("Invalid graph: missing 'nodes' section")
    return DependencyGraph.from_dict(data)
