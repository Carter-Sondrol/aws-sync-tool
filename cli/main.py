#!/usr/bin/env python3
from __future__ import annotations
import sys
import logging
import argparse
import argcomplete

from cli.commands import graph_cmd, export_cmd, mapping_cmd, visualize_cmd
from cli.context import create_context


def build_parser() -> argparse.ArgumentParser:
    """Build the top-level CLI parser with subcommands."""
    p = argparse.ArgumentParser(
        prog="aws-sync",
        description="Sync and export AWS resources across accounts (graph → CFN/CDK)."
    )

    sub = p.add_subparsers(dest="command", required=True)

    # graph
    g = sub.add_parser("graph", help="Build dependency graph from seeds or mapping table")
    g.add_argument("--seed-arn", nargs="+", help="Seed ARN(s) to start graph traversal")
    g.add_argument("--mapping-table", help="Name of DynamoDB mapping table to seed from")
    g.add_argument("--output", "-o", help="Write resulting graph JSON to file")
    g.add_argument("--visualize", "-V", action="store_true", help="Open interactive visualization")

    # export
    e = sub.add_parser("export", help="Export graph to CloudFormation/CDK")
    e.add_argument("format", choices=["cfn", "cdk", "both"], help="Output format")
    e.add_argument("--graph", default="graph.json", help="Path to existing graph JSON")
    e.add_argument("--outdir", default="output", help="Export output directory")

    # mapping
    m = sub.add_parser("mapping", help="Manage DynamoDB mapping tables")
    m.add_argument("action", choices=["export-csv"], help="Mapping action")
    m.add_argument("--table", required=True, help="DynamoDB mapping table name")
    m.add_argument("--out", default="resource_mapping.csv", help="CSV output path")

    # visualize
    v = sub.add_parser("visualize", help="Render interactive graph from a file")
    v.add_argument("--graph", default="graph.json", help="Path to graph.json")

    # global args
    p.add_argument("--profile", help="AWS profile name")
    p.add_argument("--region", help="AWS region (default: autodetect)")
    p.add_argument("--verbose", "-v", action="count", default=0, help="Increase logging verbosity")

    argcomplete.autocomplete(p)
    return p


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    log_level = logging.WARNING - 10 * min(args.verbose, 2)
    logging.basicConfig(level=log_level, format="[%(levelname)s] %(message)s")

    ctx = create_context(args.profile, args.region)

    match args.command:
        case "graph":
            return graph_cmd.run(ctx, args)
        case "export":
            return export_cmd.run(ctx, args)
        case "mapping":
            return mapping_cmd.run(ctx, args)
        case "visualize":
            return visualize_cmd.run(ctx, args)
        case _:
            print(f"Unknown command: {args.command}")
            return 1


if __name__ == "__main__":
    raise SystemExit(main())
