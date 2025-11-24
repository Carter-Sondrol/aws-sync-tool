from __future__ import annotations

import argparse
import dataclasses
import importlib
import inspect
import json
import os
import re
from dataclasses import dataclass, asdict, field
from pathlib import Path
from typing import Any, Dict, List, Optional

import boto3
from botocore.model import ServiceModel, Shape


# =====================================================================
# Data models
# =====================================================================

@dataclass
class PropertySchema:
    name: str
    type: str               # "structure", "string", "integer", "list", "map", etc.
    required: bool
    shape: str              # Parent shape name (usually describe/get output)
    item_shape: Optional[str] = None      # For list/map value shapes


@dataclass
class OperationSchema:
    name: str
    input_shape: Optional[str]
    output_shape: Optional[str]
    id_params: List[str] = field(default_factory=list)


@dataclass
class ResourceSchema:
    """
    Describes a resource type for a given AWS service.

    This is the main thing the resolver generator consumes.
    """
    service: str
    resource_name: str

    arn_field: Optional[str] = None          # e.g. QueueArn, TableArn
    list_result_path: Optional[str] = None   # e.g. QueueSummaryList
    summary_item_shape: Optional[str] = None # e.g. QueueSummary

    operations: Dict[str, Any] = field(default_factory=dict)  # list/describe/get/create/update/delete
    id_params: List[str] = field(default_factory=list)        # identify params for describe/get

    properties: Dict[str, PropertySchema] = field(default_factory=dict)

    cfn_type: Optional[str] = None
    cfn_module: Optional[str] = None
    cfn_class: Optional[str] = None
    deployable_via_cfn: bool = False

    l2_module: Optional[str] = None
    l2_class: Optional[str] = None
    deployable_via_l2: bool = False

    notes: List[str] = field(default_factory=list)

    # NEW: synthetic resources come from JSON overrides, not botocore list/describe
    synthetic: bool = False


@dataclass
class ServiceSchema:
    service: str
    resources: Dict[str, ResourceSchema]


# =====================================================================
# Helpers
# =====================================================================

def to_snake_case(name: str) -> str:
    """
    Convert an AWS OperationName (DescribeFoo, GetBar) into
    the boto3 client method name (describe_foo, get_bar).
    """
    s1 = re.sub(r"(.)([A-Z][a-z]+)", r"\1_\2", name)
    s2 = re.sub(r"([a-z0-9])([A-Z])", r"\1_\2", s1)
    return s2.lower()


# =====================================================================
# Boto3 / botocore helpers
# =====================================================================

def _get_service_model(service: str) -> ServiceModel:
    """
    Load botocore's local service model *without* hitting AWS.

    We force a dummy region + endpoint, so no network calls occur.
    """
    session = boto3.Session(region_name="us-east-1")
    client = session.client(
        service,
        region_name="us-east-1",
        endpoint_url="https://example.invalid",  # offline safe
    )
    return client.meta.service_model


def _collect_operations(model: ServiceModel) -> Dict[str, OperationSchema]:
    ops: Dict[str, OperationSchema] = {}
    for op_name in model.operation_names:
        op = model.operation_model(op_name)
        ops[op_name] = OperationSchema(
            name=op_name,
            input_shape=op.input_shape.name if op.input_shape is not None else None,
            output_shape=op.output_shape.name if op.output_shape is not None else None,
        )
    return ops


def _shape_for(model: ServiceModel, shape_name: Optional[str]) -> Optional[Shape]:
    if not shape_name:
        return None
    return model.shape_for(shape_name)


def _is_list_operation(name: str) -> bool:
    return name.startswith(("List", "Search", "Get"))


def _guess_resource_name_from_list_op(op_name: str) -> str:
    base = op_name
    for prefix in ("List", "Search", "Get", "Describe"):
        if base.startswith(prefix):
            base = base[len(prefix):]
            break

    # crude singularization
    if base.endswith("ies"):
        base = base[:-3] + "y"
    elif base.endswith("s"):
        base = base[:-1]

    return base or op_name


