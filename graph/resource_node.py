from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Dict, Set, Mapping

from utils.arn import ARN


@dataclass
class ResourceNode:
    logical_id: str
    service: str
    cfn_type: str
    properties: Dict[str, Any]
    reference_only: bool = False
    metadata: Dict[str, Any] = field(default_factory=dict)

    # cross-account identity
    arns: Dict[str, ARN] = field(default_factory=dict)

    # ONLY used during resolver → graph build
    referenced_arns: Set[ARN] = field(default_factory=set)
