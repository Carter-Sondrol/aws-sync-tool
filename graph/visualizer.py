from __future__ import annotations

import colorsys
import json
import webbrowser
from pathlib import Path

from graph.dependency_graph import DependencyGraph
from utils.json_encoder import AWSJSONEncoder

# ---------------------------------------------------------------------
# Base colors for top-level services
# ---------------------------------------------------------------------
BASE_COLORS = {
    "lambda": "#4e9cff",
    "s3": "#2ecc71",
    "dynamodb": "#f39c12",
    "connect": "#9b59b6",
    "iam": "#e74c3c",
    "sns": "#e67e22",
    "sqs": "#f1c40f",
    "cloudformation": "#16a085",
    "lex": "#3498db",
    "unresolved": "#555555",
}


def generate_distinct_color(index: int, total: int) -> str:
    hue = (index / total) % 1.0
    lightness = 0.55
    saturation = 0.85
    r, g, b = colorsys.hls_to_rgb(hue, lightness, saturation)
    return f"#{int(r*255):02x}{int(g*255):02x}{int(b*255):02x}"


# ---------------------------------------------------------------------
# Subtype normalization
# ---------------------------------------------------------------------
SUBTYPE_NORMALIZE = {
    "Bot": "bot",
    "BotAlias": "botalias",
    "BotLocale": "botlocale",
    "Intent": "intent",
    "Slot": "slot",
    "SlotType": "slottype",
    "ContactFlow": "contactflow",
    "ContactFlowModule": "contactflowmodule",
    "Prompt": "prompt",
    "Queue": "queue",
    "Instance": "instance",
    "RoutingProfile": "routingprofile",
    "HoursOfOperation": "hoursofoperation",
    "Function": "function",
    "Bucket": "bucket",
    "Table": "table",
    "Role": "role",
    "ManagedPolicy": "managedpolicy",
    "Policy": "policy",
    "Topic": "topic",
}


def normalize_subtype(service: str, cfn_type: str | None) -> str:
    if not cfn_type:
        return ""
    tail = cfn_type.split("::")[-1]
    sub = SUBTYPE_NORMALIZE.get(tail, tail).lower()
    sub = sub.replace(":", "-").replace("_", "-").replace(" ", "-")
    return sub


# ---------------------------------------------------------------------
# Visualization
# ---------------------------------------------------------------------
def render_interactive_graph(
    graph: DependencyGraph,
    out_path: Path | str | None = None,
    open_browser: bool = True,
) -> Path:
    """Render interactive ForceGraph visualization with awareness of frozen/portable mode."""
    if out_path is None:
        out_path = Path("output/graph.html")
    elif isinstance(out_path, str):
        out_path = Path(out_path)
    out_path.parent.mkdir(parents=True, exist_ok=True)

    color_keys: list[str] = []
    nodes_json = []

    is_portable = graph.metadata.get("Frozen", False)

    for lid, n in graph._nodes.items():
        service = getattr(n, "service", "unknown").lower()
        cfn_type = getattr(n, "cfn_type", "") or ""
        subtype = normalize_subtype(service, cfn_type)

        if service == "connect" and "::" in cfn_type:
            subtype = cfn_type.split("::")[-1].lower()

        is_error = bool(n.metadata.get("Unresolved") or n.metadata.get("Error"))
        if service in ("unresolved", "unknown") or is_error:
            service = "unresolved"
            subtype = ""

        key = f"{service}:{subtype}" if subtype else service
        if key not in color_keys:
            color_keys.append(key)

        nodes_json.append(
            {
                "id": lid,
                "service": service,
                "subtype": subtype,
                "cfn_type": cfn_type,
                "properties": n.properties or {},
                "classification": getattr(n, "classification", None).name if getattr(n, "classification", None) else "",
                "reference_only": bool(getattr(n, "reference_only", False)),
                "metadata": n.metadata or {},
                "color_key": key,
                "is_error": is_error,
                "error_msg": n.metadata.get("Error", ""),
                "is_seed": bool(n.metadata.get("Seed")),
                "is_portable": is_portable,
            }
        )

    # assign colors
    service_colors = dict(BASE_COLORS)
    missing = [k for k in color_keys if k not in service_colors]
    for i, key in enumerate(missing):
        color = generate_distinct_color(i, max(8, len(missing)))
        service_colors[key] = color

    tmpl_dir = Path(__file__).parent / "templates"
    html_template = (tmpl_dir / "graph_template.html").read_text(encoding="utf-8")
    js_code = (tmpl_dir / "graph.js").read_text(encoding="utf-8")
    css_code = (tmpl_dir / "graph.css").read_text(encoding="utf-8")

    graph_data = {
        "nodes": nodes_json,
        "links": [
            {
                "source": s,
                "target": t,
                "inferred": d.get("inferred", False),
                "label": d.get("label"),
            }
            for s, t, d in graph._g.edges(data=True)
        ],
        "metadata": graph.metadata,
    }

    for e in graph.metadata.get("InferredEdges", []):
        graph_data["links"].append(
            {
                "source": e["from"],
                "target": e["to"],
                "inferred": True,
                "label": e.get("label"),
            }
        )

    html = (
        html_template.replace("__STYLE__", css_code)
        .replace("__SCRIPT__", js_code)
        .replace("__GRAPH_DATA__", json.dumps(graph_data, cls=AWSJSONEncoder))
        .replace("__COLOR_MAP__", json.dumps(service_colors, indent=2))
    )

    out_path.write_text(html, encoding="utf-8")
    print(
        f"[INFO] Visualization written to {out_path.resolve()} "
        f"({len(nodes_json)} nodes, portable={is_portable})"
    )

    if open_browser:
        webbrowser.open(out_path.resolve().as_uri())

    return out_path