def _find_arn_field(shape: Shape) -> Optional[str]:
    if shape.type_name != "structure":
        return None
    for name, member in shape.members.items():
        if name.lower().endswith("arn"):
            return name
    return None


def _find_list_member_with_arn(model: ServiceModel, op: OperationSchema) -> Optional[Dict[str, Any]]:
    out_shape = _shape_for(model, op.output_shape)
    if out_shape is None or out_shape.type_name != "structure":
        return None

    for member_name, member_shape in out_shape.members.items():
        if member_shape.type_name == "list":
            item_shape = member_shape.member
            if item_shape is None or item_shape.type_name != "structure":
                continue

            arn_field = _find_arn_field(item_shape)
            if arn_field:
                return {
                    "list_name": member_name,
                    "item_shape": item_shape,
                    "arn_field": arn_field,
                }
    return None


def _guess_id_params_for_op(model: ServiceModel, op: Optional[OperationSchema]) -> List[str]:
    if op is None:
        return []
    in_shape = _shape_for(model, op.input_shape)
    if in_shape is None or in_shape.type_name != "structure":
        return []

    candidates: List[str] = []
    for name, member in in_shape.members.items():
        lname = name.lower()
        # prefer canonical patterns
        if lname.endswith(("id", "arn", "name", "identifier")):
            candidates.append(name)

    # required params first if any
    required = set(in_shape.required_members or [])
    if required:
        candidates = sorted(candidates, key=lambda n: (n not in required, n))
    return candidates


def _find_matching_op(
    ops: Dict[str, OperationSchema],
    prefixes: List[str],
    resource_name: str,
) -> Optional[OperationSchema]:
    # e.g. Describe + Queue -> DescribeQueue
    for prefix in prefixes:
        expected = f"{prefix}{resource_name}"
        if expected in ops:
            return ops[expected]

    # fallback: any op with prefix that mentions resource name
    lowered = resource_name.lower()
    for prefix in prefixes:
        for op in ops.values():
            if op.name.startswith(prefix) and lowered in op.name.lower():
                return op
    return None


def _build_properties_for_shape(model: ServiceModel, shape_name: Optional[str]) -> Dict[str, PropertySchema]:
    if not shape_name:
        return {}
    shape = _shape_for(model, shape_name)
    if shape is None or shape.type_name != "structure":
        return {}

    required_fields = set(shape.required_members or [])
    props: Dict[str, PropertySchema] = {}

    for name, member in shape.members.items():
        member_type = member.type_name
        item_shape = None
        if member_type == "list":
            item = member.member
            item_shape = item.name if item is not None else None
        elif member_type == "map":
            item = member.value
            item_shape = item.name if item is not None else None

        props[name] = PropertySchema(
            name=name,
            type=member_type,
            required=name in required_fields,
            shape=shape.name,
            item_shape=item_shape,
        )

    return props


# =====================================================================
# Core schema builder
# =====================================================================

