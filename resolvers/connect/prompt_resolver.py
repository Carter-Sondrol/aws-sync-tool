from __future__ import annotations
from typing import Any, Set
from mypy_boto3_connect.type_defs import DescribePromptResponseTypeDef
from graph.dependency_graph import ResourceNode
from utils.arn import ARN, make_artifact_arn, to_artifact_arn
from .base_connect import BaseConnectSubResolver


def _infer_instance_arn_from_subresource(arn: ARN) -> str:
    parts = arn.resource.split("/")
    if "instance" in parts:
        idx = parts.index("instance")
        if idx + 1 < len(parts):
            inst_id = parts[idx + 1]
            return f"arn:aws:{arn.service}:{arn.region}:{arn.account_id}:instance/{inst_id}"
    raise ValueError(f"Cannot infer Connect Instance from ARN: {arn}")


class PromptResolver(BaseConnectSubResolver[DescribePromptResponseTypeDef]):
    resource_type = "prompt"
    cfn_type = "AWS::Connect::Prompt"

    def fetch(self, instance_id: str, arn: ARN):
        return self.client.describe_prompt(
            InstanceId=instance_id,
            PromptId=arn.subresource_id(),
        )

    def parse(self, arn: ARN, raw: DescribePromptResponseTypeDef):
        prompt = raw.get("Prompt", {}) or {}
        refs: Set[ARN] = set()

        # Always reference its Connect instance
        instance_arn = prompt.get("InstanceArn") or _infer_instance_arn_from_subresource(arn)
        refs.add(ARN(instance_arn))

        # If this prompt has an S3Uri, create a fake artifact ARN for it
        s3_uri = prompt.get("S3Uri")
        if isinstance(s3_uri, str) and s3_uri:
            artifact_arn = to_artifact_arn(s3_uri)
            refs.add(artifact_arn)

        prompt["InstanceArn"] = instance_arn

        return ResourceNode(
            logical_id=f"ConnectPrompt{prompt.get('Name', arn.resource_id)}",
            service="connect",
            cfn_type=self.cfn_type,
            properties=prompt,
            referenced_arns=refs,
            arns={"Prompt": arn},
            metadata={
                "Source": "describe_prompt",
                "HasArtifact": bool(s3_uri),
                "PortableArtifact": bool(s3_uri),
            },
        )
