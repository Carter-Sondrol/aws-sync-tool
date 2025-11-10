from __future__ import annotations

import logging
from typing import Any, Dict, Set, Optional, Iterable
from boto3 import Session
from botocore.exceptions import ClientError
from mypy_boto3_s3 import S3Client
from mypy_boto3_s3.type_defs import (
    GetBucketLocationOutputTypeDef,
    GetBucketTaggingOutputTypeDef,
    HeadBucketOutputTypeDef,
    HeadObjectOutputTypeDef,
)
from resolvers.base import BaseResolver
from graph.dependency_graph import ResourceNode
from utils.arn import ARN, extract_dependencies

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def is_service_managed_bucket(bucket_name: str) -> bool:
    """Detect AWS-managed or service-linked S3 buckets."""
    prefixes = (
        "aws-",
        "amazon-connect-",
        "aws-glue-",
        "aws-athena-query-results",
        "logs-",
    )
    return bucket_name.startswith(prefixes)


def parse_s3_parts(arn: ARN) -> tuple[str, Optional[str]]:
    """Split arn:aws:s3:::bucket[/key] into (bucket, key)."""
    if not arn.resource:
        raise ValueError(f"Invalid S3 ARN: {arn}")
    parts = arn.resource.split("/", 1)
    bucket = parts[0]
    key = parts[1] if len(parts) > 1 else None
    return bucket, key


# ---------------------------------------------------------------------------
# Resolver
# ---------------------------------------------------------------------------

class S3Resolver(BaseResolver[S3Client, Dict[str, Any]]):
    """Resolver for S3 buckets and objects."""

    service = "s3"

    # ------------------------------------------------------------------
    # Discovery
    # ------------------------------------------------------------------
    def list_resources(self) -> Iterable[ARN]:
        """List all S3 buckets as ARNs."""
        try:
            resp = self.client.list_buckets()
            account_id = self.session.client("sts").get_caller_identity().get("Account", "")
            region = self.session.region_name or "us-east-1"
            for b in resp.get("Buckets", []):
                name = b.get("Name")
                if name:
                    yield ARN.from_parts("s3", name, region, account_id)
        except ClientError as e:
            self.log.warning("[S3Resolver] Failed to list buckets: %s", e)

    # ------------------------------------------------------------------
    # Fetch
    # ------------------------------------------------------------------
    def fetch_resource(self, arn: ARN) -> Dict[str, Any]:
        """Fetch bucket or object metadata."""
        bucket, key = parse_s3_parts(arn)
        result: Dict[str, Any] = {"Bucket": bucket, "Key": key, "Arn": str(arn)}

        # Skip service-managed buckets
        if is_service_managed_bucket(bucket):
            result.update(
                {
                    "ManagedBy": "AWS",
                    "Implicit": True,
                    "Exists": True,
                    "ServiceManaged": True,
                }
            )
            self.log.info("Skipping fetch for service-managed bucket %s", bucket)
            return result

        try:
            if key:
                # -------------------------------
                # S3 Object
                # -------------------------------
                head_obj: HeadObjectOutputTypeDef = self.client.head_object(Bucket=bucket, Key=key)
                result.update(
                    {
                        "Exists": True,
                        "ObjectSize": head_obj.get("ContentLength"),
                        "ContentType": head_obj.get("ContentType"),
                        "ETag": head_obj.get("ETag"),
                        "LastModified": head_obj.get("LastModified"),
                        "ManagedBy": "Customer",
                        "IsObject": True,
                    }
                )
            else:
                # -------------------------------
                # S3 Bucket
                # -------------------------------
                region_resp: GetBucketLocationOutputTypeDef = self.client.get_bucket_location(Bucket=bucket)
                region = region_resp.get("LocationConstraint") or "us-east-1"
                result["Region"] = region

                try:
                    tags_resp: GetBucketTaggingOutputTypeDef = self.client.get_bucket_tagging(Bucket=bucket)
                    result["Tags"] = tags_resp.get("TagSet", [])
                except ClientError as e:
                    code = e.response.get("Error", {}).get("Code")
                    if code not in ("NoSuchTagSet", "AccessDenied"):
                        raise
                    result["Tags"] = []

                _ = self.client.head_bucket(Bucket=bucket)
                result.update({"Exists": True, "ManagedBy": "Customer", "IsObject": False})

        except ClientError as e:
            self.log.warning("[S3Resolver] Failed to fetch %s: %s", arn, e)
            result.update({"Error": str(e), "Exists": False})

        return result

    # ------------------------------------------------------------------
    # Convert raw data to ResourceNode
    # ------------------------------------------------------------------
    def to_node(self, arn: ARN, raw: Dict[str, Any]) -> ResourceNode:
        """Convert S3 resource metadata to a ResourceNode."""
        bucket = raw.get("Bucket") or ""
        key = raw.get("Key") or ""
        is_object = bool(key)
        refs: Set[ARN] = set()

        implicit = raw.get("Implicit", False)
        service_managed = raw.get("ServiceManaged", False)
        aws_managed = is_service_managed_bucket(bucket)

        if is_object and bucket:
            refs.add(ARN(f"arn:aws:s3:::{bucket}"))

        reference_only = bool(service_managed or aws_managed)
        managed_by = "AWS" if reference_only else "Customer"

        if is_object:
            # Object node
            props: Dict[str, Any] = {
                "Bucket": bucket,
                "Key": key,
                "Size": raw.get("ObjectSize"),
                "ContentType": raw.get("ContentType"),
                "ETag": raw.get("ETag"),
                "ManagedBy": managed_by,
                "Exists": raw.get("Exists"),
            }

            metadata: Dict[str, Any] = {
                "IsObject": True,
                "Implicit": implicit,
                "ServiceManaged": service_managed,
                "Error": raw.get("Error"),
            }

            safe_bucket = bucket.replace("-", "").replace("_", "")
            safe_key = key.replace("/", "_").replace("-", "_")[:80]

            return self.make_node(
                arn,
                logical_id=f"S3Object{safe_bucket}_{safe_key}",
                properties=props,
                metadata=metadata,
                reference_only=reference_only or implicit,
            )

        # Bucket node
        props: Dict[str, Any] = {
            "BucketName": bucket,
            "Region": raw.get("Region"),
            "Tags": raw.get("Tags", []),
            "ManagedBy": managed_by,
        }

        metadata: Dict[str, Any] = {
            "IsObject": False,
            "Implicit": implicit,
            "Exists": raw.get("Exists", True),
            "Error": raw.get("Error"),
        }

        if aws_managed or implicit:
            metadata["Reason"] = "Service-linked managed bucket"

        safe_bucket = bucket.replace("-", "").replace("_", "")
        return self.make_node(
            arn,
            logical_id=f"S3Bucket{safe_bucket}",
            properties=props,
            metadata=metadata,
            reference_only=reference_only,
        )
