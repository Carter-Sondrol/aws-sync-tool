from __future__ import annotations

import logging
from typing import Any, Iterable, Set, Dict, cast
from boto3 import Session
from botocore.exceptions import ClientError
from mypy_boto3_logs import CloudWatchLogsClient
from mypy_boto3_logs.type_defs import LogGroupTypeDef

from resolvers.base import BaseResolver
from graph.dependency_graph import ResourceNode
from utils.arn import ARN, extract_dependencies

logger = logging.getLogger(__name__)


class LogsResolver(BaseResolver[CloudWatchLogsClient, LogGroupTypeDef]):
    """
    Resolver for CloudWatch Logs LogGroups.

    Supports discovery, fetching, and conversion into dependency graph nodes.
    """

    service = "logs"
    resource_type = "log-group"
    cfn_type = "AWS::Logs::LogGroup"

    # ------------------------------------------------------------------
    # Discovery
    # ------------------------------------------------------------------
    def list_resources(self) -> Iterable[ARN]:
        """List all LogGroup ARNs in the account."""
        for page in self.paginate("describe_log_groups"):
            for lg in page:
                name = lg.get("logGroupName")
                if not name:
                    continue
                # CloudWatch log group ARN format
                arn = ARN.from_parts(
                    service="logs",
                    resource=f"log-group:{name}",
                    region=self.session.region_name or "",
                    account_id=self.session.client('sts').get_caller_identity().get("Account", ""),
                )
                yield arn

    # ------------------------------------------------------------------
    # Fetch
    # ------------------------------------------------------------------
    def fetch_resource(self, arn: ARN) -> LogGroupTypeDef:
        """Fetch CloudWatch LogGroup metadata by name derived from ARN."""
        name = arn.resource_id
        try:
            resp = self.client.describe_log_groups(logGroupNamePrefix=name)
            for lg in resp.get("logGroups", []):
                if lg.get("logGroupName") == name:
                    return cast(LogGroupTypeDef, lg)
            # Not found fallback
            return cast(LogGroupTypeDef, {"logGroupName": name, "missing": True})
        except ClientError as e:
            self.log.warning("[LogsResolver] Failed to describe %s: %s", arn, e)
            return cast(LogGroupTypeDef, {"logGroupName": name, "error": str(e)})

    # ------------------------------------------------------------------
    # Convert raw data to ResourceNode
    # ------------------------------------------------------------------
    def to_node(self, arn: ARN, raw: LogGroupTypeDef) -> ResourceNode:
        """Convert describe_log_groups result into a ResourceNode."""
        name = raw.get("logGroupName", arn.resource_id)
        refs: Set[ARN] = extract_dependencies(raw)

        props: Dict[str, Any] = {
            "LogGroupName": name,
            "RetentionInDays": raw.get("retentionInDays"),
            "KmsKeyId": raw.get("kmsKeyId"),
        }

        # Clean out empty values
        props = {k: v for k, v in props.items() if v not in (None, "", [], {}, 0)}

        return self.make_node(
            arn,
            logical_id=f"LogsGroup{name.replace('/', '_')}",
            properties=props,
            metadata={
                "StoredBytes": raw.get("storedBytes"),
                "CreationTime": raw.get("creationTime"),
                "Missing": raw.get("missing", False),
            },
        )
