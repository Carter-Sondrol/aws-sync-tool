from __future__ import annotations

import json
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Set

from graph.dependency_graph import DependencyGraph
from graph.resource_node import NodeClassification
from utils.environment import EnvironmentContext

LEX_AUTHORING_TYPES = {
    "AWS::Lex::BotLocale",
    "AWS::Lex::Intent",
    "AWS::Lex::SlotType",
    "AWS::Lex::Slot",
}


@dataclass
class CFNStackPlan:
    name: str
    logical_ids: List[str]


@dataclass
class ImperativeOp:
    logical_id: str
    service: str
    cfn_type: str
    action: str = "apply"
    reason: str = ""

    def to_dict(self) -> Dict[str, Any]:
        return {
            "logical_id": self.logical_id,
            "service": self.service,
            "cfn_type": self.cfn_type,
            "action": self.action,
            "reason": self.reason,
        }


@dataclass
class DeploymentPlan:
    stacks: List[CFNStackPlan] = field(default_factory=list)
    parameters: Dict[str, Dict[str, Any]] = field(default_factory=dict)
    imperative_ops: List[ImperativeOp] = field(default_factory=list)
    logical_id_remap: Dict[str, str] = field(default_factory=dict)
    metadata: Dict[str, Any] = field(default_factory=dict)

    def cfn_logical_ids(self) -> Set[str]:
        lids: Set[str] = set()
        for stack in self.stacks:
            lids.update(stack.logical_ids)
        return lids

    def to_dict(self) -> Dict[str, Any]:
        return {
            "stacks": [stack.__dict__ for stack in self.stacks],
            "parameters": self.parameters,
            "imperative_ops": [op.to_dict() for op in self.imperative_ops],
            "logical_id_remap": self.logical_id_remap,
            "metadata": self.metadata,
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "DeploymentPlan":
        stacks = [CFNStackPlan(**s) for s in data.get("stacks", [])]
        imperative_ops = [ImperativeOp(**op) for op in data.get("imperative_ops", [])]
        return cls(
            stacks=stacks,
            parameters=data.get("parameters", {}),
            imperative_ops=imperative_ops,
            logical_id_remap=data.get("logical_id_remap", {}),
            metadata=data.get("metadata", {}),
        )

    def to_json(self) -> str:
        return json.dumps(self.to_dict(), indent=2)


class DeploymentPlanner:
    """
    Splits a portable graph into:
      - CFN-deployable resources (stacked)
      - Imperative operations (Connect/Lex authoring)
      - Parameterized references (cross-account inputs)
    """

    def __init__(self, env: EnvironmentContext):
        self.env = env

    def build(self, graph: DependencyGraph) -> DeploymentPlan:
        cfn_stacks = self._stack_groups(graph)
        parameters: Dict[str, Dict[str, Any]] = {}
        imperative_ops: List[ImperativeOp] = []

        def is_cfn_eligible(cfn_type: str) -> bool:
            if not cfn_type or cfn_type in LEX_AUTHORING_TYPES:
                return False
            return True

        cfn_eligible_ids = {
            lid
            for lid, node in graph._nodes.items()
            if node.classification == NodeClassification.RESOURCE and is_cfn_eligible(node.cfn_type)
        }

        # Parameterize reference-only / external nodes
        for lid, node in graph._nodes.items():
            if node.reference_only or node.classification in {
                NodeClassification.PARAMETER,
                NodeClassification.EXTERNAL,
                NodeClassification.AWS_MANAGED,
            }:
                parameters[lid] = {
                    "description": node.metadata.get("Description")
                    or f"{node.service} reference",
                    "default": node.metadata.get("PrimaryArn")
                    or (next(iter(node.arns.values())).raw if node.arns else None),
                }

        # Imperative ops for non-CFN resources
        for lid, node in graph._nodes.items():
            if node.classification != NodeClassification.RESOURCE:
                continue
            if not is_cfn_eligible(node.cfn_type):
                imperative_ops.append(
                    ImperativeOp(
                        logical_id=lid,
                        service=node.service,
                        cfn_type=node.cfn_type,
                        reason="non-CFN or authoring-only resource",
                    )
                )

        filtered_stacks = [
            CFNStackPlan(name=stack.name, logical_ids=[lid for lid in stack.logical_ids if lid in cfn_eligible_ids])
            for stack in cfn_stacks
        ]

        return DeploymentPlan(
            stacks=filtered_stacks,
            parameters=parameters,
            imperative_ops=imperative_ops,
            logical_id_remap={},
            metadata={
                "source_env": self.env.source_env,
                "target_env": self.env.target_env,
                "target_account": self.env.target_account,
            },
        )

    def _stack_groups(self, graph: DependencyGraph) -> List[CFNStackPlan]:
        meta = graph.metadata.get("CloudFormationStacks", {}) or {}
        membership = {
            stack_id: list(nodes or [])
            for stack_id, nodes in (meta.get("membership") or {}).items()
        }
        stacks: List[CFNStackPlan] = []
        if membership:
            for name, lids in membership.items():
                stacks.append(CFNStackPlan(name=name, logical_ids=lids))
        else:
            stacks.append(CFNStackPlan(name="GraphStack", logical_ids=list(graph._nodes.keys())))
        return stacks
