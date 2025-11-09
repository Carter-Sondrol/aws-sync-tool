from __future__ import annotations
import logging
from typing import Any, Dict, Set
from mypy_boto3_lexv2_models.type_defs import DescribeBotAliasResponseTypeDef
from resolvers.lex.base_lex import BaseLexSubResolver
from utils.arn import ARN, extract_dependencies
from graph.dependency_graph import ResourceNode

logger = logging.getLogger(__name__)

class LexAliasResolver(BaseLexSubResolver[DescribeBotAliasResponseTypeDef]):
    """Resolves Lex V2 bot aliases and links to parent bot."""

    resource_type = "bot-alias"
    cfn_type = "AWS::Lex::BotAlias"

    def fetch(self, arn: ARN) -> DescribeBotAliasResponseTypeDef:
        bot_id = arn.subresource_parent_id("bot") or arn.resource_parts[1]
        alias_id = arn.subresource_id()
        logger.info("[LexAliasResolver] Fetching alias %s", arn)
        return self.client.describe_bot_alias(botId=bot_id, botAliasId=alias_id)

    def parse(self, arn: ARN, raw: DescribeBotAliasResponseTypeDef) -> ResourceNode[dict[str, Any]]:
        alias = raw.get("botAlias") or raw
        refs: Set[ARN] = extract_dependencies(alias)

        # Always link parent bot
        bot_id = alias.get("botId")
        if bot_id:
            refs.add(ARN(f"arn:aws:lex:{arn.region}:{arn.account_id}:bot/{bot_id}"))

        props: Dict[str, Any] = {
            "BotAliasName": alias.get("botAliasName"),
            "BotId": bot_id,
            "Description": alias.get("description"),
            "BotAliasLocaleSettings": alias.get("botAliasLocaleSettings"),
            "ConversationLogSettings": alias.get("conversationLogSettings"),
        }

        return ResourceNode(
            logical_id=f"LexAlias{alias.get('botAliasName', arn.resource_id)}",
            service="lex",
            cfn_type=self.cfn_type,
            properties=props,
            referenced_arns=refs,
            arns={"Alias": arn},
            metadata={
                "BotAliasStatus": alias.get("botAliasStatus"),
                "BotAliasId": alias.get("botAliasId"),
                "BotVersion": alias.get("botVersion"),
            },
        )
