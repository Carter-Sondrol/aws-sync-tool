from __future__ import annotations
from typing import Any, Mapping, Optional

from botocore.exceptions import ClientError
from mypy_boto3_logs import CloudWatchLogsClient
from mypy_boto3_logs.type_defs import DescribeLogGroupsResponseTypeDef

from resolvers.base_resolver import BaseResolver
from resolvers.registry import register_resolver
from graph.resource_node import ResourceNode
from utils.arn import ARN
from utils.arn import extract_dependencies

@register_resolver("logs:log-stream")
class LogsLogStreamResolver(BaseResolver[CloudWatchLogsClient, Mapping[str, Any]]):
    service = "logs"
    resource_type = "log-stream"
    cfn_type = "AWS::Logs::LogStream"  # synthetic; never deployed

    def fetch_resource(self, arn: ARN) -> Mapping[str, Any]:
        # We cannot and must not fetch individual streams.
        # Represent them as a placeholder.
        return {
            "LogStreamName": arn.subresource_id(),
            "LogGroupName": arn.subresource_parent_id("log-group"),
        }

    def to_node(self, arn: ARN, raw: Mapping[str, Any]) -> ResourceNode:
        stream = raw["LogStreamName"]
        group = raw.get("LogGroupName")

        logical = f"LogStream{stream.replace('-', '')}"

        return self.make_node(
            arn,
            logical_id=logical,
            properties={
                "LogGroupName": group,
                "LogStreamName": stream,
            },
            metadata={"aws_managed": False, "Synthetic": True},
            reference_only=True,
        )
