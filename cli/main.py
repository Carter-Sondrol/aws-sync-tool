#!/usr/bin/env python3
from __future__ import annotations
import json
import logging
import subprocess
from pathlib import Path
from typing import List, Optional
import sys

if __package__ is None or __package__ == "":
    repo_root = Path(__file__).resolve().parent.parent
    sys.path.insert(0, str(repo_root))
    
import boto3
from graph.resource_graph_builder import ResourceGraphBuilder
from graph.graph_utils import print_link_summary
from graph.visualizer import render_interactive_graph
from utils.json_encoder import AWSJSONEncoder
from utils.arn import ARN

from cli.args import parse_args, configure_logging
from cli.aws_utils import create_session, build_registry
from cli.mapping_utils import load_mapping_table, export_mapping_csv
from cli.exporters import export_cloudformation, export_cdk

logger = logging.getLogger(__name__)

def install_completion(shell: str):
    """Install shell completions for this CLI."""
    try:
        cmd = f"register-python-argcomplete aws-sync > ~/.config/{shell}/completions/aws-sync.{shell}"
        if shell == "fish":
            out_file = Path.home() / ".config" / "fish" / "completions" / "aws-sync.fish"
        elif shell == "zsh":
            out_file = Path.home() / ".zfunc" / "_aws-sync"
        else:  # bash
            out_file = Path.home() / ".bash_completion.d" / "aws-sync"
        out_file.parent.mkdir(parents=True, exist_ok=True)
        subprocess.run(
            f"register-python-argcomplete --shell {shell} aws-sync > {out_file}",
            shell=True,
            check=True,
        )
        print(f"✅ Installed {shell} completions to {out_file}")
    except Exception as e:
        print(f"❌ Failed to install {shell} completions: {e}")


# cli/main.py
def main(argv: Optional[List[str]] = None) -> int:
    args = parse_args(_normalize_argv(argv))
    
    if args.install_completion:
        install_completion(args.install_completion)
        return 0

    configure_logging(args.verbose)
    session, account_id, region = create_session(args.profile, args.region)
    registry = build_registry(session)

    # ------------------------------------------------------------------
    # Determine seed input
    # ------------------------------------------------------------------

    if args.seed_arn:
        logger.info(f"Using single seed ARN: {args.seed_arn}")
        mapping_store = None
        # Support multiple seeds if --seed-arn is used multiple times or comma-separated
        if isinstance(args.seed_arn, list):
            arns = [ARN.parse(a.strip()) for a in args.seed_arn]
        else:
            arns = [ARN.parse(a.strip()) for a in args.seed_arn.split(",") if a.strip()]
    else:
        if not args.mapping_table:
            logger.error("Must specify either --seed-arn or --mapping-table")
            return 1
        mapping_store = load_mapping_table(session, args.mapping_table)
        arns = [
            rec.arns["Primary"]
            for lid, per_acct in mapping_store._by_logical.items()
            if (rec := per_acct.get(account_id))
        ]
        if not arns:
            logger.error(f"No ARNs found for account {account_id} in {args.mapping_table}")
            return 1
        logger.info(f"Loaded {len(arns)} seed ARNs from mapping table {args.mapping_table}")

    # ------------------------------------------------------------------
    # Build dependency graph
    # ------------------------------------------------------------------
    builder = ResourceGraphBuilder(registry)
    graph = builder.build(arns)
    graph_data = graph.to_dict()

    # Output graph JSON
    if args.output:
        Path(args.output).write_text(json.dumps(graph_data, indent=2, cls=AWSJSONEncoder))
        logger.info(f"Graph written to {args.output}")

    # Exports
    if args.export in ("cfn", "both"):
        export_cloudformation(graph, mapping_store)
    if args.export in ("cdk", "both"):
        export_cdk(
            graph=graph,
            account_id=account_id,
            region=region,
            stack_name=args.cdk_stack_name,
            app_name=args.cdk_app_name,
            out_dir=args.cdk_out,
        )

    if args.debug_links:
        print_link_summary(graph)

    # Export updated mapping CSV only if mapping table was used
    if mapping_store:
        csv_path = Path(args.export_csv or "resource_mapping_updated.csv")
        export_mapping_csv(mapping_store, csv_path)

    # Visualization
    if args.visualize:
        render_interactive_graph(graph)

    return 0

def _normalize_argv(argv: Optional[List[str]]) -> Optional[List[str]]:
    if argv is None:
        return None

    normalized = list(argv)
    if not normalized:
        return normalized

    aliases = {"cdk": ["--export", "cdk"], "cfn": ["--export", "cfn"], "both": ["--export", "both"]}
    first = normalized[0]
    if first in aliases:
        normalized = aliases[first] + normalized[1:]
    return normalized

if __name__ == "__main__":
    raise SystemExit(main())
