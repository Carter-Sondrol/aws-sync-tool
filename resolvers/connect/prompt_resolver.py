from __future__ import annotations
from typing import Any
from mypy_boto3_connect.type_defs import DescribePromptResponseTypeDef
from graph.dependency_graph import ResourceNode
from utils.arn import ARN
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
        prompt = raw.get("Prompt", {})
        props: dict[str, Any] = {
            "Name": prompt.get("Name"),
            "Description": prompt.get("Description"),
            "S3Uri": prompt.get("S3Uri"),
            "InstanceArn": (prompt.get("InstanceArn") or _infer_instance_arn_from_subresource(arn)),
        }

        refs: set[ARN] = set()
        s3_uri = prompt.get("S3Uri")
        if isinstance(s3_uri, str):
            if s3_uri.startswith("arn:aws:s3:::"):
                parsed = ARN.try_parse(s3_uri)
                if parsed:
                    refs.add(parsed)
            elif s3_uri.startswith("s3://"):
                bucket, _, key = s3_uri[5:].partition("/")
                try:
                    refs.add(ARN(f"arn:aws:s3:::{bucket}/{key}"))
                except ValueError:
                    pass

        return ResourceNode(
            logical_id=f"ConnectPrompt{prompt.get('Name', arn.resource_id)}",
            service="connect",
            cfn_type=self.cfn_type,
            properties=props,
            referenced_arns=refs,
            arns={"Prompt": arn},
        )
