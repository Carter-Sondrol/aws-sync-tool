from __future__ import annotations

from typing import Callable, Dict, Optional, Set, Union

from boto3.session import Session

from poc.resolvers.base_resolver import BaseResolver

ResolverFactory = Callable[[Session], BaseResolver]
ResolverInput = Union[BaseResolver, ResolverFactory]


class ResolverRegistry:
    """
    Lazy resolver registry that instantiates resolvers on demand.

    Keys are typically:
      - "connect:queue"
      - "connect:instance"
      - "lambda:function"
      - "dynamodb:table"
      - or plain "connect" (service-wide fallback)
    """

    def __init__(self, session: Optional[Session] = None) -> None:
        self._session = session or Session()
        self._factories: Dict[str, ResolverFactory] = {}
        self._instances: Dict[str, BaseResolver] = {}

    # ------------------------------------------------------------------
    # Registration API
    # ------------------------------------------------------------------
    def register(self, key: str, resolver: ResolverInput) -> None:
        """
        Register a resolver under a key.

        resolver may be:
          - an already-instantiated BaseResolver
          - a factory(Session) -> BaseResolver
        """
        if isinstance(resolver, BaseResolver):
            self._instances[key] = resolver
        else:
            self._factories[key] = resolver

    # ------------------------------------------------------------------
    # Lookup API
    # ------------------------------------------------------------------
    def get(self, key: str) -> Optional[BaseResolver]:
        """
        Get or lazily create a resolver for the key.
        """
        if key in self._instances:
            return self._instances[key]

        factory = self._factories.get(key)
        if not factory:
            return None

        resolver = factory(self._session)
        self._instances[key] = resolver
        return resolver

    def services(self) -> Set[str]:
        return set(self._instances).union(self._factories)

    @property
    def session(self) -> Session:
        return self._session
