from __future__ import annotations
from typing import Any, Set

from botocore.exceptions import ClientError
from mypy_boto3_connect import ConnectClient
from mypy_boto3_connect.type_defs import DescribeViewResponseTypeDef

from resolvers.registry import register_resolver
from resolvers.connect.base_connect import BaseConnectResolver
from graph.resource_node import ResourceNode
from utils.arn import ARN


@register_resolver("connect:view")
class ViewResolver(BaseConnectResolver[ConnectClient, DescribeViewResponseTypeDef]):
    resource_type = "view"
    cfn_type = "AWS::Connect::View"

    def fetch_resource(self, arn: ARN) -> DescribeViewResponseTypeDef:
        self.ensure_instance_id(arn)
        sub_id = arn.subresource_id()
        try:
            if not self.instance_id or not sub_id:
                raise ValueError(f"Invalid ARN {arn}")
            return self.client.describe_view(
                InstanceId=self.instance_id,
                ViewId=sub_id,
            )
        except ClientError:
            self.log.error("Failed to fetch %s", arn, exc_info=True)
            raise

    def to_node(self, arn: ARN, raw: DescribeViewResponseTypeDef) -> ResourceNode:
        view = raw.get("ViewVersion") or raw.get("View") or {}
        refs: Set[ARN] = set()

        inst_arn = view.get("InstanceArn") or self.instance_arn
        if inst_arn:
            refs.add(ARN.parse_cached(inst_arn))

        props = {
            "Name": view.get("Name"),
            "Description": view.get("Description"),
            "Status": view.get("Status"),
            "Content": view.get("Content"),
            "InstanceArn": inst_arn,
            "Tags": view.get("Tags", {}),
        }

        node = self.make_node(
            arn,
            logical_id=f"ConnectView{self.make_logical_id(view.get('Name'))}",
            properties=props,
            metadata={"Source": "describe_view", "EmbeddedReferenceCount": len(refs)},
        )
        node.referenced_arns |= refs
        return node
