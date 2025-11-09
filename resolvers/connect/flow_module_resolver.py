from __future__ import annotations

import json
import re
from typing import Any, Set

from mypy_boto3_connect.type_defs import DescribeContactFlowModuleResponseTypeDef
from graph.dependency_graph import ResourceNode
from utils.arn import ARN, extract_dependencies
from .base_connect import BaseConnectSubResolver


ARN_PATTERN = re.compile(r"arn:aws:[a-z0-9-]+:[a-z0-9-]*:\d*:[^\s\"'<>]+")


def _infer_instance_arn_from_subresource(arn: ARN) -> str:
    parts = arn.resource.split("/")
    if "instance" in parts:
        idx = parts.index("instance")
        if idx + 1 < len(parts):
            inst_id = parts[idx + 1]
            return f"arn:aws:{arn.service}:{arn.region}:{arn.account_id}:instance/{inst_id}"
    raise ValueError(f"Cannot infer Connect Instance from ARN: {arn}")


def _extract_embedded_arns(content: str) -> Set[ARN]:
    """Extract ARNs from both valid JSON and raw text fallback."""
    refs: set[ARN] = set()
    if not content:
        return refs
    try:
        data = json.loads(content)
        refs |= extract_dependencies(data)
    except Exception:
        for match in ARN_PATTERN.findall(content):
            parsed = ARN.try_parse(match)
            if parsed:
                refs.add(parsed)
    return refs


class FlowModuleResolver(BaseConnectSubResolver[DescribeContactFlowModuleResponseTypeDef]):
    """Resolve Connect Contact Flow Modules and capture embedded dependencies."""

    resource_type = "contact-flow-module"
    aliases = ("flow-module",)
    cfn_type = "AWS::Connect::ContactFlowModule"

    def fetch(self, instance_id: str, arn: ARN):
        return self.client.describe_contact_flow_module(
            InstanceId=instance_id,
            ContactFlowModuleId=arn.subresource_id(),
        )

    def parse(self, arn: ARN, raw: DescribeContactFlowModuleResponseTypeDef):
        mod = raw.get("ContactFlowModule", {}) or {}
        content = mod.get("Content", "") or ""
        refs = _extract_embedded_arns(content)

        # Add the instance as a dependency
        instance_arn_str = mod.get("InstanceArn") or _infer_instance_arn_from_subresource(arn)
        instance_arn = ARN(instance_arn_str)
        refs.add(instance_arn)

        props: dict[str, Any] = {
            "Name": mod.get("Name"),
            "Description": mod.get("Description"),
            "Content": content,
            "InstanceArn": instance_arn_str,
        }

        metadata = {
            "EmbeddedReferenceCount": len(refs),
            "Source": "describe_contact_flow_module",
        }

        return ResourceNode(
            logical_id=f"ConnectModule{mod.get('Name', arn.resource_id)}",
            service="connect",
            cfn_type=self.cfn_type,
            properties=props,
            referenced_arns=refs,
            arns={"Module": arn},
            metadata=metadata,
        )
