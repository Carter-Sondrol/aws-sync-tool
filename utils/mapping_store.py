# mapping_store.py
from __future__ import annotations
from dataclasses import dataclass, field
from typing import Optional, Literal
from graph.dependency_graph import ResourceNode
from utils.arn import ARN

ManagementMode = Literal["cfn", "cdk", "api"]

@dataclass
class MappingRecord(ResourceNode):
    """
    A ResourceNode extended with deployment/mapping metadata for multi-account replication.
    """
    account_id: str = ""
    managed_by_tool: bool = True
    management_mode: ManagementMode = "cfn"
    parameters: dict[str, str] = field(default_factory=dict)

    @classmethod
    def from_node(cls, node: ResourceNode, account_id: str, **meta) -> MappingRecord:
        """Create a mapping record from a graph node, tagging it with account context."""
        return cls(
            logical_id=node.logical_id,
            service=node.service,
            cfn_type=node.cfn_type,
            properties=node.properties,
            referenced_arns=node.referenced_arns,
            arns=node.arns,
            metadata=node.metadata,
            reference_only=node.reference_only,
            account_id=account_id,
            **meta,
        )

class MappingStore:
    """
    LogicalId -> { account_id -> MappingRecord }
    This powers seeding the graph, and deciding how to update in the target account.
    """
    def __init__(self) -> None:
        self._by_logical: dict[str, dict[str, MappingRecord]] = {}
        self._arn_to_logical: dict[ARN, str] = {}

    def put(self, rec: MappingRecord) -> None:
        self._by_logical.setdefault(rec.logical_id, {})[rec.account_id] = rec
        for a in rec.arns.values():
            self._arn_to_logical[a] = rec.logical_id

    def get(self, logical_id: str, account_id: str) -> Optional[MappingRecord]:
        return self._by_logical.get(logical_id, {}).get(account_id)

    def all_for_logical(self, logical_id: str) -> dict[str, MappingRecord]:
        return self._by_logical.get(logical_id, {})
    
    def logical_id_for_arn(self, arn: ARN) -> str | None:
        return self._arn_to_logical.get(arn)

    def get_hint_for_arn(self, arn: ARN) -> str | None:
        """
        Provide a stable logical ID hint for a given ARN if one is known.
        """
        return self.logical_id_for_arn(arn)
    
    def iter_all(self):
        for lid, per_acct in self._by_logical.items():
            for rec in per_acct.values():
                yield rec
