# resolvers/dynamodb/table_resolver.py
from __future__ import annotations

import logging
from typing import Any, Mapping
from botocore.exceptions import ClientError
from mypy_boto3_dynamodb import DynamoDBClient
from mypy_boto3_dynamodb.type_defs import (
    DescribeTableOutputTypeDef,
)

from resolvers.base_resolver import BaseResolver
from resolvers.registry import register_resolver
from graph.resource_node import ResourceNode
from utils.arn import ARN

log = logging.getLogger(__name__)


@register_resolver("dynamodb:table")
class DynamoDBTableResolver(
    BaseResolver[DynamoDBClient, DescribeTableOutputTypeDef]
):
    """
    Resolves a DynamoDB table using a fully-qualified ARN:
      arn:aws:dynamodb:<region>:<account>:table/<tablename>

    Discovery is strictly seed-driven:
    - Fetch only this table
    - Extract embedded ARNs (streams, KMS-key, replicas, triggers)
    - Return a ResourceNode
    """

    service = "dynamodb"
    resource_type = "table"
    cfn_type = "AWS::DynamoDB::Table"

    # ---------------------------------------------------------
    # Fetch
    # ---------------------------------------------------------
    def fetch_resource(self, arn: ARN) -> DescribeTableOutputTypeDef:
        client = self.client_for(arn, service_override="dynamodb")

        table_name = arn.resource_name()
        try:
            return client.describe_table(TableName=table_name)
        except ClientError:
            log.exception("Failed to describe DynamoDB table %s", arn)
            raise

    # ---------------------------------------------------------
    # Convert to ResourceNode
    # ---------------------------------------------------------
    def to_node(self, arn: ARN, data: DescribeTableOutputTypeDef) -> ResourceNode:
        table = data.get("Table", {})
        props: Mapping[str, Any] = table

        # No transformation: let graph.freeze() handle ARN rewriting.
        # referenced_arns will auto-detect KMS, Streams, Lambda triggers, replicas, etc.

        node = self.make_node(
            arn,
            logical_id=arn.resource_name(),
            properties=props,
            metadata={
                "FetchedVia": "DescribeTable",
            },
            reference_only=False,
        )

        return node
