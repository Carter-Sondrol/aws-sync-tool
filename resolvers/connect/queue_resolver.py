from __future__ import annotations
from typing import Any, Set
from mypy_boto3_connect.type_defs import DescribeQueueResponseTypeDef
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


class QueueResolver(BaseConnectSubResolver[DescribeQueueResponseTypeDef]):
    """Resolve AWS Connect Queues."""

    resource_type = "queue"
    cfn_type = "AWS::Connect::Queue"

    def fetch(self, instance_id: str, arn: ARN):
        return self.client.describe_queue(
            InstanceId=instance_id,
            QueueId=arn.subresource_id(),
        )

    def parse(self, arn: ARN, raw: DescribeQueueResponseTypeDef):
        q = raw.get("Queue", {}) or {}
        refs: set[ARN] = set()

        # Ensure InstanceArn
        instance_arn_str = q.get("InstanceArn") or _infer_instance_arn_from_subresource(arn)
        instance_arn = ARN(instance_arn_str)
        refs.add(instance_arn)

        # Derive HoursOfOperationArn from ID if missing
        hours_id = q.get("HoursOfOperationId")
        if not q.get("HoursOfOperationArn") and hours_id:
            parts = arn.resource.split("/")
            inst_idx = parts.index("instance")
            instance_id = parts[inst_idx + 1]
            derived = f"arn:aws:{arn.service}:{arn.region}:{arn.account_id}:instance/{instance_id}/hours-of-operation/{hours_id}"
            q["HoursOfOperationArn"] = derived

        if q.get("HoursOfOperationArn"):
            parsed = ARN.try_parse(q["HoursOfOperationArn"])
            if parsed:
                refs.add(parsed)

        # Outbound Caller Config references (optional)
        oc = q.get("OutboundCallerConfig", {}) or {}
        for field in ("OutboundCallerIdNumberId", "OutboundFlowId"):
            val = oc.get(field)
            if val and isinstance(val, str):
                parsed = ARN.try_parse(val)
                if parsed:
                    refs.add(parsed)

        props: dict[str, Any] = {
            "Name": q.get("Name"),
            "Description": q.get("Description"),
            "HoursOfOperationArn": q.get("HoursOfOperationArn"),
            "InstanceArn": instance_arn_str,
            "OutboundCallerConfig": oc,
            "Tags": q.get("Tags", {}),
        }

        metadata = {
            "EmbeddedReferenceCount": len(refs),
            "Source": "describe_queue",
        }

        return ResourceNode(
            logical_id=f"ConnectQueue{q.get('Name', arn.resource_id)}",
            service="connect",
            cfn_type=self.cfn_type,
            properties=props,
            referenced_arns=refs,
            arns={"Queue": arn},
            metadata=metadata,
        )
