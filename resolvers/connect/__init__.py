from __future__ import annotations

import importlib
import inspect
import logging
import pkgutil
from typing import Any, Dict

from boto3 import Session
from mypy_boto3_connect import ConnectClient

from resolvers.base import BaseResolver
from graph.dependency_graph import ResourceNode
from utils.arn import ARN
from .base_connect import BaseConnectSubResolver

logger = logging.getLogger(__name__)


class ConnectResolver(BaseResolver[ConnectClient, dict[str, Any]]):
    """
    Dynamic resolver for Amazon Connect subresources.
    Auto-discovers any `*_resolver.py` in this package that subclasses BaseConnectSubResolver.
    """

    def __init__(self, session: Session, client: ConnectClient):
        self.session = session
        self.client = client
        self.subresolvers: Dict[str, BaseConnectSubResolver] = {}
        self._load_subresolvers()

    # ------------------------------------------------------------------
    # Discovery
    # ------------------------------------------------------------------
    def _load_subresolvers(self) -> None:
        import resolvers.connect as connect_pkg

        count = 0
        for modinfo in pkgutil.iter_modules(connect_pkg.__path__):
            # Only load files that end with _resolver.py
            if not modinfo.name.endswith("_resolver"):
                continue

            module = importlib.import_module(f"{connect_pkg.__name__}.{modinfo.name}")
            for _, cls in inspect.getmembers(module, inspect.isclass):
                if issubclass(cls, BaseConnectSubResolver) and cls is not BaseConnectSubResolver:
                    instance = cls(self.client)
                    for tname in instance.all_type_names():
                        if not tname:
                            continue
                        self.subresolvers[tname] = instance
                        logger.debug("[ConnectResolver] Registered subresolver: %s", tname)
                        count += 1


        logger.info("[ConnectResolver] Loaded %d subresolvers: %s", count, sorted(self.subresolvers.keys()))

    # ------------------------------------------------------------------
    # Fetch
    # ------------------------------------------------------------------
    def fetch(self, arn: ARN) -> dict[str, Any]:
        hierarchy = arn.resource_hierarchy()
        instance_id = next((rid for typ, rid in hierarchy if typ == "instance"), None)
        rtype = arn.resource_type

        sub = self.subresolvers.get(rtype)
        if not sub:
            raise ValueError(f"Unsupported Connect resource type: {rtype}")

        logger.info("[ConnectResolver] Fetching %s (type=%s, region=%s)", arn, rtype, self.session.region_name)
        return sub.fetch(instance_id, arn)  # type: ignore[return-value]

    # ------------------------------------------------------------------
    # Parse
    # ------------------------------------------------------------------
    def parse(self, arn: ARN, raw: dict[str, Any]) -> ResourceNode[dict[str, Any]]:
        rtype = arn.resource_type
        sub = self.subresolvers.get(rtype)
        if not sub:
            raise ValueError(f"Unsupported Connect resource type: {rtype}")
        return sub.parse(arn, raw)
