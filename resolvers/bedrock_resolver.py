from __future__ import annotations

import logging
from typing import Any, Dict, Set

from resolvers.base import BaseResolver
from graph.dependency_graph import ResourceNode
from utils.arn import ARN

logger = logging.getLogger(__name__)


class BedrockResolver(BaseResolver[None, Dict[str, Any]]):
    """Resolver for Amazon Bedrock foundation models (global reference)."""

    resource_type = "foundation-model"
    cfn_type = "Unresolved::BedrockModel"

    def fetch(self, arn: ARN) -> Dict[str, Any]:
        parts = arn.resource.split("/")
        model_id = parts[-1] if parts else arn.resource
        return {"ModelId": model_id, "Arn": str(arn)}

    def parse(self, arn: ARN, raw: Dict[str, Any]) -> ResourceNode[Dict[str, Any]]:
        model_id = raw.get("ModelId", arn.resource_id)
        props: Dict[str, Any] = {
            "ModelId": model_id,
            "Arn": str(arn),
            "Description": "Reference-only Bedrock foundation model",
        }

        return ResourceNode(
            logical_id=f"BedrockModel{model_id.replace(':', '_').replace('-', '_')}",
            service="bedrock",
            cfn_type=self.cfn_type,
            properties=props,
            referenced_arns=set(),
            arns={"Model": arn},
            reference_only=True,  # ✅ it's a parameter (user-supplied or static ARN)
            metadata={
                "global_resource": True,
                "immutable_reference": True,  # prevents editing in visualizer
            },
        )
