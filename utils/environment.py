from __future__ import annotations

from dataclasses import dataclass, field
from typing import Dict, Optional

from utils.arn import ARN


@dataclass
class EnvironmentContext:
    """
    Captures source→target deployment context for deterministic multi-account flows.

    - source_env/target_env: friendly environment labels (dev, staging, prod)
    - source_account/target_account: AWS account IDs
    - default_region: region to prefer when mapping ARNs
    - region_overrides: per-service overrides (e.g., {"connect": "us-west-2"})
    - logical_id_map: optional remapping of logical IDs between envs
    """

    source_env: str = "source"
    target_env: str = "target"
    source_account: Optional[str] = None
    target_account: Optional[str] = None
    default_region: Optional[str] = None
    region_overrides: Dict[str, str] = field(default_factory=dict)
    logical_id_map: Dict[str, str] = field(default_factory=dict)

    def remap_logical_id(self, logical_id: str) -> str:
        return self.logical_id_map.get(logical_id, logical_id)

    def map_region(self, service: str, fallback: Optional[str]) -> Optional[str]:
        if service in self.region_overrides:
            return self.region_overrides[service]
        return fallback or self.default_region

    def map_arn(self, arn: ARN) -> ARN:
        """
        Return an ARN rewritten for the target account/region when provided.
        """
        target_account = self.target_account or arn.account_id
        target_region = self.map_region(arn.service, arn.region)
        return ARN.from_parts(
            partition=arn.partition,
            service=arn.service,
            resource=arn.resource,
            region=target_region or "",
            account_id=target_account or "",
        )

    def canonical_arn_str(self, value: str) -> str:
        """
        Validate and normalize an ARN string for storage in graphs/plans.
        """
        parsed = ARN.parse(value)
        normalized = parsed.raw.rstrip(":/")
        return normalized

