from __future__ import annotations

import json
from typing import Any, Dict

from aws_cdk import CfnParameter, CfnResource, Stack
from constructs import Construct

GRAPH_PAYLOAD: Dict[str, Any] = json.loads(r"""{{ graph_payload_json }}""")

REF_RULES: Dict[str, str] = {
    "s3": "Ref",
    "connect": "Ref",
    "lambda": "Arn",
    "dynamodb": "Arn",
    "iam": "Arn",
    "sns": "Arn",
    "sqs": "Arn",
}


class AutoStack(Stack):
    def __init__(self, scope: Construct, construct_id: str, **kwargs: Any) -> None:
        super().__init__(scope, construct_id, **kwargs)

        nodes = GRAPH_PAYLOAD.get("nodes", [])
        edges = GRAPH_PAYLOAD.get("edges", [])
        metadata = GRAPH_PAYLOAD.get("metadata", {})

        arn_index = self._build_arn_index(nodes)
        reference_params = self._define_reference_parameters(nodes)
        self._define_pending_parameters(metadata.get("PendingParams", {}))

        resources: Dict[str, CfnResource] = {}
        for node in nodes:
            if node.get("reference_only"):
                continue

            logical_id = node["logical_id"]
            properties = self._clean_properties(node.get("properties") or {})
            resolved_props = self._walk_and_replace(properties, arn_index, reference_params)

            resource = CfnResource(
                self,
                logical_id,
                type=node.get("cfn_type"),
                properties=resolved_props,
            )
            resources[logical_id] = resource

        for edge in edges:
            src = edge.get("from")
            dst = edge.get("to")
            if src in resources and dst in resources:
                resources[dst].add_dependency(resources[src])

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------
    def _build_arn_index(self, nodes: list[Dict[str, Any]]) -> Dict[str, Dict[str, Any]]:
        index: Dict[str, Dict[str, Any]] = {}
        for node in nodes:
            for arn in node.get("arns", []):
                index[arn] = node
        return index

    def _define_reference_parameters(self, nodes: list[Dict[str, Any]]) -> Dict[str, str]:
        mapping: Dict[str, str] = {}
        for node in nodes:
            if not node.get("reference_only"):
                continue
            logical_id = node["logical_id"]
            param_name = f"{logical_id}Arn"
            CfnParameter(
                self,
                param_name,
                type="String",
                description=f"External ARN for {logical_id}",
            )
            mapping[logical_id] = param_name
        return mapping

    def _define_pending_parameters(self, pending: Dict[str, Any]) -> None:
        for name, default in (pending or {}).items():
            CfnParameter(
                self,
                name,
                type="String",
                default=default,
                description="Auto-detected parameter for environment variable or link",
            )

    def _clean_properties(self, props: Dict[str, Any]) -> Dict[str, Any]:
        cleaned: Dict[str, Any] = {}
        for key, value in props.items():
            if value in (None, "", [], {}):
                continue
            cleaned[key] = value
        return cleaned

    def _walk_and_replace(
        self,
        value: Any,
        arn_index: Dict[str, Dict[str, Any]],
        reference_params: Dict[str, str],
    ) -> Any:
        if isinstance(value, str) and value.startswith("arn:"):
            target = arn_index.get(value)
            if not target:
                return value

            logical_id = target["logical_id"]
            if target.get("reference_only"):
                param_name = reference_params.get(logical_id)
                if param_name:
                    return {"Ref": param_name}
                return value

            rule = REF_RULES.get(target.get("service"), "Arn")
            if rule == "Ref":
                return {"Ref": logical_id}
            return {"Fn::GetAtt": [logical_id, "Arn"]}

        if isinstance(value, list):
            return [self._walk_and_replace(v, arn_index, reference_params) for v in value]

        if isinstance(value, dict):
            return {
                key: self._walk_and_replace(val, arn_index, reference_params)
                for key, val in value.items()
            }

        return value