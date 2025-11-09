from __future__ import annotations
from typing import Any, Set
from mypy_boto3_connect.type_defs import DescribeQuickConnectResponseTypeDef
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


class QuickConnectResolver(BaseConnectSubResolver[DescribeQuickConnectResponseTypeDef]):
    """Resolve AWS Connect Quick Connects."""

    resource_type = "quick-connect"
    cfn_type = "AWS::Connect::QuickConnect"

    def fetch(self, instance_id: str, arn: ARN):
        return self.client.describe_quick_connect(
            InstanceId=instance_id,
            QuickConnectId=arn.subresource_id(),
        )

    def parse(self, arn: ARN, raw: DescribeQuickConnectResponseTypeDef):
        qc = raw.get("QuickConnect", {}) or {}
        refs: set[ARN] = set()

        # Instance reference
        instance_arn_str = qc.get("InstanceArn") or _infer_instance_arn_from_subresource(arn)
        instance_arn = ARN(instance_arn_str)
        refs.add(instance_arn)

        # QuickConnectConfig may contain QueueArn or ContactFlowArn
        cfg = qc.get("QuickConnectConfig", {}) or {}
        for key in ("QueueArn", "ContactFlowArn"):
            val = cfg.get(key)
            if val and isinstance(val, str):
                parsed = ARN.try_parse(val)
                if parsed:
                    refs.add(parsed)

        props = {
            "Name": qc.get("Name"),
            "Description": qc.get("Description"),
            "QuickConnectConfig": cfg,
            "InstanceArn": instance_arn_str,
            "Tags": qc.get("Tags", {}),
        }

        metadata = {
            "EmbeddedReferenceCount": len(refs),
            "Source": "describe_quick_connect",
        }

        return ResourceNode(
            logical_id=f"ConnectQuickConnect{qc.get('Name', arn.resource_id)}",
            service="connect",
            cfn_type=self.cfn_type,
            properties=props,
            referenced_arns=refs,
            arns={"QuickConnect": arn},
            metadata=metadata,
        )
