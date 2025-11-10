from __future__ import annotations

import logging
from typing import Any, Iterable, Set, cast, Optional
from boto3 import Session
from botocore.exceptions import ClientError
from mypy_boto3_lambda import LambdaClient
from mypy_boto3_lambda.type_defs import (
    GetFunctionResponseTypeDef,
    GetLayerVersionResponseTypeDef,
    EventSourceMappingConfigurationResponseTypeDef,
)
from resolvers.base import BaseResolver
from resolvers.artifacts_resolver import to_artifact_arn
from utils.arn import ARN, extract_dependencies
from graph.dependency_graph import ResourceNode

logger = logging.getLogger(__name__)

LambdaResponse = (
    GetFunctionResponseTypeDef
    | GetLayerVersionResponseTypeDef
    | EventSourceMappingConfigurationResponseTypeDef
)


class LambdaResolver(BaseResolver[LambdaClient, LambdaResponse]):
    """
    Resolver for AWS Lambda functions and layers.
    Integrates artifact and ECR references into the dependency graph.
    """

    service = "lambda"

    # ------------------------------------------------------------------
    # Discovery
    # ------------------------------------------------------------------
    def list_resources(self) -> Iterable[ARN]:
        """Enumerate Lambda functions and layer versions."""
        for fn in self.paginate("list_functions"):
            arn_str = fn.get("FunctionArn")
            if arn_str:
                yield ARN.parse_cached(arn_str)

        for layer in self.paginate("list_layers"):
            versions = self.safe_get(
                lambda: self.client.list_layer_versions(LayerName=layer["LayerName"]).get("LayerVersions", []),
                [],
            )
            for v in versions:
                arn_str = v.get("LayerVersionArn")
                if arn_str:
                    yield ARN.parse_cached(arn_str)

    # ------------------------------------------------------------------
    # Fetch
    # ------------------------------------------------------------------
    def fetch_resource(self, arn: ARN) -> LambdaResponse:
        """Fetch Lambda function or layer details."""
        try:
            if arn.resource_type == "function":
                self.log.info("Fetching Lambda function %s", arn)
                return self.client.get_function(FunctionName=str(arn))
            elif arn.resource_type == "layer":
                self.log.info("Fetching Lambda layer %s", arn)
                return self.client.get_layer_version_by_arn(Arn=str(arn))
            else:
                raise ValueError(f"Unsupported Lambda ARN type: {arn.resource_type}")
        except ClientError as e:
            self.log.error("Failed to fetch %s: %s", arn, e)
            raise

    # ------------------------------------------------------------------
    # Convert raw data to ResourceNode
    # ------------------------------------------------------------------
    def to_node(self, arn: ARN, data: LambdaResponse) -> ResourceNode:
        if arn.resource_type == "function":
            return self._to_function_node(arn, cast(GetFunctionResponseTypeDef, data))
        elif arn.resource_type == "layer":
            return self._to_layer_node(arn, cast(GetLayerVersionResponseTypeDef, data))
        else:
            raise ValueError(f"Unknown Lambda resource type: {arn.resource_type}")

    # ------------------------------------------------------------------
    # Lambda function node
    # ------------------------------------------------------------------
    def _to_function_node(self, arn: ARN, raw: GetFunctionResponseTypeDef) -> ResourceNode:
        cfg = raw.get("Configuration", {}) or {}
        props: dict[str, Any] = {
            "FunctionName": cfg.get("FunctionName"),
            "Handler": cfg.get("Handler"),
            "Runtime": cfg.get("Runtime"),
            "Timeout": cfg.get("Timeout"),
            "MemorySize": cfg.get("MemorySize"),
            "Description": cfg.get("Description"),
            "Role": cfg.get("Role"),
            "Environment": cfg.get("Environment"),
            "TracingConfig": cfg.get("TracingConfig"),
            "PackageType": cfg.get("PackageType"),
        }

        # Extract dependencies (IAM roles, layers, etc.)
        referenced_arns: Set[ARN] = extract_dependencies(props)

        role_arn = cfg.get("Role")
        if role_arn and ARN.is_valid(role_arn):
            referenced_arns.add(ARN.parse_cached(role_arn))

        node = self.make_node(
            arn,
            logical_id=f"LambdaFunction{cfg.get('FunctionName')}",
            properties=props,
            metadata={
                "Source": "boto3.get_function",
                "Runtime": cfg.get("Runtime"),
                "Handler": cfg.get("Handler"),
                "PackageType": cfg.get("PackageType"),
            },
        )

        node.referenced_arns |= referenced_arns

        # ------------------------------------------------------------------
        # Attach code origin: S3 zip, ECR image, or inline
        # ------------------------------------------------------------------
        code = raw.get("Code", {}) or {}
        repo_type = code.get("RepositoryType")
        location = code.get("Location")
        image_uri: Optional[str] = cfg.get("ImageUri")  # Safe, may not exist

        if repo_type == "S3" and location and self.graph:
            # ---- S3 ZIP Artifact ----
            art_arn = to_artifact_arn(location)
            artifact_node = ResourceNode(
                logical_id=f"ArtifactLambda{cfg.get('FunctionName')}",
                service="artifacts",
                cfn_type="Portable::Artifact",
                properties={
                    "FileName": f"{cfg.get('FunctionName')}.zip",
                    "SourceUri": location,
                    "ArtifactType": "lambda-zip",
                    "LinkedTo": str(arn),
                },
                metadata={
                    "UploadRequired": True,
                    "RelatedService": "lambda",
                    "Source": "S3",
                },
                reference_only=True,
                arns={"Artifact": art_arn},
            )

            self.graph.add_node(artifact_node)
            self.graph.add_edge(artifact_node.logical_id, node.logical_id)
            node.referenced_arns.add(art_arn)

        elif cfg.get("PackageType") == "Image" and image_uri:
            # ---- ECR Image ----
            if image_uri.startswith("arn:aws:ecr:"):
                ecr_arn = ARN.parse_cached(image_uri)
                node.referenced_arns.add(ecr_arn)
            else:
                # Convert repo URI to ECR ARN if possible
                try:
                    account_id, remainder = image_uri.split(".dkr.ecr.", 1)[0], image_uri.split("/", 1)[-1]
                    region = remainder.split(".amazonaws.com")[0].split(".")[-1]
                    ecr_arn = ARN.from_parts("ecr", f"repository/{remainder}", region, account_id)
                    node.referenced_arns.add(ecr_arn)
                except Exception:
                    self.log.debug("Could not parse ECR reference: %s", image_uri)

            node.metadata["CodeOrigin"] = "ECR"
            node.metadata["ImageUri"] = image_uri

        else:
            # ---- Inline Code / direct zip upload ----
            node.metadata["CodeOrigin"] = "Inline"
            if location:
                node.metadata["InlineHint"] = location

        return node

    # ------------------------------------------------------------------
    # Lambda layer node
    # ------------------------------------------------------------------
    def _to_layer_node(self, arn: ARN, raw: GetLayerVersionResponseTypeDef) -> ResourceNode:
        layer_arn = ARN(raw.get("LayerVersionArn", str(arn)))
        layer_name = layer_arn.resource_id.split(":")[0]

        props = {
            "LayerName": layer_name,
            "Description": raw.get("Description"),
            "CompatibleRuntimes": raw.get("CompatibleRuntimes"),
            "LicenseInfo": raw.get("LicenseInfo"),
        }

        return self.make_node(
            layer_arn,
            logical_id=f"LambdaLayer{layer_name}",
            properties=props,
            metadata={"Source": "boto3.get_layer_version"},
        )
