import re
import json
import logging
from textwrap import indent
from importlib import import_module

from graph.dependency_graph import DependencyGraph

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------
# Supported CDK service modules
# ---------------------------------------------------------------------
SERVICE_MAP = {
    "connect": "aws_connect",
    "lex": "aws_lex",  # ✅ Lex v2 is unified under aws_lex
    "logs": "aws_logs",
    "iam": "aws_iam",
    "lambda": "aws_lambda",
    "s3": "aws_s3",
    "dynamodb": "aws_dynamodb",
}

# ---------------------------------------------------------------------
# CloudFormation → CDK class overrides
# ---------------------------------------------------------------------
CFN_CLASS_OVERRIDES = {
    "AWS::IAM::ServiceLinkedRole": "aws_iam.CfnServiceLinkedRole",
    "AWS::IAM::Role": "aws_iam.CfnRole",
    "AWS::Logs::LogGroup": "aws_logs.CfnLogGroup",
    "AWS::S3::Bucket": "aws_s3.CfnBucket",
    "AWS::Lambda::Function": "aws_lambda.CfnFunction",
    "AWS::DynamoDB::Table": "aws_dynamodb.CfnTable",
    "AWS::Connect::Queue": "aws_connect.CfnQueue",
    "AWS::Connect::HoursOfOperation": "aws_connect.CfnHoursOfOperation",
    "AWS::Connect::ContactFlow": "aws_connect.CfnContactFlow",
    "AWS::Connect::Prompt": "aws_connect.CfnPrompt",
    "AWS::Lex::Bot": "aws_lex.CfnBot",
    "AWS::Lex::BotAlias": "aws_lex.CfnBotAlias",
    "AWS::Lex::BotVersion": "aws_lex.CfnBotVersion",
    "AWS::Lex::ResourcePolicy": "aws_lex.CfnResourcePolicy",
}

# ---------------------------------------------------------------------
# Required properties for validation
# ---------------------------------------------------------------------
REQUIRED_PROPS = {
    "AWS::Connect::ContactFlow": ["name", "instance_arn", "type", "content"],
    "AWS::Connect::Queue": ["name", "instance_arn"],
    "AWS::Connect::Prompt": ["name", "instance_arn"],
    "AWS::Connect::Instance": ["attributes", "identity_management_type"],
    "AWS::Lex::Bot": ["name", "role_arn"],
    "AWS::Lex::BotAlias": ["bot_alias_name", "bot_id"],
}

SUPPORTED_CFN_TYPES = set(CFN_CLASS_OVERRIDES.keys())
LEX_AUTHORING_TYPES = {
    "AWS::Lex::BotLocale",
    "AWS::Lex::Intent",
    "AWS::Lex::SlotType",
    "AWS::Lex::Slot",
}


# ---------------------------------------------------------------------
# Utility helpers
# ---------------------------------------------------------------------
def sanitize_identifier(name: str) -> str:
    name = re.sub(r"[^A-Za-z0-9_]", "_", name)
    if not re.match(r"^[A-Za-z_]", name):
        name = f"r_{name}"
    return name[:100]


def camel_to_snake(name: str) -> str:
    s1 = re.sub("(.)([A-Z][a-z]+)", r"\1_\2", name)
    return re.sub("([a-z0-9])([A-Z])", r"\1_\2", s1).lower()


def cfn_to_cdk_class(cfn_type: str) -> str:
    if not cfn_type:
        return "aws_cdk.CfnResource"
    if cfn_type in CFN_CLASS_OVERRIDES:
        return CFN_CLASS_OVERRIDES[cfn_type]
    parts = cfn_type.split("::")
    if len(parts) == 3:
        _, svc, res = parts
    else:
        svc, res = parts[-2], parts[-1] if len(parts) >= 2 else "Resource"
    module = SERVICE_MAP.get(svc.lower(), f"aws_{svc.lower()}")
    return f"{module}.Cfn{res}"


