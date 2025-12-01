from __future__ import annotations

import json
import logging
import re
from typing import Any, Callable

from builder.cdk.l2_renderers import L2_RENDERERS
from graph.dependency_graph import DependencyGraph
from graph.resource_node import NodeClassification

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------
# CDK service module mapping
# ---------------------------------------------------------------------
SERVICE_MAP = {
    "connect": "aws_connect",
    "lex": "aws_lex",
    "kms": "aws_kms",
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


INVALID_KEY_CHARS = re.compile(r"[^A-Za-z0-9_]")
PRESERVE_NESTED_KEYS = {
    "policy_document",
    "policy",
    "inline_policies",
    "attached_policies",
    "policies",
    "assume_role_policy_document",
    "resource_policy",
}


def camel_to_snake(name: str) -> str:
    s1 = re.sub("(.)([A-Z][a-z]+)", r"\1_\2", name)
    return re.sub("([a-z0-9])([A-Z])", r"\1_\2", s1).lower()


def maybe_snake_key(key: str) -> str:
    if not key or INVALID_KEY_CHARS.search(key):
        return key
    return camel_to_snake(key)


def normalize_props(obj, *, parent_key: str | None = None):
    if isinstance(obj, dict):
        if parent_key in PRESERVE_NESTED_KEYS:
            return {k: normalize_props(v, parent_key=parent_key) for k, v in obj.items()}
        result = {}
        for k, v in obj.items():
            nk = maybe_snake_key(k)
            result[nk] = normalize_props(v, parent_key=nk)
        return result
    if isinstance(obj, list):
        return [normalize_props(v, parent_key=parent_key) for v in obj]
    return obj


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


READ_ONLY_GLOBAL = {"arn"}

TYPE_SPECIFIC_DROPS = {
    "AWS::Logs::LogGroup": {
        "creation_time",
        "metric_filter_count",
        "stored_bytes",
        "log_group_arn",
    },
    "AWS::DynamoDB::Table": {
        "table_status",
        "creation_date_time",
        "table_size_bytes",
        "item_count",
        "table_arn",
        "table_id",
        "billing_mode_summary",
        "table_class_summary",
        "warm_throughput",
    },
    "AWS::S3::Bucket": {
        "policy",
        "location",
    },
    "AWS::IAM::Role": {"arn"},
}


REQUIRED_PROPS = {
    "AWS::Connect::Queue": {"instance_arn", "hours_of_operation_arn", "name"},
}


def sanitize_props(cfn_type: str, props: dict[str, Any]) -> dict[str, Any]:
    drops = set(READ_ONLY_GLOBAL)
    drops |= TYPE_SPECIFIC_DROPS.get(cfn_type, set())
    for key in list(props.keys()):
        if key in drops or key == "response_metadata":
            props.pop(key, None)

    if cfn_type == "AWS::DynamoDB::Table":
        summary = props.pop("billing_mode_summary", None)
        if isinstance(summary, dict):
            mode = summary.get("BillingMode") or summary.get("billing_mode")
            if mode:
                props["billing_mode"] = mode
        if props.get("billing_mode") == "PAY_PER_REQUEST":
            props.pop("provisioned_throughput", None)
        pt = props.get("provisioned_throughput")
        if isinstance(pt, dict):
            read_units = pt.get("ReadCapacityUnits") or pt.get("read_capacity_units")
            write_units = pt.get("WriteCapacityUnits") or pt.get("write_capacity_units")
            cleaned = {}
            if read_units:
                cleaned["read_capacity_units"] = read_units
            if write_units:
                cleaned["write_capacity_units"] = write_units
            if cleaned:
                props["provisioned_throughput"] = cleaned
            else:
                props.pop("provisioned_throughput", None)

    if cfn_type == "AWS::S3::Bucket":
        name_val = props.pop("bucket", None)
        if name_val and "bucket_name" not in props:
            props["bucket_name"] = name_val
        versioning = props.pop("versioning", None)
        if isinstance(versioning, dict):
            status = versioning.get("status") or versioning.get("Status")
            if status:
                props["versioning_configuration"] = {"status": status}
        # Drop noisy discovery artifacts that don't map to CDK helpers
        props.pop("tagging", None)

    if cfn_type == "AWS::IAM::Role":
        for readonly in ("role_id", "create_date", "role_last_used"):
            props.pop(readonly, None)

    return props


# ---------------------------------------------------------------------
# CDK generator
# ---------------------------------------------------------------------
def generate_cdk_app(graph: DependencyGraph, root_stack_name: str = "GraphStack", plan=None) -> dict[str, dict[str, str]]:
    """
    Generate Python sources for the root stack and any detected CloudFormation stacks.
    Returns mapping of stack class name -> {"file_name": ..., "source": ...}.
    """
    try:
        ordered_lids = graph.topological_sort()
        logger.info("[CDK] Using topological sort for %d nodes", len(ordered_lids))
    except Exception as e:
        logger.warning("[CDK] Topological sort failed (%s), using fallback order", e)
        ordered_lids = sorted(graph._nodes.keys())

    allowed_ids = None
    if plan:
        try:
            allowed_ids = set(plan.cfn_logical_ids())
        except Exception:
            if isinstance(plan, dict):
                allowed_ids = set()
                for stack in plan.get("stacks", []):
                    allowed_ids.update(stack.get("logical_ids", []))
    stack_groups = _collect_stack_groups(graph, ordered_lids, root_stack_name, allowed_ids=allowed_ids)
    outputs: dict[str, dict[str, str]] = {}
    for group in stack_groups:
        code = _generate_stack_code(
            graph=graph,
            stack_name=group["class_name"],
            ordered_lids=ordered_lids,
            included_lids=group["included_lids"],
            is_root=group["is_root"],
            allowed_ids=allowed_ids,
        )
        outputs[group["class_name"]] = {
            "file_name": group["file_name"],
            "source": code,
        }
    return outputs


def generate_cdk_code(graph: DependencyGraph, stack_name: str = "GraphStack", plan=None) -> str:
    """
    Backwards-compatible helper that returns only the root stack source.
    """
    stacks = generate_cdk_app(graph, stack_name, plan=plan)
    root_entry = stacks.get(stack_name)
    if not root_entry:
        raise ValueError(f"Root stack {stack_name} was not generated")
    return root_entry["source"]


def _collect_stack_groups(
    graph: DependencyGraph,
    ordered_lids: list[str],
    root_stack_name: str,
    allowed_ids: set[str] | None = None,
) -> list[dict[str, Any]]:
    stack_meta = graph.metadata.get("CloudFormationStacks", {}) or {}
    membership = {}
    for stack_id, nodes in (stack_meta.get("membership") or {}).items():
        lids = set(nodes or [])
        if allowed_ids is not None:
            lids = {lid for lid in lids if lid in allowed_ids}
        membership[stack_id] = lids
    # Include any ParentStack annotations even if not captured in membership
    for lid, node in graph._nodes.items():
        parent = (node.metadata or {}).get("ParentStack")
        if parent:
            membership.setdefault(parent, set()).add(lid)

    stack_details = stack_meta.get("stacks") or {}
    stack_groups: list[dict[str, Any]] = []
    child_groups: list[dict[str, Any]] = []

    all_members: set[str] = set()
    for nodes in membership.values():
        all_members.update(nodes)

    root_nodes: list[str] = []
    for lid in ordered_lids:
        node = graph.get_node(lid)
        if not node:
            continue
        if node.classification != NodeClassification.RESOURCE:
            continue
        if allowed_ids is not None and lid not in allowed_ids:
            continue
        if lid in all_members:
            continue
        root_nodes.append(lid)

    stack_groups.append(
        {
            "logical_id": root_stack_name,
            "class_name": sanitize_identifier(root_stack_name),
            "file_name": f"{sanitize_identifier(root_stack_name)}.py",
            "included_lids": set(root_nodes),
            "is_root": True,
        }
    )

    for stack_id, nodes in membership.items():
        if not nodes:
            continue
        details = stack_details.get(stack_id, {})
        raw_name = (
            details.get("stack_name")
            or details.get("StackName")
            or stack_id.replace("CloudFormationStack", "")
            or stack_id
        )
        class_name = sanitize_identifier(raw_name)
        if not class_name:
            class_name = sanitize_identifier(stack_id) or "Stack"
        file_name = f"{class_name}.py"
        child_groups.append(
            {
                "logical_id": stack_id,
                "class_name": class_name,
                "file_name": file_name,
                "included_lids": set(nodes),
                "is_root": False,
            }
        )

    child_groups.sort(key=lambda g: g["class_name"])
    stack_groups.extend(child_groups)
    return stack_groups


def _generate_stack_code(
    *,
    graph: DependencyGraph,
    stack_name: str,
    ordered_lids: list[str],
    included_lids: set[str],
    is_root: bool,
    allowed_ids: set[str] | None = None,
) -> str:
    """
    Generate a Python CDK stack for a subset of nodes.

    Assumes graph is already frozen/portable:
      - ARN strings have been replaced with __REF_<LogicalId>__ where possible.
      - Lambda env params are recorded in graph.metadata["PendingParams"].
    """

    # --------------------------------------------------------
    # 1. Determine resource build order
    # --------------------------------------------------------
    stack_prefix_raw = stack_name or ""
    safe_stack_prefix = re.sub(r"[^A-Za-z0-9_-]", "_", stack_prefix_raw)
    stack_prefix = f"{safe_stack_prefix}-" if safe_stack_prefix else ""
    prefix_var_name = "RESOURCE_ID_PREFIX"
    prefix_literal = json.dumps(stack_prefix)

    def construct_id(raw_id: str) -> str:
        safe_raw = re.sub(r"[^A-Za-z0-9_-]", "_", raw_id or "")
        if not safe_raw:
            safe_raw = "Resource"
        suffix_literal = json.dumps(safe_raw)
        return f"{prefix_var_name} + {suffix_literal}"

    # Build a quick lookup from logical ID → example ARN (if available)
    arn_map = graph.metadata.get("ArnMap", {}) or {}
    logical_to_arn: dict[str, str] = {}
    for arn, lid in arn_map.items():
        logical_to_arn.setdefault(lid, arn)

    def _ref_target(val: str) -> str | None:
        if val.startswith("__REF_") and val.endswith("__"):
            return val[len("__REF_") : -2]
        return None

    def _param_name(val: str) -> str | None:
        if val.startswith("__PARAM_") and val.endswith("__"):
            return val[len("__PARAM_") : -2]
        return None

    PARAMETER_CLASSIFICATIONS = {
        NodeClassification.PARAMETER,
        NodeClassification.EXTERNAL,
    }

    # Treat Connect phone numbers as externally managed parameters
    for lid in ordered_lids:
        node = graph.get_node(lid)
        if not node or node.cfn_type != "AWS::Connect::PhoneNumber":
            continue
        node.reference_only = True
        node.classification = NodeClassification.EXTERNAL
        node.metadata.setdefault(
            "Description", "AWS Connect phone number managed outside CDK"
        )

    current_stack_nodes = set(included_lids)
    used_modules: set[str] = set()
    extra_cdk_symbols: set[str] = set()
    resource_ref_overrides: dict[str, Callable[[str], str]] = {}
    pending_ref_replacements: dict[str, str] = {}

    def resource_ref_expr(logical_id: str, safe_var: str) -> str:
        override = resource_ref_overrides.get(logical_id)
        var_expr = f"self.{safe_var}"
        if override:
            return override(var_expr)
        return f"{var_expr}.ref"

    def render_value(val) -> str:
        """Render an arbitrary property value as valid Python."""
        if isinstance(val, bool):
            return "True" if val else "False"
        if isinstance(val, (int, float)):
            return repr(val)
        if val is None:
            return "None"
        if isinstance(val, str):
            ref_target = _ref_target(val)
            if ref_target:
                target_node = graph.get_node(ref_target)
                if target_node:
                    classification = getattr(target_node, "classification", NodeClassification.RESOURCE)
                    if classification in PARAMETER_CLASSIFICATIONS:
                        ref_safe = sanitize_identifier(ref_target)
                        return f"self.{ref_safe}.value_as_string"
                    if classification == NodeClassification.AWS_MANAGED:
                        arn_value = (
                            target_node.metadata.get("PrimaryArn")
                            or logical_to_arn.get(ref_target)
                        )
                        if arn_value:
                            return json.dumps(arn_value)
                    if classification == NodeClassification.ARTIFACT:
                        artifact_hint = target_node.metadata.get("ArtifactUri") or target_node.metadata.get(
                            "PrimaryArn"
                        )
                        if artifact_hint:
                            return json.dumps(artifact_hint)
                    if (
                        not target_node.reference_only
                        and ref_target in current_stack_nodes
                    ):
                        ref_safe = sanitize_identifier(ref_target)
                        return resource_ref_expr(ref_target, ref_safe)
                    literal = target_node.metadata.get("PrimaryArn") if isinstance(target_node.metadata, dict) else None
                    if literal:
                        return json.dumps(literal)
                arn_value = logical_to_arn.get(ref_target)
                if arn_value:
                    return json.dumps(arn_value)
                logger.warning("[CDK] Unresolved __REF__ placeholder %s", ref_target)
                return json.dumps(val)

            param_name = _param_name(val)
            if param_name:
                p_safe = sanitize_identifier(param_name)
                return f"self.{p_safe}.value_as_string"

            return json.dumps(val)

        if isinstance(val, dict):
            if not val:
                return "{}"
            parts = []
            for dk, dv in val.items():
                rendered = render_value(dv)
                parts.append(f"{json.dumps(dk)}: {rendered}")
            inner = ", ".join(parts)
            return "{" + inner + "}"

        if isinstance(val, list):
            if not val:
                return "[]"
            items = [render_value(item) for item in val]
            return "[" + ", ".join(items) + "]"

        return json.dumps(val)

    # --------------------------------------------------------
    # 2. Build header & imports
    # --------------------------------------------------------
    custom_handler_param_id = construct_id("CustomHandlerArn")

    lines: list[str] = [
        "__IMPORT_LINE_PLACEHOLDER__",
        "from constructs import Construct",
        "import aws_cdk",
        "import json",
        "",
        f"{prefix_var_name} = {prefix_literal}",
        "",
        f"class {stack_name}(Stack):",
        "    def __init__(self, scope: Construct, id: str, **kwargs):",
        "        super().__init__(scope, id, **kwargs)",
        "",
        '        # Custom handler for unsupported resources',
        f"        self.custom_handler_arn = CfnParameter(self, {custom_handler_param_id}, type=\"String\")",
        "",
    ]

    # --------------------------------------------------------
    # 3. Emit parameters for __PARAM_* markers (Lambda env etc.)
    # --------------------------------------------------------
    pending_params = graph.metadata.get("PendingParams", {})
    for pname, default_val in pending_params.items():
        safe_name = sanitize_identifier(pname)
        default_str = json.dumps(default_val)
        param_construct_id = construct_id(pname)
        lines.append(
            f'        self.{safe_name} = CfnParameter('
            f"self, {param_construct_id}, type=\"String\", default={default_str})"
        )
    if pending_params:
        lines.append("")

    # --------------------------------------------------------
    # 3b. Emit parameters for classified external nodes
    # --------------------------------------------------------
    seen_param_ids: set[str] = set()
    for lid in ordered_lids:
        node = graph.get_node(lid)
        if not node:
            continue
        if node.classification not in PARAMETER_CLASSIFICATIONS:
            continue
        if lid in seen_param_ids:
            continue
        seen_param_ids.add(lid)
        safe_name = sanitize_identifier(lid)
        desc = node.metadata.get("Description") or f"{node.service} reference ({node.logical_id})"
        default_val = node.metadata.get("PrimaryArn")
        param_type = node.metadata.get("ParameterType", "String")
        param_construct_id = construct_id(lid)
        lines.append(f"        self.{safe_name} = CfnParameter(")
        lines.append(f"            self, {param_construct_id}, type=\"{param_type}\",")
        if desc:
            lines.append(f"            description={json.dumps(desc)},")
        if default_val:
            lines.append(f"            default={json.dumps(default_val)},")
        lines.append("        )")
        lines.append("")

    # --------------------------------------------------------
    # 4. Emit resources
    # --------------------------------------------------------
    for lid in ordered_lids:
        node = graph.get_node(lid)
        if not node:
            continue
        if node.classification != NodeClassification.RESOURCE:
            continue
        if current_stack_nodes and lid not in current_stack_nodes:
            continue
        if allowed_ids is not None and lid not in allowed_ids:
            continue

        cfn_type = node.cfn_type or "AWS::Unknown::Resource"
        cls = cfn_to_cdk_class(cfn_type)
        var_name = sanitize_identifier(lid)
        raw_props = node.properties or {}

        # Normalize keys to snake_case for CDK L1
        props_snake: dict[str, Any] = normalize_props(raw_props)
        bucket_policy_raw = None
        if cfn_type == "AWS::S3::Bucket" and "policy" in props_snake:
            bucket_policy_raw = props_snake.pop("policy")
        construct_name = construct_id(lid)
        def make_sub_construct_id(suffix: str) -> str:
            return construct_id(f"{lid}{suffix}")

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
            attached = props_snake.pop("attached_policies", None)
            if isinstance(attached, list) and attached:
                mp_arns = []
                for entry in attached:
                    if isinstance(entry, dict):
                        arn_val = (
                            entry.get("PolicyArn")
                            or entry.get("policy_arn")
                            or entry.get("policyArn")
                        )
                        if arn_val:
                            mp_arns.append(arn_val)
                if mp_arns:
                    props_snake["managed_policy_arns"] = mp_arns

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
            raw_locale_settings = raw_props.get("botAliasLocaleSettings") or raw_props.get(
                "bot_alias_locale_settings"
            )
            if isinstance(raw_locale_settings, dict):
                converted = []
                for locale_id, setting in raw_locale_settings.items():
                    if setting is None:
                        continue
                    converted.append(
                        {
                            "locale_id": locale_id,
                            "bot_alias_locale_setting": normalize_props(setting),
                        }
                    )
                if converted:
                    props_snake["bot_alias_locale_settings"] = converted

        if cfn_type == "AWS::Lex::BotLocale":
            if not props_snake.get("bot_version"):
                props_snake["bot_version"] = "DRAFT"
            bot_lid = None
            for _, tgt in graph._g.edges(lid):
                tgt_node = graph.get_node(tgt)
                if tgt_node and tgt_node.cfn_type == "AWS::Lex::Bot":
                    bot_lid = tgt
                    break
            if bot_lid:
                props_snake["bot_id"] = {"__BOT_ID_FROM__": bot_lid}
            # Conversation log keys occasionally come through mixed case
            conv = props_snake.get("conversation_log_settings")
            if isinstance(conv, dict):
                for key in ("text_log_settings", "audio_log_settings"):
                    settings = conv.get(key)
                    if isinstance(settings, dict):
                        conv[key] = [settings]

        if cfn_type == "AWS::Lex::Bot":
            # Ensure required name field is present
            if "name" not in props_snake:
                name_val = props_snake.pop("bot_name", None) or node.properties.get(
                    "botName"
                )
                if name_val:
                    props_snake["name"] = name_val
            role_val = props_snake.pop("role", None)
            if role_val and "role_arn" not in props_snake:
                props_snake["role_arn"] = role_val
            # Drop optional tags if null
            if not props_snake.get("bot_tags"):
                props_snake.pop("bot_tags", None)
            if not props_snake.get("test_bot_tags"):
                props_snake.pop("test_bot_tags", None)

        # Normalize per-type read-only props
        props_snake = sanitize_props(cfn_type, props_snake)

        missing_required = {
            key
            for key in REQUIRED_PROPS.get(cfn_type, set())
            if not props_snake.get(key)
        }

        if (
            cfn_type == "AWS::Connect::Queue"
            and "hours_of_operation_arn" in missing_required
        ):
            param_var = f"{var_name}_hours_arn_param"
            param_construct_id = construct_id(f"{lid}HoursOfOperationArnParam")
            queue_name = raw_props.get("Name") or lid
            desc = f"Hours of operation ARN for queue {queue_name}"
            lines.append(f"        self.{param_var} = CfnParameter(")
            lines.append(f"            self, {param_construct_id}, type=\"String\",")
            lines.append(f"            description={json.dumps(desc)},")
            lines.append("        )")
            lines.append("")
            props_snake["hours_of_operation_arn"] = {
                "__PARAM_REF__": f"self.{param_var}.value_as_string"
            }
            missing_required.remove("hours_of_operation_arn")

        # ----------------- Determine if we must use custom resource -----
        unsupported = (
            cfn_type in LEX_AUTHORING_TYPES
            or cls.startswith("aws_unknown")
            or bool(missing_required)
        )

        if unsupported:
            extra_cdk_symbols.add("CfnCustomResource")
            lines.append(f"        self.{var_name} = CfnCustomResource(")
            lines.append(f"            self, {construct_name},")
            lines.append(
                "            service_token=self.custom_handler_arn.value_as_string,"
            )
            lines.append("        )")
            for key, val in props_snake.items():
                if val is None:
                    continue
                rendered = render_value(val)
                lines.append(
                    f"        self.{var_name}.add_property_override({json.dumps(key)}, {rendered})"
                )
            lines.append(
                f'        self.{var_name}.add_property_override("Service", "{node.service}")'
            )
            lines.append(
                f'        self.{var_name}.add_property_override("OriginalType", "{cfn_type}")'
            )
            lines.append("")
            continue
        l2_result = None
        renderer = L2_RENDERERS.get(cfn_type)
        if renderer:
            try:
                l2_result = renderer(
                    graph=graph,
                    node=node,
                    props=props_snake,
                    var_name=var_name,
                    construct_id=construct_name,
                    make_construct_id=make_sub_construct_id,
                    render_value=render_value,
                )
            except Exception as exc:
                logger.debug("[CDK] L2 render failed for %s: %s", cfn_type, exc)

        if l2_result:
            lines.extend(l2_result.lines)
            used_modules.update(l2_result.used_modules)
            extra_cdk_symbols.update(l2_result.cdk_symbols)
            if l2_result.ref_override:
                resource_ref_overrides[lid] = l2_result.ref_override
                var_expr = f"self.{var_name}"
                pending_ref_replacements[f"{var_expr}.ref"] = l2_result.ref_override(
                    var_expr
                )
        else:
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
                    prop_lines.append(f"{key}={render_value(tag_list)}")
                    continue

                if isinstance(val, dict):
                    # Special bot_id sentinel for Lex::BotAlias/BotLocale
                    if "__BOT_ID_FROM__" in val:
                        bot_lid = val["__BOT_ID_FROM__"]
                        bot_var = sanitize_identifier(bot_lid)
                        vstr = f"self.{bot_var}.attr_id"
                        prop_lines.append(f"{key}={vstr}")
                        continue

                    # Parameter reference sentinel (HoursOfOperation ARN, etc.)
                    if "__PARAM_REF__" in val:
                        prop_lines.append(f"{key}={val['__PARAM_REF__']}")
                        continue

                prop_lines.append(f"{key}={render_value(val)}")

            # Emit the resource construct
            module_name = cls.split(".", 1)[0]
            if module_name != "aws_cdk":
                used_modules.add(module_name)

            lines.append(f"        self.{var_name} = {cls}(")
            lines.append(f"            self, {construct_name},")
            for pl in prop_lines:
                lines.append(" " * 12 + pl + ",")
            lines.append("        )")
            lines.append("")

        if cfn_type == "AWS::S3::Bucket" and bucket_policy_raw:
            policy_obj = bucket_policy_raw
            if isinstance(bucket_policy_raw, str):
                try:
                    policy_obj = json.loads(bucket_policy_raw)
                except json.JSONDecodeError:
                    policy_obj = bucket_policy_raw
            policy_literal = render_value(policy_obj)
            policy_var = f"{var_name}_policy"
            policy_construct_id = construct_id(f"{lid}BucketPolicy")
            lines.append(f"        self.{policy_var} = aws_s3.CfnBucketPolicy(")
            lines.append(f"            self, {policy_construct_id},")
            bucket_expr = resource_ref_expr(lid, var_name)
            lines.append(f"            bucket={bucket_expr},")
            lines.append(f"            policy_document={policy_literal},")
            lines.append("        )")
            lines.append("")

    if pending_ref_replacements:
        updated_lines: list[str] = []
        for line in lines:
            new_line = line
            for needle, replacement in pending_ref_replacements.items():
                new_line = new_line.replace(needle, replacement)
            updated_lines.append(new_line)
        lines = updated_lines

    module_list = sorted(used_modules)
    extra_symbols_sorted = sorted(extra_cdk_symbols)
    import_parts = ["Stack", *module_list, *extra_symbols_sorted, "CfnParameter"]
    lines[0] = "from aws_cdk import (" + ", ".join(import_parts) + ")"

    return "\n".join(lines)
