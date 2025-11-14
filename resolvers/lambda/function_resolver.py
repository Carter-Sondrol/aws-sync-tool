from __future__ import annotations

import logging
from typing import Mapping, Any

from botocore.exceptions import ClientError
from mypy_boto3_lambda import LambdaClient
from mypy_boto3_lambda.type_defs import GetFunctionResponseTypeDef

from resolvers.base_resolver import BaseResolver
from resolvers.registry import register_resolver
from utils.arn import ARN
from graph.resource_node import ResourceNode

log = logging.getLogger(__name__)


@register_resolver("lambda:function")
class LambdaFunctionResolver(BaseResolver[LambdaClient, GetFunctionResponseTypeDef]):
    """
    Resolver for Lambda functions that also extracts the code S3 object reference.
    """

    service = "lambda"
    resource_type = "function"
    cfn_type = "AWS::Lambda::Function"

    # ------------------------------------------------------------------
    def fetch_resource(self, arn: ARN) -> GetFunctionResponseTypeDef:
        fn_name = arn.resource_name()
        client = self.client_for(arn)
        try:
            return client.get_function(FunctionName=fn_name)
        except ClientError:
            log.error("Failed to fetch Lambda %s", arn, exc_info=True)
            raise

    # ------------------------------------------------------------------
    def to_node(self, arn: ARN, data: GetFunctionResponseTypeDef) -> ResourceNode:
        cfg = data.get("Configuration", {}) or {}
        code = data.get("Code", {}) or {}

        # --------------------------------------------------------------
        # Resolve S3 code location → S3 object ARN
        # --------------------------------------------------------------
        code_arn: ARN | None = None
        bucket = code.get("S3Bucket")
        key = code.get("S3Key")

        if bucket and key:
            # Construct S3 object ARN
            s3_raw = f"arn:aws:s3:::{bucket}/{key}"
            try:
                code_arn = ARN(s3_raw)
            except Exception:
                code_arn = None

        # --------------------------------------------------------------
        # Build properties (portable version — keep only stable values)
        # --------------------------------------------------------------
        props: dict[str, Any] = {
            "FunctionName": cfg.get("FunctionName"),
            "Handler": cfg.get("Handler"),
            "Runtime": cfg.get("Runtime"),
            "Role": cfg.get("Role"),  # IAM ARN
            "MemorySize": cfg.get("MemorySize"),
            "Timeout": cfg.get("Timeout"),
            "Description": cfg.get("Description"),
            "PackageType": cfg.get("PackageType"),
            "Architectures": cfg.get("Architectures"),
            "Environment": cfg.get("Environment"),
            "Tags": data.get("Tags") or {},
            "Layers": [layer.get("Arn") for layer in (cfg.get("Layers") or [])],
        }

        # Include S3 code reference (if any)
        if bucket and key:
            props["Code"] = {
                "S3Bucket": bucket,
                "S3Key": key,
                "S3ObjectVersion": code.get("S3ObjectVersion"),
            }

        # --------------------------------------------------------------
        # Build the node
        # --------------------------------------------------------------
        node = self.make_node(
            arn,
            logical_id=cfg.get("FunctionName"),
            properties=props,
        )

        # Manually add the code object ARN as a dependency
        if code_arn:
            node.referenced_arns.add(code_arn)

        return node
