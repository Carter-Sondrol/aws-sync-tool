from __future__ import annotations

import json
import re
from typing import Any, Set

from mypy_boto3_connect.type_defs import DescribeContactFlowResponseTypeDef
from graph.dependency_graph import ResourceNode
from utils.arn import ARN, extract_dependencies
from .base_connect import BaseConnectSubResolver


# ---------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------

def _infer_instance_arn_from_subresource(arn: ARN) -> str:
    """Compute the Connect Instance ARN from any Connect subresource ARN."""
    parts = arn.resource.split("/")
    if "instance" in parts:
        idx = parts.index("instance")
        if idx + 1 < len(parts):
            inst_id = parts[idx + 1]
            return f"arn:aws:{arn.service}:{arn.region}:{arn.account_id}:instance/{inst_id}"
    raise ValueError(f"Cannot infer Connect Instance from ARN: {arn}")


# Broader ARN match for inline strings that may not JSON-parse cleanly
ARN_PATTERN = re.compile(r"arn:aws:[a-z0-9-]+:[a-z0-9-]*:\d*:[^\s\"'<>]+")


def _extract_arns_from_content(content: str) -> Set[ARN]:
    """Parse flow Content JSON and extract embedded ARNs from both JSON and raw text."""
    refs: set[ARN] = set()
    if not content:
        return refs

    # Try parsing as JSON to extract structured references
    try:
        data = json.loads(content)
        refs |= extract_dependencies(data)
    except Exception:
        # Fallback: regex scan for inline ARNs in malformed content
        for match in ARN_PATTERN.findall(content):
            parsed = ARN.try_parse(match)
            if parsed:
                refs.add(parsed)
    return refs


# ---------------------------------------------------------------------
# Resolver
# ---------------------------------------------------------------------

class ContactFlowResolver(BaseConnectSubResolver[DescribeContactFlowResponseTypeDef]):
    """
    Resolves AWS Connect Contact Flows into ResourceNodes, including detection
    of embedded ARNs (prompts, queues, Lex bots, flow modules, etc.)
    """

    resource_type = "contact-flow"
    cfn_type = "AWS::Connect::ContactFlow"

    def fetch(self, instance_id: str, arn: ARN):
        return self.client.describe_contact_flow(
            InstanceId=instance_id,
            ContactFlowId=arn.subresource_id(),
        )

    def parse(self, arn: ARN, raw: DescribeContactFlowResponseTypeDef):
        flow = raw.get("ContactFlow", {}) or {}
        content_str = flow.get("Content", "") or ""

        # Extract ARNs from embedded flow JSON and text
        refs = _extract_arns_from_content(content_str)

        # Determine instance ARN and add it explicitly
        instance_arn_str = flow.get("InstanceArn") or _infer_instance_arn_from_subresource(arn)
        instance_arn = ARN(instance_arn_str)
        refs.add(instance_arn)

        # Build core CFN-compatible properties
        props: dict[str, Any] = {
            "Name": flow.get("Name"),
            "Type": flow.get("Type"),
            "Description": flow.get("Description"),
            "Content": content_str,
            "State": flow.get("State"),
            "InstanceArn": instance_arn_str,
            "Tags": flow.get("Tags", {}),
        }

        # Construct metadata for visibility / debugging
        metadata = {
            "EmbeddedReferenceCount": len(refs),
            "ExtractedReferences": [str(r) for r in sorted(refs, key=str)],
            "Source": "describe_contact_flow",
        }

        return ResourceNode(
            logical_id=f"ConnectFlow{flow.get('Name', arn.resource_id)}",
            service="connect",
            cfn_type=self.cfn_type,
            properties=props,
            referenced_arns=refs,
            arns={"Flow": arn},
            metadata=metadata,
        )
