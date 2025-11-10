from __future__ import annotations

import importlib
import inspect
import logging
import pkgutil
from typing import Any, Dict, Iterable, Optional

from boto3 import Session
from mypy_boto3_lexv2_models import LexModelsV2Client

from graph.dependency_graph import DependencyGraph, ResourceNode
from resolvers.base import BaseResolver
from resolvers.lex.base_lex import BaseLexResolver, BaseLexSubResolver
from utils.arn import ARN

logger = logging.getLogger(__name__)

class LexResolver(BaseResolver[LexModelsV2Client, dict[str, Any]]):
    """Dynamic resolver for all Lex V2 resources (bot, alias, locale, etc.)"""

    service = "lex"

    def __init__(
        self,
        session: Session,
        graph: Optional[DependencyGraph] = None,
        client: Optional[LexModelsV2Client] = None,
        enable_map_tags: bool | None = None,
    ):
        super().__init__(session, graph, client or session.client("lexv2-models"), enable_map_tags)
        self.subresolvers: Dict[str, BaseLexSubResolver] = {}
        self._load_subresolvers()

    # ------------------------------------------------------------------
    # Discovery
    # ------------------------------------------------------------------
    def _load_subresolvers(self) -> None:
        import resolvers.lex as lex_pkg

        count = 0
        for modinfo in pkgutil.iter_modules(lex_pkg.__path__):
            if not modinfo.name.endswith("_resolver"):
                continue

            module = importlib.import_module(f"{lex_pkg.__name__}.{modinfo.name}")
            for _, cls in inspect.getmembers(module, inspect.isclass):
                if issubclass(cls, BaseLexSubResolver) and cls is not BaseLexSubResolver:
                    instance = cls(self.client)
                    for tname in instance.all_type_names():
                        if not tname:
                            continue
                        self.subresolvers[tname] = instance
                        count += 1
                        logger.debug("[LexResolver] Registered subresolver: %s", tname)

        logger.info("[LexResolver] Loaded %d Lex subresolvers: %s", count, sorted(self.subresolvers))

    # ------------------------------------------------------------------
    # Fetch + Parse
    # ------------------------------------------------------------------
    def fetch_resource(self, arn: ARN) -> dict[str, Any]:
        rtype = arn.resource_type
        sub = self.subresolvers.get(rtype)
        if not sub:
            raise ValueError(f"Unsupported Lex resource type: {rtype}")
        self.log.info("Fetching Lex %s (%s)", arn, rtype)
        return sub.fetch(arn)

    def to_node(self, arn: ARN, raw: dict[str, Any]) -> ResourceNode:
        rtype = arn.resource_type
        sub = self.subresolvers.get(rtype)
        if not sub:
            raise ValueError(f"Unsupported Lex resource type: {rtype}")
        return sub.parse(arn, raw)

    # ------------------------------------------------------------------
    # Discovery stub (optional)
    # ------------------------------------------------------------------
    def list_resources(self) -> Iterable[ARN]:
        """Lex resources are enumerated via subresolvers; not globally discoverable."""
        return []
