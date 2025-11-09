from __future__ import annotations
from typing import Any
from mypy_boto3_connect.type_defs import DescribeContactFlowModuleResponseTypeDef
from graph.dependency_graph import ResourceNode
from utils.arn import ARN
from .base_connect import BaseConnectSubResolver


def _infer_instance_arn_from_subresource(arn: ARN) -> str:
    parts = arn.resource.split("/")
    if "instance" in parts:
        idx = parts.index("instance")
        if idx + 1 < len(parts):
            inst_id = parts[idx + 1]
            return f"arn:aws:{arn.service}:{arn.region}:{arn.account_id}:instance/{inst_id}"
    raise ValueError(f"Cannot infer Connect Instance from ARN: {arn}")


class FlowModuleResolver(BaseConnectSubResolver[DescribeContactFlowModuleResponseTypeDef]):
    resource_type = "contact-flow-module"
    aliases = ("flow-module",)
    cfn_type = "AWS::Connect::ContactFlowModule"

    def fetch(self, instance_id: str, arn: ARN):
        return self.client.describe_contact_flow_module(
            InstanceId=instance_id,
            ContactFlowModuleId=arn.subresource_id(),
        )

    def parse(self, arn: ARN, raw: DescribeContactFlowModuleResponseTypeDef):
        mod = raw.get("ContactFlowModule", {})
        props: dict[str, Any] = {
            "Name": mod.get("Name"),
            "Description": mod.get("Description"),
            "Content": mod.get("Content"),
            "InstanceArn": (mod.get("InstanceArn") or _infer_instance_arn_from_subresource(arn)),
        }
        return ResourceNode(
            logical_id=f"ConnectModule{mod.get('Name', arn.resource_id)}",
            service="connect",
            cfn_type=self.cfn_type,
            properties=props,
            arns={"Module": arn},
        )
