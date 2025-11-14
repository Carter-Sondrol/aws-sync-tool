from __future__ import annotations
from typing import Any, Mapping, Optional, Set

from botocore.exceptions import ClientError
from mypy_boto3_s3 import S3Client
from mypy_boto3_s3.type_defs import (
    GetObjectOutputTypeDef,
)

from resolvers.base_resolver import BaseResolver
from resolvers.registry import register_resolver
from graph.resource_node import ResourceNode
from utils.arn import ARN, extract_dependencies


@register_resolver("s3:object")
class S3ObjectResolver(BaseResolver[S3Client, Mapping[str, Any]]):
    service = "s3"
    resource_type = "object"
    cfn_type = "AWS::S3::Object"  # synthetic

    def fetch_resource(self, arn: ARN) -> Mapping[str, Any]:
        bucket, key = arn.as_s3_components() or (None, None)
        if not bucket or not key:
            raise ValueError(f"Invalid S3 object ARN: {arn}")

        # IMPORTANT: S3 is global — do NOT use client_for().
        s3 = self.session.client("s3")

        try:
            obj = s3.get_object(Bucket=bucket, Key=key)
        except ClientError as e:
            raise RuntimeError(f"Failed to fetch S3 object {arn}: {e}")

        return {
            "Bucket": bucket,
            "Key": key,
            "ContentType": obj.get("ContentType"),
            "ContentLength": obj.get("ContentLength"),
            "ETag": obj.get("ETag"),
        }

    def to_node(self, arn: ARN, data: Mapping[str, Any]) -> ResourceNode:
        bucket = data["Bucket"]
        key = data["Key"]

        logical = f"S3Object{bucket.replace('-', '')}_{key.replace('/', '_')[:60]}"

        return self.make_node(
            arn,
            logical_id=logical,
            properties=data,
            metadata={"Source": "get_object"},
            reference_only=True,  # Always reference-only
        )
