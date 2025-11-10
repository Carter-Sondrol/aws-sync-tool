from __future__ import annotations
import json
import logging
from pathlib import Path
from cli.exporters import export_cloudformation, export_cdk

logger = logging.getLogger(__name__)


def run(ctx, args) -> int:
    """Export a dependency graph into CloudFormation or CDK formats."""
    graph_path = Path(args.graph)
    if not graph_path.exists():
        raise SystemExit(f"❌ Graph file not found: {graph_path}")

    from graph.dependency_graph import DependencyGraph

    graph_data = json.loads(graph_path.read_text())
    graph = DependencyGraph.from_dict(graph_data)

    if args.format in ("cfn", "both"):
        export_cloudformation(graph, mapping_store=None)
    if args.format in ("cdk", "both"):
        export_cdk(graph, output_dir=args.outdir)

    logger.info("Export complete → %s", args.outdir)
    return 0
