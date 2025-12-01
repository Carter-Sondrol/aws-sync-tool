from __future__ import annotations
import re
import copy
import logging
from typing import Any, Dict
from graph.dependency_graph import DependencyGraph, ResourceNode

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------

def sanitize_logical_id(name: str) -> str:
    """Convert arbitrary names into a valid CloudFormation logical ID."""
    safe = re.sub(r"[^A-Za-z0-9]", "", name or "")
    if not safe:
        safe = "Resource"
    if not safe[0].isalpha():
        safe = f"R{safe}"
    return safe[:255]  # CFN logical ID limit


def _is_arnish_key(key: str) -> bool:
    return key.endswith(("Arn", "RoleArn", "BucketArn", "TopicArn", "FunctionArn", "StreamArn"))


def _is_idish_key(key: str) -> bool:
    return key.endswith(("Id", "Name", "BucketName", "QueueName", "TableName", "FunctionName"))


def _ref_token(s: str) -> str | None:
    m = re.fullmatch(r"__REF_([A-Za-z0-9_]+)__", s)
    return m.group(1) if m else None


def _clean_nones(obj: Any) -> Any:
    """Remove None / empty dicts / empty lists recursively."""
    if isinstance(obj, dict):
        return {k: _clean_nones(v) for k, v in obj.items() if v not in (None, "", [], {})}
    if isinstance(obj, list):
        return [_clean_nones(v) for v in obj if v not in (None, "", [], {})]
    return obj


READ_ONLY_PROPS = {
    "Arn", "CreatedTime", "CreationTime", "LastModifiedTime",
    "InstanceStatus", "State", "Status", "Id", "QueueId", "BotId"
}


# ---------------------------------------------------------------------
# Main Builder
# ---------------------------------------------------------------------

class CloudFormationTemplateBuilder:
    """
    Convert a portable DependencyGraph into a deployable CloudFormation template.
    - Sanitizes IDs for CFN compliance
    - Removes null/empty props
    - Treats reference_only & service-managed nodes as Parameters
    """

    def __init__(self, graph: DependencyGraph) -> None:
        self.g = graph
        self.node_index: Dict[str, ResourceNode] = graph._nodes
        self._is_param: Dict[str, bool] = {}
        self._is_resource: Dict[str, bool] = {}
        self._ref_attr_override: Dict[str, str] = {}
        self.id_map: Dict[str, str] = {}

        # Pre-sanitize all IDs up front
        for old_id in self.node_index:
            self.id_map[old_id] = sanitize_logical_id(old_id)

        # Classify nodes
        for lid, n in self.node_index.items():
            implicit = bool(n.metadata.get("implicit_aws_managed") or n.metadata.get("service_linked"))
            skip_cdk = bool(n.metadata.get("skip_cdk") or n.metadata.get("SkipCDK"))
            self._is_param[lid] = implicit or n.reference_only or skip_cdk
            self._is_resource[lid] = not self._is_param[lid]
            if "RefAttr" in n.metadata:
                self._ref_attr_override[lid] = str(n.metadata["RefAttr"])

    # ------------------------------------------------------------------
    # Ref replacement
    # ------------------------------------------------------------------
    def _ref_expr_for(self, target_lid: str, *, key_context: str | None) -> Dict[str, Any]:
        """Decide Ref vs GetAtt."""
        safe_id = self.id_map.get(target_lid, target_lid)
        if self._is_param.get(target_lid, False):
            return {"Ref": safe_id}

        if target_lid in self._ref_attr_override:
            return {"Fn::GetAtt": [safe_id, self._ref_attr_override[target_lid]]}

        if key_context and _is_arnish_key(key_context):
            return {"Fn::GetAtt": [safe_id, "Arn"]}
        if key_context and _is_idish_key(key_context):
            return {"Ref": safe_id}

        return {"Fn::GetAtt": [safe_id, "Arn"]}

    def _rewrite_refs_in_props(self, props: Any, *, key_context: str | None = None) -> Any:
        """Recursively rewrite __REF_*__ placeholders."""
        if isinstance(props, dict):
            out = {}
            for k, v in props.items():
                out[k] = self._rewrite_refs_in_props(v, key_context=k)
            return out
        elif isinstance(props, list):
            return [self._rewrite_refs_in_props(v, key_context=key_context) for v in props]
        elif isinstance(props, str):
            lid = _ref_token(props)
            if lid:
                return self._ref_expr_for(lid, key_context=key_context)
        return props

    # ------------------------------------------------------------------
    # Template Sections
    # ------------------------------------------------------------------
    def _materialize_parameters(self) -> Dict[str, Any]:
        params: Dict[str, Any] = {}
        for lid, n in self.node_index.items():
            if not self._is_param[lid]:
                continue
            safe_id = self.id_map[lid]
            desc = f"External reference for {n.service} ({n.cfn_type})"
            param_def = {
                "Type": "String",
                "Description": desc,
            }
            default_val = n.metadata.get("Default")
            if default_val:
                param_def["Default"] = default_val
            params[safe_id] = param_def
        return params

    def _materialize_resources(self) -> Dict[str, Any]:
        resources: Dict[str, Any] = {}
        for lid in self.g.topological_sort():
            node = self.node_index[lid]
            if not self._is_resource[lid]:
                continue
            safe_id = self.id_map[lid]
            props = copy.deepcopy(node.properties or {})
            props = {k: v for k, v in props.items() if k not in READ_ONLY_PROPS}
            props = self._rewrite_refs_in_props(props)
            props = _clean_nones(props)
            res = {"Type": node.cfn_type, "Properties": props}

            if node.metadata.get("DependsOn"):
                deps = node.metadata["DependsOn"]
                if isinstance(deps, str):
                    deps = [deps]
                res["DependsOn"] = [self.id_map.get(d, d) for d in deps]

            resources[safe_id] = res
        return resources

    def _materialize_outputs(self) -> Dict[str, Any]:
        outs: Dict[str, Any] = {}
        for lid, n in self.node_index.items():
            if not self._is_resource[lid]:
                continue
            safe_id = self.id_map[lid]
            out_key = f"{safe_id}Arn"
            outs[out_key] = {"Value": {"Fn::GetAtt": [safe_id, "Arn"]}}
        return outs

    # ------------------------------------------------------------------
    # Build Template
    # ------------------------------------------------------------------
    def build(self) -> Dict[str, Any]:
        tpl: Dict[str, Any] = {
            "AWSTemplateFormatVersion": "2010-09-09",
            "Description": self.g.metadata.get("Description", "Generated from DependencyGraph"),
            "Parameters": self._materialize_parameters(),
            "Resources": self._materialize_resources(),
        }
        outs = self._materialize_outputs()
        if outs:
            tpl["Outputs"] = outs
        return tpl
