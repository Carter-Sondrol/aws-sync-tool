from __future__ import annotations
from typing import Set

from botocore.exceptions import ClientError
from mypy_boto3_lexv2_models import LexModelsV2Client
from mypy_boto3_lexv2_models.type_defs import DescribeBotLocaleResponseTypeDef

from resolvers.registry import register_resolver
from resolvers.lex.base_lex import BaseLexResolver
from graph.resource_node import ResourceNode
from utils.arn import ARN


@register_resolver("lex:bot-locale")
class LexBotLocaleResolver(
    BaseLexResolver[LexModelsV2Client, DescribeBotLocaleResponseTypeDef]
):
    resource_type = "bot-locale"
    cfn_type = "AWS::Lex::BotLocale"

    # -------------------------------------------------------------
    # Parse *both* AWS Lex locale ARN patterns
    # -------------------------------------------------------------
    def _parse_locale_arn(self, arn: ARN) -> tuple[str, str]:
        parts = arn.resource_parts

        # Pattern 1:
        #   bot/<botId>/bot-locale/<localeId>
        if (
            len(parts) == 4
            and parts[0] == "bot"
            and parts[2] == "bot-locale"
        ):
            return parts[1], parts[3]

        # Pattern 2:
        #   bot-locale/<botId>/<localeId>
        if (
            len(parts) == 3
            and parts[0] == "bot-locale"
        ):
            return parts[1], parts[2]

        raise ValueError(f"Invalid Lex Locale ARN format: {arn}")

    # -------------------------------------------------------------
    def fetch_resource(self, arn: ARN) -> DescribeBotLocaleResponseTypeDef:
        bot_id, locale_id = self._parse_locale_arn(arn)

        try:
            return self.client.describe_bot_locale(  # type: ignore
                botId=bot_id,
                botVersion="DRAFT",
                localeId=locale_id,
            )
        except ClientError:
            self.log.error("Failed to fetch Lex BotLocale %s", arn, exc_info=True)
            raise

    # -------------------------------------------------------------
    def to_node(self, arn: ARN, raw: DescribeBotLocaleResponseTypeDef) -> ResourceNode:
        locale = raw.get("botLocale", raw)

        bot_id = locale.get("botId") or self._parse_locale_arn(arn)[0]
        locale_id = locale.get("localeId") or self._parse_locale_arn(arn)[1]

        name = locale.get("localeName", locale_id)

        props = {
            "localeId": locale.get("localeId"),
            "localeName": locale.get("localeName"),
            "description": locale.get("description"),
            "nluIntentConfidenceThreshold": locale.get("nluIntentConfidenceThreshold"),
            "voiceSettings": locale.get("voiceSettings"),
        }

        refs: Set[ARN] = set()

        # Reference parent bot
        refs.add(
            ARN.from_parts(
                "lex",
                f"bot/{bot_id}",
                region=arn.region,
                account_id=arn.account_id,
            )
        )

        # Reference intents in this locale
        for intent in locale.get("intents", []) or []:
            iid = intent.get("intentId")
            if iid:
                refs.add(
                    ARN.from_parts(
                        "lex",
                        f"bot/{bot_id}/intent/{iid}",
                        region=arn.region,
                        account_id=arn.account_id,
                    )
                )

        # Reference slot types in this locale
        for slot_type in locale.get("slotTypes", []) or []:
            stid = slot_type.get("slotTypeId")
            if stid:
                refs.add(
                    ARN.from_parts(
                        "lex",
                        f"bot/{bot_id}/slot-type/{stid}",
                        region=arn.region,
                        account_id=arn.account_id,
                    )
                )

        node = self.make_node(
            arn,
            logical_id=f"LexBotLocale{locale_id}",
            properties=props,
            metadata={
                "Source": "describe_bot_locale",
                "IntentCount": len(locale.get("intents", []) or []),
                "SlotTypeCount": len(locale.get("slotTypes", []) or []),
                "EmbeddedReferenceCount": len(refs),
            },
        )
        node.referenced_arns |= refs
        return node
