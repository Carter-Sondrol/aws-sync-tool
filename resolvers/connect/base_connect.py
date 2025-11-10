from __future__ import annotations

import logging
import re
from typing import Any, Iterable, Optional, Generic, TypeVar

from boto3 import Session
from mypy_boto3_connect import ConnectClient

from resolvers.base import BaseResolver, C, R  # ✅ reuse existing TypeVars
from utils.arn import ARN
from graph.dependency_graph import DependencyGraph

logger = logging.getLogger(__name__)


class BaseConnectResolver(BaseResolver[C, R]):
    """Shared base for all Amazon Connect sub-resolvers."""

    service = "connect"

    def __init__(
        self,
        session: Session,
        graph: Optional[DependencyGraph] = None,
        client: Optional[C] = None,
        instance_arn: Optional[str] = None,
        enable_map_tags: bool | None = None,
    ) -> None:
        super().__init__(session, graph, client, enable_map_tags)
        self.instance_arn = instance_arn
        self.instance_id: Optional[str] = None

        if instance_arn:
            parsed = ARN.try_parse(instance_arn)
            if parsed:
                self.instance_id = parsed.resource_id

        self.log = logging.getLogger("resolver.connect.base")

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------
    def ensure_instance_id(self, arn: ARN) -> None:
        """
        Ensure that instance_id and instance_arn are populated by inferring from the ARN if needed.
        This makes Connect subresolvers work even if instance_arn wasn't passed explicitly.
        """
        if self.instance_id:
            return

        for typ, rid in arn.resource_hierarchy():
            if typ == "instance":
                self.instance_id = rid
                self.instance_arn = str(
                    ARN.from_parts(
                        "connect",
                        f"instance/{rid}",
                        region=arn.region,
                        account_id=arn.account_id,
                    )
                )
                self.log.debug("[BaseConnectResolver] Inferred instance_id=%s from %s", rid, arn)
                return

        raise ValueError(f"Cannot infer Connect instance ID from ARN: {arn}")

    def list_with_instance(self, method_name: str, key: str, **kwargs: Any) -> Iterable[dict]:
        """Paginate Connect API calls that require InstanceId."""
        if not self.instance_id:
            raise ValueError("Connect instance ID required for this operation")

        for page in self.paginate(method_name, InstanceId=self.instance_id, **kwargs):
            yield from page.get(key, [])

    def connect_resource_arn(self, resource_type: str, resource_id: str) -> ARN:
        """Construct a fully-qualified Connect resource ARN."""
        if not self.instance_arn:
            raise ValueError("Base instance ARN is required")

        base = ARN.parse(self.instance_arn)
        return ARN.from_parts(
            "connect",
            f"instance/{base.resource_id}/{resource_type}/{resource_id}",
            region=base.region,
            account_id=base.account_id,
        )
            
    def make_logical_id(self, name: Optional[str]) -> str:
        """Generate a CloudFormation-safe logical ID (PascalCase)."""
        if not name:
            return "UnnamedResource"
        clean = re.sub(r"[^A-Za-z0-9]", "", name)
        if not clean:
            clean = "Resource"
        return clean[:128]


# ---------------------------------------------------------------------------
# Subresolver base (kept separate for dynamic discovery)
# ---------------------------------------------------------------------------

R_sub = TypeVar("R_sub")  # ✅ use a *different name* so we don't shadow imported R


class BaseConnectSubResolver(Generic[R_sub]):
    """Base class for Connect subresolvers like ContactFlow, Queue, Prompt, etc."""

    resource_type: str = ""
    cfn_type: str = ""

    def __init__(self, client: ConnectClient):
        self.client = client
        self.log = logging.getLogger(f"resolver.connect.{self.resource_type}")

    def fetch(self, instance_id: str, arn: ARN) -> R_sub:
        raise NotImplementedError

    def parse(self, arn: ARN, raw: R_sub):
        raise NotImplementedError

    @classmethod
    def all_type_names(cls) -> list[str]:
        return [cls.resource_type]
