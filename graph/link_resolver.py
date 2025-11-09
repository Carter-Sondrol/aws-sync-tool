from __future__ import annotations

import json
import logging
from typing import Any, Dict, Optional

from utils.arn import ARN
import json
import logging
from typing import Any, Dict, List
from utils.arn import ARN

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Base interface
# ---------------------------------------------------------------------------
class LinkResolver:
    """Abstract interface for per-service relationship discovery."""

    service: str = "generic"

    def resolve(self, graph) -> None:
        """Walk all nodes of this service and infer internal relationships."""
        raise NotImplementedError


# ---------------------------------------------------------------------------
# Lambda link resolver
# ---------------------------------------------------------------------------
class LambdaLinkResolver(LinkResolver):
    service = "lambda"

    def resolve(self, graph) -> None:
        """Detect cross-service links from Lambda environment variables."""
        for node in graph:
            if node.service != "lambda":
                continue

            env = node.properties.get("Environment", {}).get("Variables", {})
            if not env:
                continue

            for key, val in list(env.items()):
                if not isinstance(val, str) or val.startswith("arn:"):
                    continue
                if not isinstance(val, str):
                    continue

                # If it's already an ARN: convert to Ref/GetAtt if we have that node.
                if val.startswith("arn:"):
                    try:
                        arn = ARN(val)
                    except Exception:
                        continue
                    target = graph.get_node_by_arn(arn)
                    if target:
                        env[key] = self._as_cfn_ref(target)
                        graph.add_edge(target.logical_id, node.logical_id)
                        logger.debug("[LinkResolver:Lambda] %s.%s ARN → %s", node.logical_id, key, target.logical_id)
                    continue
            
                # Match to S3 buckets
                target = graph.find_by_property("s3", "BucketName", val)
                if target:
                    env[key] = self._as_cfn_ref(target)
                    graph.add_edge(target.logical_id, node.logical_id)
                    logger.debug("[LinkResolver:Lambda] %s.%s → %s (S3 bucket)",
                                 node.logical_id, key, target.logical_id)
                    continue

                # Match to DynamoDB tables
                target = graph.find_by_property("dynamodb", "TableName", val)
                if target:
                    env[key] = {"Ref": target.logical_id}
                    graph.add_edge(target.logical_id, node.logical_id)
                    logger.debug("[LinkResolver:Lambda] %s.%s → %s (DynamoDB table)",
                                 node.logical_id, key, target.logical_id)
                    continue

                # Match to SNS topic names
                target = graph.find_by_property("sns", "TopicName", val)
                if target:
                    env[key] = self._as_cfn_ref(target)
                    graph.add_edge(target.logical_id, node.logical_id)
                    logger.debug("[LinkResolver:Lambda] %s.%s → %s (SNS topic)",
                                 node.logical_id, key, target.logical_id)
                    continue

                # Otherwise: parameterize
                param_name = f"{key}Param"
                env[key] = {"Ref": param_name}
                graph.metadata.setdefault("PendingParams", {})[param_name] = val
                logger.debug("[LinkResolver:Lambda] %s.%s → parameter (%s)",
                             node.logical_id, key, val)

    def _find_by_property(self, graph, prop: str, value: str, service: Optional[str] = None):
        for n in graph:
            if service and n.service != service:
                continue
            if n.properties.get(prop) == value:
                return n
        return None
    
    def _as_cfn_ref(self, target_node):
        return {"Ref": target_node.logical_id}


# ---------------------------------------------------------------------------
# Connect link resolver
# ---------------------------------------------------------------------------
class ConnectLinkResolver(LinkResolver):
    """
    Generic resolver for Amazon Connect resource interlinks.
    Scans JSON-based fields (like ContactFlow Content) for ARNs or known name references
    and replaces them with graph Refs/GetAtt where applicable.
    """

    service = "connect"

    # Schema map: service_subtype → JSON keys to scan
    SCHEMA_KEYS: Dict[str, List[str]] = {
        "contact-flow": ["Content"],
        "contact-flow-module": ["Content"],
        "queue": ["QuickConnects", "OutboundCallerConfig"],
        "routing-profile": ["QueueConfigs"],
        "prompt": ["S3Uri"],
        "quick-connect": ["QuickConnectConfig"],
        "hours-of-operation": [],
        "instance": [],
    }

    def resolve(self, graph) -> None:
        for node in graph:
            if node.service != "connect":
                continue

            subtype = node.cfn_type.split("::")[-1].lower()  # e.g. AWS::Connect::Queue → "queue"
            scan_keys = self.SCHEMA_KEYS.get(subtype, [])

            for key in scan_keys:
                value = node.properties.get(key)
                if not value:
                    continue

                # Flatten nested JSON content if stringified
                if isinstance(value, str):
                    try:
                        value = json.loads(value)
                    except Exception:
                        continue

                updated = self._walk_and_link(graph, value, parent=node)
                node.properties[key] = updated

    # ------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------

    def _walk_and_link(self, graph, data: Any, parent):
        """Recursively traverse JSON structures and replace ARNs / Names."""
        if isinstance(data, str):
            if data.startswith("arn:aws:connect:"):
                return self._replace_arn(graph, data, parent)
            return data

        elif isinstance(data, list):
            return [self._walk_and_link(graph, v, parent) for v in data]

        elif isinstance(data, dict):
            out = {}
            for k, v in data.items():
                if isinstance(v, str) and v.startswith("arn:aws:connect:"):
                    out[k] = self._replace_arn(graph, v, parent)
                elif k.lower().endswith("name"):
                    # Handle name-based link (e.g. QueueName, PromptName)
                    out[k] = self._replace_name(graph, v, parent)
                else:
                    out[k] = self._walk_and_link(graph, v, parent)
            return out
        else:
            return data

    def _replace_arn(self, graph, arn_str: str, parent):
        """Try to replace ARN with a graph Ref if target exists."""
        try:
            arn = ARN(arn_str)
        except Exception:
            return arn_str

        target = graph.get_node_by_arn(arn)
        if not target:
            return arn_str

        graph.add_edge(target.logical_id, parent.logical_id)
        logger.debug("[ConnectLinkResolver] %s → %s (ARN linked)", parent.logical_id, target.logical_id)
        return {"Ref": target.logical_id}

    def _replace_name(self, graph, name: str, parent):
        """Try to resolve by name when Connect uses Name references."""
        # Example: Connect::Queue referencing HoursOfOperation by Name
        if not name or not isinstance(name, str):
            return name

        target = graph.find_by_property("connect", "Name", name)
        if not target:
            return name

        graph.add_edge(target.logical_id, parent.logical_id)
        logger.debug("[ConnectLinkResolver] %s → %s (Name linked)", parent.logical_id, target.logical_id)
        return {"Ref": target.logical_id}

# ---------------------------------------------------------------------------
# Dispatcher
# ---------------------------------------------------------------------------
DEFAULT_LINK_RESOLVERS = [
    LambdaLinkResolver(),
    ConnectLinkResolver(),
]


def resolve_graph_links(graph, extra_resolvers: Optional[list[LinkResolver]] = None) -> None:
    """
    Run all link resolvers on the provided dependency graph.
    """
    all_resolvers = list(DEFAULT_LINK_RESOLVERS)
    if extra_resolvers:
        all_resolvers.extend(extra_resolvers)

    logger.info("Running link resolution with %d resolvers", len(all_resolvers))
    for r in all_resolvers:
        try:
            r.resolve(graph)
        except Exception as e:
            logger.exception("Resolver %s failed: %s", r.service, e)
