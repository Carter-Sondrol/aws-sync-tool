from __future__ import annotations
from typing import Any

from botocore.exceptions import ClientError
from mypy_boto3_connect import ConnectClient
from mypy_boto3_connect.type_defs import DescribeInstanceResponseTypeDef

from resolvers.registry import register_resolver
from resolvers.connect.base_connect import BaseConnectResolver
from graph.resource_node import ResourceNode
from utils.arn import ARN


@register_resolver("connect:instance")
class InstanceResolver(
    BaseConnectResolver[ConnectClient, DescribeInstanceResponseTypeDef]
):
    resource_type = "instance"
    cfn_type = "AWS::Connect::Instance"

    def fetch_resource(self, arn: ARN) -> DescribeInstanceResponseTypeDef:
        self.ensure_instance_id(arn)
        try:
            if not self.instance_id:
                raise ValueError(f"Invalid ARN {arn}")
            return self.client.describe_instance(InstanceId=self.instance_id)
        except ClientError:
            self.log.error("Failed to fetch Connect instance %s", arn, exc_info=True)
            raise

    def to_node(self, arn: ARN, raw: DescribeInstanceResponseTypeDef) -> ResourceNode:
        inst = raw.get("Instance", {}) or {}

        props = {
            "InstanceAlias": inst.get("InstanceAlias"),
            "IdentityManagementType": inst.get("IdentityManagementType"),
            "InboundCallsEnabled": inst.get("InboundCallsEnabled"),
            "OutboundCallsEnabled": inst.get("OutboundCallsEnabled"),
            "ServiceRole": inst.get("ServiceRole"),
            "InstanceStatus": inst.get("InstanceStatus"),
            "Tags": inst.get("Tags", {}),
        }

        return self.make_node(
            arn,
            logical_id=f"ConnectInstance{self.make_logical_id(inst.get('InstanceAlias'))}",
            properties=props,
            metadata={"Source": "describe_instance"},
        )
