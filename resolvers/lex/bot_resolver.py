from __future__ import annotations

import logging
from typing import Any, Dict, Set
from mypy_boto3_lexv2_models import LexModelsV2Client
from mypy_boto3_lexv2_models.type_defs import DescribeBotResponseTypeDef

from resolvers.lex.base_lex import BaseLexSubResolver
from utils.arn import ARN, extract_dependencies
from graph.dependency_graph import ResourceNode

logger = logging.getLogger(__name__)


class LexBotResolver(BaseLexSubResolver[DescribeBotResponseTypeDef]):
    """Resolves Lex V2 bots and their locales."""

    resource_type = "bot"
    cfn_type = "AWS::Lex::Bot"

    def fetch(self, arn: ARN) -> DescribeBotResponseTypeDef:
        logger.info("[LexBotResolver] Fetching bot %s", arn)
        return self.client.describe_bot(botId=arn.resource_id)

    def parse(self, arn: ARN, raw: DescribeBotResponseTypeDef) -> ResourceNode:
        bot = raw.get("bot", raw)
        refs: Set[ARN] = extract_dependencies(bot)

        # Discover locales for this bot
        try:
            resp = self.client.list_bot_locales(botId=arn.resource_id, botVersion="DRAFT")
            for loc in resp.get("botLocaleSummaries", []):
                locale_id = loc.get("localeId")
                if locale_id:
                    refs.add(
                        ARN.from_parts(
                            "lex",
                            f"bot/{arn.resource_id}/bot-locale/{locale_id}",
                            region=arn.region,
                            account_id=arn.account_id,
                        )
                    )
        except Exception as e:
            logger.debug("[LexBotResolver] list_bot_locales failed for %s: %s", arn, e)

        props: Dict[str, Any] = {
            "Name": bot.get("botName"),
            "Description": bot.get("description"),
            "RoleArn": bot.get("roleArn"),
            "DataPrivacy": bot.get("dataPrivacy"),
            "IdleSessionTTLInSeconds": bot.get("idleSessionTTLInSeconds"),
        }

        meta = {"BotStatus": bot.get("botStatus"), "Source": "boto3.describe_bot"}

        node = ResourceNode(
            logical_id=f"LexBot{bot.get('botName', arn.resource_id)}",
            service="lex",
            cfn_type=self.cfn_type,
            properties=props,
            referenced_arns=refs,
            arns={"Bot": arn},
            metadata=meta,
        )
        return node
