from __future__ import annotations
import logging
from typing import Any, Generic, Sequence, TypeVar
from mypy_boto3_lexv2_models import LexModelsV2Client
from graph.dependency_graph import ResourceNode
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

    def __init__(self, client: LexModelsV2Client):
        self.client = client

    def fetch(self, arn: ARN) -> R:
        raise NotImplementedError

    def parse(self, arn: ARN, raw: R) -> ResourceNode[dict[str, Any]]:
        raise NotImplementedError

    @classmethod
    def all_type_names(cls) -> list[str]:
        return [cls.resource_type, *cls.aliases]
