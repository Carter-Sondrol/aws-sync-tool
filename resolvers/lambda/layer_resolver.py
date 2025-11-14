from __future__ import annotations

import logging
from typing import Mapping, Any
from botocore.exceptions import ClientError

from mypy_boto3_lambda import LambdaClient
from mypy_boto3_lambda.type_defs import GetLayerVersionResponseTypeDef

from resolvers.base_resolver import BaseResolver
from resolvers.registry import register_resolver
from utils.arn import ARN
from graph.resource_node import ResourceNode

log = logging.getLogger(__name__)


@register_resolver("lambda:layer")
class LambdaLayerVersionResolver(
    BaseResolver[LambdaClient, GetLayerVersionResponseTypeDef]
):
    """
    Resolve Lambda Layer Versions — including their S3 code object.
    Only follows the exact layer ARN provided by the graph, never enumerates.
    """

    service = "lambda"
    resource_type = "layer-version"
    cfn_type = "AWS::Lambda::LayerVersion"

    # ---------------------------------------------------------------
    def fetch_resource(self, arn: ARN) -> GetLayerVersionResponseTypeDef:
        """
        arn format: arn:aws:lambda:region:acct:layer:<name>:<version>
        """
        client = self.client_for(arn)
        parts = arn.resource_parts

        # example parts: ["layer", "<name>", "<version>"]
        if len(parts) < 3 or parts[0] != "layer":
            raise ValueError(f"Invalid layer ARN format: {arn}")

        layer_name = parts[1]
        try:
            version = int(parts[2])
        except Exception:
            raise ValueError(f"Invalid layer version in ARN: {arn}")

        try:
            return client.get_layer_version(
                LayerName=layer_name,
                VersionNumber=version,
            )
        except ClientError:
            log.error("Failed to fetch Layer %s", arn, exc_info=True)
            raise

    # ---------------------------------------------------------------
    def to_node(self, arn: ARN, data: GetLayerVersionResponseTypeDef) -> ResourceNode:
        """
        Convert a Lambda LayerVersion into a ResourceNode.
        Extract the S3 code object as a dependency.
        """
        content = data.get("Content", {}) or {}

        # ----------------------------------------------------------
        # Extract S3 code location → S3 object ARN
        # ----------------------------------------------------------
        code_arn: ARN | None = None
        bucket = content.get("Bucket")
        key = content.get("Key")

        if bucket and key:
            try:
                code_arn = ARN(f"arn:aws:s3:::{bucket}/{key}")
            except Exception:
                code_arn = None

        # ----------------------------------------------------------
        # Stable, portable properties
        # ----------------------------------------------------------
        props: dict[str, Any] = {
            "LayerName": data.get("LayerArn", "").split(":layer:")[1].split(":")[0]
            if data.get("LayerArn")
            else None,
            "Version": data.get("Version"),
            "CompatibleRuntimes": data.get("CompatibleRuntimes"),
            "CompatibleArchitectures": data.get("CompatibleArchitectures"),
            "LicenseInfo": data.get("LicenseInfo"),
            "Description": data.get("Description"),
        }

        # include code reference in properties (portable)
        if bucket and key:
            props["Content"] = {
                "S3Bucket": bucket,
                "S3Key": key,
                "S3ObjectVersion": content.get("ObjectVersion"),
            }

        # logical ID: <LayerName>V<version>
        layer_name = props["LayerName"] or "Layer"
        version = props["Version"] or "0"
        logical_id = f"{layer_name}V{version}"

        # ----------------------------------------------------------
        # Build node
        # ----------------------------------------------------------
        node = self.make_node(
            arn,
            logical_id=logical_id,
            properties=props,
        )

        # Follow the code S3 object if available
        if code_arn:
            node.referenced_arns.add(code_arn)

        return node
