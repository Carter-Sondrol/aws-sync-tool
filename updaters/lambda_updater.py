# updaters/lambda_updater.py
from __future__ import annotations
from botocore.exceptions import ClientError
from graph.registry import ResolverRegistry
from graph.reconciler import Change

class LambdaUpdater:
    def __init__(self, registry: ResolverRegistry) -> None:
        self._client = registry.get("lambda").client  # type: ignore

    def create(self, ch: Change):
        # Typically use CFN/CDK; for demo: guardrail
        raise NotImplementedError("Prefer CFN/CDK for Lambda create")

    def update(self, ch: Change):
        # Update config parts that drifted (Role, Env, VPC, Memory/Timeout)
        desired = ch.desired or {}
        name = desired.get("FunctionName")
        if "Environment" in desired:
            self._client.update_function_configuration(
                FunctionName=name,
                Environment=desired["Environment"],
            )
        # Add other fields similarly (Timeout, MemorySize, Role, VpcConfig, Layers) with idempotent calls.

    def delete(self, ch: Change):
        name = ch.live.get("FunctionName") if ch.live else None
        if name:
            self._client.delete_function(FunctionName=name)
