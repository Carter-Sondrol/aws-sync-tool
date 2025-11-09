from __future__ import annotations

import logging
from typing import Any, Union, cast, Set, Dict, Optional
from boto3 import Session
from botocore.exceptions import ClientError
from mypy_boto3_lambda import LambdaClient
from mypy_boto3_lambda.type_defs import (
    GetFunctionResponseTypeDef,
    GetLayerVersionResponseTypeDef,
    EventSourceMappingConfigurationResponseTypeDef,
)
from resolvers.base import BaseResolver
from utils.arn import ARN, extract_dependencies
from graph.dependency_graph import ResourceNode

logger = logging.getLogger(__name__)

LambdaResponse = Union[
    GetFunctionResponseTypeDef,
    GetLayerVersionResponseTypeDef,
    EventSourceMappingConfigurationResponseTypeDef,
]


class LambdaResolver(BaseResolver[LambdaClient, LambdaResponse]):
    """Resolver for AWS Lambda functions and layers."""

    # ----------------------------------------------------------------------
    # Fetch
    # ----------------------------------------------------------------------
    def fetch(self, arn: ARN) -> LambdaResponse:
        """Fetch raw Lambda data using boto3."""
        try:
            if arn.resource_type == "function":
                logger.info("[LambdaResolver] Fetching %s (Lambda function)", arn)
                return self.client.get_function(FunctionName=str(arn))
            elif arn.resource_type == "layer":
                logger.info("[LambdaResolver] Fetching %s (Lambda layer)", arn)
                return self.client.get_layer_version_by_arn(Arn=str(arn))
            else:
                raise ValueError(f"Unsupported Lambda ARN type: {arn.resource_type}")
        except ClientError as e:
            logger.error(f"Failed to fetch {arn}: {e}")
            raise

    # ----------------------------------------------------------------------
    # Parse dispatcher
    # ----------------------------------------------------------------------
    def parse(self, arn: ARN, raw: LambdaResponse) -> ResourceNode[dict[str, Any]]:
        """Parse Lambda API response into a ResourceNode."""
        resource_type = arn.resource_type
        if resource_type == "function":
            return self._parse_function(arn, cast(GetFunctionResponseTypeDef, raw))
        elif resource_type == "layer":
            return self._parse_layer(arn, cast(GetLayerVersionResponseTypeDef, raw))
        else:
            raise ValueError(f"Unknown resource type: {resource_type}")

    # ----------------------------------------------------------------------
    # Internal: Function parsing
    # ----------------------------------------------------------------------
    def _parse_function(self, arn: ARN, raw: GetFunctionResponseTypeDef, graph: DependencyGraph | None = None):
        cfg = raw.get("Configuration", {})
        refs: Set[ARN] = set()

        # Handle IAM Role
        role_arn = cfg.get("Role")
        if role_arn and role_arn.startswith("arn:"):
            parsed = ARN.try_parse(role_arn)
            if parsed:
                refs.add(parsed)

        # Extract code location
        code = raw.get("Code", {}) or {}
        s3_bucket = code.get("RepositoryType") == "S3" and code.get("Location") or None

        # Synthetic artifact for Lambda .zip
        if s3_bucket and graph is not None:
            artifact_node = ResourceNode(
                logical_id=f"ArtifactLambda{cfg.get('FunctionName')}",
                service="artifact",
                cfn_type="Portable::Artifact",
                properties={
                    "FileName": f"{cfg.get('FunctionName')}.zip",
                    "LocalPath": f"./artifacts/lambda/{cfg.get('FunctionName')}.zip",
                    "ArtifactType": "lambda-zip",
                    "SourceUri": s3_bucket,
                },
                metadata={
                    "UploadRequired": True,
                    "RelatedService": "lambda",
                    "LinkedTo": arn.resource,
                },
            )
            graph.add_node(artifact_node)
            graph.add_edge(artifact_node.logical_id, f"LambdaFunction{cfg.get('FunctionName')}")

    # continue parsing lambda function...

    # ----------------------------------------------------------------------
    # Internal: Layer parsing
    # ----------------------------------------------------------------------
    def _parse_layer(self, arn: ARN, raw: GetLayerVersionResponseTypeDef) -> ResourceNode[dict[str, Any]]:
        layer_arn = ARN(raw.get("LayerVersionArn", str(arn)))
        layer_name = layer_arn.resource_id.split(":")[0]

        props = {
            "LayerName": layer_name,
            "Description": raw.get("Description"),
            "CompatibleRuntimes": raw.get("CompatibleRuntimes"),
            "LicenseInfo": raw.get("LicenseInfo"),
        }

        return ResourceNode(
            logical_id=f"LambdaLayer{layer_name}",
            service="lambda",
            cfn_type="AWS::Lambda::LayerVersion",
            properties=props,
            referenced_arns=set(),
            arns={"Layer": layer_arn},
        )
