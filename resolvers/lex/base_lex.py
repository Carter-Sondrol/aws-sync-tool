from __future__ import annotations

import logging
from typing import Any, Generic, Sequence, TypeVar, Optional, Iterable

from boto3 import Session
from mypy_boto3_lexv2_models import LexModelsV2Client
from botocore.exceptions import ClientError

from resolvers.base import BaseResolver, C, R
from graph.dependency_graph import ResourceNode, DependencyGraph
from utils.arn import ARN

logger = logging.getLogger(__name__)

R = TypeVar("R")


class BaseLexSubResolver(Generic[R]):
    """
    Base class for specific Lex V2 subresource resolvers.
    Each subclass defines:
      - resource_type: str (e.g., 'bot', 'bot-alias', 'bot-locale')
      - cfn_type: str
      - aliases: optional list of alternate names
    """

    resource_type: str = ""
    aliases: Sequence[str] = ()
    cfn_type: str = ""

    def __init__(self, client: LexModelsV2Client) -> None:
        self.client = client
        self.log = logging.getLogger(f"resolver.lex.{self.resource_type}")

    def fetch(self, arn: ARN) -> R:
        raise NotImplementedError

    def parse(self, arn: ARN, raw: R) -> ResourceNode:
        raise NotImplementedError

    @classmethod
    def all_type_names(cls) -> list[str]:
        return [cls.resource_type, *cls.aliases]


class BaseLexResolver(BaseResolver[LexModelsV2Client, dict[str, Any]]):
    """Shared base resolver for Amazon Lex V2 subresources."""

    service = "lex"

    def __init__(
        self,
        session: Session,
        graph: Optional[DependencyGraph] = None,
        client: Optional[LexModelsV2Client] = None,
        enable_map_tags: bool | None = None,
    ) -> None:
        super().__init__(session, graph, client, enable_map_tags)
        self.log = logging.getLogger("resolver.lex.base")

    def list_with_bot(self, method_name: str, bot_id: str, key: str, **kwargs: Any) -> Iterable[dict]:
        """Paginate Lex API calls that require botId."""
        for page in self.paginate(method_name, botId=bot_id, **kwargs):
            yield from page.get(key, [])
