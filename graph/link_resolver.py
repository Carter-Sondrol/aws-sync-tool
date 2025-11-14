from __future__ import annotations

import json
import logging
from typing import Any, Optional

from utils.arn import ARN

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Base interface
# ---------------------------------------------------------------------------
class LinkResolver:
    """Abstract interface for relationship discovery within the graph."""

    service: str = "generic"

    def resolve(self, graph) -> None:
        """Walk the graph and infer internal relationships."""
        raise NotImplementedError


# ---------------------------------------------------------------------------
# Universal link resolver
# ---------------------------------------------------------------------------
class UniversalLinkResolver(LinkResolver):
    """
    Service-agnostic link resolver.

    Responsibilities:
      - Walk every node's properties recursively.
      - For any string that is:
          * A JSON blob → parse, walk, and dump back to string.
          * An ARN string → if target node exists, replace with __REF_<LogicalId>__.
      - Add edges (node.logical_id → target.logical_id) for any resolved links.
      - Run optional service-specific hooks (e.g., Lambda env name-based links).

    This operates purely on the graph; NO AWS calls. It strictly respects
    seed-based discovery: only links to resources already present in the graph.
    """

    service = "universal"

    def resolve(self, graph) -> None:
        logger.info("[UniversalLinkResolver] Starting link resolution")

        # Pass 1: generic recursive pass over all node properties
        for node in list(graph):
            try:
                node.properties = self._walk_value(graph, node.properties, node)
            except Exception:
                logger.exception(
                    "[UniversalLinkResolver] Failed while processing node %s",
                    node.logical_id,
                )

        # Pass 2: service-specific hooks
        for node in list(graph):
            try:
                if node.service == "lambda":
                    self._resolve_lambda_env(graph, node)
            except Exception:
                logger.exception(
                    "[UniversalLinkResolver] Service hook failed for node %s",
                    node.logical_id,
                )

        logger.info("[UniversalLinkResolver] Link resolution complete")

    # ------------------------------------------------------------------
    # Core recursive walker
    # ------------------------------------------------------------------
    def _walk_value(self, graph, value: Any, parent_node) -> Any:
        """
        Recursively traverse arbitrary structures and:

          - If string is JSON: parse, walk, and dump back to JSON string.
          - If string is an ARN: replace with __REF_<LogicalId>__ if target exists.
          - Otherwise: recurse into dicts/lists, leave scalars as-is.
        """
        # Strings: JSON blobs or ARN strings
        if isinstance(value, str):
            # Already a ref or parameter marker? leave alone
            if value.startswith("__REF_") or value.startswith("__PARAM_"):
                return value

            stripped = value.strip()

            # Heuristic: JSON-like string → parse and recurse
            if stripped and stripped[0] in ("{", "[") and stripped[-1] in ("}", "]"):
                try:
                    parsed = json.loads(stripped)
                except Exception:
                    # Not actually JSON; fall through to ARN handling
                    pass
                else:
                    updated = self._walk_value(graph, parsed, parent_node)
                    # Always store back as JSON string (important for Connect Content)
                    try:
                        return json.dumps(updated, separators=(",", ":"))
                    except TypeError:
                        # Fallback: default json.dumps
                        return json.dumps(updated)

            # Pure ARN string?
            if stripped.startswith("arn:") and ARN.is_valid(stripped):
                try:
                    arn = ARN.parse_cached(stripped)
                except Exception:
                    return value

                target = graph.get_node_by_arn(arn)
                if not target:
                    # Unknown target: respect seed-based rules, keep literal ARN.
                    return value

                # Parent depends on child (current node → target)
                graph.add_edge(parent_node.logical_id, target.logical_id)
                logger.debug(
                    "[UniversalLinkResolver] %s.%s → %s (ARN linked)",
                    parent_node.logical_id,
                    "<string>",
                    target.logical_id,
                )
                return f"__REF_{target.logical_id}__"

            return value

        # Lists: recurse element-wise
        if isinstance(value, list):
            return [self._walk_value(graph, v, parent_node) for v in value]

        # Dicts: recurse value-wise
        if isinstance(value, dict):
            out: dict[str, Any] = {}
            for k, v in value.items():
                out[k] = self._walk_value(graph, v, parent_node)
            return out

        # Other scalars: pass through unchanged
        return value

    # ------------------------------------------------------------------
    # Lambda-specific env var hook (name-based linking + parameters)
    # ------------------------------------------------------------------
    def _resolve_lambda_env(self, graph, node) -> None:
        """
        Preserve Lambda-specific behavior:

          - If env value is a non-ARN string, try to match:
              * S3 BucketName
              * DynamoDB TableName
              * SNS TopicName
          - On match: replace with __REF_<LogicalId>__ and add an edge.
          - On no match: convert to a parameter marker and record it in graph.metadata.

        NOTE:
          - Seed-based guarantee is preserved: all matches use existing graph nodes.
          - ARN env values are already handled by _walk_value.
        """
        env_root = node.properties.get("Environment")
        if not isinstance(env_root, dict):
            return

        variables = env_root.get("Variables")
        if not isinstance(variables, dict):
            return

        pending_params = graph.metadata.setdefault("PendingParams", {})

        for key, val in list(variables.items()):
            if not isinstance(val, str):
                continue

            # Already processed by the generic walker or explicitly parameterized
            if val.startswith("__REF_") or val.startswith("__PARAM_"):
                continue

            # ARN strings are handled generically; we only care about name-like values here
            if val.startswith("arn:"):
                continue

            # Try S3 bucket by name
            target = graph.find_by_property("s3", "BucketName", val)
            if target:
                variables[key] = f"__REF_{target.logical_id}__"
                graph.add_edge(node.logical_id, target.logical_id)
                logger.debug(
                    "[UniversalLinkResolver:LambdaEnv] %s.%s → %s (S3 bucket by name)",
                    node.logical_id,
                    key,
                    target.logical_id,
                )
                continue

            # Try DynamoDB table by TableName
            target = graph.find_by_property("dynamodb", "TableName", val)
            if target:
                variables[key] = f"__REF_{target.logical_id}__"
                graph.add_edge(node.logical_id, target.logical_id)
                logger.debug(
                    "[UniversalLinkResolver:LambdaEnv] %s.%s → %s (DynamoDB table by name)",
                    node.logical_id,
                    key,
                    target.logical_id,
                )
                continue

            # Try SNS topic by TopicName
            target = graph.find_by_property("sns", "TopicName", val)
            if target:
                variables[key] = f"__REF_{target.logical_id}__"
                graph.add_edge(node.logical_id, target.logical_id)
                logger.debug(
                    "[UniversalLinkResolver:LambdaEnv] %s.%s → %s (SNS topic by name)",
                    node.logical_id,
                    key,
                    target.logical_id,
                )
                continue

            # Otherwise: treat as a parameter (do NOT invent resources)
            param_name = f"{key}Param"
            variables[key] = f"__PARAM_{param_name}__"
            pending_params[param_name] = val
            logger.debug(
                "[UniversalLinkResolver:LambdaEnv] %s.%s → parameter (%s)",
                node.logical_id,
                key,
                val,
            )


# ---------------------------------------------------------------------------
# Dispatcher
# ---------------------------------------------------------------------------
DEFAULT_LINK_RESOLVERS = [
    UniversalLinkResolver(),
]


def resolve_graph_links(
    graph,
    extra_resolvers: Optional[list[LinkResolver]] = None,
) -> None:
    """
    Run link resolution on the provided dependency graph.

    - Always runs the UniversalLinkResolver.
    - Optional extra_resolvers can layer on hyper-specific behaviors if needed,
      but they should generally be avoided in favor of the unified pass.
    """
    all_resolvers: list[LinkResolver] = list(DEFAULT_LINK_RESOLVERS)
    if extra_resolvers:
        all_resolvers.extend(extra_resolvers)

    logger.info("Running link resolution with %d resolvers", len(all_resolvers))
    for r in all_resolvers:
        try:
            r.resolve(graph)
        except Exception as e:
            logger.exception("Resolver %s failed: %s", r.service, e)
