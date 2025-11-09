from __future__ import annotations
from typing import Any

from mypy_boto3_connect.type_defs import DescribeViewResponseTypeDef
from botocore.exceptions import ClientError

from graph.dependency_graph import ResourceNode
from utils.arn import ARN
from .base_connect import BaseConnectSubResolver


class ViewResolver(BaseConnectSubResolver[dict[str, Any]]):
    resource_type = "view"
    cfn_type = "AWS::Connect::View"

    def fetch(self, instance_id: str, arn: ARN):
        """
        Handles both arn:...:view/<id> and arn:...:view/<id>:$LATEST.
        Falls back to describe_view if describe_view_version() is unavailable.
        """
        parts = arn.resource_parts
        if not instance_id and "instance" in parts:
            try:
                idx = parts.index("instance")
                instance_id = parts[idx + 1]
            except Exception:
                raise ValueError(f"Cannot extract InstanceId from {arn}")

        # Extract version suffix if present
        view_id = arn.subresource_id()
        view_version = None
        if parts[-1].startswith("$"):
            view_version = parts[-1]
        elif ":" in arn.resource:
            tail = arn.resource.split(":")[-1]
            if tail.startswith("$") or tail.isdigit():
                view_version = tail

        # Call the correct API dynamically
        try:
            if view_version and hasattr(self.client, "describe_view_version"):
                return getattr(self.client, "describe_view_version")(
                    InstanceId=instance_id,
                    ViewId=view_id,
                    ViewVersion=view_version,
                )
            else:
                # default: latest version
                return self.client.describe_view(
                    InstanceId=instance_id,
                    ViewId=view_id,
                )
        except ClientError as e:
            if e.response["Error"]["Code"] == "ResourceNotFoundException":
                return {"ResourceNotFound": True, "Arn": str(arn)}
            raise

    def parse(self, arn: ARN, raw: dict[str, Any]):
        # Support both describe_view and describe_view_version outputs
        view = raw.get("View") or raw.get("ViewVersion") or {}
        instance_arn = view.get("InstanceArn")
        if not instance_arn and arn:
            parts = arn.resource_parts
            if "instance" in parts:
                try:
                    inst_idx = parts.index("instance")
                    inst_id = parts[inst_idx + 1]
                    instance_arn = f"arn:aws:{arn.service}:{arn.region}:{arn.account_id}:instance/{inst_id}"
                except Exception:
                    instance_arn = None
        props: dict[str, Any] = {
            "Name": view.get("Name"),
            "Description": view.get("Description"),
            "Status": view.get("Status"),
            "Content": view.get("Content"),
            "InstanceArn": instance_arn,
        }
        return ResourceNode(
            logical_id=f"ConnectView{view.get('Name', arn.resource_id)}",
            service="connect",
            cfn_type=self.cfn_type,
            properties=props,
            arns={"View": arn},
        )
