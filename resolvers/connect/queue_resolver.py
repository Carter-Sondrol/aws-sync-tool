from __future__ import annotations
from typing import Any
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
    resource_type = "queue"
    cfn_type = "AWS::Connect::Queue"

    def fetch(self, instance_id: str, arn: ARN):
        return self.client.describe_queue(
            InstanceId=instance_id,
            QueueId=arn.subresource_id(),
        )

    def parse(self, arn: ARN, raw: DescribeQueueResponseTypeDef):
        q = raw.get("Queue", {})

        # Ensure InstanceArn is present
        try:
            _inst_arn = q.get("InstanceArn") if isinstance(q, dict) else None
        except Exception:
            _inst_arn = None
        if not _inst_arn:
            inst_arn = _infer_instance_arn_from_subresource(arn)
            if isinstance(q, dict):
                q["InstanceArn"] = inst_arn

        refs: set[ARN] = set()

        if q.get("HoursOfOperationArn"):
            parsed = ARN.try_parse(q["HoursOfOperationArn"])
            if parsed:
                refs.add(parsed)

        for qc in q.get("QuickConnectIds", []):
            parsed = ARN.try_parse(qc)
            if parsed:
                refs.add(parsed)

        return ResourceNode(
            logical_id=f"ConnectQueue{q.get('Name', arn.resource_id)}",
            service="connect",
            cfn_type=self.cfn_type,
            properties=q,
            referenced_arns=refs,
            arns={"Queue": arn},
        )
