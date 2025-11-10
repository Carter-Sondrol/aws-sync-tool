from __future__ import annotations

import importlib
import inspect
import logging
import pkgutil
from typing import Any, Dict, Optional

from boto3 import Session
from mypy_boto3_connect import ConnectClient

from resolvers.base import BaseResolver
from utils.arn import ARN
from graph.dependency_graph import ResourceNode
from .base_connect import BaseConnectResolver

logger = logging.getLogger(__name__)


class ConnectResolver(BaseResolver[ConnectClient, dict[str, Any]]):
    """Dynamic resolver for Amazon Connect resources."""

    service = "connect"

    def __init__(
        self,
        session: Session,
        graph=None,
        enable_map_tags: bool | None = None,
    ):
        super().__init__(session, graph, enable_map_tags=enable_map_tags)
        self.client: ConnectClient = self.session.client("connect")
        self.subresolvers: Dict[str, BaseConnectResolver] = {}
        self._load_subresolvers()

    # ------------------------------------------------------------------
    def _load_subresolvers(self) -> None:
        import resolvers.connect as connect_pkg
        count = 0
        for modinfo in pkgutil.iter_modules(connect_pkg.__path__):
            if not modinfo.name.endswith("_resolver"):
                continue

            module = importlib.import_module(f"{connect_pkg.__name__}.{modinfo.name}")
            for _, cls in inspect.getmembers(module, inspect.isclass):
                if issubclass(cls, BaseConnectResolver) and cls is not BaseConnectResolver:
                    instance = cls(self.session, client=self.client, graph=self.graph)
                    for tname in getattr(instance, "aliases", (instance.resource_type,)):
                        if not tname:
                            continue
                        self.subresolvers[tname] = instance
                        count += 1
                        logger.debug("[ConnectResolver] Registered subresolver: %s", tname)

        logger.info("[ConnectResolver] Loaded %d subresolvers", count)

    # ------------------------------------------------------------------
    def list_resources(self):
        """Root-level Connect resources are instance-bound; none enumerated here."""
        return []

    def fetch_resource(self, arn: ARN) -> dict[str, Any]:
        """Route fetch to the appropriate subresolver."""
        rtype = arn.resource_type
        sub = self.subresolvers.get(rtype)
        if not sub:
            raise ValueError(f"Unsupported Connect resource type: {rtype}")

        # ✅ Automatically ensure instance_id and instance_arn are set
        if isinstance(sub, BaseConnectResolver):
            sub.ensure_instance_id(arn)

        logger.debug("[ConnectResolver] Dispatching fetch for %s via %s", arn, type(sub).__name__)
        return sub.fetch_resource(arn)

    def to_node(self, arn: ARN, data: dict[str, Any]) -> ResourceNode:
        """Delegate parsing to appropriate subresolver."""
        rtype = arn.resource_type
        sub = self.subresolvers.get(rtype)
        if not sub:
            raise ValueError(f"Unsupported Connect resource type: {rtype}")
        return sub.to_node(arn, data)
