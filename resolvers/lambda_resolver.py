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
    def _parse_function(self, arn: ARN, raw: GetFunctionResponseTypeDef) -> ResourceNode[dict[str, Any]]:
        cfg = raw.get("Configuration", {})
        refs: Set[ARN] = set()

        # Role reference
        role_arn = cfg.get("Role")
        if role_arn and role_arn.startswith("arn:"):
            parsed = ARN.try_parse(role_arn)
            if parsed:
                refs.add(parsed)

        # Layers
        for layer in cfg.get("Layers", []):
            layer_arn = layer.get("Arn")
            if layer_arn:
                parsed = ARN.try_parse(layer_arn)
                if parsed:
                    refs.add(parsed)

        # VPC
        vpc_cfg = cfg.get("VpcConfig", {})
        for key in ("SecurityGroupIds", "SubnetIds"):
            for val in vpc_cfg.get(key, []):
                if isinstance(val, str) and val.startswith("arn:"):
                    parsed = ARN.try_parse(val)
                    if parsed:
                        refs.add(parsed)

        # Environment vars — may contain references or bucket names
        env_vars = cfg.get("Environment", {}).get("Variables", {}) or {}
        refs |= extract_dependencies(env_vars)

        properties: Dict[str, Any] = {
            "FunctionName": cfg.get("FunctionName"),
            "Runtime": cfg.get("Runtime"),
            "Handler": cfg.get("Handler"),
            "Role": role_arn,
            "Description": cfg.get("Description"),
            "Timeout": cfg.get("Timeout"),
            "MemorySize": cfg.get("MemorySize"),
            "VpcConfig": vpc_cfg,
            "Environment": {"Variables": env_vars} if env_vars else {},
            "Layers": [layer.get("Arn") for layer in cfg.get("Layers", [])],
        }

        return ResourceNode(
            logical_id=f"LambdaFunction{cfg.get('FunctionName')}",
            service="lambda",
            cfn_type="AWS::Lambda::Function",
            properties=properties,
            referenced_arns=refs,
            arns={"Function": arn},
            metadata={
                "LastModified": cfg.get("LastModified"),
                "HasEnvVars": bool(env_vars),
                "EnvVarCount": len(env_vars),
            },
        )

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
