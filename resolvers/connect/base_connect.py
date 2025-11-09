from __future__ import annotations

import logging
from typing import Any, Generic, TypeVar, Sequence

from mypy_boto3_connect import ConnectClient
from graph.dependency_graph import ResourceNode
from utils.arn import ARN

logger = logging.getLogger(__name__)

R = TypeVar("R")


class BaseConnectSubResolver(Generic[R]):
    """
    Base class for specific Amazon Connect subresource resolvers.
    Subclasses can define:
      - resource_type: str
      - aliases: list[str]
      - cfn_type: str
    """

    resource_type: str = ""
    aliases: Sequence[str] = ()
    cfn_type: str = ""

    def __init__(self, client: ConnectClient):
        self.client = client

    def fetch(self, instance_id: str, arn: ARN) -> R:
        raise NotImplementedError

    def parse(self, arn: ARN, raw: R) -> ResourceNode[dict[str, Any]]:
        raise NotImplementedError

    @classmethod
    def all_type_names(cls) -> list[str]:
        """Return all type names this resolver supports."""
        return [cls.resource_type, *cls.aliases]
