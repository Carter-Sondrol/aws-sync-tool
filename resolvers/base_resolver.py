from __future__ import annotations

import logging
from abc import ABC, abstractmethod
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

from graph.resource_node import ResourceNode
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
    Generic, type-safe base class for AWS resource resolvers.
    """

    # Expected class-level attributes
    service: str = ""
    cfn_type: Optional[str] = None
    resource_type: Optional[str] = None

    def __init__(
        self,
        session: Session,
        client: Optional[C] = None,
    ) -> None:
        self.session = session
        # cache the session's region (CLI --region lands here)
        self.session_region: Optional[str] = session.region_name

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
        return self.session.client(svc, region_name=region)

    

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
    # Abstract methods (subclass contract)
    # ------------------------------------------------------------------
    @abstractmethod
    def fetch_resource(self, arn: ARN) -> R:
        """Return raw API data for the given resource ARN."""
        raise NotImplementedError

    @abstractmethod
    def to_node(self, arn: ARN, data: R) -> ResourceNode:
        """Convert raw resource data into a ResourceNode."""
        raise NotImplementedError

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
    ) -> ResourceNode:
        """Factory to create a standardized ResourceNode."""
        props = dict(properties or {})
        meta = dict(metadata or {})
        referenced_arns = extract_dependencies(props)
        referenced_arns = {a for a in referenced_arns if not a.raw.endswith(":*")}

        return ResourceNode(
            logical_id=logical_id or arn.resource_id,
            service=self.service,
            cfn_type=self.cfn_type
            or f"AWS::{self.service.title()}::{self.resource_type.title() if self.resource_type else 'Resource'}",
            properties=props,
            reference_only=reference_only,
            metadata=meta,
            arns={arn.account_id: arn},
            referenced_arns=referenced_arns,
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
        Applies recursive ARN harvesting to the raw AWS response.

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

        return refs
