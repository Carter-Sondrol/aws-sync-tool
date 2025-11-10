# export_cdk.py
import json
import logging
import textwrap
from pathlib import Path

from builder.cdk.cdk_builder import generate_cdk_code

logger = logging.getLogger(__name__)


def export_cdk(
    graph,
    output_dir: str = "output/cdk",
    stack_name: str = "GraphStack",
    handler_src: str | Path | None = None,
):
    """
    Exports a complete CDK app for the given dependency graph.

    Includes:
      - {stack_name.lower()}.py (auto-generated)
      - graph_custom_handler_stack.py (Lambda+IAM)
      - lambda_custom_handler.py (loaded dynamically from handler_src)
      - app.py (entrypoint wiring stacks)
    """
    out_dir = Path(output_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    # 1️⃣ Generate the graph stack
    graph_code = generate_cdk_code(graph, stack_name=stack_name)
    graph_file = out_dir / f"{stack_name.lower()}.py"
    graph_file.write_text(graph_code)
    logger.info("✅ Wrote %s", graph_file)

    # 2️⃣ Write the handler stack
    (out_dir / "graph_custom_handler_stack.py").write_text(_GRAPH_CUSTOM_HANDLER_STACK)
    logger.info("✅ Wrote graph_custom_handler_stack.py")

    # 3️⃣ Copy in the actual handler implementation
    if handler_src is None:
        handler_src = Path(__file__).with_name("graph_custom_handler.py")
    else:
        handler_src = Path(handler_src)
    if not handler_src.exists():
        raise FileNotFoundError(f"Could not find handler source: {handler_src}")

    handler_dest = out_dir / "lambda_custom_handler.py"
    handler_dest.write_text(handler_src.read_text())
    logger.info("✅ Copied handler code from %s", handler_src)

    # 4️⃣ Generate CDK entrypoint
    app_code = _APP_TEMPLATE.format(
        stack_name=stack_name,
        stack_name_lower=stack_name.lower(),
    )
    (out_dir / "app.py").write_text(app_code)
    logger.info("✅ Wrote app.py")

    # 5️⃣ Project metadata
    (out_dir / "requirements.txt").write_text(
        "aws-cdk-lib\nconstructs>=10.0.0\n",
        encoding="utf-8",
    )
    logger.info("✅ Wrote requirements.txt")

    cdk_json = {
        "app": "python3 app.py",
        "requireApproval": "never",
        "versionReporting": False,
    }
    (out_dir / "cdk.json").write_text(json.dumps(cdk_json, indent=2), encoding="utf-8")
    logger.info("✅ Wrote cdk.json")

    readme = textwrap.dedent(
        f"""
        # AWS CDK App: {stack_name}

        This project was generated automatically from a dependency graph.

        ## Quick start

        ```bash
        python3 -m venv .venv
        source .venv/bin/activate
        pip install -r requirements.txt
        cdk synth
        cdk deploy
        ```

        The custom resource handler is deployed via `GraphCustomHandlerStack`.
        Once deployed, provide the exported handler ARN to the generated `{stack_name}` stack.
        """
    ).strip()
    (out_dir / "README.md").write_text(readme, encoding="utf-8")
    logger.info("✅ Wrote README.md")

    return out_dir


# ---------------------------------------------------------------------------
# CDK App Entrypoint Template
# ---------------------------------------------------------------------------
_APP_TEMPLATE = """#!/usr/bin/env python3
import aws_cdk as cdk
from graph_custom_handler_stack import GraphCustomHandlerStack
from {stack_name_lower} import {stack_name}

app = cdk.App()

# Deploy Lambda handler first
handler_stack = GraphCustomHandlerStack(app, "GraphCustomHandlerStack")

# Deploy generated graph stack
graph_stack = {stack_name}(app, "{stack_name}", env=cdk.Environment(region="us-west-2"))

# Inject handler ARN parameter
graph_stack.node.default_child.add_override(
    "Parameters.CustomHandlerArn.Default", handler_stack.handler_arn
)

app.synth()
"""

# ---------------------------------------------------------------------------
# CDK Stack Definition for Lambda Handler
# ---------------------------------------------------------------------------
_GRAPH_CUSTOM_HANDLER_STACK = """from aws_cdk import (
    Stack, Duration, aws_lambda as _lambda, aws_iam as iam, CfnOutput
)
from constructs import Construct
from pathlib import Path

class GraphCustomHandlerStack(Stack):
    \\"\\\"Deploys the Lambda handler for Connect/Lex/API-backed custom resources.\\"\\\"

    def __init__(self, scope: Construct, id: str, **kwargs):
        super().__init__(scope, id, **kwargs)

        role = iam.Role(
            self, "GraphCustomHandlerRole",
            assumed_by=iam.ServicePrincipal("lambda.amazonaws.com"),
            managed_policies=[
                iam.ManagedPolicy.from_aws_managed_policy_name(
                    "service-role/AWSLambdaBasicExecutionRole"
                ),
                iam.ManagedPolicy.from_aws_managed_policy_name("AmazonConnectFullAccess"),
                iam.ManagedPolicy.from_aws_managed_policy_name("AmazonLexFullAccess"),
            ],
        )

        fn = _lambda.Function(
            self, "GraphCustomHandler",
            runtime=_lambda.Runtime.PYTHON_3_13,
            handler="lambda_custom_handler.handler",
            code=_lambda.Code.from_asset(str(Path(__file__).parent)),
            role=role,
            timeout=Duration.seconds(300),
        )

        CfnOutput(self, "HandlerArn", value=fn.function_arn)
        self.handler_arn = fn.function_arn
"""
