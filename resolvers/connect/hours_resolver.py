from __future__ import annotations

from typing import Any, Iterable
from botocore.exceptions import ClientError
from boto3 import Session
from mypy_boto3_connect import ConnectClient
from mypy_boto3_connect.type_defs import DescribeHoursOfOperationResponseTypeDef

from graph.dependency_graph import ResourceNode
from resolvers.connect.base_connect import BaseConnectResolver
from utils.arn import ARN


class HoursResolver(BaseConnectResolver[ConnectClient, DescribeHoursOfOperationResponseTypeDef]):
    """Resolver for Amazon Connect Hours of Operation."""

    resource_type = "hours-of-operation"
    cfn_type = "AWS::Connect::HoursOfOperation"

    def list_resources(self) -> Iterable[ARN]:
        for hoo in self.list_with_instance("list_hours_of_operations", "HoursOfOperationSummaryList"):
            arn_str = hoo.get("Arn")
            if arn_str:
                yield ARN.parse_cached(arn_str)

    def fetch_resource(self, arn: ARN) -> DescribeHoursOfOperationResponseTypeDef:
        self.ensure_instance_id(arn)

        if not self.instance_id:
            raise ValueError("Connect instance ID is required")
        sub_id = arn.subresource_id()
        if not sub_id:
            raise ValueError(f"Invalid ARN missing subresource ID: {arn}")

        try:
            return self.client.describe_hours_of_operation(
                InstanceId=self.instance_id,
                HoursOfOperationId=sub_id,
            )
        except ClientError as e:
            self.log.error("Failed to fetch hours-of-operation %s: %s", arn, e)
            raise

    def to_node(self, arn: ARN, raw: DescribeHoursOfOperationResponseTypeDef) -> ResourceNode:
        hoo = raw.get("HoursOfOperation", {}) or {}

        instance_arn = hoo.get("InstanceArn") or self.instance_arn
        instance_ref = ARN.parse_cached(instance_arn) if instance_arn else None

        props: dict[str, Any] = {
            "Name": hoo.get("Name"),
            "Description": hoo.get("Description"),
            "Config": hoo.get("Config"),
            "TimeZone": hoo.get("TimeZone"),
            "InstanceArn": instance_arn,
            "Tags": hoo.get("Tags", {}),
        }

        meta = {"Source": "boto3.describe_hours_of_operation"}

        node = self.make_node(
            arn,
            logical_id=f"ConnectHours{hoo.get('Name', arn.resource_id)}",
            properties=props,
            metadata=meta,
        )

        if instance_ref:
            node.referenced_arns.add(instance_ref)
        return node
