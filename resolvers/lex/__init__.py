from __future__ import annotations
import importlib
import inspect
import logging
import pkgutil
from typing import Any, Dict
from boto3 import Session
from mypy_boto3_lexv2_models import LexModelsV2Client
from resolvers.base import BaseResolver
from graph.dependency_graph import ResourceNode
from utils.arn import ARN
from .base_lex import BaseLexSubResolver

logger = logging.getLogger(__name__)

class LexResolver(BaseResolver[LexModelsV2Client, dict[str, Any]]):
    """Dynamic resolver for all Lex V2 resources (bot, alias, locale, etc.)"""

    def __init__(self, session: Session, client: LexModelsV2Client):
        self.session = session
        self.client = client
        self.subresolvers: Dict[str, BaseLexSubResolver] = {}
        self._load_subresolvers()

    # ------------------------------------------------------------------
    def _load_subresolvers(self) -> None:
        import resolvers.lex as lex_pkg

        count = 0
        for modinfo in pkgutil.iter_modules(lex_pkg.__path__):
            # Load any file ending with _resolver.py (like ConnectResolver does)
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
                        logger.debug("Registered subresolver: %s", tname)
                        count += 1

        logger.info("Loaded %d Lex subresolvers: %s", count, sorted(self.subresolvers.keys()))

    # ------------------------------------------------------------------
    def fetch(self, arn: ARN) -> dict[str, Any]:
        rtype = arn.resource_type
        sub = self.subresolvers.get(rtype)
        if not sub:
            raise ValueError(f"Unsupported Lex resource type: {rtype}")
        logger.info("[LexResolver] Fetching %s (type=%s)", arn, rtype)
        return sub.fetch(arn)

    # ------------------------------------------------------------------
    def parse(self, arn: ARN, raw: dict[str, Any]) -> ResourceNode[dict[str, Any]]:
        rtype = arn.resource_type
        sub = self.subresolvers.get(rtype)
        if not sub:
            raise ValueError(f"Unsupported Lex resource type: {rtype}")
        return sub.parse(arn, raw)
