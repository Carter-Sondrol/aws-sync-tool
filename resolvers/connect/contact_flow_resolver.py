from __future__ import annotations

import json
from typing import Any, Iterable, Set, cast
from boto3 import Session
from botocore.exceptions import ClientError
from mypy_boto3_connect import ConnectClient
from mypy_boto3_connect.type_defs import DescribeContactFlowResponseTypeDef

from graph.dependency_graph import ResourceNode
from resolvers.base import BaseResolver
from resolvers.connect.base_connect import BaseConnectResolver
from utils.arn import ARN, extract_dependencies


class ContactFlowResolver(BaseConnectResolver[ConnectClient, DescribeContactFlowResponseTypeDef]):
    """
    Resolver for Amazon Connect Contact Flows.
    Extracts embedded ARNs (Queues, Lex bots, Prompts, FlowModules, etc.).
    """

    resource_type = "contact-flow"
    cfn_type = "AWS::Connect::ContactFlow"

    # ------------------------------------------------------------------
    # Discovery
    # ------------------------------------------------------------------
    def list_resources(self) -> Iterable[ARN]:
        """Enumerate all Contact Flows for the configured instance."""
        for flow in self.list_with_instance("list_contact_flows", "ContactFlowSummaryList"):
            arn_str = flow.get("Arn")
            if arn_str:
                yield ARN.parse_cached(arn_str)

    # ------------------------------------------------------------------
    # Fetch
    # ------------------------------------------------------------------
    def fetch_resource(self, arn: ARN) -> DescribeContactFlowResponseTypeDef:
        """Fetch a single Contact Flow definition."""
        self.ensure_instance_id(arn)
        if not self.instance_id:
            raise ValueError("Connect instance ID is required")
        sub_id = arn.subresource_id()
        if not sub_id:
            raise ValueError(f"Invalid ARN missing subresource ID: {arn}")

        try:
            return self.client.describe_contact_flow(
                InstanceId=self.instance_id,
                ContactFlowId=sub_id,
            )
        except ClientError as e:
            self.log.error("Failed to fetch contact flow %s: %s", arn, e)
            raise

    # ------------------------------------------------------------------
    # Convert to graph node
    # ------------------------------------------------------------------
    def to_node(self, arn: ARN, raw: DescribeContactFlowResponseTypeDef) -> ResourceNode:
        flow = raw.get("ContactFlow", {}) or {}
        content = flow.get("Content", "") or ""

        # Extract dependencies from JSON or inline text
        try:
            refs: Set[ARN] = extract_dependencies(json.loads(content))
        except Exception:
            refs = extract_dependencies(content)

        instance_arn = flow.get("InstanceArn") or self.instance_arn
        if instance_arn:
            refs.add(ARN.parse_cached(instance_arn))

        props: dict[str, Any] = {
            "Name": flow.get("Name"),
            "Type": flow.get("Type"),
            "Description": flow.get("Description"),
            "Content": content,
            "State": flow.get("State"),
            "InstanceArn": instance_arn,
            "Tags": flow.get("Tags", {}),
        }

        meta = {
            "EmbeddedReferenceCount": len(refs),
            "Source": "boto3.describe_contact_flow",
        }

        node = self.make_node(
            arn,
            logical_id=f"ConnectFlow{flow.get('Name', arn.resource_id)}",
            properties=props,
            metadata=meta,
        )
        node.referenced_arns |= refs
        return node
