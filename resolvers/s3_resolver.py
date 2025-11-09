from __future__ import annotations

import logging
from typing import Any, Union, cast, Optional, Set
from boto3 import Session
from mypy_boto3_s3 import S3Client
from mypy_boto3_s3.type_defs import (
    GetBucketPolicyOutputTypeDef,
    GetBucketEncryptionOutputTypeDef,
    GetBucketTaggingOutputTypeDef,
)
from botocore.exceptions import ClientError

from resolvers.base import BaseResolver
from graph.dependency_graph import ResourceNode
from utils.arn import ARN, extract_dependencies

logger = logging.getLogger(__name__)

S3Response = dict[str, Any]


class S3Resolver(BaseResolver[S3Client, S3Response]):
    """Resolver for AWS S3 buckets."""

    def fetch(self, arn: ARN) -> S3Response:
        """Fetch bucket configuration (policy, encryption, tags)."""
        bucket_name = arn.resource_id or arn.resource
        logger.info("[S3Resolver] Fetching %s", arn)

        result: S3Response = {}
        try:
            result["Policy"] = self.client.get_bucket_policy(Bucket=bucket_name).get("Policy")
        except ClientError:
            pass

        try:
            result["Encryption"] = self.client.get_bucket_encryption(Bucket=bucket_name).get("ServerSideEncryptionConfiguration")
        except ClientError:
            pass

        try:
            tag_resp: GetBucketTaggingOutputTypeDef = self.client.get_bucket_tagging(Bucket=bucket_name)
            result["Tags"] = tag_resp.get("TagSet", [])
        except ClientError:
            pass

        return result

    def parse(self, arn: ARN, raw: S3Response) -> ResourceNode[dict[str, Any]]:
        """Convert fetched S3 bucket data into a ResourceNode."""
        bucket_name = arn.resource_id or arn.resource
        refs: Set[ARN] = set()

        # Extract embedded ARNs from policy text if present
        policy = raw.get("Policy")
        if isinstance(policy, str):
            refs |= extract_dependencies(policy)

        props: dict[str, Any] = {
            "BucketName": bucket_name,
        }

        if raw.get("Encryption"):
            props["BucketEncryption"] = raw["Encryption"]

        if raw.get("Tags"):
            props["Tags"] = raw["Tags"]

        return ResourceNode(
            logical_id=f"S3Bucket{bucket_name.replace('-', '').replace('_', '')}",
            service="s3",
            cfn_type="AWS::S3::Bucket",
            properties=props,
            referenced_arns=refs,
            arns={"Bucket": arn},
            metadata={"HasPolicy": bool(policy), "HasEncryption": bool(raw.get("Encryption"))},
        )
