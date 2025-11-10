import boto3
import logging
from typing import Tuple
from graph.registry import ResolverRegistry
from resolvers.artifacts_resolver import ArtifactResolver
from resolvers.bedrock_resolver import BedrockResolver
from resolvers.lambda_resolver import LambdaResolver
from resolvers.connect import ConnectResolver
from resolvers.iam_resolver import IAMResolver
from resolvers.dynamodb_resolver import DynamoDBResolver
from resolvers.lex import LexResolver
from resolvers.logs_resolver import LogsResolver
from resolvers.s3_resolver import S3Resolver

logger = logging.getLogger(__name__)


def create_session(
    profile: str | None, region: str | None
) -> Tuple[boto3.Session, str, str]:
    """Return (session, account_id, region)."""
    region = region or boto3.session.Session().region_name or "us-west-2"
    session = boto3.Session(profile_name=profile, region_name=region)
    sts = session.client("sts", region_name=region)
    account_id = sts.get_caller_identity()["Account"]
    logger.info(
        f"Using AWS profile={profile or 'default'} account={account_id} region={region}"
    )
    return session, account_id, region


def build_registry(session: boto3.Session) -> ResolverRegistry:
    region = session.region_name or boto3.session.Session().region_name or "us-west-2"
    registry = ResolverRegistry(session)
    registry.register(
        "lambda",
        lambda s: LambdaResolver(
            s, graph=None, client=s.client("lambda", region_name=region)
        ),
    )

    registry.register(
        "connect",
        lambda s: ConnectResolver(s, s.client("connect", region_name=region)),
    )

    registry.register(
        "iam",
        lambda s: IAMResolver(
            s, graph=None, client=s.client("iam", region_name=region)
        ),
    )

    registry.register(
        "dynamodb",
        lambda s: DynamoDBResolver(
            s, graph=None, client=s.client("dynamodb", region_name=region)
        ),
    )

    registry.register(
        "s3",
        lambda s: S3Resolver(s, graph=None, client=s.client("s3", region_name=region)),
    )

    registry.register(
        "lex",
        lambda s: LexResolver(
            s, graph=None, client=s.client("lexv2-models", region_name=region)
        ),
    )

    registry.register(
        "logs",
        lambda s: LogsResolver(
            s, graph=None, client=s.client("logs", region_name=region)
        ),
    )

    registry.register(
        "bedrock",
        lambda s: BedrockResolver(
            s, graph=None, client=s.client("bedrock", region_name=region)
        ),
    )

    registry.register(
        "artifact",
        lambda s: ArtifactResolver(
            s, client=s.client("s3", region_name=region)
        ),
    )
    return registry
