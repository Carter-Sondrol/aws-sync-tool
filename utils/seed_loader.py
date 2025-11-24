from __future__ import annotations

import csv
import logging
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List, Optional

from utils.arn import ARN

log = logging.getLogger(__name__)


@dataclass(frozen=True)
class SeedRecord:
    """Represents a logical seed entry loaded from CSV."""

    logical_id: str
    arn_map: Dict[str, ARN]
    reference_only: bool = False

    def preferred_arn(self, env: Optional[str] = None) -> Optional[ARN]:
        """
        Return the ARN that should be used for discovery.

        Preference order:
          1. Exact env match (case-insensitive). For example, ``env="dev"``
             matches the ``arn_dev`` column.
          2. First ARN defined in the row.
        """

        if not self.arn_map:
            return None

        if env:
            key = env.lower().strip()
            if key.startswith("arn_"):
                key = key[4:]
            if key in self.arn_map:
                return self.arn_map[key]

        # Fallback to first ARN provided
        for arn in self.arn_map.values():
            return arn
        return None

    def arn_metadata(self) -> Dict[str, str]:
        return {label: str(arn) for label, arn in self.arn_map.items()}


def _normalize_row(row: Dict[str, Optional[str]]) -> Dict[str, Optional[str]]:
    normalized: Dict[str, Optional[str]] = {}
    for key, value in row.items():
        clean_key = (key or "").strip().lower()
        if isinstance(value, str):
            value = value.strip()
        if value == "":
            value = None
        normalized[clean_key] = value
    return normalized


def _parse_arn_columns(row: Dict[str, Optional[str]], row_num: int) -> Dict[str, ARN]:
    arn_map: Dict[str, ARN] = {}
    for key, value in row.items():
        if not key or value is None:
            continue
        if not key.startswith("arn"):
            continue

        suffix = key[3:].lstrip("_- ")
        label = suffix or "primary"
        try:
            arn_map[label] = ARN.parse(value)
        except Exception as exc:  # pragma: no cover - defensive logging
            log.warning("[seeds] row %d: invalid ARN '%s': %s", row_num, value, exc)
    return arn_map


def load_seed_csv(path: str | Path) -> List[SeedRecord]:
    path = Path(path)
    if not path.exists():
        raise FileNotFoundError(f"Seed file not found: {path}")

    records: List[SeedRecord] = []
    with path.open(newline="") as handle:
        reader = csv.DictReader(handle)
        if not reader.fieldnames:
            return []

        for idx, raw_row in enumerate(reader, start=2):  # header is line 1
            row = _normalize_row(raw_row)
            logical_id = row.get("logical_id")
            if not logical_id:
                log.warning("[seeds] row %d skipped: missing logical_id", idx)
                continue

            arn_map = _parse_arn_columns(row, idx)
            if not arn_map:
                log.warning("[seeds] row %d (%s) skipped: no ARN columns", idx, logical_id)
                continue

            is_ref = row.get("is_ref") or row.get("reference_only")
            reference_only = str(is_ref).lower() in {"1", "true", "yes", "y"}

            records.append(SeedRecord(logical_id=logical_id, arn_map=arn_map, reference_only=reference_only))

    return records
