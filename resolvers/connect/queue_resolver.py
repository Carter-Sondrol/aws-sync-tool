from __future__ import annotations
from typing import Any, Set
from botocore.exceptions import ClientError
from mypy_boto3_connect import ConnectClient
from mypy_boto3_connect.type_defs import DescribeQueueResponseTypeDef

from resolvers.registry import register_resolver
from resolvers.connect.base_connect import BaseConnectResolver
from graph.resource_node import ResourceNode
from utils.arn import ARN


@register_resolver("connect:queue")
class QueueResolver(BaseConnectResolver[ConnectClient, DescribeQueueResponseTypeDef]):
    resource_type = "queue"
    cfn_type = "AWS::Connect::Queue"

    def fetch_resource(self, arn: ARN) -> dict[str, Any]:
        self.ensure_instance_id(arn)
        sub_id = arn.subresource_id()
        try:
            if not self.instance_id or not sub_id:
                raise ValueError(f"Invalid ARN {arn}")
            resp = self.client.describe_queue(
                InstanceId=self.instance_id,
                QueueId=sub_id,
            )
            return {"Queue": resp.get("Queue", {})}
        except ClientError:
            self.log.error("Failed to fetch %s", arn, exc_info=True)
            raise

    def to_node(self, arn: ARN, raw: dict[str, Any]) -> ResourceNode:
        q = raw.get("Queue", {}) or {}
        refs: Set[ARN] = set()

        inst_arn = q.get("InstanceArn") or self.instance_arn
        if inst_arn:
            refs.add(ARN.parse_cached(inst_arn))

        hours_arn = q.get("HoursOfOperationArn")
        if hours_arn and ARN.is_valid(hours_arn):
            refs.add(ARN.parse_cached(hours_arn))

        props = {
            "Name": q.get("Name"),
            "Description": q.get("Description"),
            "OutboundCallerConfig": q.get("OutboundCallerConfig"),
            "InstanceArn": inst_arn,
            "HoursOfOperationArn": hours_arn,
            "Tags": q.get("Tags", {}),
        }

        node = self.make_node(
            arn,
            logical_id=self.make_logical_id(q.get("Name")),
            properties=props,
            metadata={"Source": "describe_queue", "EmbeddedReferenceCount": len(refs)},
        )
        node.referenced_arns |= refs
        return node
