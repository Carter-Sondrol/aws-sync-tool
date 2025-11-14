from __future__ import annotations
from typing import Any, Set

from botocore.exceptions import ClientError
from mypy_boto3_connect import ConnectClient
from mypy_boto3_connect.type_defs import DescribePromptResponseTypeDef

from resolvers.registry import register_resolver
from resolvers.connect.base_connect import BaseConnectResolver
from graph.resource_node import ResourceNode
from utils.arn import ARN


@register_resolver("connect:prompt")
class PromptResolver(BaseConnectResolver[ConnectClient, DescribePromptResponseTypeDef]):
    resource_type = "prompt"
    cfn_type = "AWS::Connect::Prompt"

    def fetch_resource(self, arn: ARN) -> DescribePromptResponseTypeDef:
        self.ensure_instance_id(arn)
        sub_id = arn.subresource_id()
        try:
            if not self.instance_id or not sub_id:
                raise ValueError(f"Invalid ARN {arn}")
            return self.client.describe_prompt(
                InstanceId=self.instance_id,
                PromptId=sub_id,
            )
        except ClientError:
            self.log.error("Failed to fetch %s", arn, exc_info=True)
            raise

    def to_node(self, arn: ARN, raw: DescribePromptResponseTypeDef) -> ResourceNode:
        prompt = raw.get("Prompt", {}) or {}
        refs: Set[ARN] = set()

        inst_arn = prompt.get("InstanceArn") or self.instance_arn
        if inst_arn:
            refs.add(ARN.parse_cached(inst_arn))

        s3_uri = prompt.get("S3Uri")
        if isinstance(s3_uri, str) and s3_uri.startswith("arn:aws:s3:"):
            refs.add(ARN.parse_cached(s3_uri))

        props = {
            "Name": prompt.get("Name"),
            "Description": prompt.get("Description"),
            "S3Uri": s3_uri,
            "InstanceArn": inst_arn,
            "Tags": prompt.get("Tags", {}),
        }

        node = self.make_node(
            arn,
            logical_id=f"ConnectPrompt{self.make_logical_id(prompt.get('Name'))}",
            properties=props,
            metadata={"Source": "describe_prompt", "EmbeddedReferenceCount": len(refs)},
        )
        node.referenced_arns |= refs
        return node
