from __future__ import annotations

import json
import logging
import re

from graph.dependency_graph import DependencyGraph

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------
# CDK service module mapping
# ---------------------------------------------------------------------
SERVICE_MAP = {
    "connect": "aws_connect",
    "lex": "aws_lex",
    "logs": "aws_logs",
    "iam": "aws_iam",
    "lambda": "aws_lambda",
    "s3": "aws_s3",
    "dynamodb": "aws_dynamodb",
    "sns": "aws_sns",
}

# ---------------------------------------------------------------------
# CloudFormation → CDK L1 overrides
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

LEX_AUTHORING_TYPES = {
    "AWS::Lex::BotLocale",
    "AWS::Lex::Intent",
    "AWS::Lex::SlotType",
    "AWS::Lex::Slot",
}


# ---------------------------------------------------------------------
# Helper functions
# ---------------------------------------------------------------------
def sanitize_identifier(name: str) -> str:
    name = re.sub(r"[^A-Za-z0-9_]", "_", name)
    if not re.match(r"^[A-Za-z_]", name):
        name = f"r_{name}"
    return name[:80]


def camel_to_snake(name: str) -> str:
    s1 = re.sub("(.)([A-Z][a-z]+)", r"\1_\2", name)
    return re.sub("([a-z0-9])([A-Z])", r"\1_\2", s1).lower()


def cfn_to_cdk_class(cfn_type: str) -> str:
    if not cfn_type:
        return "aws_cdk.CfnResource"
    if cfn_type in CFN_CLASS_OVERRIDES:
        return CFN_CLASS_OVERRIDES[cfn_type]
    try:
        _, svc, res = cfn_type.split("::")
    except ValueError:
        svc = "unknown"
        res = "Resource"
    module = SERVICE_MAP.get(svc.lower(), f"aws_{svc.lower()}")
    return f"{module}.Cfn{res}"


