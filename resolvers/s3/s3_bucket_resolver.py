from __future__ import annotations
import logging
from typing import Mapping, Any

from botocore.exceptions import ClientError

from resolvers.base_resolver import BaseResolver
from resolvers.registry import register_resolver
from utils.arn import ARN, extract_dependencies
from graph.resource_node import ResourceNode, NodeClassification

log = logging.getLogger(__name__)


@register_resolver("s3:bucket")
class S3BucketResolver(BaseResolver):
    """
    Hand-written resolver for S3 buckets (synthetic).
    S3 ARNs do not contain region/account; bucket discovery is inferred
    from environment strings or Connect configs.
    """

    service = "s3"
    resource_type = "bucket"
    resource_name = "Bucket"
    cfn_type = "AWS::S3::Bucket"
    deployment_mode = "l2"

    list_operation = None         # synthetic
    describe_operation = "get_bucket_location"
    id_fields = ["Bucket"]
    summary_list_path = None
    summary_arn_field = None

    def fetch_resource(self, arn: ARN) -> Mapping[str, Any]:
        bucket = arn.resource_id

        # S3 requires explicit region (ARNs do not contain it)
        region = (
            arn.region
            or getattr(self, "session_region", None)
            or self.session.region_name
            or "us-east-1"
        )

        client = self.session.client("s3", region_name=region)

        props: dict[str, Any] = {"Bucket": bucket}

        # Basic describe
        try:
            location = client.get_bucket_location(Bucket=bucket)
            props["Location"] = location
        except ClientError as e:
            code = e.response.get("Error", {}).get("Code")
            if code in ("NoSuchBucket", "AccessDenied"):
                props["ErrorCode"] = code
                props["ErrorMessage"] = str(e)
                return props
            raise RuntimeError(f"Failed to describe bucket {bucket}: {e}")

        # Optional: fetch extra metadata
        try:
            versioning = client.get_bucket_versioning(Bucket=bucket)
            props["Versioning"] = versioning
        except Exception:
            pass

        try:
            tagging = client.get_bucket_tagging(Bucket=bucket)
            props["Tagging"] = tagging
        except Exception:
            pass

        return props

    def to_node(self, arn: ARN, raw: Mapping[str, Any]) -> ResourceNode:
        props = dict(raw) if isinstance(raw, Mapping) else {}
        props.setdefault("Bucket", arn.resource_id)

        metadata: dict[str, Any] = {}
        reference_only = False
        classification = NodeClassification.RESOURCE

        error_code = props.pop("ErrorCode", None)
        error_msg = props.pop("ErrorMessage", None)
        if error_code:
            metadata["FetchError"] = {"Code": error_code, "Message": error_msg}
            reference_only = True
            classification = NodeClassification.EXTERNAL

        refs = extract_dependencies(props)

        return ResourceNode(
            logical_id=f"Bucket_{arn.resource_id}",
            service="s3",
            cfn_type=self.cfn_type,
            properties=props,
            referenced_arns=refs,
            reference_only=reference_only,
            metadata=metadata,
            classification=classification,
            arns={"Primary": arn},
        )
