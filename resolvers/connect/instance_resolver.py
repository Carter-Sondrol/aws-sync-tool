from __future__ import annotations

from typing import Any, Iterable
from boto3 import Session
from botocore.exceptions import ClientError
from mypy_boto3_connect import ConnectClient
from mypy_boto3_connect.type_defs import DescribeInstanceResponseTypeDef

from graph.dependency_graph import ResourceNode
from resolvers.connect.base_connect import BaseConnectResolver
from utils.arn import ARN


class InstanceResolver(BaseConnectResolver[ConnectClient, DescribeInstanceResponseTypeDef]):
    """Resolver for Amazon Connect Instances."""

    resource_type = "instance"
    cfn_type = "AWS::Connect::Instance"

    def list_resources(self) -> Iterable[ARN]:
        """List all Connect instances in the current region."""
        for inst in self.paginate("list_instances", MaxResults=100):
            arn_str = inst.get("Arn")
            if arn_str:
                yield ARN.parse_cached(arn_str)

    def fetch_resource(self, arn: ARN) -> DescribeInstanceResponseTypeDef:
        self.ensure_instance_id(arn)

        sub_id = arn.subresource_id() or arn.resource_id
        try:
            return self.client.describe_instance(InstanceId=sub_id)
        except ClientError as e:
            self.log.error("Failed to fetch Connect instance %s: %s", arn, e)
            raise

    def to_node(self, arn: ARN, raw: DescribeInstanceResponseTypeDef) -> ResourceNode:
        inst = raw.get("Instance", {}) or {}

        props: dict[str, Any] = {
            "InstanceAlias": inst.get("InstanceAlias"),
            "IdentityManagementType": inst.get("IdentityManagementType"),
            "InboundCallsEnabled": inst.get("InboundCallsEnabled"),
            "OutboundCallsEnabled": inst.get("OutboundCallsEnabled"),
            "Arn": inst.get("Arn"),
            "ServiceRole": inst.get("ServiceRole"),
            "InstanceStatus": inst.get("InstanceStatus"),
            "CreatedTime": inst.get("CreatedTime"),
            "Tags": inst.get("Tags", {}),
        }

        meta = {"Source": "boto3.describe_instance"}

        return self.make_node(
            arn,
            logical_id=f"ConnectInstance{inst.get('InstanceAlias', arn.resource_id)}",
            properties=props,
            metadata=meta,
        )
