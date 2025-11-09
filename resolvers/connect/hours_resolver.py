from __future__ import annotations
from typing import Any
from mypy_boto3_connect.type_defs import DescribeHoursOfOperationResponseTypeDef
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


class HoursResolver(BaseConnectSubResolver[DescribeHoursOfOperationResponseTypeDef]):
    """Resolve Connect Hours of Operation resources."""

    resource_type = "hours-of-operation"
    cfn_type = "AWS::Connect::HoursOfOperation"

    def fetch(self, instance_id: str, arn: ARN):
        return self.client.describe_hours_of_operation(
            InstanceId=instance_id,
            HoursOfOperationId=arn.subresource_id(),
        )

    def parse(self, arn: ARN, raw: DescribeHoursOfOperationResponseTypeDef):
        hoo = raw.get("HoursOfOperation", {}) or {}

        instance_arn_str = hoo.get("InstanceArn") or _infer_instance_arn_from_subresource(arn)
        instance_arn = ARN(instance_arn_str)

        props: dict[str, Any] = {
            "Name": hoo.get("Name"),
            "Description": hoo.get("Description"),
            "Config": hoo.get("Config"),
            "TimeZone": hoo.get("TimeZone"),
            "InstanceArn": instance_arn_str,
            "Tags": hoo.get("Tags", {}),
        }

        metadata = {
            "Source": "describe_hours_of_operation",
        }

        return ResourceNode(
            logical_id=f"ConnectHoursOfOperation{hoo.get('Name', arn.resource_id)}",
            service="connect",
            cfn_type=self.cfn_type,
            properties=props,
            referenced_arns={instance_arn},
            arns={"HoursOfOperation": arn},
            metadata=metadata,
        )
