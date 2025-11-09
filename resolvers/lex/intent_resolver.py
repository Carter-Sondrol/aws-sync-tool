from __future__ import annotations
import logging
from typing import Any, Dict, Set
from mypy_boto3_lexv2_models.type_defs import DescribeIntentResponseTypeDef
from resolvers.lex.base_lex import BaseLexSubResolver
from utils.arn import ARN, extract_dependencies
from graph.dependency_graph import ResourceNode

logger = logging.getLogger(__name__)

class LexIntentResolver(BaseLexSubResolver[DescribeIntentResponseTypeDef]):
    """Resolves Lex V2 intents and their dependent slots."""

    resource_type = "intent"
    cfn_type = "AWS::Lex::Intent"

    def fetch(self, arn: ARN) -> DescribeIntentResponseTypeDef:
        bot_id = arn.subresource_parent_id("bot") or arn.resource_parts[1]
        locale_id = arn.subresource_parent_id("bot-locale") or arn.resource_parts[3]
        intent_id = arn.subresource_id()

        logger.info("[LexIntentResolver] Fetching intent %s", arn)
        return self.client.describe_intent(
            botId=bot_id,
            botVersion="DRAFT",
            localeId=locale_id,
            intentId=intent_id,
        )

    def parse(self, arn: ARN, raw: DescribeIntentResponseTypeDef) -> ResourceNode[dict[str, Any]]:
        intent = raw.get("intent", raw)
        refs: Set[ARN] = extract_dependencies(intent)

        bot_id = arn.subresource_parent_id("bot") or arn.resource_parts[1]
        locale_id = arn.subresource_parent_id("bot-locale") or arn.resource_parts[3]

        # Expand to slots (dependencies)
        for slot in intent.get("slots", []) or []:
            sid = slot.get("slotId")
            if sid:
                refs.add(
                    ARN(
                        f"arn:aws:lex:{arn.region}:{arn.account_id}:bot/{bot_id}/bot-locale/{locale_id}/intent/{intent.get('intentId', arn.resource_id)}/slot/{sid}"
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

        return ResourceNode(
            logical_id=f"LexIntent{intent.get('intentName', arn.resource_id)}",
            service="lex",
            cfn_type=self.cfn_type,
            properties=props,
            referenced_arns=refs,
            arns={"Intent": arn},
        )
