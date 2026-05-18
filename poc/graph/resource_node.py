from __future__ import annotations

from dataclasses import dataclass, field, InitVar
from enum import Enum, auto
from typing import Any, Dict, Set, Mapping

from poc.utils.arn import ARN


class NodeClassification(Enum):
    RESOURCE = auto()
    PARAMETER = auto()
    EXTERNAL = auto()
    AWS_MANAGED = auto()
    ARTIFACT = auto()


@dataclass
class ResourceNode:
    logical_id: str
    service: str
    cfn_type: str
    properties: Dict[str, Any]
    primary_arn: InitVar[ARN | None] = None
    reference_only: bool = False
    metadata: Dict[str, Any] = field(default_factory=dict)
    classification: NodeClassification = NodeClassification.RESOURCE

    # cross-account identity
    arns: Dict[str, ARN] = field(default_factory=dict)

    # ONLY used during resolver → graph build
    referenced_arns: Set[ARN] = field(default_factory=set)

    def __post_init__(self, primary_arn: ARN | None) -> None:
        """
        Normalize primary ARN handling for both legacy and new resolver code.

        - Accepts optional primary_arn init arg (for compatibility)
        - Ensures a Primary label exists in the arns map when any ARN is present
        """
        if primary_arn:
            self.arns.setdefault("Primary", ARN.parse(primary_arn))

        if self.arns and "Primary" not in self.arns:
            # Deterministic choice: first provided ARN becomes Primary
            first_arn = next(iter(self.arns.values()))
            self.arns["Primary"] = ARN.parse(first_arn)

    def get_primary_arn(self) -> ARN | None:
        """
        Return the preferred/primary ARN for this node, if known.
        """
        if self.arns:
            return self.arns.get("Primary") or next(iter(self.arns.values()))
        return None
