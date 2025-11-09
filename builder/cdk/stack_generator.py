from __future__ import annotations
import json
from pathlib import Path

from utils.json_encoder import AWSJSONEncoder
from .template_loader import load_template, render_template

def emit_auto_stack(out_dir: Path, graph_payload: dict):
    """Emit the AutoStack definition file based on a serialized graph."""
    stacks_dir = out_dir / "stacks"
    stacks_dir.mkdir(parents=True, exist_ok=True)
    (stacks_dir / "__init__.py").write_text("from .auto_stack import AutoStack\n")

    rendered = render_template(
        load_template("auto_stack.py.tpl"),
        graph_payload_json=json.dumps(graph_payload, indent=2, cls=AWSJSONEncoder)
    )
    (stacks_dir / "auto_stack.py").write_text(rendered)
