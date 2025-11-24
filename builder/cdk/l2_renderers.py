from __future__ import annotations

import json
from dataclasses import dataclass
from typing import Any, Callable, Dict

from graph.dependency_graph import DependencyGraph


@dataclass
class L2RenderResult:
    lines: list[str]
    used_modules: set[str]
    cdk_symbols: set[str]
    ref_override: Callable[[str], str] | None = None


L2Renderer = Callable[
    [
        DependencyGraph,
        Any,
        dict[str, Any],
        str,
        str,
        Callable[[str], str],
        Callable[[Any], str],
    ],
    L2RenderResult | None,
]


def _render_s3_bucket(
    graph: DependencyGraph,
    node,
    props: dict[str, Any],
    var_name: str,
    construct_id: str,
    make_construct_id: Callable[[str], str],
    render_value: Callable[[Any], str],
) -> L2RenderResult | None:
    supported_keys = {
        "bucket_name",
        "public_access_block_configuration",
        "versioning_configuration",
        "enforce_ssl",
    }
    unsupported = set(props) - supported_keys
    if unsupported:
        return None

    prop_lines: list[str] = []
    if "bucket_name" in props:
        prop_lines.append(f"bucket_name={render_value(props['bucket_name'])}")
    if "enforce_ssl" in props:
        prop_lines.append(f"enforce_ssl={render_value(props['enforce_ssl'])}")
    version_config = props.get("versioning_configuration")
    if isinstance(version_config, dict):
        status = (version_config.get("status") or "").lower()
        if status in {"enabled", "suspended"}:
            versioned = status == "enabled"
            prop_lines.append(f"versioned={'True' if versioned else 'False'}")
        elif version_config:
            return None
    pab = props.get("public_access_block_configuration")
    if pab is not None:
        if not isinstance(pab, dict):
            return None
        bools = {
            "block_public_acls": bool(pab.get("block_public_acls")),
            "ignore_public_acls": bool(pab.get("ignore_public_acls")),
            "block_public_policy": bool(pab.get("block_public_policy")),
            "restrict_public_buckets": bool(pab.get("restrict_public_buckets")),
        }
        if all(bools.values()):
            prop_lines.append(
                "block_public_access=aws_s3.BlockPublicAccess.BLOCK_ALL"
            )
        else:
            # Mixed configurations can't be easily represented with L2 helpers yet.
            return None

    lines = [
        f"        self.{var_name} = aws_s3.Bucket(",
        f"            self, {construct_id},",
    ]
    for pl in prop_lines:
        lines.append(" " * 12 + pl + ",")
    lines.append("        )")
    lines.append("")

    return L2RenderResult(
        lines=lines,
        used_modules={"aws_s3"},
        cdk_symbols=set(),
        ref_override=lambda var_expr: f"{var_expr}.bucket_arn",
    )


