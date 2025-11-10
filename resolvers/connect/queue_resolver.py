from __future__ import annotations
from typing import Any, Iterable, Set, cast
from botocore.exceptions import ClientError
from mypy_boto3_connect import ConnectClient
from mypy_boto3_connect.type_defs import DescribeQueueResponseTypeDef
from resolvers.connect.base_connect import BaseConnectResolver
from graph.dependency_graph import ResourceNode
from utils.arn import ARN


class QueueResolver(BaseConnectResolver[ConnectClient, DescribeQueueResponseTypeDef]):
    """Resolver for Amazon Connect Queues."""

    resource_type = "queue"
    cfn_type = "AWS::Connect::Queue"

    def list_resources(self) -> Iterable[ARN]:
        for q in self.list_with_instance("list_queues", "QueueSummaryList"):
            arn_str = q.get("Arn")
            if arn_str:
                yield ARN.parse_cached(arn_str)

    def fetch_resource(self, arn: ARN) -> dict[str, Any]:
        """Return full DescribeQueueResponse-like shape for consistency."""
        self.ensure_instance_id(arn)
        assert self.instance_id is not None, "instance_id must be set"

        try:
            resp: DescribeQueueResponseTypeDef = self.client.describe_queue(
                InstanceId=self.instance_id,
                QueueId=arn.subresource_id() or "",
            )
            data = cast(dict[str, Any], resp.get("Queue", {}))
            return {"Queue": data}
        except ClientError as e:
            self.log.error("Failed to fetch Connect Queue %s: %s", arn, e)
            raise

    def to_node(self, arn: ARN, raw: dict[str, Any]) -> ResourceNode:
        """Convert a Connect Queue description into a ResourceNode."""
        q = raw.get("Queue", {}) or {}

        props = {
            "Name": q.get("Name"),
            "Description": q.get("Description"),
            "InstanceArn": self.instance_arn,
            "OutboundCallerConfig": q.get("OutboundCallerConfig"),
            "Tags": q.get("Tags", {}),
        }

        # Resolve Hours of Operation
        hours_arn = q.get("HoursOfOperationArn")
        hours_id = q.get("HoursOfOperationId")
        if not hours_arn and hours_id and self.instance_arn:
            base = ARN.parse_cached(self.instance_arn)
            hours_arn = (
                f"arn:aws:connect:{base.region}:{base.account_id}:"
                f"instance/{base.resource_id}/hours-of-operation/{hours_id}"
            )
        if hours_arn:
            props["HoursOfOperationArn"] = hours_arn

        refs: Set[ARN] = set()
        for key in ("InstanceArn", "HoursOfOperationArn"):
            val = props.get(key)
            if val and ARN.is_valid(val):
                refs.add(ARN.parse_cached(val))

        return ResourceNode(
            logical_id=self.make_logical_id(q.get("Name")),
            service="connect",
            cfn_type=self.cfn_type,
            properties=props,
            arns={"Primary": ARN.parse_cached(q["QueueArn"])},
            referenced_arns=refs,
            metadata={"Source": "boto3.describe_queue"},
        )
