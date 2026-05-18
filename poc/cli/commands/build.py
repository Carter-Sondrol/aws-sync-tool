from __future__ import annotations
import json
import logging
from pathlib import Path

from boto3 import Session

from poc.graph.resource_graph_builder import ResourceGraphBuilder
from poc.graph.registry import ResolverRegistry
# Temporarily use the new metadata-driven resolvers
from poc.resolvers import register_all
from poc.utils.arn import ARN
from poc.utils.seed_loader import SeedRecord
from poc.utils.seed_source import CSVSeedSource, DynamoDBSeedSource, SeedSourceChain
from poc.utils.environment import EnvironmentContext
from poc.utils.json_encoder import AWSJSONEncoder

logger = logging.getLogger(__name__)

def register(subparsers):
    parser = subparsers.add_parser(
        "build",
        help="Build a dependency graph from seed ARNs",
    )

    # Seeding
    parser.add_argument("--arn", action="append", help="Seed ARN (repeatable)")
    parser.add_argument("--arn-file", help="File with ARNs, one per line")

    parser.add_argument("--seed-csv", help="CSV with logical_id + ARN columns")
    parser.add_argument("--seed-env", help="Seed environment column suffix")
    parser.add_argument("--seed-table", help="DynamoDB table name with seed rows")
    parser.add_argument("--seed-table-region", help="Region for DynamoDB seed table")

    # Environments
    parser.add_argument("--source-env", default="source", help="Source environment label")
    parser.add_argument("--target-env", default="target", help="Target environment label")
    parser.add_argument("--target-account", help="Target AWS account for remap")
    parser.add_argument("--default-region", help="Default region override in target")
    parser.add_argument(
        "--deep",
        action="store_true",
        help="Enable deep discovery (e.g., enumerate Connect child resources from an instance)",
    )

    # Output
    parser.add_argument("--output", "-o", default="graph.json", help="Portable graph output")
    parser.add_argument("--raw", action="store_true", help="Output raw un-frozen graph")

    parser.set_defaults(handler=handler)

def handler(args):
    session = build_session(args)

    registry = ResolverRegistry(session)
    register_all(registry)

    env = EnvironmentContext(
        source_env=args.source_env,
        target_env=args.target_env,
        target_account=args.target_account,
        default_region=args.default_region,
    )

    #--------------------------------------------------
    # Collect seeds
    #--------------------------------------------------
    arn_objects: list[ARN] = []
    seed_overrides: dict[ARN, SeedRecord] = {}
    reference_seeds: list[SeedRecord] = []

    # Direct ARNs
    if args.arn:
        for a in args.arn:
            arn_objects.append(ARN.parse(a))

    # File-based ARNs
    if args.arn_file:
        for line in Path(args.arn_file).read_text().splitlines():
            line = line.strip()
            if line and not line.startswith("#"):
                arn_objects.append(ARN.parse(line))

    # Structured seeds (CSV/DynamoDB)
    sources = []
    if args.seed_csv:
        sources.append(CSVSeedSource(args.seed_csv))
    if args.seed_table:
        sources.append(DynamoDBSeedSource(
            table_name=args.seed_table,
            region=args.seed_table_region,
            env_attribute="env",
            logical_id_attribute="logical_id",
            arn_attribute="arn",
        ))

    if sources:
        chain = SeedSourceChain(sources)
        seed_records = chain.load(env)

        for rec in seed_records:
            if rec.reference_only:
                reference_seeds.append(rec)
                continue

            seed_arn = rec.preferred_arn(args.seed_env or env.source_env)
            if seed_arn:
                arn_objects.append(seed_arn)
                seed_overrides[seed_arn] = rec

    if not arn_objects:
        raise RuntimeError("No seed ARNs provided.")

    #--------------------------------------------------
    # Build graph
    #--------------------------------------------------
    discovery_config = {"deep": bool(args.deep)}
    builder = ResourceGraphBuilder(registry, session=session, discovery_config=discovery_config)
    graph = builder.build(
        arn_objects,
        seed_metadata=seed_overrides,
        reference_seeds=reference_seeds,
        freeze=not args.raw,
    )

    graph.metadata["EnvironmentContext"] = vars(env)

    out = Path(args.output)
    out.write_text(
        json.dumps(
            graph.to_dict() if args.raw else graph.to_portable(),
            indent=2,
            cls=AWSJSONEncoder,
        )
    )

    print(f"[OK] Wrote graph → {out}")
    print(f"    Nodes: {len(graph)}, Edges: {graph._g.number_of_edges()}")

def build_session(args) -> Session:
    return Session(
        profile_name=args._global_profile,
        region_name=args._global_region,
    )
