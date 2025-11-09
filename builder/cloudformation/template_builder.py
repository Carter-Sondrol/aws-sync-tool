from __future__ import annotations
import json
from collections import OrderedDict
from typing import Any, Mapping
from graph.dependency_graph import ResourceNode
from graph.registry import ResolverRegistry
from utils.mapping_store import MappingStore


class CloudFormationTemplateBuilder:
    """
    Serialize a dependency graph into a CloudFormation template.
    """

    REF_RULES = {
        "lambda": lambda lid: {"Fn::GetAtt": [lid, "Arn"]},
        "dynamodb": lambda lid: {"Fn::GetAtt": [lid, "Arn"]},
        "iam": lambda lid: {"Fn::GetAtt": [lid, "Arn"]},
        "s3": lambda lid: {"Ref": lid},
        "connect": lambda lid: {"Ref": lid},
    }

    def __init__(
        self,
        graph,
        registry: ResolverRegistry,
        arn_index: Mapping[str, str] | None = None,
        *,
        target_account: str | None = None,
        managed_replicas: dict[str, Any] | None = None,
        mapping_store: MappingStore | None = None,
    ):
        self.graph = graph
        self.registry = registry
        self.arn_index = arn_index or {}
        self.target_account = target_account
        self.managed_replicas = managed_replicas or {}
        self.mapping_store = mapping_store

    # --------------------------
    # Core entry point
    # --------------------------
    def build(self) -> dict[str, Any]:
        """Return a JSON-safe CloudFormation template."""
        template: dict[str, Any] = OrderedDict()
        template["AWSTemplateFormatVersion"] = "2010-09-09"
        template["Description"] = "Auto-generated from FirstFire AWS Sync graph"
        template["Resources"] = OrderedDict()

        for lid, node in self.graph._nodes.items():
            if getattr(node, "reference_only", False):
                continue

            logical_id = self._sanitize_id(lid)
            resource = {
                "Type": node.cfn_type,
                "Properties": self._sanitize_properties(node),
            }
            template["Resources"][logical_id] = resource

        return template

    # --------------------------
    # Helpers
    # --------------------------
    def _sanitize_id(self, lid: str) -> str:
        return "".join(ch for ch in lid if ch.isalnum() or ch == "_")

    def _sanitize_properties(self, node: ResourceNode) -> dict[str, Any]:
        props = (node.properties or {}).copy()

        # Strip Nones and empty lists
        for k in list(props.keys()):
            if props[k] in (None, "", [], {}):
                props.pop(k)

        # InstanceArn remap
        if node.service == "connect" and "InstanceArn" in props:
            target = getattr(self, "target_instance_arn", None)
            if target:
                props["InstanceArn"] = target

        # Replace embedded ARNs with Refs where possible
        for dep in getattr(node, "referenced_arns", []):
            dep_service = getattr(dep, "service", None)
            if dep_service in self.REF_RULES:
                ref_value = self.REF_RULES[dep_service](dep.resource_id)
                # crude replacement: look for the literal ARN string
                props_json = json.dumps(props)
                props_json = props_json.replace(str(dep), json.dumps(ref_value))
                props = json.loads(props_json)
        return props

    # --------------------------
    # Output convenience
    # --------------------------
    def write_to_file(self, path: str):
        with open(path, "w") as f:
            json.dump(self.build(), f, indent=2)
        print(f"[+] CloudFormation template written to {path}")
