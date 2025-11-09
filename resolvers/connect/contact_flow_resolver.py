from __future__ import annotations

import json
from typing import Any, Set

from mypy_boto3_connect.type_defs import DescribeContactFlowResponseTypeDef

from graph.dependency_graph import ResourceNode
from utils.arn import ARN, extract_dependencies
from .base_connect import BaseConnectSubResolver


def _infer_instance_arn_from_subresource(arn: ARN) -> str:
    """Compute the Connect Instance ARN from any Connect subresource ARN."""
    parts = arn.resource.split("/")
    if "instance" in parts:
        idx = parts.index("instance")
        if idx + 1 < len(parts):
            inst_id = parts[idx + 1]
            return f"arn:aws:{arn.service}:{arn.region}:{arn.account_id}:instance/{inst_id}"
    raise ValueError(f"Cannot infer Connect Instance from ARN: {arn}")


def _extract_arns_from_content(content: str) -> Set[ARN]:
    """Parse flow Content JSON and extract embedded ARNs."""
    refs: set[ARN] = set()
    if not content:
        return refs
    try:
        data = json.loads(content)
        refs |= extract_dependencies(data)
    except Exception:
        pass
    return refs


class ContactFlowResolver(BaseConnectSubResolver[DescribeContactFlowResponseTypeDef]):
    resource_type = "contact-flow"
    cfn_type = "AWS::Connect::ContactFlow"

    def fetch(self, instance_id: str, arn: ARN):
        return self.client.describe_contact_flow(
            InstanceId=instance_id,
            ContactFlowId=arn.subresource_id(),
        )

    def parse(self, arn: ARN, raw: DescribeContactFlowResponseTypeDef):
        flow = raw.get("ContactFlow", {})
        content_str = flow.get("Content", "") or ""

        # Extract ARNs from embedded flow JSON
        refs = _extract_arns_from_content(content_str)

        # Determine instance ARN and treat it as a graph dependency
        instance_arn_str = flow.get("InstanceArn") or _infer_instance_arn_from_subresource(arn)
        instance_arn = ARN(instance_arn_str)
        refs.add(instance_arn)

        # Core properties used for template/CDK synthesis
        props: dict[str, Any] = {
            "Name": flow.get("Name"),
            "Type": flow.get("Type"),
            "Description": flow.get("Description"),
            "Content": content_str,
        }

        return ResourceNode(
            logical_id=f"ConnectFlow{flow.get('Name', arn.resource_id)}",
            service="connect",
            cfn_type=self.cfn_type,
            properties=props,
            referenced_arns=refs,   # ✅ includes InstanceArn + flow-internal refs
            arns={"Flow": arn},
        )
