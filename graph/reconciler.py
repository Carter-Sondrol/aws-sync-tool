# graph/reconciler.py
from __future__ import annotations

from dataclasses import dataclass
from enum import Enum, auto
from typing import Dict, List, Optional

from graph.dependency_graph import DependencyGraph
from graph.registry import ResolverRegistry
from graph.resource_node import ResourceNode
from utils.mapping_store import MappingStore
from utils.types import JSON


class Action(Enum):
    CREATE = auto()
    UPDATE = auto()
    DELETE = auto()
    NOOP = auto()
    SKIP = auto()  # aws-managed, unresolved, or intentionally unmanaged


@dataclass
class Change:
    action: Action
    logical_id: str
    service: str
    cfn_type: str
    desired: Optional[JSON]
    live: Optional[JSON]
    reason: str = ""


@dataclass
class Plan:
    changes: List[Change]

    def summary(self) -> Dict[str, int]:
        from collections import Counter

        return dict(Counter(c.action.name for c in self.changes))


class Reconciler:
    """
    Computes drift and produces a plan; applies it using service-specific updaters.
    """

    def __init__(self, registry: ResolverRegistry, mapping: MappingStore) -> None:
        self._registry = registry
        self._mapping = mapping

    def plan(
        self,
        desired: DependencyGraph,
        target_account: str,
        *,
        allow_delete: bool = False,
    ) -> Plan:
        changes: List[Change] = []

        # Reverse index: logical_id -> live record (if any) for target account
        live_map = {
            lid: self._mapping.get(lid, target_account)
            for lid in self._mapping._by_logical
        }
        live_map = {k: v for k, v in live_map.items() if v is not None}

        # 1) For each desired node, find live equivalent in target account
        for node in desired:
            if node.reference_only or node.metadata.get("aws_managed"):
                changes.append(
                    Change(
                        Action.SKIP,
                        node.logical_id,
                        node.service,
                        node.cfn_type,
                        None,
                        None,
                        "reference-only/aws-managed",
                    )
                )
                continue

            live_rec = live_map.get(node.logical_id)
            if not live_rec:
                changes.append(
                    Change(
                        Action.CREATE,
                        node.logical_id,
                        node.service,
                        node.cfn_type,
                        node.properties,
                        None,
                        "not present in target",
                    )
                )
                continue

            # Compare desired vs live (portable spec)
            desired_spec = self._portable_spec(node)
            live_spec = self._portable_spec(live_rec)
            if self._is_equal(desired_spec, live_spec):
                changes.append(
                    Change(
                        Action.NOOP,
                        node.logical_id,
                        node.service,
                        node.cfn_type,
                        None,
                        None,
                        "in sync",
                    )
                )
            else:
                changes.append(
                    Change(
                        Action.UPDATE,
                        node.logical_id,
                        node.service,
                        node.cfn_type,
                        desired_spec,
                        live_spec,
                        "drift detected",
                    )
                )

        # 2) Deletions (live but not desired)
        if allow_delete:
            desired_ids = {n.logical_id for n in desired}
            for lid, rec in live_map.items():
                if (
                    lid not in desired_ids
                    and not rec.reference_only
                    and not rec.metadata.get("aws_managed")
                ):
                    changes.append(
                        Change(
                            Action.DELETE,
                            lid,
                            rec.service,
                            rec.cfn_type,
                            None,
                            rec.properties,
                            "not in desired",
                        )
                    )

        return Plan(changes)

    def apply(self, plan: Plan, *, dry_run: bool = True) -> None:
        for ch in plan.changes:
            if ch.action in (Action.NOOP, Action.SKIP):
                continue
            if dry_run:
                continue

            updater = self._get_updater(ch.service)
            if ch.action == Action.CREATE:
                updater.create(ch)
            elif ch.action == Action.UPDATE:
                updater.update(ch)
            elif ch.action == Action.DELETE:
                updater.delete(ch)

    # --- helpers ---
    def _get_updater(self, service: str):
        raise NotImplementedError(f"No updater for {service}")

    def _portable_spec(self, node_or_rec: ResourceNode) -> JSON:
        """
        Convert node properties into a portable spec:
        - Replace embedded ARNs with logical IDs via MappingStore, when possible.
        - Normalize/ignore volatile fields (timestamps, ETags, versions).
        """
        from copy import deepcopy
        from utils.arn import ARN as ARNType
        from utils.types import JSON

        spec = deepcopy(node_or_rec.properties)

        def map_arnish(v):
            if isinstance(v, ARNType):
                lid = self._mapping.logical_id_for_arn(v)
                return {"$ref": lid} if lid else str(v)
            if isinstance(v, str) and v.startswith("arn:"):
                a = ARNType.try_parse(v)
                if not a:
                    return v
                lid = self._mapping.logical_id_for_arn(a)
                return {"$ref": lid} if lid else v
            return v

        def walk(o):
            if isinstance(o, dict):
                return {
                    k: walk(map_arnish(v))
                    for k, v in o.items()
                    if k not in {"LastModified", "RevisionId", "ETag"}
                }
            if isinstance(o, list):
                return [walk(map_arnish(i)) for i in o]
            return map_arnish(o)

        return walk(spec)

    def _is_equal(self, a: JSON, b: JSON) -> bool:
        # Shallow canonicalization for now; can plug in deep schema-aware comparator later
        return a == b