def build_service_schema(service: str) -> ServiceSchema:
    """
    Analyze a boto3 service model and emit a ServiceSchema with rich resource schemas.

    Generic rules:
      - Use List*/Search*/Get* to discover "resource types" that return lists of
        items containing an ARN field.
      - Attach Describe*/Get* operations for detailed fetch.
      - Infer id_params from the input shape.
      - Attach CFN/L2 metadata in a separate pass.
      - Apply service-specific JSON overrides for synthetic/extra resources.
    """
    model = _get_service_model(service)
    ops = _collect_operations(model)

    resources: Dict[str, ResourceSchema] = {}

    # 1) Discover resource candidates from list-like operations
    for op_name, op in ops.items():
        if not _is_list_operation(op_name):
            continue

        list_info = _find_list_member_with_arn(model, op)
        if not list_info:
            continue

        resource_name = _guess_resource_name_from_list_op(op_name)
        arn_field = list_info["arn_field"]
        list_result_path = list_info["list_name"]
        item_shape = list_info["item_shape"]

        # ---------------------------------------------------------
        # Resource acceptance rule:
        # Accept only if the ARN field is really the resource's own ARN.
        # (1) arn_field exists
        # (2) arn_field shape actually contains an ARN-typed string
        # (3) the inferred resource_name roughly matches the ARN field's semantic owner
        # ---------------------------------------------------------
        item = item_shape  # summary entry type

        # RULE (2): Must contain ARN-like string in this shape
        sample_arn_field = None
        for mname, member in item.members.items():
            if mname == arn_field and member.type_name == "string":
                sample_arn_field = mname
                break

        if sample_arn_field is None:
            # Reject — not a real ARN, probably a parent ARN or unrelated reference.
            continue

        # RULE (3): The ARN field name should reference this resource type.
        # Examples:
        #   QueueSummaryList => QueueArn (ok)
        #   ProvisionedConcurrencyConfig => FunctionArn (NOT ok)
        field_owner = arn_field.lower().replace("arn", "").strip("_")
        if field_owner and field_owner not in resource_name.lower():
            # Example failure: arn_field="FunctionArn", resource_name="ProvisionedConcurrencyConfig"
            continue

        # NOTE: We intentionally skip deeper ARN segment matching here; it's noisy
        # and didn't add value in practice. Resource-level name matching is enough.

        res = resources.get(resource_name) or ResourceSchema(
            service=service,
            resource_name=resource_name,
        )

        res.arn_field = res.arn_field or arn_field
        res.list_result_path = res.list_result_path or list_result_path
        res.summary_item_shape = res.summary_item_shape or item_shape.name

        # list op (store boto3 method name, not AWS op name)
        res.operations.setdefault("list", [])
        res.operations["list"].append(to_snake_case(op_name))

        resources[resource_name] = res

    schema = ServiceSchema(service=service, resources=resources)

    # 2) For each resource, find describe/get/create/update/delete, id params, properties
    for resource_name, res in schema.resources.items():
        # Prefer DescribeX, then GetX
        describe_op = _find_matching_op(ops, ["Describe", "Get"], resource_name)

        if describe_op:
            res.operations["describe"] = to_snake_case(describe_op.name)
            id_params = _guess_id_params_for_op(model, describe_op)
            res.id_params = id_params

            # Build top-level properties from describe/get output
            props = _build_properties_for_shape(model, describe_op.output_shape)
            res.properties = props

        # Create/Update/Delete if present
        create_op = _find_matching_op(ops, ["Create"], resource_name)
        if create_op:
            res.operations["create"] = to_snake_case(create_op.name)
        update_op = _find_matching_op(ops, ["Update"], resource_name)
        if update_op:
            res.operations["update"] = to_snake_case(update_op.name)
        delete_op = _find_matching_op(ops, ["Delete"], resource_name)
        if delete_op:
            res.operations["delete"] = to_snake_case(delete_op.name)

    # 3) Service-specific adjustments (DynamoDB, IAM, Lambda, Connect, etc.)
    apply_special_cases(model, ops, schema)

    # 4) JSON-based overrides / synthetic resources (Connect config, etc.)
    apply_resource_overrides(schema)

    # 5) Attach CDK metadata (CFN + L2)
    attach_cdk_metadata(schema)

    return schema


# =====================================================================
# Special-case service tweaks (DynamoDB, IAM, etc.)
# =====================================================================

def apply_special_cases(
    model: ServiceModel,
    ops: Dict[str, OperationSchema],
    schema: ServiceSchema,
) -> None:
    svc = schema.service

    if svc == "dynamodb":
        _tweak_dynamodb(model, ops, schema)
    elif svc == "iam":
        _tweak_iam(model, ops, schema)
    elif svc == "lambda":
        _tweak_lambda(model, ops, schema)
    elif svc == "connect":
        _tweak_connect(model, ops, schema)
    # add more per-service tweaks as needed