# ---------------------------------------------------------------------
# Property normalization for nested CDK structures
# ---------------------------------------------------------------------
def _build_cfn_property_str(module_name: str, class_name: str, data: dict) -> str:
    """Recursively convert nested dicts into proper Cfn*Property(...) syntax."""
    module = import_module(f"aws_cdk.{module_name}")
    cfn_cls = getattr(module, class_name, None)
    if not cfn_cls or not isinstance(data, dict):
        return repr(data)

    # Special case: Connect HoursOfOperation
    if class_name == "CfnHoursOfOperation" and "config" in data:
        cfgs = []
        for cfg in data["config"]:
            day = cfg.get("Day")
            st = cfg.get("StartTime", {})
            et = cfg.get("EndTime", {})
            cfgs.append(
                f"aws_connect.CfnHoursOfOperation.HoursOfOperationConfigProperty("
                f"day={json.dumps(day)}, "
                f"start_time=aws_connect.CfnHoursOfOperation.HoursOfOperationTimeSliceProperty("
                f"hours={st.get('Hours', 0)}, minutes={st.get('Minutes', 0)}), "
                f"end_time=aws_connect.CfnHoursOfOperation.HoursOfOperationTimeSliceProperty("
                f"hours={et.get('Hours', 0)}, minutes={et.get('Minutes', 0)}))"
            )
        data = {**data, "config": f"[{', '.join(cfgs)}]"}
    return repr(data)

