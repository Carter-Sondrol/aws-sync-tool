from __future__ import annotations

import logging
from typing import Any, Dict, Set
from mypy_boto3_lexv2_models.type_defs import DescribeSlotResponseTypeDef

from resolvers.lex.base_lex import BaseLexSubResolver
from graph.dependency_graph import ResourceNode
from utils.arn import ARN, extract_dependencies

logger = logging.getLogger(__name__)


class LexSlotResolver(BaseLexSubResolver[DescribeSlotResponseTypeDef]):
    """Resolves Lex V2 Slots."""

    resource_type = "slot"
    cfn_type = "AWS::Lex::Slot"

    def fetch(self, arn: ARN) -> DescribeSlotResponseTypeDef:
        bot_id = arn.subresource_parent_id("bot") or arn.resource_parts[1]
        locale_id = arn.subresource_parent_id("bot-locale") or arn.resource_parts[3]
        intent_id = arn.subresource_parent_id("intent") or arn.resource_parts[5]
        slot_id = arn.subresource_id()

        if not slot_id:
            raise ValueError(f"Malformed Lex Slot ARN: {arn}")

        self.log.info("[LexSlotResolver] Fetching slot %s", arn)
        return self.client.describe_slot(
            botId=bot_id,
            botVersion="DRAFT",
            localeId=locale_id,
            intentId=intent_id,
            slotId=slot_id,
        )

    def parse(self, arn: ARN, raw: DescribeSlotResponseTypeDef) -> ResourceNode:
        slot = raw.get("slot", raw)
        refs: Set[ARN] = extract_dependencies(slot)

        props: Dict[str, Any] = {
            "BotId": arn.subresource_parent_id("bot"),
            "LocaleId": arn.subresource_parent_id("bot-locale"),
            "IntentId": arn.subresource_parent_id("intent"),
            "SlotName": slot.get("slotName"),
            "SlotTypeId": slot.get("slotTypeId"),
            "ValueElicitationSetting": slot.get("valueElicitationSetting"),
            "ObfuscationSetting": slot.get("obfuscationSetting"),
        }

        meta = {"Source": "boto3.describe_slot"}

        node = ResourceNode(
            logical_id=f"LexSlot{slot.get('slotName', arn.resource_id)}",
            service="lex",
            cfn_type=self.cfn_type,
            properties=props,
            referenced_arns=refs,
            arns={"Slot": arn},
            metadata=meta,
        )
        return node