def _ensure_resource(schema: ServiceSchema, name: str) -> ResourceSchema:
    if name in schema.resources:
        return schema.resources[name]
    res = ResourceSchema(service=schema.service, resource_name=name)
    schema.resources[name] = res
    return res


def _tweak_dynamodb(model: ServiceModel, ops: Dict[str, OperationSchema], schema: ServiceSchema) -> None:
    # DynamoDB Table is extremely important; ensure it exists.
    res = _ensure_resource(schema, "Table")

    if "describe" not in res.operations:
        op = ops.get("DescribeTable") or ops.get("describe_table")
        if op:
            res.operations["describe"] = to_snake_case(op.name)
            res.id_params = ["TableName"]
            res.properties = _build_properties_for_shape(model, op.output_shape)

    if not res.arn_field:
        # DescribeTable output: Table.TableArn
        op = ops.get("DescribeTable")
        out_shape = _shape_for(model, op.output_shape) if op else None
        if out_shape and out_shape.type_name == "structure":
            table_shape = out_shape.members.get("Table")
            if table_shape and table_shape.type_name == "structure":
                arn_field = _find_arn_field(table_shape)
                if arn_field:
                    res.arn_field = arn_field

    res.notes.append("Special-cased DynamoDB Table resolver")


def _tweak_iam(model: ServiceModel, ops: Dict[str, OperationSchema], schema: ServiceSchema) -> None:
    # IAM Role
    role = _ensure_resource(schema, "Role")
    if "describe" not in role.operations:
        op = ops.get("GetRole")
        if op:
            role.operations["describe"] = to_snake_case(op.name)
            role.id_params = ["RoleName"]
            role.properties = _build_properties_for_shape(model, op.output_shape)
    if not role.arn_field:
        op = ops.get("GetRole")
        out_shape = _shape_for(model, op.output_shape) if op else None
        if out_shape and out_shape.type_name == "structure":
            role_shape = out_shape.members.get("Role")
            if role_shape and role_shape.type_name == "structure":
                arn_field = _find_arn_field(role_shape)
                if arn_field:
                    role.arn_field = arn_field

    # IAM Policy
    policy = _ensure_resource(schema, "Policy")
    if "describe" not in policy.operations:
        op = ops.get("GetPolicy")
        if op:
            policy.operations["describe"] = to_snake_case(op.name)
            policy.id_params = ["PolicyArn"]
            policy.properties = _build_properties_for_shape(model, op.output_shape)
    if not policy.arn_field:
        policy.arn_field = "PolicyArn"


def _tweak_lambda(model: ServiceModel, ops: Dict[str, OperationSchema], schema: ServiceSchema) -> None:
    fn = _ensure_resource(schema, "Function")
    if "describe" not in fn.operations:
        op = ops.get("GetFunction")
        if op:
            fn.operations["describe"] = to_snake_case(op.name)
            fn.id_params = ["FunctionName"]
            fn.properties = _build_properties_for_shape(model, op.output_shape)
    if not fn.arn_field:
        # functionArn appears inside Configuration
        op = ops.get("GetFunction")
        out_shape = _shape_for(model, op.output_shape) if op else None
        if out_shape and out_shape.type_name == "structure":
            cfg_shape = out_shape.members.get("Configuration")
            if cfg_shape and cfg_shape.type_name == "structure":
                arn_field = _find_arn_field(cfg_shape)
                if arn_field:
                    fn.arn_field = arn_field


def _tweak_connect(model: ServiceModel, ops: Dict[str, OperationSchema], schema: ServiceSchema) -> None:
    """
    Connect has many resources that are identified by (InstanceId, ResourceId).
    The generic introspection usually picks them up correctly, but we can add
    hints for important ones.
    """
    important = [
        "Instance",
        "ContactFlow",
        "Queue",
        "RoutingProfile",
        "HoursOfOperation",
        "UserHierarchyGroup",
        "User",
        "QuickConnect",
    ]

    for name in important:
        res = schema.resources.get(name)
        if not res:
            continue

        # Ensure we have describe & id_params
        if "describe" not in res.operations:
            op = _find_matching_op(ops, ["Describe"], name)
            if op:
                res.operations["describe"] = to_snake_case(op.name)
                res.id_params = _guess_id_params_for_op(model, op)
                res.properties = _build_properties_for_shape(model, op.output_shape)

        # Ensure arn_field is set
        if not res.arn_field and res.summary_item_shape:
            shape = _shape_for(model, res.summary_item_shape)
            if shape:
                arn_field = _find_arn_field(shape)
                if arn_field:
                    res.arn_field = arn_field


