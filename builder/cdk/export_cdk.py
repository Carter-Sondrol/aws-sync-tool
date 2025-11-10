import json
import logging
import textwrap
from pathlib import Path
from builder.cdk.cdk_builder import generate_cdk_code
from graph.dependency_graph import DependencyGraph

logger = logging.getLogger(__name__)

def export_cdk(graph: DependencyGraph, output_dir="output/cdk", stack_name="GraphStack", handler_src=None):
    """Generate a deployable CDK app that recreates the resource graph."""
    out_dir = Path(output_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    # Stack file
    graph_code = generate_cdk_code(graph, stack_name)
    graph_file = out_dir / f"{stack_name.lower()}.py"
    graph_file.write_text(graph_code)
    logger.info("✅ Wrote %s", graph_file)

    # Handler Lambda code goes in dedicated folder
    lambda_code_dir = out_dir / "lambda_code"
    lambda_code_dir.mkdir(exist_ok=True)

    if handler_src is None:
        handler_src = Path(__file__).with_name("graph_custom_handler.py")

    handler_dest = lambda_code_dir / "lambda_custom_handler.py"
    handler_dest.write_text(Path(handler_src).read_text())

    # Copy handler stack safely (avoid recursive copy)
    src_handler_stack = Path(__file__).resolve().parent / "graph_custom_handler_stack.py"
    dest_handler_stack = out_dir / "graph_custom_handler_stack.py"
    if src_handler_stack.resolve().parent != out_dir.resolve():
        dest_handler_stack.write_text(src_handler_stack.read_text())
    else:
        logger.warning("Skipping recursive copy of graph_custom_handler_stack.py inside output dir")

    # app.py
    app_py = out_dir / "app.py"
    app_py.write_text(textwrap.dedent(f"""\
        #!/usr/bin/env python3
        import aws_cdk as cdk
        from graph_custom_handler_stack import GraphCustomHandlerStack
        from {stack_name.lower()} import {stack_name}

        app = cdk.App()
        handler_stack = GraphCustomHandlerStack(app, "GraphCustomHandlerStack")
        graph_stack = {stack_name}(app, "{stack_name}", env=cdk.Environment(region="us-west-2"))

        # Inject handler ARN into parameter
        graph_stack.node.default_child.add_override(
            "Parameters.CustomHandlerArn.Default", handler_stack.handler_arn
        )

        app.synth()
    """))

    # Support files
    (out_dir / "requirements.txt").write_text("aws-cdk-lib\nconstructs>=10.0.0\n")
    (out_dir / "cdk.json").write_text(json.dumps({
        "app": "python3 app.py",
        "requireApproval": "never",
        "versionReporting": False,
    }, indent=2))
    (out_dir / "README.md").write_text(f"# Generated CDK App: {stack_name}\n\nRun:\n```\ncd {output_dir}\ncdk synth\ncdk deploy\n```")

    return out_dir
