from __future__ import annotations

import logging
from abc import ABC
from typing import (
    TYPE_CHECKING,
    Any,
    Callable,
    Generic,
    Iterable,
    Mapping,
    Optional,
    TypeVar,
    cast,
)

from boto3 import Session
from botocore.exceptions import ClientError

from graph.resource_node import NodeClassification, ResourceNode
from utils.arn import ARN, extract_dependencies

# ---------------------------------------------------------------------------
# Type parameters (runtime-loose, IDE-strong)
# ---------------------------------------------------------------------------
if TYPE_CHECKING:
    from botocore.client import BaseClient  # only imported for typing
else:
    BaseClient = Any  # prevents runtime dependency issues

C = TypeVar("C", bound=BaseClient)
R = TypeVar("R", bound=Mapping[str, Any])

logger = logging.getLogger(__name__)


class BaseResolver(ABC, Generic[C, R]):
    """
    Generic, metadata-driven base class for AWS resource resolvers.

    This replaces the old GenericAWSResolver so resolvers only need
    to implement overrides when the metadata-driven path is insufficient.
    """

    # Expected class-level attributes
    service: str = ""
    cfn_type: Optional[str] = None
    resource_type: Optional[str] = None
    resource_name: Optional[str] = None
    deployment_mode: Optional[str] = None

    # Metadata-driven resolver knobs
    list_operation: Optional[str] = None
    describe_operation: Optional[str] = None
    id_fields: list[str] = []
    summary_list_path: Optional[str] = None
    summary_arn_field: Optional[str] = None
    enable_deep_scan: bool = False

    def __init__(
        self,
        session: Session,
        client: Optional[C] = None,
    ) -> None:
        self.session = session
        # cache the session's region (CLI --region lands here)
        self.session_region: Optional[str] = session.region_name
        self.discovery_config: dict[str, Any] = {}

        # Do NOT create a single static client.
        # Instead maintain a region-aware client cache.
        self._clients: dict[tuple[str, str], C] = {}

        self.log = logging.getLogger(f"resolver.{self.service}")

        # Optional preload of a generic client *only* if explicitly passed.
        # For resolvers like IAM/global services.
        self._default_client = cast(C, client) if client else None

    # ---------------------------------------------------------------
    # Region-aware client acquisition
    # ---------------------------------------------------------------
    def client_for(self, arn: ARN):
        svc = arn.service

        # S3 has no region in ARN → fallback to session region or CLI region
        region = arn.region or self.session_region or self.session.region_name or "us-east-1"
        key = (svc, region)
        if key not in self._clients:
            self._clients[key] = cast(C, self.session.client(svc, region_name=region))
        return self._clients[key]

    

    # ---------------------------------------------------------------
    # If a resolver truly must use a region-agnostic client
    # ---------------------------------------------------------------
    @property
    def client(self) -> C:
        """
        For global services only.
        DO NOT use this for region-bound services like Connect or Lex.
        """
        if self._default_client:
            return self._default_client

        svc = cast(Any, self.service)
        self._default_client = cast(C, self.session.client(svc))
        return self._default_client

    # ------------------------------------------------------------------
    # Core operations (override when the metadata path is insufficient)
    # ------------------------------------------------------------------
    def fetch_resource(self, arn: ARN) -> R:
        """
        Default fetch: call the configured describe/get operation using
        metadata-defined id_fields. Override for bespoke behavior.
        """
        if not self.describe_operation:
            raise NotImplementedError(f"{self.__class__.__name__} must implement fetch_resource or define describe_operation")

        client = self.client_for(arn)
        fn = getattr(client, self.describe_operation)

        params = self._resolve_id_fields(arn)
        result = fn(**params)

        inner = result.get(self.resource_name) if isinstance(result, Mapping) else None
        if isinstance(inner, Mapping):
            return cast(R, {self.resource_name: dict(inner)})

        return cast(R, result)

    def to_node(self, arn: ARN, data: R) -> ResourceNode:
        """
        Default node builder: unwraps the resource block named by resource_name,
        applies ARN metadata, and extracts dependencies.
        """
        if not self.resource_name:
            raise NotImplementedError(f"{self.__class__.__name__} must set resource_name or override to_node")

        inner = data.get(self.resource_name) if isinstance(data, Mapping) else None
        props = dict(inner if isinstance(inner, Mapping) else cast(Mapping[str, Any], data))
        logical_id = f"{self.resource_name}_{arn.resource_id or 'Root'}"
        referenced = extract_dependencies(props)

        arns = {"Primary": arn}
        if arn.account_id:
            arns.setdefault(arn.account_id, arn)

        return ResourceNode(
            logical_id=logical_id,
            service=self.service,
            cfn_type=self.cfn_type,
            properties=props,
            referenced_arns=referenced,
            classification=NodeClassification.RESOURCE,
            arns=arns,
        )

    # ------------------------------------------------------------------
    # Framework methods (shared behavior)
    # ------------------------------------------------------------------
    def resolve(self, arn: ARN) -> Optional[ResourceNode]:
        """
        Fetch a single resource and convert it into a ResourceNode.

        IMPORTANT:
        - This method NO LONGER mutates the graph.
        - The caller (GraphBuilder / DependencyGraph) owns insertion,
            pending/resolved bookkeeping, and traversal logic.
        """
        try:
            raw = self.fetch_resource(arn)
            if not isinstance(raw, Mapping):
                raise TypeError(
                    f"{self.__class__.__name__}.fetch_resource() returned "
                    f"{type(raw).__name__}, expected Mapping"
                )

            node = self.to_node(arn, raw)
            if not isinstance(node, ResourceNode):
                raise TypeError(
                    f"{self.__class__.__name__}.to_node() returned "
                    f"{type(node).__name__}, expected ResourceNode"
                )

            return node

        except ClientError as e:
            self.log.warning("[%s] Failed to fetch %s: %s", self.service, arn, e)
        except Exception as e:
            self.log.error(
                "[%s] Unexpected error resolving %s: %s",
                self.service,
                arn,
                e,
                exc_info=True,
            )
        return None

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------
    def make_node(
        self,
        arn: ARN,
        *,
        logical_id: Optional[str] = None,
        properties: Optional[Mapping[str, Any]] = None,
        metadata: Optional[dict[str, Any]] = None,
        reference_only: bool = False,
        classification: NodeClassification = NodeClassification.RESOURCE,
    ) -> ResourceNode:
        """Factory to create a standardized ResourceNode."""
        props = dict(properties or {})
        meta = dict(metadata or {})
        referenced_arns = extract_dependencies(props)
        referenced_arns = {a for a in referenced_arns if not a.raw.endswith(":*")}

        arns = {"Primary": arn}
        if arn.account_id:
            arns.setdefault(arn.account_id, arn)

        return ResourceNode(
            logical_id=logical_id or arn.resource_id,
            service=self.service,
            cfn_type=self.cfn_type
            or f"AWS::{self.service.title()}::{self.resource_type.title() if self.resource_type else 'Resource'}",
            properties=props,
            reference_only=reference_only,
            metadata=meta,
            arns=arns,
            referenced_arns=referenced_arns,
            classification=classification,
        )

    def paginate(self, method_name: str, **kwargs: Any) -> Iterable[Mapping[str, Any]]:
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

    # ------------------------------------------------------------------
    # extract_references
    # ------------------------------------------------------------------
    def extract_references(
        self,
        arn: ARN,
        raw: Mapping[str, Any],
        *,
        known_buckets: set[str] | None = None,
    ) -> set[ARN]:
        """
        Universal dependency extractor for all resolvers.
        Applies recursive ARN harvesting to the raw AWS response and
        optionally deep children when enabled.

        This is used by ResourceGraphBuilder to find downstream
        dependencies and expand the graph.
        """
        try:
            refs = extract_dependencies(
                raw,
                allow_partial=False,
                service_filter=None,
                known_buckets=known_buckets,
            )
        except Exception as e:
            self.log.warning(
                "[%s] extract_references failed for %s: %s",
                self.service,
                arn,
                e,
            )
            return set()

        if self.enable_deep_scan and self.discovery_config.get("deep"):
            try:
                refs.update(self.deep_children(arn, raw))
            except Exception as e:
                self.log.warning("[%s] deep_children() failed for %s: %s", self.service, arn, e)

        return refs

    def deep_children(self, arn: ARN, raw: Mapping[str, Any]) -> Iterable[ARN]:
        """
        Emit additional ARNs when deep discovery is explicitly enabled
        (resolver.enable_deep_scan + --deep flag).
        Default: nothing.
        """
        return []

    # ------------------------------------------------------------------
    # ID resolution for metadata-driven resolvers
    # ------------------------------------------------------------------
    def _resolve_id_fields(self, arn: ARN) -> dict[str, str]:
        params: dict[str, str] = {}
        parts = arn.resource_parts
        hierarchy = dict(arn.resource_hierarchy())

        for key in self.id_fields or []:
            lower = key.lower()

            # InstanceId / QueueId / ContactFlowId → hierarchy match
            if lower.endswith("id"):
                base = lower[:-2]
                if base in hierarchy:
                    params[key] = hierarchy[base]
                    continue

            # ResourceArn → full ARN
            if lower.endswith("arn"):
                params[key] = arn.raw
                continue

            # FunctionName / TableName / BotName → resource_id
            if lower.endswith("name") and arn.resource_id:
                params[key] = arn.resource_id
                continue

        # Fallback: map trailing ARN parts to any remaining id_fields
        missing = [k for k in self.id_fields or [] if k not in params]
        if missing:
            needed = len(missing)
            if len(parts) >= needed:
                for field, val in zip(missing, parts[-needed:]):
                    params[field] = val

        return params
