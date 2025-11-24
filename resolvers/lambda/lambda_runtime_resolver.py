from __future__ import annotations

from resolvers.base_resolver import BaseResolver
from graph.resource_node import NodeClassification, ResourceNode
from utils.arn import ARN


class LambdaRuntimeResolver(BaseResolver):
    """
    Lightweight resolver for Lambda runtime ARNs (arn:aws:lambda:<region>::runtime:<id>).

    These are catalog entries, not account-bound resources, so we treat them as
    reference-only nodes with minimal metadata.
    """

    service = "lambda"
    resource_type = "runtime"
    cfn_type = "AWS::Lambda::Runtime"

    def fetch_resource(self, arn: ARN) -> dict:
        # No AWS API call required; the ARN itself is the authoritative payload.
        return {"Arn": str(arn), "Runtime": arn.resource_id}

    def to_node(self, arn: ARN, data: dict) -> ResourceNode:
        logical_id = f"LambdaRuntime_{arn.resource_id[:40]}"
        return ResourceNode(
            logical_id=logical_id,
            service=self.service,
            cfn_type=self.cfn_type,
            properties=data,
            reference_only=True,
            metadata={"CatalogOnly": True},
            arns={"Primary": arn},
            referenced_arns=set(),
            classification=NodeClassification.AWS_MANAGED,
        )
