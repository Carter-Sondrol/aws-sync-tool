from __future__ import annotations

from typing import Any, Iterable, cast
from botocore.exceptions import ClientError
from boto3 import Session
from mypy_boto3_connect import ConnectClient
from mypy_boto3_connect.type_defs import DescribeViewResponseTypeDef

from graph.dependency_graph import ResourceNode
from resolvers.connect.base_connect import BaseConnectResolver
from utils.arn import ARN


class ViewResolver(BaseConnectResolver[ConnectClient, DescribeViewResponseTypeDef]):
    """Resolver for Amazon Connect Views (agent desktop configuration)."""

    resource_type = "view"
    cfn_type = "AWS::Connect::View"

    def list_resources(self) -> Iterable[ARN]:
        for view in self.list_with_instance("list_views", "ViewsSummaryList"):
            arn_str = view.get("Arn")
            if arn_str:
                yield ARN.parse_cached(arn_str)

    def fetch_resource(self, arn: ARN) -> DescribeViewResponseTypeDef:
        self.ensure_instance_id(arn)
        """Fetch the latest View or ViewVersion data."""
        if not self.instance_id:
            raise ValueError("Connect instance ID is required")

        sub_id = arn.subresource_id()
        if not sub_id:
            raise ValueError(f"Invalid View ARN: {arn}")

        try:
            describe_view_version = getattr(self.client, "describe_view_version", None)
            if callable(describe_view_version):  # type: ignore[attr-defined]
                return cast(
                    DescribeViewResponseTypeDef,
                    describe_view_version(
                        InstanceId=self.instance_id,
                        ViewId=sub_id,
                        ViewVersion="$LATEST",
                    ),
                )
            return self.client.describe_view(InstanceId=self.instance_id, ViewId=sub_id)
        except ClientError as e:
            self.log.error("Failed to fetch Connect View %s: %s", arn, e)
            raise

    def to_node(self, arn: ARN, raw: DescribeViewResponseTypeDef) -> ResourceNode:
        view = raw.get("ViewVersion") or raw.get("View") or {}
        inst_arn = view.get("InstanceArn") or self.instance_arn

        props: dict[str, Any] = {
            "Name": view.get("Name"),
            "Description": view.get("Description"),
            "Status": view.get("Status"),
            "Content": view.get("Content"),
            "InstanceArn": inst_arn,
            "Tags": view.get("Tags", {}),
        }

        meta = {"Source": "boto3.describe_view"}

        return self.make_node(
            arn,
            logical_id=f"ConnectView{view.get('Name', arn.resource_id)}",
            properties=props,
            metadata=meta,
        )
