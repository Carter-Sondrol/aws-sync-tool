from __future__ import annotations

import logging
from typing import Any, Set, Dict
from mypy_boto3_logs import CloudWatchLogsClient
from mypy_boto3_logs.type_defs import DescribeLogGroupsResponseTypeDef

from resolvers.base import BaseResolver
from graph.dependency_graph import ResourceNode
from utils.arn import ARN

logger = logging.getLogger(__name__)


class LogsResolver(BaseResolver[CloudWatchLogsClient, DescribeLogGroupsResponseTypeDef]):
    """Resolver for CloudWatch Logs resources (LogGroups)."""

    resource_type = "log-group"
    cfn_type = "AWS::Logs::LogGroup"

    # ----------------------------------------------------------------------
    # Fetch
    # ----------------------------------------------------------------------
    def fetch(self, arn: ARN) -> DescribeLogGroupsResponseTypeDef:
        """Fetch CloudWatch LogGroup metadata by name derived from ARN."""
        name = arn.resource.split(":")[-1].replace("log-group:", "")
        try:
            resp = self.client.describe_log_groups(logGroupNamePrefix=name)
            for lg in resp.get("logGroups", []):
                if lg.get("logGroupName") == name:
                    return lg
            # Fallback dummy if not found
            return {"logGroupName": name, "missing": True}
        except Exception as e:
            logger.warning(f"[LogsResolver] Failed to describe {arn}: {e}")
            return {"logGroupName": name, "error": str(e)}

    # ----------------------------------------------------------------------
    # Parse
    # ----------------------------------------------------------------------
    def parse(self, arn: ARN, raw: Dict[str, Any]) -> ResourceNode[Dict[str, Any]]:
        """Convert describe_log_groups result into a ResourceNode."""
        name = raw.get("logGroupName", arn.resource_id)
        refs: Set[ARN] = set()

        props: Dict[str, Any] = {
            "LogGroupName": name,
            "RetentionInDays": raw.get("retentionInDays"),
            "KmsKeyId": raw.get("kmsKeyId"),
        }

        # Drop empty fields
        props = {k: v for k, v in props.items() if v not in (None, "", [], {})}

        return ResourceNode(
            logical_id=f"LogsGroup{name.replace('/', '_')}",
            service="logs",
            cfn_type=self.cfn_type,
            properties=props,
            referenced_arns=refs,
            arns={"LogGroup": arn},
            metadata={
                "StoredBytes": raw.get("storedBytes"),
                "CreationTime": raw.get("creationTime"),
                "Missing": raw.get("missing", False),
            },
        )
