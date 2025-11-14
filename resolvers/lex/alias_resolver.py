from __future__ import annotations

from typing import Set
from botocore.exceptions import ClientError
from mypy_boto3_lexv2_models import LexModelsV2Client
from mypy_boto3_lexv2_models.type_defs import DescribeBotAliasResponseTypeDef

from resolvers.registry import register_resolver
from resolvers.lex.base_lex import BaseLexResolver
from graph.resource_node import ResourceNode
from utils.arn import ARN


@register_resolver("lex:bot-alias")
class LexBotAliasResolver(
    BaseLexResolver[LexModelsV2Client, DescribeBotAliasResponseTypeDef]
):
    """
    Resolver for Lex V2 Bot Alias resources.
    ARN examples:
      arn:aws:lex:us-west-2:123456789012:bot/botId/bot-alias/aliasId
    """

    resource_type = "bot-alias"
    cfn_type = "AWS::Lex::BotAlias"

    # ----------------------------------------------------------------------
    # Fetch
    # ----------------------------------------------------------------------
    def fetch_resource(self, arn: ARN):
        parts = arn.resource_parts

        bot_id = None
        alias_id = None

        # Pattern 1: bot/<botId>/bot-alias/<aliasId>
        if len(parts) == 4 and parts[0] == "bot" and parts[2] == "bot-alias":
            bot_id = parts[1]
            alias_id = parts[3]

        # Pattern 2: bot-alias/<botId>/<aliasId>
        elif len(parts) == 3 and parts[0] == "bot-alias":
            bot_id = parts[1]
            alias_id = parts[2]

        else:
            raise ValueError(f"Unrecognized Lex BotAlias ARN format: {arn}")

        return self.client.describe_bot_alias(  # type: ignore
            botId=bot_id, botAliasId=alias_id
        )

    # ----------------------------------------------------------------------
    # Convert to graph node
    # ----------------------------------------------------------------------
    def to_node(self, arn: ARN, raw: DescribeBotAliasResponseTypeDef) -> ResourceNode:
        alias = raw.get("botAlias", raw)

        # Always extract botId from AWS response — NEVER from ARN
        bot_id = alias.get("botId")
        alias_id = alias.get("botAliasId")

        # Fallback only if AWS response missing fields (practically never)
        if not bot_id or not alias_id:
            # Re-use your fetch parser logic
            parts = arn.resource_parts
            if len(parts) == 4 and parts[0] == "bot" and parts[2] == "bot-alias":
                bot_id = bot_id or parts[1]
                alias_id = alias_id or parts[3]
            elif len(parts) == 3 and parts[0] == "bot-alias":
                bot_id = bot_id or parts[1]
                alias_id = alias_id or parts[2]
            else:
                raise ValueError(f"Unrecognized Lex BotAlias ARN: {arn}")

        props = {
            "botAliasName": alias.get("botAliasName"),
            "description": alias.get("description"),
            "botAliasLocaleSettings": alias.get("botAliasLocaleSettings"),
            "conversationLogSettings": alias.get("conversationLogSettings"),
            "sentimentAnalysisSettings": alias.get("sentimentAnalysisSettings"),
        }

        refs: Set[ARN] = set()

        # Parent bot reference
        refs.add(
            ARN.from_parts(
                "lex",
                f"bot/{bot_id}",
                region=arn.region,
                account_id=arn.account_id,
            )
        )

        # Locale references
        locales = alias.get("botAliasLocaleSettings", {}) or {}
        for locale_id in locales.keys():
            locale_arn = ARN.from_parts(
                "lex",
                f"bot/{bot_id}/bot-locale/{locale_id}",
                region=arn.region,
                account_id=arn.account_id,
            )
            refs.add(locale_arn)

        # Optional Lambda references
        conv_log = alias.get("conversationLogSettings", {}) or {}
        audio_settings = conv_log.get("audioLogSettings", []) or []
        for cfg in audio_settings:
            dest = cfg.get("destination", {})
            l_arn = dest.get("lambdaArn")
            if isinstance(l_arn, str) and ARN.is_valid(l_arn):
                refs.add(ARN.parse_cached(l_arn))

        node = self.make_node(
            arn,
            logical_id=f"LexBotAlias{alias.get('botAliasName', alias_id)}",
            properties=props,
            metadata={
                "Source": "describe_bot_alias",
                "Locales": list(locales.keys()),
                "EmbeddedReferenceCount": len(refs),
            },
        )

        node.referenced_arns |= refs
        return node
