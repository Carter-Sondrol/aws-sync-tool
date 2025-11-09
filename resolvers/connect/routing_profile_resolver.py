from __future__ import annotations
from typing import Any, Set
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
    """Resolve AWS Connect Routing Profiles."""

    resource_type = "routing-profile"
    cfn_type = "AWS::Connect::RoutingProfile"

    def fetch(self, instance_id: str, arn: ARN):
        return self.client.describe_routing_profile(
            InstanceId=instance_id,
            RoutingProfileId=arn.subresource_id(),
        )

    def parse(self, arn: ARN, raw: DescribeRoutingProfileResponseTypeDef):
        prof = raw.get("RoutingProfile", {}) or {}
        refs: set[ARN] = set()

        # Instance reference
        instance_arn_str = prof.get("InstanceArn") or _infer_instance_arn_from_subresource(arn)
        instance_arn = ARN(instance_arn_str)
        refs.add(instance_arn)

        # DefaultOutboundQueueArn and possibly other queues
        if prof.get("DefaultOutboundQueueArn"):
            parsed = ARN.try_parse(prof["DefaultOutboundQueueArn"])
            if parsed:
                refs.add(parsed)

        for q in prof.get("MediaConcurrencies", []) or []:
            if isinstance(q, dict) and "QueueArn" in q:
                parsed = ARN.try_parse(q["QueueArn"])
                if parsed:
                    refs.add(parsed)

        props = {
            "Name": prof.get("Name"),
            "Description": prof.get("Description"),
            "InstanceArn": instance_arn_str,
            "DefaultOutboundQueueArn": prof.get("DefaultOutboundQueueArn"),
            "MediaConcurrencies": prof.get("MediaConcurrencies"),
            "Tags": prof.get("Tags", {}),
        }

        metadata = {
            "EmbeddedReferenceCount": len(refs),
            "Source": "describe_routing_profile",
        }

        return ResourceNode(
            logical_id=f"ConnectRoutingProfile{prof.get('Name', arn.resource_id)}",
            service="connect",
            cfn_type=self.cfn_type,
            properties=props,
            referenced_arns=refs,
            arns={"RoutingProfile": arn},
            metadata=metadata,
        )
