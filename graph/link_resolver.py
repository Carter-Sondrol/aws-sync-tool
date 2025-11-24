from __future__ import annotations

import json
import logging
from pathlib import Path
import re
from typing import Any, Iterable, Optional

from graph.dependency_graph import DependencyGraph
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
      - Optionally track unresolved "parameter" strings for later mapping.

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
                    except Exception:
                        # Last resort: keep original string
                        return value

            # ARN-like? try to resolve
            if value.startswith("arn:") and ARN.is_valid(value):
                try:
                    arn = ARN.parse(value)
                except Exception:
                    return value

                target = graph.get_node_by_arn(arn)
                if target:
                    marker = f"__REF_{target.logical_id}__"
                    graph.add_edge(
                        parent_node.logical_id,
                        target.logical_id,
                        label="property",
                    )
                    return marker
                elif parent_node:
                    graph.defer_link(parent_node.logical_id, arn, label="property")

            return value

        # Dicts: walk values
        if isinstance(value, dict):
            return {k: self._walk_value(graph, v, parent_node) for k, v in value.items()}

        # Lists/tuples: walk each element
        if isinstance(value, (list, tuple)):
            return [self._walk_value(graph, v, parent_node) for v in value]

        # Everything else: leave unchanged
        return value

class EnvironmentLinkResolver(LinkResolver):
    service = "lambda-env"

    def resolve(self, graph: DependencyGraph) -> None:
        for node in list(graph):
            if node.service != "lambda":
                continue

            env = (
                node.properties.get("Configuration", {})
                    .get("Environment", {})
                    .get("Variables", {})
            )

            if not isinstance(env, dict):
                continue

            connect_nodes: set[str] = set()
            bucket_targets: set[str] = set()

            for key, value in env.items():
                original_value = value
                if not isinstance(value, str):
                    continue

                # ARN strings are authoritative
                if ARN.is_valid(value):
                    try:
                        arn = ARN.parse(value)
                    except Exception:
                        arn = None
                    if arn:
                        target = graph.get_node_by_arn(arn)
                        if target:
                            graph.add_edge(
                                node.logical_id,
                                target.logical_id,
                                label=f"env:{key}",
                            )
                            env[key] = f"__REF_{target.logical_id}__"
                            if target.service == "s3":
                                bucket_targets.add(target.logical_id)
                            if target.service == "connect" and target.logical_id.startswith(
                                "Instance_"
                            ):
                                connect_nodes.add(target.logical_id)
                        else:
                            graph.defer_link(node.logical_id, arn, label=f"env:{key}")
                    continue

                # Respect explicit __REF_* markers
                ref_lid = _extract_ref_lid(value)
                if ref_lid:
                    target = graph.get_node(ref_lid)
                    if target:
                        graph.add_edge(
                            node.logical_id,
                            target.logical_id,
                            label=f"env:{key}",
                        )
                        env[key] = f"__REF_{target.logical_id}__"
                        if target.service == "s3":
                            bucket_targets.add(target.logical_id)
                        if target.service == "connect" and target.logical_id.startswith(
                            "Instance_"
                        ):
                            connect_nodes.add(target.logical_id)
                    continue

                # Direct logical-id match (explicit presence in graph)
                direct_target = graph.get_node(value)
                if direct_target:
                    graph.add_edge(
                        node.logical_id,
                        direct_target.logical_id,
                        label=f"env:{key}",
                    )
                    env[key] = f"__REF_{direct_target.logical_id}__"
                    if direct_target.service == "s3":
                        bucket_targets.add(direct_target.logical_id)
                    if direct_target.service == "connect" and direct_target.logical_id.startswith(
                        "Instance_"
                    ):
                        connect_nodes.add(direct_target.logical_id)
                    continue

                # Best-effort: map to existing bucket/connect nodes only if present
                if looks_like_bucket_name(value):
                    bucket_arn = ARN.from_parts("s3", value, region="", account_id="")
                    target = graph.get_node_by_arn(bucket_arn)
                    if target:
                        graph.add_edge(
                            node.logical_id,
                            target.logical_id,
                            label=f"env:{key}",
                        )
                        env[key] = f"__REF_{target.logical_id}__"
                        bucket_targets.add(target.logical_id)
                    continue

                if _looks_like_connect_instance_id(value):
                    primary = node.get_primary_arn()
                    carn = ARN.from_parts(
                        "connect",
                        f"instance/{value.strip()}",
                        region=primary.region if primary else "",
                        account_id=primary.account_id if primary else "",
                    )
                    target = graph.get_node_by_arn(carn)
                    if target:
                        graph.add_edge(
                            node.logical_id,
                            target.logical_id,
                            label=f"env:{key}",
                        )
                        env[key] = f"__REF_{target.logical_id}__"
                        connect_nodes.add(target.logical_id)

            if connect_nodes and bucket_targets:
                for connect_lid in connect_nodes:
                    connect_node = graph.get_node(connect_lid)
                    if not connect_node:
                        continue
                    for lid in bucket_targets:
                        target = graph.get_node(lid)
                        if target:
                            graph.add_edge(
                                connect_node.logical_id,
                                target.logical_id,
                                label="env:connect-bucket",
                            )


