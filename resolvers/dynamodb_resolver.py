from __future__ import annotations

import logging
from typing import Any, Dict, Iterable, Optional, Set, cast

from botocore.exceptions import ClientError
from mypy_boto3_dynamodb import DynamoDBClient
from mypy_boto3_dynamodb.type_defs import DescribeTableOutputTypeDef

from resolvers.base import BaseResolver
from graph.dependency_graph import ResourceNode
from utils.arn import ARN, extract_dependencies

logger = logging.getLogger(__name__)

DynamoResponse = DescribeTableOutputTypeDef


class DynamoDBResolver(BaseResolver[DynamoDBClient, DynamoResponse]):
    """Resolver for AWS DynamoDB tables."""

    service = "dynamodb"

    # ------------------------------------------------------------------
    # Discovery
    # ------------------------------------------------------------------
    def list_resources(self) -> Iterable[ARN]:
        """List all DynamoDB table ARNs in the account/region."""
        account_id = self.session.client("sts").get_caller_identity().get("Account", "")
        region = self.session.region_name or "us-east-1"
        try:
            paginator = self.client.get_paginator("list_tables")
            for page in paginator.paginate():
                for name in page.get("TableNames", []):
                    # arn:aws:dynamodb:<region>:<account>:table/<name>
                    yield ARN.from_parts(
                        "dynamodb", f"table/{name}", region, account_id
                    )
        except ClientError as e:
            self.log.warning("[DynamoDBResolver] list_tables failed: %s", e)

    # ------------------------------------------------------------------
    # Fetch
    # ------------------------------------------------------------------
    def fetch_resource(self, arn: ARN) -> DynamoResponse:
        """Describe the table for the given ARN."""
        table_name = arn.resource_id or arn.resource
        try:
            self.log.info("[DynamoDBResolver] Fetching %s", arn)
            return self.client.describe_table(TableName=table_name)
        except ClientError as e:
            self.log.error("Failed to fetch %s: %s", arn, e)
            # Return a minimal shape rather than raising, so graph can continue
            return cast(
                DynamoResponse,
                {
                    "Table": {
                        "TableName": table_name,
                        "TableStatus": "UNKNOWN",
                        "Error": str(e),
                    }
                },
            )

    # ------------------------------------------------------------------
    # Convert to ResourceNode
    # ------------------------------------------------------------------
    def to_node(self, arn: ARN, raw: DynamoResponse) -> ResourceNode:
        """Parse a DescribeTable result into a ResourceNode."""
        table = raw.get("Table", {}) or {}
        refs: Set[ARN] = set()

        # KMS key reference
        kms_arn = (table.get("SSEDescription", {}) or {}).get("KMSMasterKeyArn")
        if kms_arn:
            parsed = ARN.try_parse(kms_arn or "")
            if parsed:
                refs.add(parsed)

        # Stream reference
        latest_stream_arn = table.get("LatestStreamArn")
        if latest_stream_arn:
            parsed = ARN.try_parse(latest_stream_arn or "")
            if parsed:
                refs.add(parsed)

        # Core properties (keep CFN-friendly names where possible)
        props: Dict[str, Any] = {
            "TableName": table.get("TableName"),
            "AttributeDefinitions": table.get("AttributeDefinitions", []),
            "KeySchema": table.get("KeySchema", []),
            "BillingMode": (table.get("BillingModeSummary", {}) or {}).get(
                "BillingMode", "PAY_PER_REQUEST"
            ),
        }

        # ProvisionedThroughput (for PROVISIONED tables)
        throughput = table.get("ProvisionedThroughput")
        if throughput:
            props["ProvisionedThroughput"] = {
                "ReadCapacityUnits": throughput.get("ReadCapacityUnits"),
                "WriteCapacityUnits": throughput.get("WriteCapacityUnits"),
            }

        # StreamSpecification (if enabled)
        stream_specs = table.get("StreamSpecification")
        if stream_specs:
            props["StreamSpecification"] = stream_specs

        # SSE (map describe → spec-ish form)
        sse_desc = table.get("SSEDescription", {}) or {}
        props["SSESpecification"] = {
            "Enabled": sse_desc.get("Status") == "ENABLED",
            "KMSMasterKeyId": kms_arn,
            "SSEType": sse_desc.get("SSEType"),
        }

        # Optional helpful metadata
        metadata: Dict[str, Any] = {
            "ItemCount": table.get("ItemCount"),
            "Status": table.get("TableStatus"),
        }
        if "Error" in table:
            metadata["Error"] = table["Error"]

        # Build node via factory and merge explicit refs we collected
        node = self.make_node(
            arn,
            logical_id=f"DynamoTable{table.get('TableName')}",
            properties=props,
            metadata=metadata,
        )
        node.referenced_arns |= refs
        return node
