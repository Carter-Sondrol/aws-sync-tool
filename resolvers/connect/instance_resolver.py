from __future__ import annotations
from mypy_boto3_connect.type_defs import DescribeInstanceResponseTypeDef
from graph.dependency_graph import ResourceNode
from utils.arn import ARN
from .base_connect import BaseConnectSubResolver


class InstanceResolver(BaseConnectSubResolver[DescribeInstanceResponseTypeDef]):
    """Resolve Connect Instance resources."""

    resource_type = "instance"
    cfn_type = "AWS::Connect::Instance"

    def fetch(self, instance_id: str, arn: ARN):
        return self.client.describe_instance(InstanceId=instance_id or arn.resource_id)

    def parse(self, arn: ARN, raw: DescribeInstanceResponseTypeDef):
        inst = raw.get("Instance", {}) or {}

        props = {
            "InstanceAlias": inst.get("InstanceAlias"),
            "IdentityManagementType": inst.get("IdentityManagementType"),
            "InboundCallsEnabled": inst.get("InboundCallsEnabled"),
            "OutboundCallsEnabled": inst.get("OutboundCallsEnabled"),
            "Arn": inst.get("Arn"),
            "ServiceRole": inst.get("ServiceRole"),
            "InstanceStatus": inst.get("InstanceStatus"),
            "CreatedTime": inst.get("CreatedTime"),
        }

        metadata = {
            "Source": "describe_instance",
        }

        return ResourceNode(
            logical_id=f"ConnectInstance{inst.get('InstanceAlias', arn.resource_id)}",
            service="connect",
            cfn_type=self.cfn_type,
            properties=props,
            arns={"Instance": arn},
            metadata=metadata,
        )