DEFAULT_LINK_RESOLVERS: tuple[LinkResolver, ...] = (UniversalLinkResolver(),EnvironmentLinkResolver(),)

def resolve_graph_links(graph, extra_resolvers: Optional[Iterable[LinkResolver]] = None) -> None:
    """
    Run link resolution passes over the graph.

    This is intentionally side-effect limited:
      - No AWS calls
      - No new nodes created
      - Only edges + property rewrites
    """
    all_resolvers: list[LinkResolver] = list(DEFAULT_LINK_RESOLVERS)
    if extra_resolvers:
        all_resolvers.extend(extra_resolvers)

    logger.info("Running link resolution with %d resolvers", len(all_resolvers))
    for r in all_resolvers:
        try:
            r.resolve(graph)
        except Exception as e:
            logger.exception("Resolver %s failed: %s", getattr(r, "service", "unknown"), e)

SCHEMA_DIR = Path("./schemas")

def try_introspect(value: str):
    """
    Attempt to match an arbitrary string to a known AWS resource
    using the outputs of tools.service_introspector.

    Returns:
        ARN or None
    """

    if not value or not isinstance(value, str):
        return None

    # Fast path: if the env var already looks like an ARN, just return it
    if value.startswith("arn:"):
        try:
            return ARN.parse(value)
        except Exception:
            pass  # fall through to other matches

    # Walk all introspector schemas
    if not SCHEMA_DIR.exists():
        return None

    for schema_file in SCHEMA_DIR.glob("*.json"):
        try:
            data = json.loads(schema_file.read_text())
        except Exception:
            continue

        # Introspector schema shape:
        # {
        #   "Resources": {
        #       "<name>": {
        #           "Arn": "...",
        #           "Id": "...",
        #           "Name": "...",
        #           ...
        #       }
        #   }
        # }
        resources = data.get("Resources") or {}
        for res_name, res_info in resources.items():
            arn = res_info.get("Arn")
            name = res_info.get("Name")
            rid  = res_info.get("Id")

            # Match against:
            #   - resource name ("dev-srh-vm-presigner")
            #   - logical introspector key ("PresignerLambda")
            #   - resource ID ("voicemailbucket6df79c0c-awvs...")
            #   - bucket names, function names, etc.
            if value == name or value == res_name or value == rid:
                if arn:
                    try:
                        return ARN.parse(arn)
                    except Exception:
                        continue
    return None
_BUCKET_RE = re.compile(r"^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$")
def looks_like_bucket_name(value: str) -> bool:
    """
    Heuristic to detect if a string is a valid S3 bucket name.
    Based on AWS bucket naming rules:
      - 3 to 63 chars
      - lowercase a-z, 0-9, dots, hyphens
      - no uppercase, no underscores
      - cannot start or end with dot or hyphen
    """

    if not isinstance(value, str):
        return False

    # Length check
    if len(value) < 3 or len(value) > 63:
        return False

    # No uppercase or underscores
    if any(c.isupper() for c in value) or "_" in value:
        return False

    # No ARN-like structure
    if value.startswith("arn:"):
        return False

    # Must match basic S3 naming rules
    if not _BUCKET_RE.match(value):
        return False

    # Must not resemble an AWS Lambda function name
    # (optional but helps avoid false positives)
    if value.startswith("dev-") or value.startswith("prod-"):
        # Function names often start with env prefix + service
        # Bucket names rarely use this exact pattern
        # Adjust as needed
        return False

    return True

def _extract_ref_lid(value: Any) -> Optional[str]:
    if not isinstance(value, str):
        return None
    if value.startswith("__REF_") and value.endswith("__"):
        return value.removeprefix("__REF_").removesuffix("__")
    return None

_CONNECT_ID_RE = re.compile(r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$")
def _looks_like_connect_instance_id(value: Any) -> bool:
    return isinstance(value, str) and _CONNECT_ID_RE.match(value.strip()) is not None