# =====================================================================
# JSON overrides / synthetic resources
# =====================================================================

_OVERRIDES_CACHE: Optional[Dict[str, Any]] = None
_OVERRIDES_ENV_VAR = "SERVICE_OVERRIDES_FILE"


def _load_override_spec() -> Dict[str, Any]:
    """
    Load a JSON spec that can define synthetic/override resources.

    Lookup order:
      1) Env var SERVICE_OVERRIDES_FILE, if set.
      2) service_overrides.json next to this module.
      3) If nothing exists, return {}.
    """
    global _OVERRIDES_CACHE
    if _OVERRIDES_CACHE is not None:
        return _OVERRIDES_CACHE

    path: Optional[Path] = None

    env_val = os.getenv(_OVERRIDES_ENV_VAR)
    if env_val:
        p = Path(env_val)
        if p.is_file():
            path = p

    if path is None:
        default = Path(__file__).with_name("service_overrides.json")
        if default.is_file():
            path = default

    if path is None:
        _OVERRIDES_CACHE = {}
        return _OVERRIDES_CACHE

    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        data = {}

    _OVERRIDES_CACHE = data if isinstance(data, dict) else {}
    return _OVERRIDES_CACHE


def apply_resource_overrides(schema: ServiceSchema) -> None:
    """
    Merge JSON-defined synthetic/override resources into the schema.

    This is where we add things like Connect instance storage config,
    Contact Lens config, Voice ID config, etc.
    """
    overrides = _load_override_spec()
    svc_cfg = overrides.get(schema.service)
    if not isinstance(svc_cfg, dict):
        return

    for spec in svc_cfg.get("synthetic_resources", []):
        if not isinstance(spec, dict):
            continue

        name = spec.get("resource_name")
        if not name:
            continue

        res = _ensure_resource(schema, name)

        # Mark as synthetic (can be overridden in spec)
        res.synthetic = bool(spec.get("synthetic", True))

        # Operations: "describe", "list", "create", etc. (direct boto3 method names)
        ops_cfg = spec.get("operations") or {}
        if isinstance(ops_cfg, dict):
            for op_kind, fn_name in ops_cfg.items():
                if isinstance(op_kind, str) and isinstance(fn_name, str):
                    res.operations[op_kind] = fn_name

        # ID params
        id_params = spec.get("id_params")
        if isinstance(id_params, list):
            res.id_params = [str(p) for p in id_params]

        # ARN field (may be null for config surfaces)
        if "arn_field" in spec:
            res.arn_field = spec["arn_field"]

        # list_result_path if relevant
        if "list_result_path" in spec:
            res.list_result_path = spec["list_result_path"]

        # CFN / L2 overrides if ever needed
        if "cfn_type" in spec:
            res.cfn_type = spec["cfn_type"]
        if "deployable_via_cfn" in spec:
            res.deployable_via_cfn = bool(spec["deployable_via_cfn"])
        if "deployable_via_l2" in spec:
            res.deployable_via_l2 = bool(spec["deployable_via_l2"])

        notes = spec.get("notes")
        if isinstance(notes, list):
            res.notes.extend(str(n) for n in notes)


# =====================================================================
# CDK L1 + L2 introspection
# =====================================================================

def _load_cdk_module(service: str) -> Optional[Any]:
    # L1 and L2 share module: aws_cdk.aws_<service>
    mod_name = f"aws_cdk.aws_{service}"
    try:
        return importlib.import_module(mod_name)
    except ImportError:
        return None


