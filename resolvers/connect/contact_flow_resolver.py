from __future__ import annotations

import json
from typing import Any, Set
from botocore.exceptions import ClientError
from mypy_boto3_connect import ConnectClient
from mypy_boto3_connect.type_defs import DescribeContactFlowResponseTypeDef

from resolvers.registry import register_resolver
from resolvers.connect.base_connect import BaseConnectResolver
from graph.resource_node import ResourceNode
from utils.arn import ARN, extract_dependencies


@register_resolver("connect:contact-flow")
class ContactFlowResolver(BaseConnectResolver[ConnectClient, DescribeContactFlowResponseTypeDef]):
    resource_type = "contact-flow"
    cfn_type = "AWS::Connect::ContactFlow"

    def fetch_resource(self, arn: ARN) -> DescribeContactFlowResponseTypeDef:
        self.ensure_instance_id(arn)
        sub_id = arn.subresource_id()
        try:
            if not self.instance_id or not sub_id:
                raise ValueError(f"Invalid ARN {arn}")
                
            return self.client.describe_contact_flow(
                InstanceId=self.instance_id,
                ContactFlowId=sub_id,
            )
        except ClientError:
            self.log.error("Failed to fetch %s", arn, exc_info=True)
            raise

    def to_node(self, arn: ARN, raw: DescribeContactFlowResponseTypeDef) -> ResourceNode:
        flow = raw.get("ContactFlow", {}) or {}
        content = flow.get("Content") or ""

        # JSON or inline dependency extraction
        try:
            refs: Set[ARN] = extract_dependencies(json.loads(content))
        except Exception:
            refs = extract_dependencies(content)

        inst_arn = flow.get("InstanceArn") or self.instance_arn
        if inst_arn:
            refs.add(ARN.parse_cached(inst_arn))

        props = {
            "Name": flow.get("Name"),
            "Type": flow.get("Type"),
            "Description": flow.get("Description"),
            "Content": content,
            "InstanceArn": inst_arn,
            "Tags": flow.get("Tags", {}),
        }

        node = self.make_node(
            arn,
            logical_id=f"ConnectFlow{self.make_logical_id(flow.get('Name'))}",
            properties=props,
            metadata={"Source": "describe_contact_flow", "EmbeddedReferenceCount": len(refs)},
        )
        node.referenced_arns |= refs
        return node
