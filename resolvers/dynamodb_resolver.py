from __future__ import annotations

import logging
from typing import Any, Union, cast, Optional, Set
from boto3 import Session
from mypy_boto3_dynamodb import DynamoDBClient
from mypy_boto3_dynamodb.type_defs import DescribeTableOutputTypeDef
from botocore.exceptions import ClientError

from resolvers.base import BaseResolver
from graph.dependency_graph import ResourceNode
from utils.arn import ARN, extract_dependencies

logger = logging.getLogger(__name__)

DynamoResponse = DescribeTableOutputTypeDef


class DynamoDBResolver(BaseResolver[DynamoDBClient, DynamoResponse]):
    """Resolver for AWS DynamoDB tables."""

    def fetch(self, arn: ARN) -> DynamoResponse:
        """Fetch raw DynamoDB table data using boto3."""
        try:
            table_name = arn.resource_id or arn.resource
            logger.info("[DynamoDBResolver] Fetching %s", arn)
            return self.client.describe_table(TableName=table_name)
        except ClientError as e:
            logger.error(f"Failed to fetch {arn}: {e}")
            raise

    def parse(self, arn: ARN, raw: DynamoResponse) -> ResourceNode[dict[str, Any]]:
        """Parse a DynamoDB DescribeTable result into a ResourceNode."""
        table = raw.get("Table", {})
        refs: Set[ARN] = set()

        # KMS key reference
        kms_arn = table.get("SSEDescription", {}).get("KMSMasterKeyArn")
        if kms_arn:
            parsed = ARN.try_parse(kms_arn)
            if parsed:
                refs.add(parsed)

        # Stream reference
        latest_arn = table.get("LatestStreamArn")
        if latest_arn:
            parsed = ARN.try_parse(latest_arn)
            if parsed:
                refs.add(parsed)

        props: dict[str, Any] = {
            "TableName": table.get("TableName"),
            "AttributeDefinitions": table.get("AttributeDefinitions", []),
            "KeySchema": table.get("KeySchema", []),
            "BillingMode": table.get("BillingModeSummary", {}).get("BillingMode", "PAY_PER_REQUEST"),
        }

        throughput = table.get("ProvisionedThroughput")
        if throughput:
            props["ProvisionedThroughput"] = {
                "ReadCapacityUnits": throughput.get("ReadCapacityUnits"),
                "WriteCapacityUnits":throughput.get("WriteCapacityUnits"),
            }
        strem_specs = table.get("StreamSpecification")    
        if strem_specs:
            props["StreamSpecification"] = strem_specs

        props["SSESpecification"] = {
            "Enabled": table.get("SSEDescription", {}).get("Status") == "ENABLED",
            "KMSMasterKeyId": kms_arn,
        }

        return ResourceNode(
            logical_id=f"DynamoTable{table.get('TableName')}",
            service="dynamodb",
            cfn_type="AWS::DynamoDB::Table",
            properties=props,
            referenced_arns=refs,
            arns={"Table": arn},
            metadata={"ItemCount": table.get("ItemCount"), "Status": table.get("TableStatus")},
        )
