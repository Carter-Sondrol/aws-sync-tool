import json
import logging
from pathlib import Path
from builder.cloudformation_builder import CloudFormationTemplateBuilder
from builder.cdk.project_writer import generate_cdk_project
from utils.json_encoder import AWSJSONEncoder

logger = logging.getLogger(__name__)

def export_cloudformation(graph, mapping_store, output_dir="output/cloudformation"):
    out = Path(output_dir) / "template.json"
    out.parent.mkdir(parents=True, exist_ok=True)
    builder = CloudFormationTemplateBuilder(graph, mapping_store=mapping_store)
    tmpl = builder.build_template()
    out.write_text(json.dumps(tmpl, indent=2, cls=AWSJSONEncoder))
    logger.info("CloudFormation template written to %s", out)
    return out


def export_cdk(graph, account_id, region, stack_name, app_name, out_dir="output/cdk_app"):
    try:
        out = Path(out_dir)
        generate_cdk_project(
            graph=graph,
            out_dir=str(out),
            stack_name=stack_name,
            account=account_id,
            region=region,
        )
        logger.info("CDK app (%s) written to %s", app_name, out)
        return out
    except Exception as e:
        logger.exception("CDK generation failed: %s", e)
        raise
