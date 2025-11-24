import json
import logging
from pathlib import Path

from builder.cdk.cdk_builder import generate_cdk_app, sanitize_identifier
from graph.dependency_graph import DependencyGraph
from planner.deployment_plan import DeploymentPlan

logger = logging.getLogger(__name__)


def export_cdk(
    graph: DependencyGraph,
    output_dir: str = "output/cdk",
    stack_name: str = "GraphStack",
    handler_src: str | None = None,
    plan: DeploymentPlan | None = None,
):
    """Generate a deployable CDK app that recreates the resource graph."""
    out_dir = Path(output_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    stack_sources = generate_cdk_app(graph, stack_name, plan=plan)

    # Stack files
    for class_name, info in stack_sources.items():
        stack_path = out_dir / info["file_name"]
        stack_path.write_text(info["source"])
        logger.info("✅ Wrote %s", stack_path)

    # Handler Lambda code goes in dedicated folder
    lambda_code_dir = out_dir / "lambda_code"
    lambda_code_dir.mkdir(exist_ok=True)

    if handler_src is None:
        handler_src = Path(__file__).with_name("graph_custom_handler.py")

    handler_dest = lambda_code_dir / "lambda_custom_handler.py"
    handler_dest.write_text(Path(handler_src).read_text())

    # Copy handler stack safely (avoid recursive copy)
    src_handler_stack = (
        Path(__file__).resolve().parent / "graph_custom_handler_stack.py"
    )
    dest_handler_stack = out_dir / "graph_custom_handler_stack.py"
    if src_handler_stack.resolve().parent != out_dir.resolve():
        dest_handler_stack.write_text(src_handler_stack.read_text())
    else:
        logger.warning(
            "Skipping recursive copy of graph_custom_handler_stack.py inside output dir"
        )

    # app.py
    imports = [
        "#!/usr/bin/env python3",
        "import aws_cdk as cdk",
        "from graph_custom_handler_stack import GraphCustomHandlerStack",
    ]
    stack_vars: dict[str, str] = {}
    for class_name, info in stack_sources.items():
        module_name = Path(info["file_name"]).stem
        imports.append(f"from {module_name} import {class_name}")
        stack_vars[class_name] = f"stack_{sanitize_identifier(class_name)}"
    imports.append("")

    body_lines = ["app = cdk.App()"]
    body_lines.append('handler_stack = GraphCustomHandlerStack(app, "GraphCustomHandlerStack")')
    for class_name, var_name in stack_vars.items():
        body_lines.append(
            f'{var_name} = {class_name}(app, "{class_name}", env=cdk.Environment(region="us-west-2"))'
        )
        body_lines.append(
            f'{var_name}.node.default_child.add_override(\n'
            '    "Parameters.CustomHandlerArn.Default", handler_stack.handler_arn\n)'
        )
    body_lines.append("app.synth()")

    app_py = out_dir / "app.py"
    app_py.write_text("\n".join(imports + body_lines) + "\n")

    # Support files
    (out_dir / "requirements.txt").write_text("aws-cdk-lib\nconstructs>=10.0.0\n")
    (out_dir / "cdk.json").write_text(
        json.dumps(
            {
                "app": "python3 app.py",
                "requireApproval": "never",
                "versionReporting": False,
            },
            indent=2,
        )
    )
    (out_dir / "README.md").write_text(
        f"# Generated CDK App: {stack_name}\n\nRun:\n```\ncd {output_dir}\ncdk synth\ncdk deploy\n```"
    )

    return out_dir
