from __future__ import annotations

import json
from pathlib import Path

from deploy.imperative_apply import ImperativeApplier
from graph.dependency_graph import DependencyGraph
from graph.resource_node import NodeClassification, ResourceNode
from planner.deployment_plan import DeploymentPlan
from utils.environment import EnvironmentContext


def register(subparsers):
    parser = subparsers.add_parser(
        "apply-imperative",
        help="Apply imperative (boto3) updates for non-CFN resources defined in a plan",
    )
    parser.add_argument("--graph", "-g", required=True, help="Portable graph JSON")
    parser.add_argument("--plan", "-p", required=True, help="Plan JSON produced by `plan` command")
    parser.add_argument("--dry-run", action="store_true", help="Log actions without calling AWS APIs")
    parser.add_argument("--target-env", default="target", help="Target environment label")
    parser.add_argument("--target-account", help="Target AWS account id")
    parser.add_argument("--default-region", help="Default region override")

    parser.set_defaults(handler=handler)


def handler(args):
    graph = _rebuild_graph(Path(args.graph))
    with open(args.plan) as f:
        plan_data = json.load(f)
    plan = DeploymentPlan.from_dict(plan_data)
    env = EnvironmentContext(
        target_env=args.target_env,
        target_account=args.target_account,
        default_region=args.default_region,
    )
    applier = ImperativeApplier(env)
    applier.apply(graph, plan, dry_run=args.dry_run)


def _rebuild_graph(path: Path) -> DependencyGraph:
    with open(path) as f:
        data = json.load(f)
    g = DependencyGraph()
    for lid, entry in data["nodes"].items():
        classification_name = entry.get("classification") or "RESOURCE"
        try:
            classification = NodeClassification[classification_name]
        except KeyError:
            classification = NodeClassification.RESOURCE

        node = ResourceNode(
            logical_id=lid,
            service=entry["service"],
            cfn_type=entry.get("cfn_type", ""),
            properties=entry.get("properties", {}),
            reference_only=entry.get("reference_only", False),
            metadata=entry.get("metadata", {}),
            classification=classification,
            arns={},
        )
        g.add_node(node)

    for e in data.get("edges", []):
        g.add_edge(e["from"], e["to"], label=e.get("label"))
    g.metadata = data.get("metadata", {})
    return g
