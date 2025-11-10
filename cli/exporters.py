from __future__ import annotations
import json
import logging
import shutil
import textwrap
from pathlib import Path
from typing import Optional

from builder.cloudformation_builder import CloudFormationTemplateBuilder
from utils.json_encoder import AWSJSONEncoder
from builder.cdk.cdk_builder import generate_cdk_code

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
    output_dir: str = "output/cdk_app",
    stack_name: str = "GraphStack",
    app_name: Optional[str] = None,
) -> Path:
    """Generate a fully self-contained Python CDK app for the given resource graph."""
    out_path = Path(output_dir)
    lambda_dir = out_path / "lambda"
    out_path.mkdir(parents=True, exist_ok=True)
    lambda_dir.mkdir(parents=True, exist_ok=True)

    logger.info("[cdk] Generating CDK app for stack '%s' in %s", stack_name, out_path)

    # 1️⃣ Generate Python CDK source from the graph
    cdk_code = generate_cdk_code(graph, stack_name)
    stack_file = out_path / f"{stack_name.lower()}.py"
    stack_file.write_text(cdk_code, encoding="utf-8")
    logger.debug("[cdk] Generated %s", stack_file)

    # 2️⃣ Copy support files
    _copy_support_files(out_path, lambda_dir)
    _write_graph_json(graph, out_path)
    _write_app_py(out_path, stack_name, app_name or "GraphApp")
    _write_requirements(out_path)
    _write_cdk_json(out_path)
    _write_readme(out_path, stack_name)

    logger.info("[cdk] CDK app ready → %s", out_path)
    return out_path


def _copy_support_files(out_path: Path, lambda_dir: Path) -> None:
    builder_src = Path(__file__).parent / "cdk_builder.py"
    if builder_src.exists():
        shutil.copy2(builder_src, out_path / "cdk_builder.py")
        logger.debug("[cdk] Included cdk_builder.py")

    handler_src = Path(__file__).parent / "lambda" / "graph_custom_handler.py"
    if handler_src.exists():
        shutil.copy2(handler_src, lambda_dir / handler_src.name)
        logger.debug("[cdk] Included Lambda handler: %s", handler_src.name)


def _write_graph_json(graph, out_path: Path) -> None:
    graph_json = out_path / "graph.json"
    data = {"nodes": {lid: node.__dict__ for lid, node in graph._nodes.items()}}
    graph_json.write_text(json.dumps(data, indent=2, cls=AWSJSONEncoder))
    logger.debug("[cdk] Wrote graph.json (%d nodes)", len(graph._nodes))


def _write_app_py(out_path: Path, stack_name: str, app_name: str) -> None:
    app_py = textwrap.dedent(f"""
        #!/usr/bin/env python3
        from aws_cdk import App
        import importlib
        import json

        def load_graph(path="graph.json"):
            with open(path, "r", encoding="utf-8") as f:
                return json.load(f)

        def main():
            app = App()
            mod = importlib.import_module("{stack_name.lower()}")
            stack_cls = getattr(mod, "{stack_name}")
            stack_cls(app, "{stack_name}")
            app.synth()
            print("✅ Synth complete → cdk.out/{stack_name}.template.json")

        if __name__ == "__main__":
            main()
    """).strip()
    (out_path / "app.py").write_text(app_py, encoding="utf-8")
    logger.debug("[cdk] Generated app.py")


def _write_requirements(out_path: Path) -> None:
    (out_path / "requirements.txt").write_text(
        "aws-cdk-lib\nconstructs>=10.0.0\n",
        encoding="utf-8",
    )
    logger.debug("[cdk] Wrote requirements.txt")


def _write_cdk_json(out_path: Path) -> None:
    config = {
        "app": "python3 app.py",
        "requireApproval": "never",
        "versionReporting": False,
    }
    (out_path / "cdk.json").write_text(json.dumps(config, indent=2), encoding="utf-8")
    logger.debug("[cdk] Wrote cdk.json")


def _write_readme(out_path: Path, stack_name: str) -> None:
    readme = textwrap.dedent(f"""
        # AWS CDK App: {stack_name}

        This directory was generated automatically from a dependency graph.

        ## Deployment

        ```bash
        cd {out_path}
        python3 -m venv .venv && source .venv/bin/activate
        pip install -r requirements.txt
        cdk synth
        cdk deploy
        ```

        - Graph data: `graph.json`
        - Lambda handler: `lambda/graph_custom_handler.py`
        - Output templates: `cdk.out/`
    """).strip()

    (out_path / "README.md").write_text(readme, encoding="utf-8")
    logger.debug("[cdk] Wrote README.md")