def generate_cdk_code(graph: DependencyGraph, stack_name="GraphStack") -> str:
    import re
    from textwrap import indent

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------
    def _inject_placeholder_edges(graph: DependencyGraph):
        """Infer dependency edges from __REF_*__ placeholders anywhere in node properties."""
        import re
        injected = 0

        def _extract_refs(obj):
            """Recursively collect all __REF_*__ placeholders from nested dict/list/str structures."""
            refs = set()
            if isinstance(obj, str):
                for match in re.findall(r"__REF_([^_]+)__", obj):
                    refs.add(match.strip())
            elif isinstance(obj, dict):
                for v in obj.values():
                    refs.update(_extract_refs(v))
            elif isinstance(obj, list):
                for v in obj:
                    refs.update(_extract_refs(v))
            return refs

        for lid, node in list(graph._nodes.items()):
            refs = _extract_refs(node.properties)
            for ref_match in refs:
                ref_match = ref_match.strip()
                for candidate in graph._nodes.keys():
                    if candidate == ref_match or sanitize_identifier(candidate) == sanitize_identifier(ref_match):
                        if not graph._g.has_edge(lid, candidate):
                            graph.add_edge(lid, candidate, inferred=True)
                            injected += 1
                        break

        logger.info(f"[CDK] Injected {injected} inferred edges from __REF__ placeholders")

    def _priority(node):
        # Fallback priority ordering if topo sort fails
        if "Parameter" in node.metadata:
            return 0
        if node.reference_only:
            return 1
        if node.service == "iam":
            return 2
        if node.service == "s3":
            return 3
        if node.service == "lambda":
            return 4
        return 10

    # ------------------------------------------------------------------
    # Ensure correct dependency order
    # ------------------------------------------------------------------
    _inject_placeholder_edges(graph)
    try:
        ordered_lids = graph.topological_sort()
        logger.info(f"[CDK] Using topological sort for {len(ordered_lids)} nodes")
    except Exception as e:
        logger.warning(f"[CDK] Topological sort failed ({e}); using fallback order")
        ordered_lids = sorted(graph._nodes.keys(), key=lambda lid: _priority(graph._nodes[lid]))

    # ------------------------------------------------------------------
    # Imports and Stack header
    # ------------------------------------------------------------------
    used_modules = sorted(set(SERVICE_MAP.values()))
    import_line = f"from aws_cdk import (Stack, {', '.join(used_modules)}, custom_resources)"
    lines = [
        import_line,
        "from constructs import Construct",
        "from aws_cdk import CfnParameter",
        "import json",
        "",
        f"class {stack_name}(Stack):",
        "    def __init__(self, scope: Construct, id: str, **kwargs):",
        "        super().__init__(scope, id, **kwargs)",
        "",
        '        self.custom_handler_arn = CfnParameter(self, "CustomHandlerArn", type="String")',
        "",
    ]

    # ------------------------------------------------------------------
    # Parameter definitions
    # ------------------------------------------------------------------
    for lid in ordered_lids:
        node = graph._nodes[lid]
        if node.metadata.get("Parameter") and not node.reference_only:
            var_name = sanitize_identifier(lid)
            lines.append(f'        self.{var_name} = CfnParameter(self, "{lid}", type="String")')
    lines.append("")

    # ------------------------------------------------------------------
    # Resource generation
    # ------------------------------------------------------------------
    for lid in ordered_lids:
        node = graph._nodes[lid]
        if node.reference_only or node.metadata.get("Parameter"):
            continue

        cfn_type = node.cfn_type or "AWS::Unknown::Resource"
        cls = cfn_to_cdk_class(cfn_type)
        var_name = sanitize_identifier(lid)
        props = node.properties or {}

        normalized_props = {camel_to_snake(k): v for k, v in props.items()}
        for req in REQUIRED_PROPS.get(cfn_type, []):
            normalized_props.setdefault(req, f"__AUTO_{req}__")

        unsupported = (
            cfn_type not in SUPPORTED_CFN_TYPES
            or cfn_type in LEX_AUTHORING_TYPES
            or "Unknown" in cls
        )

        # Unsupported → custom resource bridge
        if unsupported:
            prop_json = json.dumps(normalized_props, indent=2)
            lines.append(f"""\
        self.{var_name} = aws_cdk.CfnCustomResource(
            self, "{lid}",
            service_token=self.custom_handler_arn.value_as_string,
        )
        for k, v in json.loads(r'''{prop_json}''').items():
            self.{var_name}.add_property_override(k, v)
        self.{var_name}.add_property_override("Service", "{node.service}")
        self.{var_name}.add_property_override("OriginalType", "{cfn_type}")
""")
            continue

        # ------------------------------------------------------------------
        # Supported → CDK native resource
        # ------------------------------------------------------------------
        prop_lines = []
        for key, val in normalized_props.items():
            vstr = None
            # --- Special handling: Lex alias locale settings ---
            if key in ("bot_alias_locale_settings", "botalias_localesettings"):
                # Convert dict {"en_US": {...}, "es_US": {...}} → list of objects
                if isinstance(val, dict):
                    converted = []
                    for locale_id, conf in val.items():
                        converted.append({
                            "locale_id": locale_id,
                            "bot_alias_locale_setting": conf,
                        })
                    vstr = (
                        "["
                        + ", ".join(
                            f"aws_lex.CfnBotAlias.BotAliasLocaleSettingsItemProperty(locale_id={json.dumps(i['locale_id'])}, "
                            f"bot_alias_locale_setting={json.dumps(i['bot_alias_locale_setting'])})"
                            for i in converted
                        )
                        + "]"
                    )
                    prop_lines.append(f"{key}={vstr}")
                    continue


            # Handle __REF_*__ references
            if isinstance(val, str) and val.startswith("__REF_") and val.endswith("__"):
                ref_target = val.strip("_").replace("REF_", "")
                ref_target_sanitized = sanitize_identifier(ref_target)
                target_node = graph._nodes.get(ref_target)

                # Try fallback match by sanitized name
                if not target_node:
                    for k in graph._nodes.keys():
                        if sanitize_identifier(k) == ref_target_sanitized:
                            target_node = graph._nodes[k]
                            break

                if target_node and target_node.metadata.get("Parameter"):
                    vstr = f"self.{ref_target_sanitized}.value_as_string"
                elif target_node:
                    vstr = f"self.{ref_target_sanitized}.ref"
                else:
                    logger.warning(f"[CDK] Unresolved placeholder: {ref_target}")
                    vstr = f'"__UNRESOLVED_{ref_target}__"'

            elif isinstance(val, dict) and key == "config" and "connect" in cls:
                vstr = _build_cfn_property_str("aws_connect", "CfnHoursOfOperation", {"config": val})
            elif isinstance(val, dict) and key == "tags":
                vstr = repr([{"key": k, "value": v} for k, v in val.items()])
            elif isinstance(val, dict):
                vstr = json.dumps(val)
            else:
                vstr = json.dumps(val) if isinstance(val, str) else repr(val)
            vstr = vstr.replace("true", "True").replace("false", "False").replace("null", "None")
            prop_lines.append(f"{key}={vstr}")

        joined_props = ",\n".join(indent(p, " " * 12) for p in prop_lines)
        lines.append(f"""\
        self.{var_name} = {cls}(
            self, "{lid}",
{joined_props}
        )
""")

    return "\n".join(lines)
