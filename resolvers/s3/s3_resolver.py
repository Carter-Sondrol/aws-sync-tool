from __future__ import annotations
from typing import Any, Mapping, Optional, Set

from botocore.exceptions import ClientError
from mypy_boto3_s3 import S3Client
from mypy_boto3_s3.type_defs import (
    GetBucketLocationOutputTypeDef,
    GetBucketPolicyOutputTypeDef,
    GetObjectOutputTypeDef,
)

from resolvers.base_resolver import BaseResolver
from resolvers.registry import register_resolver
from graph.resource_node import ResourceNode
from utils.arn import ARN, extract_dependencies


@register_resolver("s3:bucket")
class S3BucketResolver(BaseResolver[S3Client, Mapping[str, Any]]):
    service = "s3"
    resource_type = "bucket"
    cfn_type = "AWS::S3::Bucket"

    def fetch_resource(self, arn: ARN) -> Mapping[str, Any]:
        bucket, _ = arn.as_s3_components() or (None, None)
        if not bucket:
            raise ValueError(f"Invalid S3 bucket ARN: {arn}")

        # IMPORTANT: S3 is global — do NOT use client_for().
        s3 = self.session.client("s3")

        data: dict[str, Any] = {"Bucket": bucket}

        # Region
        try:
            loc = s3.get_bucket_location(Bucket=bucket)
            data["Location"] = loc.get("LocationConstraint")
        except ClientError as e:
            self.log.warning(f"S3 get_bucket_location failed for {bucket}: {e}")

        # Bucket policy (optional)
        try:
            pol = s3.get_bucket_policy(Bucket=bucket)
            data["Policy"] = pol.get("Policy")
        except ClientError:
            pass  # Bucket may have no policy

        return data

    def to_node(self, arn: ARN, data: Mapping[str, Any]) -> ResourceNode:
        bucket = data.get("Bucket")

        props = {
            "BucketName": bucket,
            "Location": data.get("Location"),
            "Policy": data.get("Policy"),
        }

        refs = extract_dependencies(props)

        node = self.make_node(
            arn,
            logical_id=f"S3Bucket{bucket.replace('-', '')}", # type: ignore
            properties=props,
            metadata={"Source": "get_bucket"},
            reference_only=False,
        )

        node.referenced_arns |= refs
        return node
