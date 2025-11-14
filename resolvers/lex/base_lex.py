from __future__ import annotations

import logging
from typing import Mapping, Optional, TypeVar, cast
from mypy_boto3_lexv2_models import LexModelsV2Client

from resolvers.base_resolver import BaseResolver
from utils.arn import ARN

log = logging.getLogger(__name__)

C_Lex = TypeVar("C_Lex", bound=LexModelsV2Client)
R_Lex = TypeVar("R_Lex", bound=Mapping[str, object])


class BaseLexResolver(BaseResolver[C_Lex, R_Lex]):
    """
    Base class for all Lex V2 resolvers.

    Logical service name stays "lex".
    boto_service_name ensures AWS client creation uses "lexv2-models".
    """
    service = "lex"
    boto_service_name = "lexv2-models"

    def __init__(self, session, client: Optional[C_Lex] = None):
        # Ensure client is always type-compatible with C_Lex
        real_client: C_Lex = cast(
            C_Lex,
            client or session.client("lexv2-models")
        )
        super().__init__(session, real_client)
