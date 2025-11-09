from __future__ import annotations
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
    resource_type = "quick-connect"
    cfn_type = "AWS::Connect::QuickConnect"

    def fetch(self, instance_id: str, arn: ARN):
        return self.client.describe_quick_connect(
            InstanceId=instance_id,
            QuickConnectId=arn.subresource_id(),
        )

    def parse(self, arn: ARN, raw: DescribeQuickConnectResponseTypeDef):
        qc = raw.get("QuickConnect", {})

        if not qc.get("InstanceArn"):
            qc["InstanceArn"] = _infer_instance_arn_from_subresource(arn)

        qc_cfg = qc.get("QuickConnectConfig", {}) or {}
        refs: set[ARN] = set()
        for k in ("QueueArn", "ContactFlowArn"):
            if k in qc_cfg and isinstance(qc_cfg[k], str):
                parsed = ARN.try_parse(qc_cfg[k])
                if parsed:
                    refs.add(parsed)

        return ResourceNode(
            logical_id=f"ConnectQuickConnect{qc.get('Name', arn.resource_id)}",
            service="connect",
            cfn_type=self.cfn_type,
            properties=qc,
            referenced_arns=refs,
            arns={"QuickConnect": arn},
        )