# ---------------------------------------------------------------------
# CDK generator
# ---------------------------------------------------------------------
def generate_cdk_code(graph: DependencyGraph, stack_name: str = "GraphStack") -> str:
    """
    Generate a Python CDK stack that recreates the given DependencyGraph.

    Assumes graph is already frozen/portable:
      - ARN strings have been replaced with __REF_<LogicalId>__ where possible.
      - Lambda env params are recorded in graph.metadata["PendingParams"].
    """

    # --------------------------------------------------------
    # 1. Determine resource build order
    # --------------------------------------------------------
    try:
        ordered_lids = graph.topological_sort()
        logger.info("[CDK] Using topological sort for %d nodes", len(ordered_lids))
    except Exception as e:
        logger.warning("[CDK] Topological sort failed (%s), using fallback order", e)
        ordered_lids = sorted(graph._nodes.keys())

    # --------------------------------------------------------
    # 2. Build header & imports
    # --------------------------------------------------------
    used_modules = sorted(set(SERVICE_MAP.values()))
    import_line = (
        f"from aws_cdk import (Stack, {', '.join(used_modules)}, "
        "CfnParameter, CfnCustomResource)"
    )

    lines: list[str] = [
        import_line,
        "from constructs import Construct",
        "import aws_cdk",
        "import json",
        "",
        f"class {stack_name}(Stack):",
        "    def __init__(self, scope: Construct, id: str, **kwargs):",
        "        super().__init__(scope, id, **kwargs)",
        "",
        '        # Custom handler for unsupported resources',
        '        self.custom_handler_arn = CfnParameter(self, "CustomHandlerArn", type="String")',
        "",
    ]

    # --------------------------------------------------------
    # 3. Emit parameters for __PARAM_* markers (Lambda env etc.)
    # --------------------------------------------------------
    pending_params = graph.metadata.get("PendingParams", {})
    for pname, default_val in pending_params.items():
        safe_name = sanitize_identifier(pname)
        default_str = json.dumps(default_val)
        lines.append(
            f'        self.{safe_name} = CfnParameter('
            f'self, "{pname}", type="String", default={default_str})'
        )
    if pending_params:
        lines.append("")

    # --------------------------------------------------------
    # 4. Emit resources
    # --------------------------------------------------------
    for lid in ordered_lids:
        node = graph.get_node(lid)
        if not node or node.reference_only:
            continue

        cfn_type = node.cfn_type or "AWS::Unknown::Resource"
        cls = cfn_to_cdk_class(cfn_type)
        var_name = sanitize_identifier(lid)
        raw_props = node.properties or {}

        # Normalize keys to snake_case for CDK L1
        props_snake: dict[str, object] = {
            camel_to_snake(k): v for k, v in raw_props.items()
        }

        # ----------------- Per-type fixups & injections -----------------

        # Lambda Function requires code
        if cfn_type == "AWS::Lambda::Function":
            if "code" not in props_snake:
                props_snake["code"] = {
                    "zip_file": (
                        "def handler(event, context):\n"
                        "    return {'statusCode': 200, 'body': 'OK'}"
                    )
                }

        # IAM Role inline_policies → policies list
        if cfn_type == "AWS::IAM::Role":
            inline = props_snake.pop("inline_policies", None)
            if isinstance(inline, dict) and inline:
                pols = []
                for pname, pdoc in inline.items():
                    pols.append(
                        {
                            "policy_name": pname,
                            "policy_document": pdoc,
                        }
                    )
                props_snake["policies"] = pols

        # Lex BotAlias requires bot_id and usually references a Bot
        if cfn_type == "AWS::Lex::BotAlias":
            if "bot_id" not in props_snake:
                # Look for a dependent Lex::Bot node
                bot_lid = None
                for _, tgt in graph._g.edges(lid):
                    tgt_node = graph.get_node(tgt)
                    if tgt_node and tgt_node.cfn_type == "AWS::Lex::Bot":
                        bot_lid = tgt
                        break
                if bot_lid:
                    # Special sentinel so we can emit attr_bot_id
                    props_snake["bot_id"] = {"__BOT_ID_FROM__": bot_lid}

        # ----------------- Determine if we must use custom resource -----
        unsupported = (
            cfn_type not in CFN_CLASS_OVERRIDES
            or cfn_type in LEX_AUTHORING_TYPES
            or cls.startswith("aws_unknown")
        )

        if unsupported:
            prop_literal = repr(props_snake)
            lines.append(f"        self.{var_name} = CfnCustomResource(")
            lines.append(f'            self, "{lid}",')
            lines.append(
                "            service_token=self.custom_handler_arn.value_as_string,"
            )
            lines.append("        )")
            lines.append(f"        for k, v in {prop_literal}.items():")
            lines.append(f"            self.{var_name}.add_property_override(k, v)")
            lines.append(
                f'        self.{var_name}.add_property_override("Service", "{node.service}")'
            )
            lines.append(
                f'        self.{var_name}.add_property_override("OriginalType", "{cfn_type}")'
            )
            lines.append("")
            continue

        # ----------------- Native CDK L1 resource -----------------------
        prop_lines: list[str] = []

        for key, val in props_snake.items():
            # Drop any explicit None values to avoid type errors
            if val is None:
                continue

            # Tag dict → list of {key, value}
            if key == "tags" and isinstance(val, dict):
                if not val:
                    # empty tags dict → omit property entirely
                    continue
                tag_list = [{"key": k, "value": v} for k, v in val.items()]
                prop_lines.append(f"{key}={repr(tag_list)}")
                continue

            # Special bot_id sentinel for Lex::BotAlias
            if isinstance(val, dict) and "__BOT_ID_FROM__" in val:
                bot_lid = val["__BOT_ID_FROM__"]
                bot_var = sanitize_identifier(bot_lid)
                vstr = f"self.{bot_var}.attr_bot_id"
                prop_lines.append(f"{key}={vstr}")
                continue

            # __REF_<LogicalId>__ placeholder → .ref
            if isinstance(val, str) and val.startswith("__REF_") and val.endswith("__"):
                ref_target = val.strip("_").replace("REF_", "")
                ref_safe = sanitize_identifier(ref_target)
                target_node = graph.get_node(ref_target)

                if target_node:
                    vstr = f"self.{ref_safe}.ref"
                else:
                    logger.warning("[CDK] Unresolved __REF__ placeholder %s", ref_target)
                    vstr = json.dumps(val)
                prop_lines.append(f"{key}={vstr}")
                continue

            # __PARAM_<Name>__ placeholder → parameter
            if isinstance(val, str) and val.startswith("__PARAM_"):
                pname = val.replace("__PARAM_", "").replace("__", "")
                p_safe = sanitize_identifier(pname)
                vstr = f"self.{p_safe}.value_as_string"
                prop_lines.append(f"{key}={vstr}")
                continue

            # Dict/list → literal JSON-like structure
            if isinstance(val, (dict, list)):
                prop_lines.append(f"{key}={json.dumps(val)}")
                continue

            # Primitive string → JSON string literal
            if isinstance(val, str):
                prop_lines.append(f"{key}={json.dumps(val)}")
                continue

            # Other primitives
            prop_lines.append(f"{key}={repr(val)}")

        # Emit the resource construct
        lines.append(f"        self.{var_name} = {cls}(")
        lines.append(f'            self, "{lid}",')
        for pl in prop_lines:
            lines.append(" " * 12 + pl + ",")
        lines.append("        )")
        lines.append("")

    return "\n".join(lines)
