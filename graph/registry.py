from __future__ import annotations

from typing import Callable, Dict, Optional, Set, TYPE_CHECKING, Union

from resolvers.base import BaseResolver
from boto3.session import Session


ResolverFactory = Callable[["Session"], BaseResolver]
ResolverInput = Union[BaseResolver, ResolverFactory]


class ResolverRegistry:
    """Lazy resolver registry that instantiates resolvers on demand."""

    def __init__(
        self,
        session: Session,
        *,
        resolvers: Optional[Dict[str, BaseResolver]] = None,
        factories: Optional[Dict[str, ResolverFactory]] = None,
    ) -> None:
        self._session = session
        self._instances: Dict[str, BaseResolver] = resolvers.copy() if resolvers else {}
        self._factories: Dict[str, ResolverFactory] = (
            factories.copy() if factories else {}
        )

    def register(self, service: str, resolver_or_factory: ResolverInput) -> None:
        if callable(resolver_or_factory):
            self._factories[service] = resolver_or_factory
            self._instances.pop(service, None)
        else:
            self._instances[service] = resolver_or_factory
            self._factories.pop(service, None)

    def get(self, service: str) -> Optional[BaseResolver]:
        if service in self._instances:
            return self._instances[service]

        factory = self._factories.get(service)
        if not factory:
            return None

        resolver = factory(self._session)
        self._instances[service] = resolver
        return resolver

    def services(self) -> Set[str]:
        return set(self._instances).union(self._factories)
