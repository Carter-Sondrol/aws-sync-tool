from __future__ import annotations
from typing import Set
from botocore.exceptions import ClientError
from mypy_boto3_connect import ConnectClient
from mypy_boto3_connect.type_defs import DescribeHoursOfOperationResponseTypeDef

from resolvers.registry import register_resolver
from resolvers.connect.base_connect import BaseConnectResolver
from utils.arn import ARN
from graph.resource_node import ResourceNode


@register_resolver("connect:hours")
class HoursResolver(BaseConnectResolver[ConnectClient, DescribeHoursOfOperationResponseTypeDef]):
    resource_type = "hours-of-operation"
    cfn_type = "AWS::Connect::HoursOfOperation"

    def fetch_resource(self, arn: ARN) -> DescribeHoursOfOperationResponseTypeDef:
        self.ensure_instance_id(arn)
        sub_id = arn.subresource_id()
        try:
            if not self.instance_id or not sub_id:
                raise ValueError(f"Invalid ARN {arn}")
            return self.client.describe_hours_of_operation(
                InstanceId=self.instance_id,
                HoursOfOperationId=sub_id,
            )
        except ClientError:
            self.log.error("Failed to fetch %s", arn, exc_info=True)
            raise

    def to_node(self, arn: ARN, raw: DescribeHoursOfOperationResponseTypeDef) -> ResourceNode:
        hoo = raw.get("HoursOfOperation", {}) or {}
        refs: Set[ARN] = set()

        inst_arn = hoo.get("InstanceArn") or self.instance_arn
        if inst_arn:
            refs.add(ARN.parse_cached(inst_arn))

        props = {
            "Name": hoo.get("Name"),
            "Description": hoo.get("Description"),
            "Config": hoo.get("Config"),
            "TimeZone": hoo.get("TimeZone"),
            "InstanceArn": inst_arn,
            "Tags": hoo.get("Tags", {}),
        }

        node = self.make_node(
            arn,
            logical_id=f"ConnectHours{self.make_logical_id(hoo.get('Name'))}",
            properties=props,
            metadata={"Source": "describe_hours_of_operation", "EmbeddedReferenceCount": len(refs)},
        )
        node.referenced_arns |= refs
        return node
