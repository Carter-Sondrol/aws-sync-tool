from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Optional

import boto3

from graph.dependency_graph import DependencyGraph
from graph.resource_node import ResourceNode
from planner.deployment_plan import DeploymentPlan, ImperativeOp
from utils.environment import EnvironmentContext

log = logging.getLogger(__name__)


@dataclass
class ImperativeApplier:
    env: EnvironmentContext
    session: Optional[boto3.Session] = None

    def _session(self) -> boto3.Session:
        if self.session:
            return self.session
        return boto3.Session()

    def apply(self, graph: DependencyGraph, plan: DeploymentPlan, *, dry_run: bool = True) -> None:
        for op in plan.imperative_ops:
            node = graph.get_node(op.logical_id)
            if not node:
                log.warning("[imperative] missing node for %s", op.logical_id)
                continue

            if dry_run:
                log.info("[imperative][dry-run] %s %s (%s)", op.action, op.logical_id, op.service)
                continue

            if op.service == "connect":
                self._apply_connect(node)
            elif op.service == "lex":
                self._apply_lex(node)
            else:
                log.info("[imperative] no handler for %s (%s)", op.logical_id, op.service)

    # ------------------------------------------------------------------
    # Connect
    # ------------------------------------------------------------------
    def _apply_connect(self, node: ResourceNode) -> None:
        session = self._session()
        client = session.client("connect")
        instance_arn = node.properties.get("InstanceArn") or node.properties.get("instance_arn")
        if not instance_arn:
            log.warning("[imperative][connect] %s missing InstanceArn", node.logical_id)
            return
        if node.cfn_type.endswith("ContactFlow"):
            content = node.properties.get("content") or node.properties.get("Content")
            flow_id = node.properties.get("contact_flow_id") or node.properties.get("ContactFlowId") or node.arns.get("Primary", "")
            if not content or not flow_id:
                log.warning("[imperative][connect] %s missing content/contact_flow_id", node.logical_id)
                return
            log.info("[imperative][connect] updating contact flow %s", node.logical_id)
            client.update_contact_flow_content(InstanceId=instance_arn.split("/")[-1], ContactFlowId=flow_id, Content=content)
            return
        log.info("[imperative][connect] no-op for %s (%s)", node.logical_id, node.cfn_type)

    # ------------------------------------------------------------------
    # Lex
    # ------------------------------------------------------------------
    def _apply_lex(self, node: ResourceNode) -> None:
        session = self._session()
        client = session.client("lexv2-models")
        if node.cfn_type in ("AWS::Lex::BotLocale", "AWS::Lex::Intent", "AWS::Lex::SlotType", "AWS::Lex::Slot"):
            log.info("[imperative][lex] authoring update for %s (stub)", node.logical_id)
            # Placeholder: real implementation would upsert authoring resources
            return
        log.info("[imperative][lex] no-op for %s (%s)", node.logical_id, node.cfn_type)

