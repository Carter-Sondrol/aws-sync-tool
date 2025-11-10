from __future__ import annotations

import logging
from typing import Any, Dict, Iterable, Set, cast

from resolvers.base import BaseResolver
from graph.dependency_graph import ResourceNode
from utils.arn import ARN
from botocore.client import BaseClient

logger = logging.getLogger(__name__)


class BedrockResolver(BaseResolver[BaseClient, Dict[str, Any]]):
    """
    Resolver for Amazon Bedrock foundation models (global reference).

    These ARNs point to AWS-managed foundation models, which are immutable and
    shared globally across accounts. They are represented as reference-only
    nodes in the dependency graph.
    """

    service = "bedrock"
    resource_type = "foundation-model"
    cfn_type = "Unresolved::BedrockModel"

    # ------------------------------------------------------------------
    # Discovery
    # ------------------------------------------------------------------
    def list_resources(self) -> Iterable[ARN]:
        """
        Bedrock models are global and not enumerable via boto3, so this resolver
        does not perform discovery. It only handles explicit ARNs provided
        elsewhere in the graph.
        """
        return []

    # ------------------------------------------------------------------
    # Fetch
    # ------------------------------------------------------------------
    def fetch_resource(self, arn: ARN) -> Dict[str, Any]:
        """Return minimal metadata for a Bedrock model ARN."""
        model_id = arn.resource.split("/")[-1] if "/" in arn.resource else arn.resource
        self.log.debug("[BedrockResolver] Fetching model reference: %s", arn)
        return {
            "ModelId": model_id,
            "Arn": str(arn),
            "Description": "Reference-only Bedrock foundation model",
        }

    # ------------------------------------------------------------------
    # Convert to ResourceNode
    # ------------------------------------------------------------------
    def to_node(self, arn: ARN, raw: Dict[str, Any]) -> ResourceNode:
        """Convert fetched Bedrock model data into a ResourceNode."""
        model_id = raw.get("ModelId", arn.resource_id)

        props: Dict[str, Any] = {
            "ModelId": model_id,
            "Arn": str(arn),
            "Description": raw.get("Description"),
        }

        metadata: Dict[str, Any] = {
            "GlobalResource": True,
            "ImmutableReference": True,
            "ReferenceOnly": True,
        }

        # Use factory for consistency and to ensure MAP tags aren't applied to this reference node
        return self.make_node(
            arn,
            logical_id=f"BedrockModel{model_id.replace(':', '_').replace('-', '_')}",
            properties=props,
            metadata=metadata,
            reference_only=True,
        )
