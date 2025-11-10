from __future__ import annotations

from typing import Any, Iterable, Set, Optional
import logging
from botocore.exceptions import ClientError
from boto3 import Session
from mypy_boto3_connect import ConnectClient
from mypy_boto3_connect.type_defs import DescribePromptResponseTypeDef

from graph.dependency_graph import ResourceNode
from resolvers.connect.base_connect import BaseConnectResolver
from utils.arn import ARN

logger = logging.getLogger(__name__)


class PromptResolver(BaseConnectResolver[ConnectClient, DescribePromptResponseTypeDef]):
    """Resolver for Amazon Connect Prompts (audio assets)."""

    resource_type = "prompt"
    cfn_type = "AWS::Connect::Prompt"

    # ------------------------------------------------------------------
    def list_resources(self) -> Iterable[ARN]:
        for prompt in self.list_with_instance("list_prompts", "PromptSummaryList"):
            arn_str = prompt.get("Arn")
            if arn_str:
                yield ARN.parse_cached(arn_str)

    # ------------------------------------------------------------------
    def fetch_resource(self, arn: ARN) -> DescribePromptResponseTypeDef:
        self.ensure_instance_id(arn)
        if not self.instance_id:
            raise ValueError("Connect instance ID is required")
        sub_id = arn.subresource_id()
        if not sub_id:
            raise ValueError(f"Missing prompt ID in ARN: {arn}")

        try:
            return self.client.describe_prompt(
                InstanceId=self.instance_id,
                PromptId=sub_id,
            )
        except ClientError as e:
            self.log.error("Failed to fetch Connect prompt %s: %s", arn, e)
            raise

    # ------------------------------------------------------------------
    def to_node(self, arn: ARN, raw: DescribePromptResponseTypeDef) -> ResourceNode:
        prompt = raw.get("Prompt", {}) or {}
        refs: Set[ARN] = set()

        # Always reference the Connect instance
        instance_arn = prompt.get("InstanceArn") or self.instance_arn
        if instance_arn:
            refs.add(ARN.parse_cached(instance_arn))

        # Handle S3Uri as a soft reference (do NOT fabricate artifact ARN)
        s3_uri = prompt.get("S3Uri")
        s3_arn: Optional[ARN] = None
        if isinstance(s3_uri, str) and s3_uri.startswith("arn:aws:s3:"):
            s3_arn = ARN.parse_cached(s3_uri)
            refs.add(s3_arn)

        props: dict[str, Any] = {
            "Name": prompt.get("Name"),
            "Description": prompt.get("Description"),
            "S3Uri": s3_uri,
            "InstanceArn": instance_arn,
            "Tags": prompt.get("Tags", {}),
        }

        meta = {
            "Source": "boto3.describe_prompt",
            "HasS3Reference": bool(s3_uri),
            "S3ReferenceType": "ARN" if s3_arn else "URI",
        }

        node = self.make_node(
            arn,
            logical_id=f"ConnectPrompt{prompt.get('Name', arn.resource_id)}",
            properties=props,
            metadata=meta,
        )

        node.referenced_arns |= refs
        return node
