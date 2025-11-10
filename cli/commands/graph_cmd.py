from __future__ import annotations
import json
import logging
from pathlib import Path

from graph.resource_graph_builder import ResourceGraphBuilder
from utils.json_encoder import AWSJSONEncoder
from utils.arn import ARN
from cli.mapping_utils import load_mapping_table

logger = logging.getLogger(__name__)


def run(ctx, args) -> int:
    """Build a dependency graph from seed ARNs or a mapping table."""
    session = ctx.session
    registry = ctx.registry

    if args.seed_arn:
        arns = [ARN.parse(a.strip()) for a in args.seed_arn]
        mapping_store = None
        logger.info("Building graph from %d seed ARNs", len(arns))
    elif args.mapping_table:
        mapping_store = load_mapping_table(session, args.mapping_table)
        arns = [
            rec.arns["Primary"]
            for rec in mapping_store.iter_all()
            if rec.account_id == ctx.account_id
        ]
        logger.info("Loaded %d ARNs from mapping table %s", len(arns), args.mapping_table)
    else:
        raise SystemExit("❌ Must specify --seed-arn or --mapping-table")

    builder = ResourceGraphBuilder(registry)
    graph = builder.build(arns)

    # inside graph_cmd.py
    if args.output:
        graph_data = {"nodes": graph.to_dict()} if isinstance(graph.to_dict(), list) else graph.to_dict()
        Path(args.output).write_text(json.dumps(graph_data, indent=2, cls=AWSJSONEncoder))
        logger.info("Graph written to %s", args.output)


    if args.visualize:
        from graph.visualizer import render_interactive_graph
        render_interactive_graph(graph)

    return 0
