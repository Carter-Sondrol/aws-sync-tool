from __future__ import annotations

import logging
from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Iterable, List, Optional

import boto3

from poc.utils.environment import EnvironmentContext
from poc.utils.arn import ARN
from poc.utils.seed_loader import SeedRecord, load_seed_csv

log = logging.getLogger(__name__)


class SeedSource(ABC):
    @abstractmethod
    def load(self, env: EnvironmentContext) -> List[SeedRecord]:
        ...


@dataclass
class CSVSeedSource(SeedSource):
    path: str

    def load(self, env: EnvironmentContext) -> List[SeedRecord]:
        try:
            return load_seed_csv(self.path)
        except FileNotFoundError:
            log.info("[seed] CSV not found at %s", self.path)
            return []


@dataclass
class DynamoDBSeedSource(SeedSource):
    table_name: str
    env_attribute: str = "env"
    logical_id_attribute: str = "logical_id"
    arn_attribute: str = "arn"
    region: Optional[str] = None
    profile: Optional[str] = None

    def load(self, env: EnvironmentContext) -> List[SeedRecord]:
        session_kwargs = {}
        if self.profile:
            session_kwargs["profile_name"] = self.profile
        if self.region:
            session_kwargs["region_name"] = self.region
        session = boto3.Session(**session_kwargs)
        client = session.client("dynamodb")

        log.info("[seed] Loading seeds from DynamoDB table %s", self.table_name)
        resp = client.scan(TableName=self.table_name)
        items = resp.get("Items", [])
        records: List[SeedRecord] = []
        for itm in items:
            maybe_env = itm.get(self.env_attribute, {}).get("S")
            if maybe_env and maybe_env.lower() != env.source_env.lower():
                continue
            logical_id = itm.get(self.logical_id_attribute, {}).get("S")
            arn_val = itm.get(self.arn_attribute, {}).get("S")
            if not logical_id or not arn_val:
                continue
            try:
                rec = SeedRecord(
                    logical_id=logical_id,
                    arn_map={env.source_env: ARN.parse(arn_val)},
                )
                records.append(rec)
            except Exception as exc:
                log.warning("[seed] skipping dynamo row %s: %s", logical_id, exc)
        return records


@dataclass
class SeedSourceChain(SeedSource):
    sources: Iterable[SeedSource]

    def load(self, env: EnvironmentContext) -> List[SeedRecord]:
        records: List[SeedRecord] = []
        for src in self.sources:
            try:
                records.extend(src.load(env))
            except Exception as exc:  # pragma: no cover - defensive
                log.warning("[seed] %s failed: %s", type(src).__name__, exc)
        return records
