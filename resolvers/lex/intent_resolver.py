from __future__ import annotations

import logging
from typing import Any, Dict, Set
from mypy_boto3_lexv2_models.type_defs import DescribeIntentResponseTypeDef

from resolvers.lex.base_lex import BaseLexSubResolver
from graph.dependency_graph import ResourceNode
from utils.arn import ARN, extract_dependencies

logger = logging.getLogger(__name__)


class LexIntentResolver(BaseLexSubResolver[DescribeIntentResponseTypeDef]):
    """Resolves Lex V2 Intents and their dependent Slots."""

    resource_type = "intent"
    cfn_type = "AWS::Lex::Intent"

    def fetch(self, arn: ARN) -> DescribeIntentResponseTypeDef:
        """Fetch intent definition."""
        bot_id = arn.subresource_parent_id("bot") or arn.resource_parts[1]
        locale_id = arn.subresource_parent_id("bot-locale") or arn.resource_parts[3]
        intent_id = arn.subresource_id()
        if not intent_id:
            raise ValueError(f"Invalid Lex intent ARN (missing intent ID): {arn}")

        if not all([bot_id, locale_id, intent_id]):
            raise ValueError(f"Malformed Lex Intent ARN: {arn}")

        self.log.info("[LexIntentResolver] Fetching intent %s", arn)
        return self.client.describe_intent(
            botId=bot_id,
            botVersion="DRAFT",
            localeId=locale_id,
            intentId=intent_id,
        )

    def parse(self, arn: ARN, raw: DescribeIntentResponseTypeDef) -> ResourceNode:
        intent = raw.get("intent", raw)
        refs: Set[ARN] = extract_dependencies(intent)

        bot_id = arn.subresource_parent_id("bot") or arn.resource_parts[1]
        locale_id = arn.subresource_parent_id("bot-locale") or arn.resource_parts[3]

        # Expand dependent slots
        for slot in intent.get("slots", []) or []:
            sid = slot.get("slotId")
            if sid:
                refs.add(
                    ARN.from_parts(
                        "lex",
                        f"bot/{bot_id}/bot-locale/{locale_id}/intent/{intent.get('intentId', arn.resource_id)}/slot/{sid}",
                        region=arn.region,
                        account_id=arn.account_id,
                    )
                )

        props: Dict[str, Any] = {
            "BotId": bot_id,
            "LocaleId": locale_id,
            "IntentName": intent.get("intentName"),
            "Description": intent.get("description"),
            "SampleUtterances": intent.get("sampleUtterances"),
            "DialogCodeHook": intent.get("dialogCodeHook"),
            "FulfillmentCodeHook": intent.get("fulfillmentCodeHook"),
            "SlotPriorities": intent.get("slotPriorities"),
            "IntentClosingSetting": intent.get("intentClosingSetting"),
            "IntentConfirmationSetting": intent.get("intentConfirmationSetting"),
            "InputContexts": intent.get("inputContexts"),
            "OutputContexts": intent.get("outputContexts"),
        }

        meta = {"Source": "boto3.describe_intent"}

        node = ResourceNode(
            logical_id=f"LexIntent{intent.get('intentName', arn.resource_id)}",
            service="lex",
            cfn_type=self.cfn_type,
            properties=props,
            referenced_arns=refs,
            arns={"Intent": arn},
            metadata=meta,
        )
        return node
