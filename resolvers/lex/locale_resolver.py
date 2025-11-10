from __future__ import annotations

import logging
from typing import Any, Dict, Set
from mypy_boto3_lexv2_models.type_defs import DescribeBotLocaleResponseTypeDef

from resolvers.lex.base_lex import BaseLexSubResolver
from graph.dependency_graph import ResourceNode
from utils.arn import ARN, extract_dependencies

logger = logging.getLogger(__name__)


class LexLocaleResolver(BaseLexSubResolver[DescribeBotLocaleResponseTypeDef]):
    """Resolves Lex V2 Locales and links to Intents and SlotTypes."""

    resource_type = "bot-locale"
    cfn_type = "AWS::Lex::BotLocale"

    def fetch(self, arn: ARN) -> DescribeBotLocaleResponseTypeDef:
        bot_id = arn.subresource_parent_id("bot") or arn.resource_parts[1]
        locale_id = arn.subresource_id()

        if not locale_id:
            raise ValueError(f"Malformed Lex Locale ARN: {arn}")

        self.log.info("[LexLocaleResolver] Fetching locale %s", arn)
        return self.client.describe_bot_locale(
            botId=bot_id,
            botVersion="DRAFT",
            localeId=locale_id,
        )

    def parse(self, arn: ARN, raw: DescribeBotLocaleResponseTypeDef) -> ResourceNode:
        locale = raw.get("botLocale", raw)
        refs: Set[ARN] = extract_dependencies(locale)
        bot_id = locale.get("botId") or arn.subresource_parent_id("bot")
        locale_id = locale.get("localeId")
        
        if not bot_id:
            raise ValueError(f"Invalid Lex locale ARN (missing bot ID): {arn}")

        # Discover intents
        try:
            intents = self.client.list_intents(botId=bot_id, botVersion="DRAFT", localeId=locale_id)
            for i in intents.get("intentSummaries", []):
                iid = i.get("intentId")
                if iid:
                    refs.add(
                        ARN.from_parts(
                            "lex",
                            f"bot/{bot_id}/bot-locale/{locale_id}/intent/{iid}",
                            region=arn.region,
                            account_id=arn.account_id,
                        )
                    )
        except Exception as e:
            self.log.debug("[LexLocaleResolver] list_intents failed for %s: %s", arn, e)

        # Discover slot types
        try:
            stypes = self.client.list_slot_types(botId=bot_id, botVersion="DRAFT", localeId=locale_id)
            for st in stypes.get("slotTypeSummaries", []):
                stid = st.get("slotTypeId")
                if stid:
                    refs.add(
                        ARN.from_parts(
                            "lex",
                            f"bot/{bot_id}/bot-locale/{locale_id}/slot-type/{stid}",
                            region=arn.region,
                            account_id=arn.account_id,
                        )
                    )
        except Exception as e:
            self.log.debug("[LexLocaleResolver] list_slot_types failed for %s: %s", arn, e)

        props: Dict[str, Any] = {
            "BotId": bot_id,
            "LocaleId": locale_id,
            "Description": locale.get("description"),
            "NluIntentConfidenceThreshold": locale.get("nluIntentConfidenceThreshold"),
            "VoiceSettings": locale.get("voiceSettings"),
        }

        meta = {"Source": "boto3.describe_bot_locale"}

        node = ResourceNode(
            logical_id=f"LexLocale{locale_id or arn.resource_id}",
            service="lex",
            cfn_type=self.cfn_type,
            properties=props,
            referenced_arns=refs,
            arns={"Locale": arn},
            metadata=meta,
        )
        return node