def _extract_cfn_classes(cdk_module: Any) -> Dict[str, Dict[str, str]]:
    cfn_map: Dict[str, Dict[str, str]] = {}
    for name, obj in inspect.getmembers(cdk_module, inspect.isclass):
        if not name.startswith("Cfn"):
            continue
        cfn_type = getattr(obj, "CFN_RESOURCE_TYPE_NAME", None)
        if not isinstance(cfn_type, str):
            continue
        cfn_map[cfn_type] = {
            "class_name": name,
            "module": cdk_module.__name__,
        }
    return cfn_map


def _map_cfn_to_resource_name(cfn_type: str) -> str:
    parts = cfn_type.split("::")
    return parts[2] if len(parts) == 3 else cfn_type


def _extract_l2_classes(cdk_module: Any) -> Dict[str, Dict[str, str]]:
    """
    Rough heuristic: L2 constructs are classes that:
      - do NOT start with 'Cfn'
      - live in the aws_cdk.aws_<service> module
    """
    l2_map: Dict[str, Dict[str, str]] = {}
    for name, obj in inspect.getmembers(cdk_module, inspect.isclass):
        if name.startswith("Cfn"):
            continue
        if name[0].islower():
            continue
        l2_map[name.lower()] = {
            "class_name": name,
            "module": cdk_module.__name__,
        }
    return l2_map


def attach_cdk_metadata(schema: ServiceSchema) -> None:
    cdk_module = _load_cdk_module(schema.service)
    if cdk_module is None:
        return

    cfn_map = _extract_cfn_classes(cdk_module)
    l2_map = _extract_l2_classes(cdk_module)

    # Map CFN to resources
    by_resname: Dict[str, Dict[str, str]] = {}
    for cfn_type, meta in cfn_map.items():
        rname = _map_cfn_to_resource_name(cfn_type).lower()
        by_resname[rname] = {
            "cfn_type": cfn_type,
            "class_name": meta["class_name"],
            "module": meta["module"],
        }

    for res in schema.resources.values():
        key = res.resource_name.lower()
        cfn = by_resname.get(key)
        if cfn:
            res.cfn_type = cfn["cfn_type"]
            res.cfn_class = cfn["class_name"]
            res.cfn_module = cfn["module"]
            res.deployable_via_cfn = True

        # L2: simple name match (Bucket, Table, Function, etc.)
        l2 = l2_map.get(key)
        if l2:
            res.l2_class = l2["class_name"]
            res.l2_module = l2["module"]
            res.deployable_via_l2 = True


# =====================================================================
# Serialization helpers
# =====================================================================

def _service_schema_to_json(schema: ServiceSchema) -> Dict[str, Any]:
    return {
        "service": schema.service,
        "resources": {
            name: {
                **asdict(res),
                "properties": {pname: asdict(p) for pname, p in res.properties.items()},
            }
            for name, res in schema.resources.items()
        },
    }


# =====================================================================
# CLI
# =====================================================================

def main(argv: Optional[List[str]] = None) -> None:
    parser = argparse.ArgumentParser(
        description="Introspect a boto3 service + CDK to build a rich resource schema.",
    )
    parser.add_argument("--service", required=True, help="AWS service name (e.g. connect, lambda, dynamodb)")
    parser.add_argument("--output", "-o", help="Output JSON path; if omitted, prints to stdout")
    parser.add_argument("--pretty", action="store_true", help="Pretty-print JSON")

    args = parser.parse_args(argv)

    svc = args.service
    svc_schema = build_service_schema(svc)

    data = _service_schema_to_json(svc_schema)
    indent = 2 if args.pretty else None

    if args.output:
        out_path = Path(args.output)
        out_path.parent.mkdir(parents=True, exist_ok=True)
        out_path.write_text(json.dumps(data, indent=indent, sort_keys=True))
        print(f"Wrote schema for service '{svc}' to {args.output}")
    else:
        print(json.dumps(data, indent=indent, sort_keys=True))


if __name__ == "__main__":
    main()
