from __future__ import annotations

import json
from pathlib import Path

from graph.dependency_graph import DependencyGraph
from graph.resource_node import NodeClassification, ResourceNode
from planner.deployment_plan import DeploymentPlanner, DeploymentPlan
from utils.environment import EnvironmentContext


def register(subparsers):
    parser = subparsers.add_parser(
        "plan",
        help="Create a deploy plan (CFN vs imperative) from a portable graph",
    )

    parser.add_argument("--graph", "-g", required=True, help="Path to portable graph JSON")
    parser.add_argument("--output", "-o", default="plan.json", help="Plan output path")
    parser.add_argument("--source-env", default="source", help="Source environment label")
    parser.add_argument("--target-env", default="target", help="Target environment label")
    parser.add_argument("--target-account", help="Target AWS account ID")
    parser.add_argument("--default-region", help="Default region override for target")

    parser.set_defaults(handler=handler)


def handler(args):
    graph_path = Path(args.graph)
    if not graph_path.exists():
        raise RuntimeError(f"Graph not found: {graph_path}")

    with open(graph_path) as f:
        data = json.load(f)

    graph = DependencyGraph.from_dict(data)
    env = EnvironmentContext(
        source_env=args.source_env,
        target_env=args.target_env,
        target_account=args.target_account,
        default_region=args.default_region,
    )
    planner = DeploymentPlanner(env)
    plan = planner.build(graph)

    out_path = Path(args.output)
    out_path.write_text(plan.to_json())
    print(f"[OK] Plan written → {out_path}")