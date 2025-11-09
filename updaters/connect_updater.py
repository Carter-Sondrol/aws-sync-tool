# updaters/connect_updater.py
from __future__ import annotations
import json
from graph.registry import ResolverRegistry
from graph.reconciler import Change

class ConnectUpdater:
    def __init__(self, registry: ResolverRegistry) -> None:
        self._client = registry.get("connect").client  # type: ignore

    def create(self, ch: Change):
        # For flows/modules, create by Name + InstanceArn + Content
        d = ch.desired or {}
        # self._client.create_contact_flow(...)

    def update(self, ch: Change):
        d = ch.desired or {}
        # Example: ContactFlow content drift
        if ch.cfn_type.endswith("ContactFlow") and "Content" in d and "InstanceArn" in d:
            self._client.update_contact_flow_content(
                InstanceId=d["InstanceArn"].split("/")[-1],
                ContactFlowId=d.get("Id") or d.get("Arn", "").split("/")[-1],
                Content=d["Content"],
            )
        # Similar for QuickConnect, Queue, HoursOfOperation, Prompt (S3Uri changes)
        # You already parse these well—just map to the right update_* APIs.

    def delete(self, ch: Change):
        # e.g., delete_contact_flow / delete_queue etc as needed
        pass
