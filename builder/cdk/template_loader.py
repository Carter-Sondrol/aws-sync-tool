from __future__ import annotations
from pathlib import Path

TEMPLATE_DIR = Path(__file__).parent / "templates"

def load_template(name: str) -> str:
    """Load a text template from the templates/ folder."""
    path = TEMPLATE_DIR / name
    if not path.exists():
        raise FileNotFoundError(f"Missing CDK template: {path}")
    return path.read_text()


def render_template(template: str, **context) -> str:
    """Very simple mustache-style renderer without external deps."""
    for key, val in context.items():
        template = template.replace(f"{{{{ {key} }}}}", str(val or ""))
    return template
