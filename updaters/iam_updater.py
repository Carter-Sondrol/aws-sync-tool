# updaters/iam_updater.py
from __future__ import annotations
from graph.registry import ResolverRegistry
from graph.reconciler import Change

class IAMUpdater:
    def __init__(self, registry: ResolverRegistry) -> None:
        self._client = registry.get("iam").client  # type: ignore

    def create(self, ch: Change):
        # Create roles/policies if customer-managed (skip aws-managed)
        pass

    def update(self, ch: Change):
        # For roles: update assume role policy, attach/detach managed policies
        pass

    def delete(self, ch: Change):
        pass
