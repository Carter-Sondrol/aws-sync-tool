from __future__ import annotations
from typing import Set, Any

from botocore.exceptions import ClientError
from mypy_boto3_lexv2_models import LexModelsV2Client
from mypy_boto3_lexv2_models.type_defs import DescribeBotResponseTypeDef

from resolvers.registry import register_resolver
from resolvers.lex.base_lex import BaseLexResolver
from graph.resource_node import ResourceNode
from utils.arn import ARN


@register_resolver("lex:bot")
class LexBotResolver(BaseLexResolver[LexModelsV2Client, DescribeBotResponseTypeDef]):
    resource_type = "bot"
    cfn_type = "AWS::Lex::Bot"

    # -------------------------------------------------------------
    # Parse *both* Lex bot ARN formats
    # -------------------------------------------------------------
    def _parse_bot_arn(self, arn: ARN) -> str:
        parts = arn.resource_parts

        # Format 1 — standard
        #   bot/<botId>
        if len(parts) == 2 and parts[0] == "bot":
            return parts[1]

        # Format 2 — sometimes returned by APIs:
        #   bot/<botId>/bot-version/<ver>
        if len(parts) == 4 and parts[0] == "bot" and parts[2] == "bot-version":
            return parts[1]

        raise ValueError(f"Unrecognized Lex Bot ARN: {arn}")

    # -------------------------------------------------------------
    def fetch_resource(self, arn: ARN) -> DescribeBotResponseTypeDef:
        bot_id = self._parse_bot_arn(arn)

        try:
            return self.client.describe_bot(  # type: ignore
                botId=bot_id
            )
        except ClientError:
            self.log.error("Failed to fetch Lex Bot %s", arn, exc_info=True)
            raise

    # -------------------------------------------------------------
    def to_node(self, arn: ARN, raw: DescribeBotResponseTypeDef) -> ResourceNode:
        bot = raw.get("bot", raw)

        bot_id = bot.get("botId") or self._parse_bot_arn(arn)
        name = bot.get("botName") or bot_id

        props = {
            "botName": bot.get("botName"),
            "description": bot.get("description"),
            "idleSessionTTLInSeconds": bot.get("idleSessionTTLInSeconds"),
            "roleArn": bot.get("roleArn"),
            "dataPrivacy": bot.get("dataPrivacy"),
            "botTags": bot.get("botTags"),
            "testBotTags": bot.get("testBotTags"),
        }

        # Reference-only at this level; versions/locales resolved downstream
        refs: Set[ARN] = set()

        node = self.make_node(
            arn,
            logical_id=f"LexBot{bot.get('botName', arn.resource_id)}",
            properties=props,
            metadata={
                "Source": "describe_bot",
                "BotStatus": bot.get("botStatus"),
            },
        )
        node.referenced_arns |= refs
        return node
