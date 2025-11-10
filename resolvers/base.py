from __future__ import annotations

import logging
import os
from abc import ABC, abstractmethod
from typing import Any, Callable, Dict, Generic, Iterable, List, Optional, TypeVar, cast

from boto3 import Session
from botocore.client import BaseClient
from botocore.exceptions import ClientError

from utils.arn import ARN, extract_dependencies
from graph.dependency_graph import ResourceNode, DependencyGraph

# ---------------------------------------------------------------------------
# Type parameters
# ---------------------------------------------------------------------------
C = TypeVar("C", bound=BaseClient)
R = TypeVar("R")

# ---------------------------------------------------------------------------
# Optional MAP Tag Configuration
# ---------------------------------------------------------------------------
MAP_CONFIG: dict[str, str] = {
    "MAP_ID": os.getenv("MAP_ID", ""),          # e.g. "*******-LFZ6"
    "PREFIX": os.getenv("MAP_TAG_PREFIX", "mig"),
    "TAG_KEY": os.getenv("MAP_TAG_KEY", "map-migrated"),
}
MAP_ENABLED = bool(os.getenv("ENABLE_MAP_TAGS"))  # opt-in via env flag


class BaseResolver(ABC, Generic[C, R]):
    """
    Generic, type-safe base class for AWS resource resolvers.

    Subclasses define:
      - service (e.g., "lambda")
      - cfn_type (CloudFormation resource type)
      - resource_type (AWS resource subtype)
      - list_resources(), fetch_resource(), to_node()
    """

    # Expected class-level attributes
    service: str = ""
    cfn_type: Optional[str] = None
    resource_type: Optional[str] = None

    def __init__(
        self,
        session: Session,
        graph: Optional[DependencyGraph] = None,
        client: Optional[C] = None,
        enable_map_tags: bool | None = None,
    ) -> None:
        self.session = session
        self.graph = graph
        self.client: C = cast(C, client or session.client(self.service))  # type: ignore[arg-type]
        self.log = logging.getLogger(f"resolver.{self.service}")

        # Determine whether MAP tagging is active
        self.enable_map_tags = enable_map_tags if enable_map_tags is not None else MAP_ENABLED

    # ------------------------------------------------------------------
    # Abstracts
    # ------------------------------------------------------------------
    @abstractmethod
    def list_resources(self) -> Iterable[ARN]:
        """Return iterable of resource ARNs discovered by the resolver."""
        raise NotImplementedError

    @abstractmethod
    def fetch_resource(self, arn: ARN) -> R:
        """Return raw API data for the given resource ARN."""
        raise NotImplementedError

    @abstractmethod
    def to_node(self, arn: ARN, data: R) -> ResourceNode:
        """Convert raw resource data into a ResourceNode."""
        raise NotImplementedError

    # ------------------------------------------------------------------
    # Framework methods
    # ------------------------------------------------------------------
    def resolve(self, arn: ARN) -> Optional[ResourceNode]:
        """Fetch a single resource and convert to a node (adds to graph if present)."""
        try:
            raw = self.fetch_resource(arn)
            if not isinstance(raw, dict):
                raise TypeError(
                    f"{self.__class__.__name__}.fetch_resource() returned {type(raw).__name__}, expected dict"
                )
            node = self.to_node(arn, raw)
            if not isinstance(node, ResourceNode):
                raise TypeError(
                    f"{self.__class__.__name__}.to_node() returned {type(node).__name__}, expected ResourceNode"
                )
            if self.graph:
                self.graph.add_node(node)
            return node

        except ClientError as e:
            self.log.warning("[%s] Failed to fetch %s: %s", self.service, arn, e)
        except Exception as e:
            self.log.error("[%s] Unexpected error resolving %s: %s", self.service, arn, e, exc_info=True)
        return None


    def discover(self) -> List[ResourceNode]:
        """List, fetch, and parse all resources into graph nodes."""
        nodes: List[ResourceNode] = []
        for arn in self.list_resources():
            node = self.resolve(arn)
            if node:
                nodes.append(node)
        self.log.info("[%s] Discovered %d resources", self.service, len(nodes))
        return nodes


    # ------------------------------------------------------------------
    # MAP Tag Helpers
    # ------------------------------------------------------------------
    def inject_map_tag(self, props: dict[str, Any]) -> dict[str, Any]:
        """
        Inject AWS MAP 2.0 tags into resource properties (non-destructive).
        Only runs if ENABLE_MAP_TAGS is set or enable_map_tags=True.
        """
        if not self.enable_map_tags:
            return props

        map_id = MAP_CONFIG.get("MAP_ID")
        if not map_id:
            self.log.debug("MAP tagging enabled but MAP_ID missing — skipping")
            return props

        try:
            tag_key = MAP_CONFIG["TAG_KEY"]
            tag_value = f"{MAP_CONFIG['PREFIX']}{map_id}"

            # CloudFormation-compatible tag injection
            tags = props.get("Tags", [])
            if isinstance(tags, list):
                if not any(t.get("Key") == tag_key for t in tags):
                    tags.append({"Key": tag_key, "Value": tag_value})
                    props["Tags"] = tags
            elif isinstance(tags, dict):
                props["Tags"][tag_key] = tag_value
            else:
                props["Tags"] = [{"Key": tag_key, "Value": tag_value}]
        except Exception as e:
            self.log.debug("[%s] Failed to inject MAP tag: %s", self.service, e)

        return props

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------
    def make_node(
        self,
        arn: ARN,
        *,
        logical_id: Optional[str] = None,
        properties: Optional[dict] = None,
        metadata: Optional[dict] = None,
        reference_only: bool = False,
    ) -> ResourceNode:
        """Factory to create a standardized ResourceNode."""
        props = properties or {}
        meta = metadata or {}

        # Inject MAP tag if enabled and appropriate
        if not reference_only and self.enable_map_tags and self.service not in ("iam", "logs"):
            props = self.inject_map_tag(props)

        referenced_arns = extract_dependencies(props)

        return ResourceNode(
            logical_id=logical_id or arn.resource_id,
            service=self.service,
            cfn_type=self.cfn_type
            or f"AWS::{self.service.title()}::{self.resource_type.title() if self.resource_type else 'Resource'}",
            properties=props,
            reference_only=reference_only,
            metadata=meta,
            arns={"Primary": arn},
            referenced_arns=referenced_arns,
        )

    def paginate(self, method_name: str, **kwargs: Any) -> Iterable[dict]:
        """Generic paginator helper for boto3 clients."""
        paginator = self.client.get_paginator(method_name)
        for page in paginator.paginate(**kwargs):
            yield from (
                page.get("Items")
                or page.get("Resources")
                or page.get("Functions", [])
                or []
            )

    def safe_get(self, call: Callable[[], Any], default: Any = None) -> Any:
        """Wrapper to handle ClientError safely."""
        try:
            return call()
        except ClientError as e:
            self.log.warning("[%s] client error: %s", self.service, e)
            return default
