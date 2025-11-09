from __future__ import annotations
from pathlib import Path
from .template_loader import load_template, render_template

def write_app_files(
    out_dir: Path,
    stack_name: str,
    account: str | None,
    region: str | None,
    app_name: str = "FirstFire CDK App"
):
    """Writes top-level CDK app files from templates."""
    out_dir.mkdir(parents=True, exist_ok=True)

    # static templates
    (out_dir / "cdk.json").write_text(load_template("cdk.json.tpl"))
    (out_dir / "requirements.txt").write_text(load_template("requirements.txt.tpl"))

    # parameterized templates
    (out_dir / "README.md").write_text(
        render_template(load_template("readme.md.tpl"), app_name=app_name)
    )
    (out_dir / "app.py").write_text(
        render_template(
            load_template("app.py.tpl"),
            stack_name=stack_name,
            account=account or "",
            region=region or "",
        )
    )
