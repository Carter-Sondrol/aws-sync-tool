from __future__ import annotations
import logging
from typing import Any, Dict, Set
from mypy_boto3_lexv2_models.type_defs import DescribeBotLocaleResponseTypeDef
from resolvers.lex.base_lex import BaseLexSubResolver
from utils.arn import ARN, extract_dependencies
from graph.dependency_graph import ResourceNode

logger = logging.getLogger(__name__)

class LexLocaleResolver(BaseLexSubResolver[DescribeBotLocaleResponseTypeDef]):
    """Resolves Lex V2 locales and links intents + slot types."""

    resource_type = "bot-locale"
    cfn_type = "AWS::Lex::BotLocale"

    def fetch(self, arn: ARN) -> DescribeBotLocaleResponseTypeDef:
        bot_id = arn.subresource_parent_id("bot") or arn.resource_parts[1]
        locale_id = arn.subresource_id()
        return self.client.describe_bot_locale(botId=bot_id, botVersion="DRAFT", localeId=locale_id)

    def parse(self, arn: ARN, raw: DescribeBotLocaleResponseTypeDef) -> ResourceNode[dict[str, Any]]:
        locale = raw.get("botLocale", raw)
        refs: Set[ARN] = extract_dependencies(locale)

        bot_id = locale.get("botId") or arn.subresource_parent_id("bot")

        # Discover intents
        try:
            intents = self.client.list_intents(botId=bot_id, botVersion="DRAFT", localeId=locale.get("localeId"))
            for i in intents.get("intentSummaries", []):
                iid = i.get("intentId")
                if iid:
                    refs.add(ARN(f"arn:aws:lex:{arn.region}:{arn.account_id}:bot/{bot_id}/bot-locale/{locale.get('localeId')}/intent/{iid}"))
        except Exception as e:
            logger.warning("[LexLocaleResolver] list_intents failed for %s: %s", arn, e)

        # Discover slot types
        try:
            stypes = self.client.list_slot_types(botId=bot_id, botVersion="DRAFT", localeId=locale.get("localeId"))
            for st in stypes.get("slotTypeSummaries", []):
                stid = st.get("slotTypeId")
                if stid:
                    refs.add(ARN(f"arn:aws:lex:{arn.region}:{arn.account_id}:bot/{bot_id}/bot-locale/{locale.get('localeId')}/slot-type/{stid}"))
        except Exception as e:
            logger.warning("[LexLocaleResolver] list_slot_types failed for %s: %s", arn, e)

        props: Dict[str, Any] = {
            "BotId": bot_id,
            "LocaleId": locale.get("localeId"),
            "Description": locale.get("description"),
            "NluIntentConfidenceThreshold": locale.get("nluIntentConfidenceThreshold"),
            "VoiceSettings": locale.get("voiceSettings"),
        }

        return ResourceNode(
            logical_id=f"LexLocale{locale.get('localeId', arn.resource_id)}",
            service="lex",
            cfn_type=self.cfn_type,
            properties=props,
            referenced_arns=refs,
            arns={"Locale": arn},
        )