def _render_dynamodb_table(
    graph: DependencyGraph,
    node,
    props: dict[str, Any],
    var_name: str,
    construct_id: str,
    make_construct_id: Callable[[str], str],
    render_value: Callable[[Any], str],
) -> L2RenderResult | None:
    supported_keys = {
        "attribute_definitions",
        "key_schema",
        "table_name",
        "billing_mode",
        "provisioned_throughput",
        "point_in_time_recovery_specification",
        "time_to_live_specification",
        "stream_specification",
        "deletion_protection_enabled",
    }
    unsupported = set(props) - supported_keys
    if unsupported:
        return None

    attr_defs_list = props.get("attribute_definitions") or []
    if not isinstance(attr_defs_list, list) or not attr_defs_list:
        return None
    attr_map = {
        item.get("attribute_name"): item.get("attribute_type")
        for item in attr_defs_list
        if isinstance(item, dict)
    }
    key_schema = props.get("key_schema") or []
    if not isinstance(key_schema, list) or not key_schema:
        return None

    key_entries = {
        (entry.get("key_type") or "").upper(): entry.get("attribute_name")
        for entry in key_schema
        if isinstance(entry, dict)
    }
    hash_name = key_entries.get("HASH")
    if not hash_name:
        return None

    def _attr_expr(attr_name: str | None) -> str | None:
        if not attr_name:
            return None
        attr_type = (attr_map.get(attr_name) or "").upper()
        type_map = {
            "S": "aws_dynamodb.AttributeType.STRING",
            "N": "aws_dynamodb.AttributeType.NUMBER",
            "B": "aws_dynamodb.AttributeType.BINARY",
        }
        type_expr = type_map.get(attr_type)
        if not type_expr:
            return None
        return (
            "aws_dynamodb.Attribute("
            f"name={json.dumps(attr_name)}, type={type_expr}"
            ")"
        )

    partition_expr = _attr_expr(hash_name)
    if not partition_expr:
        return None
    sort_expr = _attr_expr(key_entries.get("RANGE"))

    prop_lines: list[str] = [
        f"partition_key={partition_expr}",
    ]
    if sort_expr:
        prop_lines.append(f"sort_key={sort_expr}")
    if "table_name" in props:
        prop_lines.append(f"table_name={render_value(props['table_name'])}")

    billing_mode = props.get("billing_mode")
    if billing_mode:
        mode_map = {
            "PAY_PER_REQUEST": "aws_dynamodb.BillingMode.PAY_PER_REQUEST",
            "PROVISIONED": "aws_dynamodb.BillingMode.PROVISIONED",
        }
        bm_expr = mode_map.get(billing_mode.upper())
        if not bm_expr:
            return None
        prop_lines.append(f"billing_mode={bm_expr}")
        if billing_mode.upper() == "PROVISIONED":
            throughput = props.get("provisioned_throughput") or {}
            if not isinstance(throughput, dict):
                return None
            read_units = throughput.get("read_capacity_units")
            write_units = throughput.get("write_capacity_units")
            if not isinstance(read_units, (int, float)) or not isinstance(
                write_units, (int, float)
            ):
                return None
            prop_lines.append(f"read_capacity={int(read_units)}")
            prop_lines.append(f"write_capacity={int(write_units)}")
    pit = props.get("point_in_time_recovery_specification")
    if isinstance(pit, dict):
        enabled = pit.get("point_in_time_recovery_enabled")
        if enabled is not None:
            prop_lines.append(f"point_in_time_recovery={render_value(enabled)}")
    ttl_spec = props.get("time_to_live_specification")
    if isinstance(ttl_spec, dict) and ttl_spec.get("enabled"):
        attr_name = ttl_spec.get("attribute_name")
        if not attr_name:
            return None
        prop_lines.append(f"time_to_live_attribute={json.dumps(attr_name)}")
    stream_spec = props.get("stream_specification")
    if isinstance(stream_spec, dict) and stream_spec.get("stream_view_type"):
        view_type = stream_spec.get("stream_view_type")
        view_map = {
            "NEW_IMAGE": "aws_dynamodb.StreamViewType.NEW_IMAGE",
            "OLD_IMAGE": "aws_dynamodb.StreamViewType.OLD_IMAGE",
            "NEW_AND_OLD_IMAGES": "aws_dynamodb.StreamViewType.NEW_AND_OLD_IMAGES",
            "KEYS_ONLY": "aws_dynamodb.StreamViewType.KEYS_ONLY",
        }
        view_expr = view_map.get(str(view_type).upper())
        if not view_expr:
            return None
        prop_lines.append(f"stream={view_expr}")
    deletion_protection = props.get("deletion_protection_enabled")
    if deletion_protection is not None:
        prop_lines.append(
            f"deletion_protection={render_value(deletion_protection)}"
        )

    lines = [
        f"        self.{var_name} = aws_dynamodb.Table(",
        f"            self, {construct_id},",
    ]
    for pl in prop_lines:
        lines.append(" " * 12 + pl + ",")
    lines.append("        )")
    lines.append("")

    return L2RenderResult(
        lines=lines,
        used_modules={"aws_dynamodb"},
        cdk_symbols=set(),
        ref_override=lambda var_expr: f"{var_expr}.table_arn",
    )


