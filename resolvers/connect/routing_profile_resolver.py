from __future__ import annotations

from typing import Any, Iterable, Set, cast
from botocore.exceptions import ClientError
from boto3 import Session
from mypy_boto3_connect import ConnectClient
from mypy_boto3_connect.type_defs import DescribeRoutingProfileResponseTypeDef

from graph.dependency_graph import ResourceNode
from resolvers.connect.base_connect import BaseConnectResolver
from utils.arn import ARN


class RoutingProfileResolver(
    BaseConnectResolver[ConnectClient, DescribeRoutingProfileResponseTypeDef]
):
    """Resolver for Amazon Connect Routing Profiles."""

    resource_type = "routing-profile"
    cfn_type = "AWS::Connect::RoutingProfile"

    def fetch_resource(self, arn: ARN) -> DescribeRoutingProfileResponseTypeDef:
        self.ensure_instance_id(arn)
        sub_id = arn.subresource_id()
        try:
            if not self.instance_id or not sub_id:
                raise ValueError(f"Invalid ARN {arn}")
            return self.client.describe_routing_profile(
                InstanceId=self.instance_id,
                RoutingProfileId=sub_id,
            )
        except ClientError as e:
            self.log.error("Failed to fetch RoutingProfile %s: %s", arn, e)
            raise

    def to_node(
        self, arn: ARN, raw: DescribeRoutingProfileResponseTypeDef
    ) -> ResourceNode:
        # Cast to generic dict to handle fields missing from stubs
        prof = cast(dict[str, Any], raw.get("RoutingProfile", {}) or {})
        refs: Set[ARN] = set()

        inst_arn = prof.get("InstanceArn") or self.instance_arn
        if inst_arn:
            refs.add(ARN.parse_cached(inst_arn))

        # Handle DefaultOutboundQueueArn (newer field not in stub)
        dobq = prof.get("DefaultOutboundQueueArn")
        if dobq and ARN.is_valid(dobq):
            refs.add(ARN.parse_cached(dobq))

        for mc in prof.get("MediaConcurrencies", []) or []:
            if (
                isinstance(mc, dict)
                and "QueueArn" in mc
                and ARN.is_valid(mc["QueueArn"])
            ):
                refs.add(ARN.parse_cached(mc["QueueArn"]))

        props: dict[str, Any] = {
            "Name": prof.get("Name"),
            "Description": prof.get("Description"),
            "InstanceArn": inst_arn,
            "DefaultOutboundQueueArn": dobq,
            "MediaConcurrencies": prof.get("MediaConcurrencies"),
            "Tags": prof.get("Tags", {}),
        }

        meta = {
            "EmbeddedReferenceCount": len(refs),
            "Source": "boto3.describe_routing_profile",
        }

        node = self.make_node(
            arn,
            logical_id=f"ConnectRoutingProfile{prof.get('Name', arn.resource_id)}",
            properties=props,
            metadata=meta,
        )
        node.referenced_arns |= refs
        return node
