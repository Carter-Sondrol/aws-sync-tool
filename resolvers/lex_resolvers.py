from __future__ import annotations

from resolvers.base_resolver import BaseResolver
from resolvers.registry import register_resolver

# Optional: enable service-specific mypy-boto3 stubs.
# Uncomment if you have the correct stub package:
# from mypy_boto3_lexv2_models import LexModelsV2Client as Boto3Client  # type: ignore[import]
# Otherwise fallback:
# from botocore.client import BaseClient as Boto3Client


@register_resolver("lex:bot")
class LexBotResolver(BaseResolver):
    """
    Synthetic resolver for Lex V2 bot ARNs (lexv2-models). Lex APIs are scoped
    under a different client; we avoid live calls and instead materialize a
    minimal node so references become connected.
    """

    service = "lex"
    resource_type = "bot"
    resource_name = "Bot"
    cfn_type = None
    deployment_mode = "boto3"

    # No describe API available in introspected schema
    list_operation = None
    describe_operation = None
    id_fields: list[str] = []
    summary_list_path = None
    summary_arn_field = None

    def client_for(self, arn):
        # Ensure the lexv2-models client is used if needed elsewhere.
        return self.session.client("lexv2-models", region_name=arn.region or self.session_region)

    def fetch_resource(self, arn):
        return {"Bot": {"Arn": arn.raw, "BotId": arn.resource_id}}

    def to_node(self, arn, raw):
        inner = raw.get("Bot") if isinstance(raw, dict) else {}
        props = dict(inner) if isinstance(inner, dict) else {}
        props.setdefault("Arn", arn.raw)
        props.setdefault("BotId", arn.resource_id)

        return self.make_node(
            arn,
            logical_id=f"LexBot_{arn.resource_id}",
            properties=props,
        )


@register_resolver("lex:bot-alias")
class LexBotAliasResolver(BaseResolver):
    """
    Synthetic resolver for Lex V2 bot-alias ARNs.
    """

    service = "lex"
    resource_type = "bot-alias"
    resource_name = "BotAlias"
    cfn_type = None
    deployment_mode = "boto3"

    list_operation = None
    describe_operation = None
    id_fields: list[str] = []
    summary_list_path = None
    summary_arn_field = None

    def client_for(self, arn):
        return self.session.client("lexv2-models", region_name=arn.region or self.session_region)

    def fetch_resource(self, arn):
        return {"BotAlias": {"Arn": arn.raw, "BotAliasId": arn.resource_id}}

    def to_node(self, arn, raw):
        inner = raw.get("BotAlias") if isinstance(raw, dict) else {}
        props = dict(inner) if isinstance(inner, dict) else {}
        props.setdefault("Arn", arn.raw)
        props.setdefault("BotAliasId", arn.resource_id)

        return self.make_node(
            arn,
            logical_id=f"LexBotAlias_{arn.resource_id}",
            properties=props,
        )