def _extract_service_principals(doc: Any) -> list[str] | None:
    if not isinstance(doc, dict):
        return None
    statements = doc.get("statement") or doc.get("Statement")
    if isinstance(statements, dict):
        statements = [statements]
    if not isinstance(statements, list) or not statements:
        return None
    services: list[str] = []
    for stmt in statements:
        if not isinstance(stmt, dict):
            return None
        principal_obj = stmt.get("principal") or stmt.get("Principal")
        if not isinstance(principal_obj, dict):
            return None
        svc = principal_obj.get("service") or principal_obj.get("Service")
        if not svc:
            return None
        if isinstance(svc, str):
            services.append(svc)
        elif isinstance(svc, list):
            services.extend(s for s in svc if isinstance(s, str))
        else:
            return None
    return services or None


def _render_iam_role(
    graph: DependencyGraph,
    node,
    props: dict[str, Any],
    var_name: str,
    construct_id: str,
    make_construct_id: Callable[[str], str],
    render_value: Callable[[Any], str],
) -> L2RenderResult | None:
    supported_keys = {
        "assume_role_policy_document",
        "role_name",
        "description",
        "max_session_duration",
        "path",
        "permissions_boundary",
        "managed_policy_arns",
        "policies",
        "tags",
    }
    unsupported = set(props) - supported_keys
    if unsupported:
        return None

    assume_doc = props.get("assume_role_policy_document")
    services = _extract_service_principals(assume_doc)
    if not services:
        return None
    principal_exprs = [
        f"aws_iam.ServicePrincipal({json.dumps(s)})" for s in services
    ]
    if not principal_exprs:
        return None
    if len(principal_exprs) == 1:
        principal_expr = principal_exprs[0]
    else:
        principal_expr = (
            "aws_iam.CompositePrincipal(" + ", ".join(principal_exprs) + ")"
        )

    prop_lines: list[str] = [f"assumed_by={principal_expr}"]
    for key in ("role_name", "description", "max_session_duration", "path"):
        if key in props:
            prop_lines.append(f"{key}={render_value(props[key])}")

    permissions_boundary = props.get("permissions_boundary")
    if permissions_boundary is not None:
        pb_expr = render_value(permissions_boundary)
        pb_id = make_construct_id("PermissionsBoundary")
        boundary_expr = (
            f"aws_iam.ManagedPolicy.from_managed_policy_arn("
            f"self, {pb_id}, {pb_expr}"
            ")"
        )
        prop_lines.append(f"permissions_boundary={boundary_expr}")

    managed_policies = []
    managed_arns = props.get("managed_policy_arns") or []
    if not isinstance(managed_arns, list):
        return None
    for idx, arn_val in enumerate(managed_arns):
        arn_expr = render_value(arn_val)
        mp_id = make_construct_id(f"ManagedPolicy{idx}")
        managed_policies.append(
            f"aws_iam.ManagedPolicy.from_managed_policy_arn("
            f"self, {mp_id}, {arn_expr}"
            ")"
        )
    if managed_policies:
        prop_lines.append("managed_policies=[" + ", ".join(managed_policies) + "]")

    inline_entries = []
    policies = props.get("policies") or []
    if isinstance(policies, dict):
        policies = [
            {"policy_name": name, "policy_document": doc}
            for name, doc in policies.items()
        ]
    if not isinstance(policies, list):
        return None
    for policy in policies:
        if not isinstance(policy, dict):
            return None
        pname = policy.get("policy_name")
        pdoc = policy.get("policy_document")
        if not pname or not isinstance(pdoc, dict):
            return None
        doc_expr = render_value(pdoc)
        inline_entries.append(
            f"{json.dumps(pname)}: aws_iam.PolicyDocument.from_json({doc_expr})"
        )
    if inline_entries:
        inline_expr = "{" + ", ".join(inline_entries) + "}"
        prop_lines.append(f"inline_policies={inline_expr}")

    lines = [
        f"        self.{var_name} = aws_iam.Role(",
        f"            self, {construct_id},",
    ]
    for pl in prop_lines:
        lines.append(" " * 12 + pl + ",")
    lines.append("        )")

    tags_expr = props.get("tags")
    if tags_expr:
        tag_items: list[tuple[str, str]] = []
        if isinstance(tags_expr, dict):
            tag_items = list(tags_expr.items())
        elif isinstance(tags_expr, list):
            for entry in tags_expr:
                if not isinstance(entry, dict):
                    continue
                key = entry.get("key") or entry.get("Key")
                value = entry.get("value") or entry.get("Value")
                if key is not None and value is not None:
                    tag_items.append((key, value))
        for key, value in tag_items:
            lines.append(
                f"        aws_cdk.Tags.of(self.{var_name}).add("
                f"{json.dumps(key)}, {render_value(value)})"
            )

    lines.append("")
    return L2RenderResult(
        lines=lines,
        used_modules={"aws_iam"},
        cdk_symbols=set(),
        ref_override=lambda var_expr: f"{var_expr}.role_arn",
    )


