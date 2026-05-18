from __future__ import annotations

from dataclasses import dataclass
from enum import Enum, auto
from typing import Dict, List, Optional

from poc.graph.dependency_graph import DependencyGraph
from poc.graph.resource_node import ResourceNode
from poc.graph.registry import ResolverRegistry
from poc.utils.mapping_store import MappingStore
from poc.utils.types import JSON  # whatever your JSON alias is


NOISY_KEYS = {
    "LastModified",
    "LastModifiedTime",
    "LastUpdated",
    "LastUpdatedTime",
    "ResponseMetadata",
    "CreatedTime",
    "CreationTime",
    "Revision",
    "Version",
    "RequestId",
    "RequestID",
}


def canonicalize_props(props: JSON) -> JSON:
    """
    Strip noisy or non-deterministic fields from property blobs so comparisons
    are based on stable configuration, not timestamps or AWS metadata.
    """
    def _walk(value: JSON) -> JSON:
        if isinstance(value, dict):
            return {
                k: _walk(v)
                for k, v in value.items()
                if k not in NOISY_KEYS
            }
        if isinstance(value, list):
            return [_walk(v) for v in value]
        return value

    return _walk(props)


class Action(Enum):
    CREATE = auto()
    UPDATE = auto()
    DELETE = auto()
    NOOP = auto()


@dataclass
class Change:
    action: Action
    logical_id: str
    service: str
    cfn_type: str | None
    desired: Optional[JSON]
    live: Optional[JSON]
    reason: str = ""


@dataclass
class Plan:
    changes: List[Change]

    def summary(self) -> Dict[str, int]:
        counts: Dict[str, int] = {}
        for c in self.changes:
            key = c.action.name
            counts[key] = counts.get(key, 0) + 1
        return counts


class Reconciler:
    """
    Naive desired-vs-live reconciler.

    For now we do:
      - logical_id in desired only  -> CREATE
      - logical_id in live only     -> DELETE
      - logical_id in both:
          if properties differ      -> UPDATE
          else                      -> NOOP
    """

    def __init__(
        self,
        mapping_store: MappingStore,
        registry: ResolverRegistry,
    ) -> None:
        self.mapping_store = mapping_store
        self.registry = registry

    def plan(self, desired: DependencyGraph, live: DependencyGraph) -> Plan:
        changes: List[Change] = []

        desired_nodes: Dict[str, ResourceNode] = {
            lid: node for lid, node in desired._nodes.items()
        }
        live_nodes: Dict[str, ResourceNode] = {
            lid: node for lid, node in live._nodes.items()
        }

        all_ids = set(desired_nodes) | set(live_nodes)

        for lid in sorted(all_ids):
            d = desired_nodes.get(lid)
            l = live_nodes.get(lid)

            if d and not l:
                changes.append(
                    Change(
                        action=Action.CREATE,
                        logical_id=lid,
                        service=d.service,
                        cfn_type=d.cfn_type,
                        desired=d.properties,
                        live=None,
                        reason="Absent from live graph",
                    )
                )
                continue

            if l and not d:
                changes.append(
                    Change(
                        action=Action.DELETE,
                        logical_id=lid,
                        service=l.service,
                        cfn_type=l.cfn_type,
                        desired=None,
                        live=l.properties,
                        reason="Absent from desired graph",
                    )
                )
                continue

            # both exist
            assert d and l
            d_clean = canonicalize_props(d.properties)
            l_clean = canonicalize_props(l.properties)

            if d_clean != l_clean:
                changes.append(
                    Change(
                        action=Action.UPDATE,
                        logical_id=lid,
                        service=d.service,
                        cfn_type=d.cfn_type,
                        desired=d_clean,
                        live=l_clean,
                        reason="Properties differ",
                    )
                )
            else:
                changes.append(
                    Change(
                        action=Action.NOOP,
                        logical_id=lid,
                        service=d.service,
                        cfn_type=d.cfn_type,
                        desired=d.properties,
                        live=l.properties,
                        reason="No change",
                    )
                )

        return Plan(changes=changes)
