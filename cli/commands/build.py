from __future__ import annotations
import json
from venv import logger
from boto3 import Session

from graph.resource_graph_builder import ResourceGraphBuilder
from graph.registry import ResolverRegistry
from utils.arn import ARN
from resolvers import register_all
from utils.json_encoder import AWSJSONEncoder


def register(subparsers):
    parser = subparsers.add_parser(
        "build",
        help="Build a dependency graph from one or more seed ARNs",
    )

    parser.add_argument(
        "--arn",
        action="append",
        help="Seed ARN (repeatable)",
    )
    parser.add_argument(
        "--arn-file",
        help="Path to a text file containing seed ARNs (one per line)",
    )
    parser.add_argument(
        "--output",
        "-o",
        default="graph.json",
        help="Output JSON file (portable graph)",
    )

    parser.add_argument(
        "--raw",
        action="store_true",
        help="Write raw graph (without portable freeze)",
    )

    parser.set_defaults(handler=handler)


def handler(args):
    session = build_session(args)
    registry = ResolverRegistry(session)
    register_all(registry)
    builder = ResourceGraphBuilder(registry, session=session)

    # ---- collect ARNs from flags ----
    seed_arns: list[str] = args.arn or []

    # ---- read from file if provided ----
    if args.arn_file:
        try:
            with open(args.arn_file, "r") as f:
                for line in f:
                    line = line.strip()
                    if not line or line.startswith("#"):
                        continue
                    seed_arns.append(line)
        except Exception as e:
            raise RuntimeError(f"Failed to read ARN file {args.arn_file}: {e}")

    if not seed_arns:
        raise RuntimeError("No seed ARNs provided via --arn or --arn-file")

    # ---- parse into ARN objects ----
    arn_objects = [ARN.parse(a) for a in seed_arns]

    # ---- build graph ----
    graph = builder.build(arn_objects)

    # ---- output selection ----
    data = graph.to_dict() if args.raw else graph.to_portable()

    with open(args.output, "w") as f:
        json.dump(data, f, indent=2, cls=AWSJSONEncoder)

    print(f"[OK] Wrote graph → {args.output}")
    print(f"      Nodes: {len(graph)}, Edges: {graph._g.number_of_edges()}")


def build_session(args) -> Session:
    if args.profile and args.region:
        return Session(profile_name=args.profile, region_name=args.region)
    elif args.profile:
        return Session(profile_name=args.profile)
    elif args.region:
        return Session(region_name=args.region)
    else:
        return Session()
