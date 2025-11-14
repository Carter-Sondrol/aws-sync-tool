# resolvers/logs/log_group_resolver.py

from __future__ import annotations

import logging
from typing import Mapping, Any

from botocore.exceptions import ClientError
from mypy_boto3_logs import CloudWatchLogsClient
from mypy_boto3_logs.type_defs import DescribeLogGroupsResponseTypeDef, LogGroupTypeDef

from resolvers.base_resolver import BaseResolver
from resolvers.registry import register_resolver
from graph.resource_node import ResourceNode
from utils.arn import ARN


@register_resolver("logs:log-group")
class LogGroupResolver(BaseResolver[CloudWatchLogsClient, Mapping[str, Any]]):
    """
    Resolver for CloudWatch Log Groups.

    ARN form:
      arn:aws:logs:{region}:{account}:log-group:{group-name}

    This resolver fetches ONLY the specified log group and does not enumerate
    others. Fully safe under seed-based discovery rules.
    """

    service = "logs"
    resource_type = "log-group"
    cfn_type = "AWS::Logs::LogGroup"

    # ------------------------------------------------------------------
    # AWS fetch
    # ------------------------------------------------------------------
    def fetch_resource(self, arn: ARN) -> LogGroupTypeDef:
        """
        Fetch the log group *by name*:

        CloudWatch Logs has no direct "GetLogGroup" API.
        We must call describe_log_groups(logGroupNamePrefix=...) and filter down.

        Since this resolver is seed-driven, we consider it valid because
        we pass the *exact* name and only return a match with exact equality.
        """
        group_name = arn.resource_name()

        client = self.client_for(arn)

        try:
            resp: DescribeLogGroupsResponseTypeDef = client.describe_log_groups(
                logGroupNamePrefix=group_name,
                limit=1,
            )
        except ClientError as e:
            self.log.warning("Failed to describe log group %s: %s", arn, e)
            raise

        groups = resp.get("logGroups", [])
        for g in groups:
            if g.get("logGroupName") == group_name:
                return g

        raise ValueError(f"Log group not found: {arn}")

    # ------------------------------------------------------------------
    # Convert AWS response → ResourceNode
    # ------------------------------------------------------------------
    def to_node(self, arn: ARN, data: Mapping[str, Any]) -> ResourceNode:
        """
        Convert the raw payload directly into the node; extract_dependencies()
        handles referenced ARNs automatically (KMS keys, etc.).
        """
        # Optional: fetch tags
        tags_resp = self.safe_get(
            lambda: self.client_for(arn).list_tags_for_resource(resourceArn=str(arn)),
            default=None,
        )
        if isinstance(tags_resp, Mapping):
            data = dict(data)
            data["Tags"] = tags_resp.get("tags") or tags_resp.get("Tags") or {}

        return self.make_node(
            arn,
            logical_id=arn.resource_name().replace("/", "").replace(":", ""),
            properties=data,
            metadata={"AWSResponse": data},
        )
