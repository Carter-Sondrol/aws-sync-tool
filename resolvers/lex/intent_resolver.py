from __future__ import annotations

from typing import Set
from botocore.exceptions import ClientError
from mypy_boto3_lexv2_models import LexModelsV2Client
from mypy_boto3_lexv2_models.type_defs import DescribeIntentResponseTypeDef

from resolvers.registry import register_resolver
from resolvers.lex.base_lex import BaseLexResolver
from graph.resource_node import ResourceNode
from utils.arn import ARN


@register_resolver("lex:intent")
class LexIntentResolver(
    BaseLexResolver[LexModelsV2Client, DescribeIntentResponseTypeDef]
):
    resource_type = "intent"
    cfn_type = "AWS::Lex::Intent"

    # ----------------------------------------------------------------------
    # Fetch
    # ----------------------------------------------------------------------
    def fetch_resource(self, arn: ARN) -> DescribeIntentResponseTypeDef:
        """
        ARN: bot/<botId>/intent/<intentId>
        NOTE: Lex intents require a locale to fetch. We default to en_US unless
        a future feature adds locale-aware ARNs.
        """
        hier = arn.resource_hierarchy()
        # [("bot", botId), ("intent", intentId)]
        if len(hier) != 2 or hier[0][0] != "bot" or hier[1][0] != "intent":
            raise ValueError(f"Invalid Lex Intent ARN hierarchy: {arn}")

        bot_id = hier[0][1]
        intent_id = hier[1][1]

        try:
            return self.client.describe_intent(  # type: ignore
                botId=bot_id,
                botVersion="DRAFT",
                localeId="en_US",
                intentId=intent_id,
            )
        except ClientError:
            self.log.error("Failed to fetch Lex Intent %s", arn, exc_info=True)
            raise

    # ----------------------------------------------------------------------
    # Convert to graph node
    # ----------------------------------------------------------------------
    def to_node(self, arn: ARN, raw: DescribeIntentResponseTypeDef) -> ResourceNode:
        intent = raw.get("intent", raw)
        bot_id = arn.subresource_parent_id("bot")
        intent_id = arn.subresource_parent_id("intent")
        name = intent.get("intentName", intent_id)

        props = {
            "intentName": intent.get("intentName"),
            "description": intent.get("description"),
            "parentIntentSignature": intent.get("parentIntentSignature"),
            "sampleUtterances": intent.get("sampleUtterances"),
            "intentClosingSetting": intent.get("intentClosingSetting"),
            "intentConfirmationSetting": intent.get("intentConfirmationSetting"),
            "dialogCodeHook": intent.get("dialogCodeHook"),
            "fulfillmentCodeHook": intent.get("fulfillmentCodeHook"),
        }

        refs: Set[ARN] = set()

        # Parent bot
        if bot_id:
            bot_arn = ARN.from_parts(
                "lex",
                f"bot/{bot_id}",
                region=arn.region,
                account_id=arn.account_id,
            )
            refs.add(bot_arn)

        # Slot references inside the intent
        for slot in intent.get("slots", []) or []:
            slot_id = slot.get("slotId")
            if slot_id:
                slot_arn = ARN.from_parts(
                    "lex",
                    f"bot/{bot_id}/slot/{slot_id}",
                    region=arn.region,
                    account_id=arn.account_id,
                )
                refs.add(slot_arn)

        # Lambda code hooks (optional)
        hooks = [
            intent.get("dialogCodeHook", {}),
            intent.get("fulfillmentCodeHook", {}),
        ]
        for hook in hooks:
            l_arn = hook.get("lambdaCodeHook", {}).get("lambdaArn")
            if isinstance(l_arn, str) and ARN.is_valid(l_arn):
                refs.add(ARN.parse_cached(l_arn))

        node = self.make_node(
            arn,
            logical_id=f"LexIntent{name}",
            properties=props,
            metadata={
                "Source": "describe_intent",
                "SlotCount": len(intent.get("slots", []) or []),
                "EmbeddedReferenceCount": len(refs),
            },
        )

        node.referenced_arns |= refs
        return node
