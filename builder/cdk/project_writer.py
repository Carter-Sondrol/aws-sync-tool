from __future__ import annotations
from pathlib import Path
from typing import Optional
from .graph_serializer import serialize_graph
from .stack_generator import emit_auto_stack
from .app_generator import write_app_files

def generate_cdk_project(
    *,
    graph,
    out_dir: str = "output/cdk_app",
    stack_name: str = "FirstFireAutoStack",
    account: Optional[str] = None,
    region: Optional[str] = None,
):
    """Main entrypoint for CDK project generation."""
    out = Path(out_dir)
    graph_payload = serialize_graph(graph)
    write_app_files(out, stack_name, account, region)
    emit_auto_stack(out, graph_payload)
