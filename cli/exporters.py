from __future__ import annotations
import json
import logging
from pathlib import Path

from builder.cdk.export_cdk import export_cdk as builder_export_cdk
from builder.cloudformation_builder import CloudFormationTemplateBuilder
from utils.json_encoder import AWSJSONEncoder

logger = logging.getLogger(__name__)


def export_cloudformation(
    graph,
    mapping_store=None,
    output_dir: str = "output/cloudformation",
) -> Path:
    """Serialize a dependency graph into a CloudFormation template JSON file."""
    out_path = Path(output_dir)
    out_path.mkdir(parents=True, exist_ok=True)
    template_path = out_path / "template.json"

    builder = CloudFormationTemplateBuilder(graph)
    tmpl = builder.build(mapping_store=mapping_store)

    template_path.write_text(json.dumps(tmpl, indent=2, cls=AWSJSONEncoder))
    logger.info("[cloudformation] Template written to %s", template_path)
    return template_path


def export_cdk(
    graph,
    *,
    output_dir: str = "output/cdk",
    stack_name: str = "GraphStack",
) -> Path:
    """Generate a CDK application using the shared builder module."""

    out_path = builder_export_cdk(
        graph,
        output_dir=output_dir,
        stack_name=stack_name,
    )

    # Persist graph metadata alongside the generated application for reference.
    graph_json = Path(out_path) / "graph.json"
    if not graph_json.exists():
        data = {"nodes": {lid: node.__dict__ for lid, node in graph._nodes.items()}}
        graph_json.write_text(json.dumps(data, indent=2, cls=AWSJSONEncoder))

    logger.info("[cdk] CDK app ready → %s", out_path)
    return Path(out_path)
