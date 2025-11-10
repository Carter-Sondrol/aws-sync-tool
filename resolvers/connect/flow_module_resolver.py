from __future__ import annotations

import json
from typing import Any, Iterable, Set
from boto3 import Session
from botocore.exceptions import ClientError
from mypy_boto3_connect import ConnectClient
from mypy_boto3_connect.type_defs import DescribeContactFlowModuleResponseTypeDef

from graph.dependency_graph import ResourceNode
from resolvers.connect.base_connect import BaseConnectResolver
from utils.arn import ARN, extract_dependencies


class FlowModuleResolver(BaseConnectResolver[ConnectClient, DescribeContactFlowModuleResponseTypeDef]):
    """
    Resolver for Amazon Connect Contact Flow Modules.
    Captures embedded dependencies and instance linkage.
    """

    resource_type = "contact-flow-module"
    aliases = ("flow-module",)
    cfn_type = "AWS::Connect::ContactFlowModule"

    def list_resources(self) -> Iterable[ARN]:
        for mod in self.list_with_instance("list_contact_flow_modules", "ContactFlowModulesSummaryList"):
            arn_str = mod.get("Arn")
            if arn_str:
                yield ARN.parse_cached(arn_str)

    def fetch_resource(self, arn: ARN) -> DescribeContactFlowModuleResponseTypeDef:
        self.ensure_instance_id(arn)
        if not self.instance_id:
            raise ValueError("Connect instance ID is required")
        sub_id = arn.subresource_id()
        if not sub_id:
            raise ValueError(f"Invalid ARN missing subresource ID: {arn}")

        try:
            return self.client.describe_contact_flow_module(
                InstanceId=self.instance_id,
                ContactFlowModuleId=sub_id,
            )
        except ClientError as e:
            self.log.error("Failed to fetch flow module %s: %s", arn, e)
            raise

    def to_node(self, arn: ARN, raw: DescribeContactFlowModuleResponseTypeDef) -> ResourceNode:
        mod = raw.get("ContactFlowModule", {}) or {}
        content = mod.get("Content", "") or ""

        try:
            refs: Set[ARN] = extract_dependencies(json.loads(content))
        except Exception:
            refs = extract_dependencies(content)

        inst_arn = mod.get("InstanceArn") or self.instance_arn
        if inst_arn:
            refs.add(ARN.parse_cached(inst_arn))

        props: dict[str, Any] = {
            "Name": mod.get("Name"),
            "Description": mod.get("Description"),
            "Content": content,
            "InstanceArn": inst_arn,
            "Tags": mod.get("Tags", {}),
        }

        meta = {"EmbeddedReferenceCount": len(refs), "Source": "boto3.describe_contact_flow_module"}

        node = self.make_node(
            arn,
            logical_id=f"ConnectModule{mod.get('Name', arn.resource_id)}",
            properties=props,
            metadata=meta,
        )
        node.referenced_arns |= refs
        return node
