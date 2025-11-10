from __future__ import annotations

from typing import Any, Iterable, Set
from botocore.exceptions import ClientError
from boto3 import Session
from mypy_boto3_connect import ConnectClient
from mypy_boto3_connect.type_defs import DescribeQuickConnectResponseTypeDef

from graph.dependency_graph import ResourceNode
from resolvers.connect.base_connect import BaseConnectResolver
from utils.arn import ARN


class QuickConnectResolver(BaseConnectResolver[ConnectClient, DescribeQuickConnectResponseTypeDef]):
    """Resolver for Amazon Connect Quick Connects."""

    resource_type = "quick-connect"
    cfn_type = "AWS::Connect::QuickConnect"

    def list_resources(self) -> Iterable[ARN]:
        for qc in self.list_with_instance("list_quick_connects", "QuickConnectSummaryList"):
            arn_str = qc.get("Arn")
            if arn_str:
                yield ARN.parse_cached(arn_str)

    def fetch_resource(self, arn: ARN) -> DescribeQuickConnectResponseTypeDef:
        self.ensure_instance_id(arn)
        if not self.instance_id:
            raise ValueError("Connect instance ID is required")
        sub_id = arn.subresource_id()
        if not sub_id:
            raise ValueError(f"Invalid QuickConnect ARN: {arn}")

        try:
            return self.client.describe_quick_connect(
                InstanceId=self.instance_id,
                QuickConnectId=sub_id,
            )
        except ClientError as e:
            self.log.error("Failed to fetch QuickConnect %s: %s", arn, e)
            raise

    def to_node(self, arn: ARN, raw: DescribeQuickConnectResponseTypeDef) -> ResourceNode:
        qc = raw.get("QuickConnect", {}) or {}
        refs: Set[ARN] = set()

        inst_arn = qc.get("InstanceArn") or self.instance_arn
        if inst_arn:
            refs.add(ARN.parse_cached(inst_arn))

        cfg = qc.get("QuickConnectConfig", {}) or {}
        for key in ("QueueArn", "ContactFlowArn"):
            val = cfg.get(key)
            if val and ARN.is_valid(val):
                refs.add(ARN.parse_cached(val))

        props = {
            "Name": qc.get("Name"),
            "Description": qc.get("Description"),
            "QuickConnectConfig": cfg,
            "InstanceArn": inst_arn,
            "Tags": qc.get("Tags", {}),
        }

        meta = {"EmbeddedReferenceCount": len(refs), "Source": "boto3.describe_quick_connect"}

        node = self.make_node(
            arn,
            logical_id=f"ConnectQuickConnect{qc.get('Name', arn.resource_id)}",
            properties=props,
            metadata=meta,
        )
        node.referenced_arns |= refs
        return node
