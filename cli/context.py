from __future__ import annotations
from cli.aws_utils import create_session, build_registry


class CLIContext:
    """Holds reusable AWS session, region, and resolver registry."""
    def __init__(self, session, account_id: str, region: str, registry):
        self.session = session
        self.account_id = account_id
        self.region = region
        self.registry = registry


def create_context(profile: str | None, region: str | None) -> CLIContext:
    """Create a CLIContext containing AWS session, account info, and registry."""
    session, account_id, region = create_session(profile, region)
    registry = build_registry(session)
    return CLIContext(session, account_id, region, registry)