def _render_kms_key(
    graph: DependencyGraph,
    node,
    props: dict[str, Any],
    var_name: str,
    construct_id: str,
    make_construct_id: Callable[[str], str],
    render_value: Callable[[Any], str],
) -> L2RenderResult | None:
    arn_value = None
    metadata = getattr(node, "metadata", {}) or {}
    if isinstance(metadata, Dict):
        arn_value = metadata.get("PrimaryArn")
    if not arn_value:
        raw_arn = props.get("arn") or props.get("key_arn")
        if isinstance(raw_arn, str) and raw_arn.startswith("__REF_"):
            raw_arn = None
        arn_value = raw_arn
    if not isinstance(arn_value, str):
        return None

    arn_literal = json.dumps(arn_value)
    lines = [
        f"        self.{var_name} = aws_kms.Key.from_key_arn(",
        f"            self, {construct_id}, {arn_literal}",
        "        )",
        "",
    ]
    return L2RenderResult(
        lines=lines,
        used_modules={"aws_kms"},
        cdk_symbols=set(),
        ref_override=lambda var_expr: f"{var_expr}.key_arn",
    )
    
def _render_lambda_function(
    graph: DependencyGraph,
    node,
    props: dict[str, Any],
    var_name: str,
    construct_id: str,
    make_construct_id: Callable[[str], str],
    render_value: Callable[[Any], str],
    ) -> L2RenderResult | None:
        arn_value = None
        metadata = getattr(node, "metadata", {}) or {}
        if isinstance(metadata, Dict):
            arn_value = metadata.get("FunctionArn")

        # Fallback: CFN properties
        if not arn_value:
            raw_arn = props.get("function_arn") or props.get("arn")
            if isinstance(raw_arn, str):
                arn_value = raw_arn

        # If still no ARN → cannot L2-render it
        if not isinstance(arn_value, str):
            return None

        arn_literal = render_value(arn_value)

        lines = [
            f"        self.{var_name} = aws_lambda.Function.from_function_arn(",
            f"            self, {construct_id}, {arn_literal}",
            "        )",
            "",
        ]

        return L2RenderResult(
            lines=lines,
            used_modules={"aws_lambda"},
            cdk_symbols=set(),
            ref_override=lambda var_expr: f"{var_expr}.function_arn",
        )


L2_RENDERERS: dict[str, L2Renderer] = {
    "AWS::S3::Bucket": _render_s3_bucket,
    "AWS::DynamoDB::Table": _render_dynamodb_table,
    "AWS::IAM::Role": _render_iam_role,
    "AWS::KMS::Key": _render_kms_key,
    "AWS::Lambda::Function": _render_lambda_function
}
