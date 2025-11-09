from __future__ import annotations
from mypy_boto3_connect.type_defs import DescribeRoutingProfileResponseTypeDef
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


class RoutingProfileResolver(BaseConnectSubResolver[DescribeRoutingProfileResponseTypeDef]):
    resource_type = "routing-profile"
    cfn_type = "AWS::Connect::RoutingProfile"

    def fetch(self, instance_id: str, arn: ARN):
        return self.client.describe_routing_profile(
            InstanceId=instance_id,
            RoutingProfileId=arn.subresource_id(),
        )

    def parse(self, arn: ARN, raw: DescribeRoutingProfileResponseTypeDef):
        prof = raw.get("RoutingProfile", {})

        # Ensure InstanceArn
        if not prof.get("InstanceArn"):
            prof["InstanceArn"] = _infer_instance_arn_from_subresource(arn)

        refs: set[ARN] = set()
        if prof.get("DefaultOutboundQueueArn"):
            parsed = ARN.try_parse(prof["DefaultOutboundQueueArn"])
            if parsed:
                refs.add(parsed)

        return ResourceNode(
            logical_id=f"ConnectRoutingProfile{prof.get('Name', arn.resource_id)}",
            service="connect",
            cfn_type=self.cfn_type,
            properties=prof,
            referenced_arns=refs,
            arns={"RoutingProfile": arn},
        )
