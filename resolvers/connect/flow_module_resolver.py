from __future__ import annotations
import json
from typing import Any, Set
from botocore.exceptions import ClientError
from mypy_boto3_connect import ConnectClient
from mypy_boto3_connect.type_defs import DescribeContactFlowModuleResponseTypeDef

from resolvers.registry import register_resolver
from resolvers.connect.base_connect import BaseConnectResolver
from graph.resource_node import ResourceNode
from utils.arn import ARN, extract_dependencies


@register_resolver("connect:flow-module")
class FlowModuleResolver(BaseConnectResolver[ConnectClient, DescribeContactFlowModuleResponseTypeDef]):
    resource_type = "flow-module"
    cfn_type = "AWS::Connect::ContactFlowModule"

    def fetch_resource(self, arn: ARN) -> DescribeContactFlowModuleResponseTypeDef:
        self.ensure_instance_id(arn)
        sub_id = arn.subresource_id()
        try:
            if not self.instance_id or not sub_id:
                raise ValueError(f"Invalid ARN {arn}")
            return self.client.describe_contact_flow_module(
                InstanceId=self.instance_id,
                ContactFlowModuleId=sub_id,
            )
        except ClientError:
            self.log.error("Failed to fetch %s", arn, exc_info=True)
            raise

    def to_node(self, arn: ARN, raw: DescribeContactFlowModuleResponseTypeDef) -> ResourceNode:
        mod = raw.get("ContactFlowModule", {}) or {}
        content = mod.get("Content") or ""

        try:
            refs: Set[ARN] = extract_dependencies(json.loads(content))
        except Exception:
            refs = extract_dependencies(content)

        inst_arn = mod.get("InstanceArn") or self.instance_arn
        if inst_arn:
            refs.add(ARN.parse_cached(inst_arn))

        props = {
            "Name": mod.get("Name"),
            "Description": mod.get("Description"),
            "Content": content,
            "InstanceArn": inst_arn,
            "Tags": mod.get("Tags", {}),
        }

        node = self.make_node(
            arn,
            logical_id=f"ConnectModule{self.make_logical_id(mod.get('Name'))}",
            properties=props,
            metadata={"Source": "describe_contact_flow_module", "EmbeddedReferenceCount": len(refs)},
        )
        node.referenced_arns |= refs
        return node
