from __future__ import annotations

import logging
import re
from typing import Any, Iterable, Mapping, Optional, TypeVar

from mypy_boto3_connect import ConnectClient

from resolvers.base_resolver import BaseResolver
from utils.arn import ARN

log = logging.getLogger(__name__)

# Bind Connect-specific type vars
C_Connect = TypeVar("C_Connect", bound=ConnectClient)
R_Connect = TypeVar("R_Connect", bound=Mapping[str, Any])


class BaseConnectResolver(BaseResolver[C_Connect, R_Connect]):
    """
    Lightweight Amazon Connect resolver base.
    """

    service = "connect"

    def __init__(
        self,
        session,
        client: Optional[C_Connect] = None,
        instance_arn: Optional[str] = None,
    ) -> None:
        super().__init__(session, client)
        self.instance_arn = instance_arn
        self.instance_id: Optional[str] = None

        if instance_arn:
            parsed = ARN.try_parse(instance_arn)
            if parsed:
                self.instance_id = parsed.resource_id

    def ensure_instance_id(self, arn: ARN) -> None:
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
                return
        raise ValueError(f"Cannot infer Connect instance ID from ARN: {arn}")

    def make_logical_id(self, name: Optional[str]) -> str:
        if not name:
            return "ConnectResource"
        cleaned = re.sub(r"[^A-Za-z0-9]", "", name)
        return cleaned[:128] or "ConnectResource"
