# resolvers/registry.py

from __future__ import annotations
from typing import Type, Dict, TypeVar, Generic
from botocore.client import BaseClient
from .base_resolver import BaseResolver

C = TypeVar("C", bound=BaseClient)
R = TypeVar("R")


class ResolverRegistry:
    """Global registry of all resolvers."""

    _registry: Dict[str, Type[BaseResolver]] = {}

    @classmethod
    def register(cls, name: str, resolver_cls: Type[BaseResolver]) -> None:
        """Register a resolver under its service name."""
        if name in cls._registry:
            raise ValueError(f"Resolver '{name}' already registered.")
        cls._registry[name] = resolver_cls

    T = TypeVar("T", bound=BaseResolver)

    @classmethod
    def get(cls, name: str) -> Type[T]:
        return cls._registry[name]  # type: ignore[return-value]

    @classmethod
    def all(cls) -> Dict[str, Type[BaseResolver]]:
        """Return all registered resolvers."""
        return dict(cls._registry)


def register_resolver(name: str):
    """Decorator for automatic resolver registration."""

    def decorator(cls: Type[BaseResolver]) -> Type[BaseResolver]:
        ResolverRegistry.register(name, cls)
        return cls

    return decorator
