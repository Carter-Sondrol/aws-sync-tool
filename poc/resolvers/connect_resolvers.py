from __future__ import annotations

import logging
from functools import lru_cache
from typing import Iterable, Mapping, Set

from poc.graph.resource_node import NodeClassification, ResourceNode
from poc.resolvers.base_resolver import BaseResolver
from poc.resolvers.registry import register_resolver
from poc.utils.arn import ARN

log = logging.getLogger(__name__)

# Optional: enable service-specific mypy-boto3 stubs.
# Uncomment if you have the correct stub package:
# from mypy_boto3_connect import ConnectClient as Boto3Client  # type: ignore[import]
# Otherwise fallback:
# from botocore.client import BaseClient as Boto3Client


class ConnectInstanceChild(BaseResolver):
    """
    Connect sub-resources should always reference their parent instance so the
    graph ties flows/queues/etc back to the instance even when not present in
    the payload.
    """

    def extract_references(
        self,
        arn: ARN,
        raw: Mapping[str, object],
        *,
        known_buckets: set[str] | None = None,
    ) -> set[ARN]:
        refs = super().extract_references(arn, raw, known_buckets=known_buckets)

        instance_id = arn.subresource_parent_id("instance")
        if instance_id:
            refs.add(
                ARN.from_parts(
                    "connect",
                    f"instance/{instance_id}",
                    region=arn.region,
                    account_id=arn.account_id,
                    partition=arn.partition,
                )
            )

        return refs


@register_resolver("connect:authentication-profile")
class ConnectAuthenticationProfileResolver(ConnectInstanceChild):
    service = "connect"
    resource_type = "authentication-profile"
    resource_name = "AuthenticationProfile"
    cfn_type = None
    deployment_mode = "boto3"

    list_operation = "list_authentication_profiles"
    describe_operation = "describe_authentication_profile"
    id_fields = ["AuthenticationProfileId", "InstanceId"]
    summary_list_path = "AuthenticationProfileSummaryList"
    summary_arn_field = "Arn"


@register_resolver("connect:contact")
class ConnectContactResolver(ConnectInstanceChild):
    service = "connect"
    resource_type = "contact"
    resource_name = "Contact"
    cfn_type = None
    deployment_mode = "boto3"

    list_operation = "search_contacts"
    describe_operation = "describe_contact"
    id_fields = ["ContactId", "InstanceId"]
    summary_list_path = "Contacts"
    summary_arn_field = "Arn"


@register_resolver("connect:contact-evaluation")
class ConnectContactEvaluationResolver(ConnectInstanceChild):
    service = "connect"
    resource_type = "contact-evaluation"
    resource_name = "ContactEvaluation"
    cfn_type = None
    deployment_mode = "boto3"

    list_operation = "list_contact_evaluations"
    describe_operation = "describe_contact_evaluation"
    id_fields = ["EvaluationId", "InstanceId"]
    summary_list_path = "EvaluationSummaryList"
    summary_arn_field = "EvaluationArn"


@register_resolver("connect:contact-flow")
class ConnectContactFlowResolver(ConnectInstanceChild):
    service = "connect"
    resource_type = "contact-flow"
    resource_name = "ContactFlow"
    cfn_type = "AWS::Connect::ContactFlow"
    deployment_mode = "cfn"

    list_operation = "list_contact_flows"
    describe_operation = "describe_contact_flow"
    id_fields = ["ContactFlowId", "InstanceId"]
    summary_list_path = "ContactFlowSummaryList"
    summary_arn_field = "Arn"


@register_resolver("connect:contact-flow-module")
class ConnectContactFlowModuleResolver(ConnectInstanceChild):
    service = "connect"
    resource_type = "contact-flow-module"
    resource_name = "ContactFlowModule"
    cfn_type = "AWS::Connect::ContactFlowModule"
    deployment_mode = "cfn"

    list_operation = "list_contact_flow_modules"
    describe_operation = "describe_contact_flow_module"
    id_fields = ["ContactFlowModuleId", "InstanceId"]
    summary_list_path = "ContactFlowModulesSummaryList"
    summary_arn_field = "Arn"


@register_resolver("connect:evaluation-form")
class ConnectEvaluationFormResolver(ConnectInstanceChild):
    service = "connect"
    resource_type = "evaluation-form"
    resource_name = "EvaluationForm"
    cfn_type = "AWS::Connect::EvaluationForm"
    deployment_mode = "cfn"

    list_operation = "list_evaluation_forms"
    describe_operation = "describe_evaluation_form"
    id_fields = ["EvaluationFormId", "InstanceId"]
    summary_list_path = "EvaluationFormSummaryList"
    summary_arn_field = "EvaluationFormArn"


@register_resolver("connect:hours-of-operation")
class ConnectHoursOfOperationResolver(ConnectInstanceChild):
    service = "connect"
    resource_type = "hours-of-operation"
    resource_name = "HoursOfOperation"
    cfn_type = "AWS::Connect::HoursOfOperation"
    deployment_mode = "cfn"

    list_operation = "list_hours_of_operations"
    describe_operation = "describe_hours_of_operation"
    id_fields = ["HoursOfOperationId", "InstanceId"]
    summary_list_path = "HoursOfOperationSummaryList"
    summary_arn_field = "Arn"


@register_resolver("connect:hours-of-operation-override")
class ConnectHoursOfOperationOverrideResolver(ConnectInstanceChild):
    service = "connect"
    resource_type = "hours-of-operation-override"
    resource_name = "HoursOfOperationOverride"
    cfn_type = None
    deployment_mode = "boto3"

    list_operation = "list_hours_of_operation_overrides"
    describe_operation = "describe_hours_of_operation_override"
    id_fields = ["HoursOfOperationId", "HoursOfOperationOverrideId", "InstanceId"]
    summary_list_path = "HoursOfOperationOverrideList"
    summary_arn_field = "HoursOfOperationArn"


@register_resolver("connect:instance")
class ConnectInstanceResolver(BaseResolver):
    service = "connect"
    resource_type = "instance"
    resource_name = "Instance"
    cfn_type = "AWS::Connect::Instance"
    deployment_mode = "cfn"

    list_operation = "list_instances"
    describe_operation = "describe_instance"
    id_fields = ["InstanceId"]
    summary_list_path = "InstanceSummaryList"
    summary_arn_field = "Arn"
    enable_deep_scan = True

    def deep_children(self, arn: ARN, raw: Mapping[str, object]) -> Iterable[ARN]:
        instance_id = arn.resource_id
        if not instance_id or not self.discovery_config.get("deep"):
            return []

        discovered: Set[ARN] = set()
        client = self.client_for(arn)

        for target in self._deep_targets():
            params = {"InstanceId": instance_id} if target["needs_instance"] else {}
            try:
                paginator = client.get_paginator(target["list_operation"])
                pages_iter = paginator.paginate(**params)
            except Exception:
                try:
                    fn = getattr(client, target["list_operation"])
                    pages_iter = [fn(**params)]
                except Exception as e:
                    log.debug(
                        "Skipping deep discovery %s for %s: %s",
                        target["list_operation"],
                        instance_id,
                        e,
                    )
                    continue

            try:
                for page in pages_iter:
                    if not isinstance(page, Mapping):
                        continue
                    items = page.get(target["summary_path"]) or []
                    if not isinstance(items, list):
                        continue
                    for item in items:
                        if not isinstance(item, Mapping):
                            continue
                        arn_val = item.get(target["arn_field"])
                        if not arn_val:
                            continue
                        try:
                            discovered.add(ARN.parse_cached(arn_val))
                        except Exception:
                            continue
            except Exception as e:
                log.debug(
                    "Skipping deep discovery iteration %s for %s: %s",
                    target["list_operation"],
                    instance_id,
                    e,
                )
                continue

        return discovered

    @classmethod
    @lru_cache(maxsize=1)
    def _deep_targets(cls) -> list[dict[str, str]]:
        return [
            {
                "list_operation": "list_authentication_profiles",
                "summary_path": "AuthenticationProfileSummaryList",
                "arn_field": "Arn",
                "needs_instance": True,
            },
            {
                "list_operation": "list_contact_flows",
                "summary_path": "ContactFlowSummaryList",
                "arn_field": "Arn",
                "needs_instance": True,
            },
            {
                "list_operation": "list_contact_flow_modules",
                "summary_path": "ContactFlowModulesSummaryList",
                "arn_field": "Arn",
                "needs_instance": True,
            },
            {
                "list_operation": "list_evaluation_forms",
                "summary_path": "EvaluationFormSummaryList",
                "arn_field": "EvaluationFormArn",
                "needs_instance": True,
            },
            {
                "list_operation": "list_hours_of_operations",
                "summary_path": "HoursOfOperationSummaryList",
                "arn_field": "Arn",
                "needs_instance": True,
            },
            {
                "list_operation": "list_hours_of_operation_overrides",
                "summary_path": "HoursOfOperationOverrideList",
                "arn_field": "HoursOfOperationArn",
                "needs_instance": True,
            },
            {
                "list_operation": "list_phone_numbers",
                "summary_path": "PhoneNumberSummaryList",
                "arn_field": "Arn",
                "needs_instance": False,
            },
            {
                "list_operation": "list_prompts",
                "summary_path": "PromptSummaryList",
                "arn_field": "Arn",
                "needs_instance": True,
            },
            {
                "list_operation": "list_queues",
                "summary_path": "QueueSummaryList",
                "arn_field": "Arn",
                "needs_instance": True,
            },
            {
                "list_operation": "list_quick_connects",
                "summary_path": "QuickConnectSummaryList",
                "arn_field": "Arn",
                "needs_instance": True,
            },
            {
                "list_operation": "list_routing_profiles",
                "summary_path": "RoutingProfileSummaryList",
                "arn_field": "Arn",
                "needs_instance": True,
            },
            {
                "list_operation": "list_rules",
                "summary_path": "RuleSummaryList",
                "arn_field": "RuleArn",
                "needs_instance": True,
            },
            {
                "list_operation": "list_security_profiles",
                "summary_path": "SecurityProfileSummaryList",
                "arn_field": "Arn",
                "needs_instance": True,
            },
            {
                "list_operation": "list_task_templates",
                "summary_path": "TaskTemplates",
                "arn_field": "Arn",
                "needs_instance": True,
            },
            {
                "list_operation": "list_traffic_distribution_groups",
                "summary_path": "TrafficDistributionGroupSummaryList",
                "arn_field": "Arn",
                "needs_instance": False,
            },
            {
                "list_operation": "list_users",
                "summary_path": "UserSummaryList",
                "arn_field": "Arn",
                "needs_instance": True,
            },
            {
                "list_operation": "list_user_hierarchy_groups",
                "summary_path": "UserHierarchyGroupSummaryList",
                "arn_field": "Arn",
                "needs_instance": True,
            },
            {
                "list_operation": "list_views",
                "summary_path": "ViewsSummaryList",
                "arn_field": "Arn",
                "needs_instance": True,
            },
        ]


@register_resolver("connect:phone-number")
class ConnectPhoneNumberResolver(BaseResolver):
    service = "connect"
    resource_type = "phone-number"
    resource_name = "PhoneNumber"
    cfn_type = "AWS::Connect::PhoneNumber"
    deployment_mode = "cfn"

    list_operation = "list_phone_numbers"
    describe_operation = "describe_phone_number"
    id_fields = ["PhoneNumberId"]
    summary_list_path = "PhoneNumberSummaryList"
    summary_arn_field = "Arn"


@register_resolver("connect:prompt")
class ConnectPromptResolver(ConnectInstanceChild):
    service = "connect"
    resource_type = "prompt"
    resource_name = "Prompt"
    cfn_type = "AWS::Connect::Prompt"
    deployment_mode = "cfn"

    list_operation = "list_prompts"
    describe_operation = "describe_prompt"
    id_fields = ["InstanceId", "PromptId"]
    summary_list_path = "PromptSummaryList"
    summary_arn_field = "Arn"


@register_resolver("connect:queue")
class ConnectQueueResolver(ConnectInstanceChild):
    service = "connect"
    resource_type = "queue"
    resource_name = "Queue"
    cfn_type = "AWS::Connect::Queue"
    deployment_mode = "cfn"

    list_operation = "list_queues"
    describe_operation = "describe_queue"
    id_fields = ["InstanceId", "QueueId"]
    summary_list_path = "QueueSummaryList"
    summary_arn_field = "Arn"

    def _resolve_id_fields(self, arn: ARN) -> dict[str, str]:
        parts = arn.resource_parts
        if (
            len(parts) >= 5
            and parts[0] == "instance"
            and parts[2] == "queue"
            and parts[3] == "agent"
        ):
            return {
                "InstanceId": parts[1],
                "QueueId": parts[4],
            }
        return super()._resolve_id_fields(arn)

    def fetch_resource(self, arn: ARN):
        try:
            return super().fetch_resource(arn)
        except Exception as e:
            msg = str(e)
            if "Queue not found" in msg or "ResourceNotFoundException" in msg:
                instance_id = arn.subresource_parent_id("instance")
                return {
                    "Queue": {
                        "QueueId": arn.resource_id,
                        "InstanceId": instance_id,
                        "Arn": arn.raw,
                        "Synthetic": True,
                    }
                }
            raise


@register_resolver("connect:quick-connect")
class ConnectQuickConnectResolver(ConnectInstanceChild):
    service = "connect"
    resource_type = "quick-connect"
    resource_name = "QuickConnect"
    cfn_type = "AWS::Connect::QuickConnect"
    deployment_mode = "cfn"

    list_operation = "list_quick_connects"
    describe_operation = "describe_quick_connect"
    id_fields = ["InstanceId", "QuickConnectId"]
    summary_list_path = "QuickConnectSummaryList"
    summary_arn_field = "Arn"


@register_resolver("connect:routing-profile")
class ConnectRoutingProfileResolver(ConnectInstanceChild):
    service = "connect"
    resource_type = "routing-profile"
    resource_name = "RoutingProfile"
    cfn_type = "AWS::Connect::RoutingProfile"
    deployment_mode = "cfn"

    list_operation = "list_routing_profiles"
    describe_operation = "describe_routing_profile"
    id_fields = ["InstanceId", "RoutingProfileId"]
    summary_list_path = "RoutingProfileSummaryList"
    summary_arn_field = "Arn"


@register_resolver("connect:rule")
class ConnectRuleResolver(ConnectInstanceChild):
    service = "connect"
    resource_type = "rule"
    resource_name = "Rule"
    cfn_type = "AWS::Connect::Rule"
    deployment_mode = "cfn"

    list_operation = "list_rules"
    describe_operation = "describe_rule"
    id_fields = ["InstanceId", "RuleId"]
    summary_list_path = "RuleSummaryList"
    summary_arn_field = "RuleArn"


@register_resolver("connect:security-profile")
class ConnectSecurityProfileResolver(ConnectInstanceChild):
    service = "connect"
    resource_type = "security-profile"
    resource_name = "SecurityProfile"
    cfn_type = "AWS::Connect::SecurityProfile"
    deployment_mode = "cfn"

    list_operation = "list_security_profiles"
    describe_operation = "describe_security_profile"
    id_fields = ["InstanceId", "SecurityProfileId"]
    summary_list_path = "SecurityProfileSummaryList"
    summary_arn_field = "Arn"


@register_resolver("connect:task-template")
class ConnectTaskTemplateResolver(ConnectInstanceChild):
    service = "connect"
    resource_type = "task-template"
    resource_name = "TaskTemplate"
    cfn_type = "AWS::Connect::TaskTemplate"
    deployment_mode = "cfn"

    list_operation = "list_task_templates"
    describe_operation = "get_task_template"
    id_fields = ["InstanceId", "TaskTemplateId"]
    summary_list_path = "TaskTemplates"
    summary_arn_field = "Arn"


@register_resolver("connect:traffic-distribution-group")
class ConnectTrafficDistributionGroupResolver(ConnectInstanceChild):
    service = "connect"
    resource_type = "traffic-distribution-group"
    resource_name = "TrafficDistributionGroup"
    cfn_type = "AWS::Connect::TrafficDistributionGroup"
    deployment_mode = "cfn"

    list_operation = "list_traffic_distribution_groups"
    describe_operation = "describe_traffic_distribution_group"
    id_fields = ["TrafficDistributionGroupId"]
    summary_list_path = "TrafficDistributionGroupSummaryList"
    summary_arn_field = "Arn"


@register_resolver("connect:user")
class ConnectUserResolver(ConnectInstanceChild):
    service = "connect"
    resource_type = "user"
    resource_name = "User"
    cfn_type = "AWS::Connect::User"
    deployment_mode = "cfn"

    list_operation = "list_users"
    describe_operation = "describe_user"
    id_fields = ["InstanceId", "UserId"]
    summary_list_path = "UserSummaryList"
    summary_arn_field = "Arn"


@register_resolver("connect:user-hierarchy-group")
class ConnectUserHierarchyGroupResolver(ConnectInstanceChild):
    service = "connect"
    resource_type = "user-hierarchy-group"
    resource_name = "UserHierarchyGroup"
    cfn_type = "AWS::Connect::UserHierarchyGroup"
    deployment_mode = "cfn"

    list_operation = "list_user_hierarchy_groups"
    describe_operation = "describe_user_hierarchy_group"
    id_fields = ["HierarchyGroupId", "InstanceId"]
    summary_list_path = "UserHierarchyGroupSummaryList"
    summary_arn_field = "Arn"


@register_resolver("connect:view")
class ConnectViewResolver(ConnectInstanceChild):
    service = "connect"
    resource_type = "view"
    resource_name = "View"
    cfn_type = "AWS::Connect::View"
    deployment_mode = "cfn"

    list_operation = "list_views"
    describe_operation = "describe_view"
    id_fields = ["InstanceId", "ViewId"]
    summary_list_path = "ViewsSummaryList"
    summary_arn_field = "Arn"

    def _resolve_id_fields(self, arn: ARN) -> dict[str, str]:
        parts = arn.resource_parts
        if (
            len(parts) >= 5
            and parts[0] == "instance"
            and parts[2] == "view"
            and parts[-1].startswith("$")
        ):
            return {
                "InstanceId": parts[1],
                "ViewId": parts[-2],
            }
        return super()._resolve_id_fields(arn)


@register_resolver("connect:vocabulary")
class ConnectVocabularyResolver(ConnectInstanceChild):
    service = "connect"
    resource_type = "vocabulary"
    resource_name = "Vocabulary"
    cfn_type = None
    deployment_mode = "boto3"

    list_operation = "search_vocabularies"
    describe_operation = "describe_vocabulary"
    id_fields = ["InstanceId", "VocabularyId"]
    summary_list_path = "VocabularySummaryList"
    summary_arn_field = "Arn"


@register_resolver("connect:agent")
class ConnectAgentResolver(ConnectInstanceChild):
    """
    Synthetic resolver for agent ARNs (Connect uses /agent/<id> in payloads).
    """

    service = "connect"
    resource_type = "agent"
    resource_name = "Agent"
    cfn_type = None
    deployment_mode = "boto3"

    list_operation = None
    describe_operation = None
    id_fields: list[str] = []
    summary_list_path = None
    summary_arn_field = None

    def fetch_resource(self, arn: ARN):
        instance_id = arn.subresource_parent_id("instance")
        return {
            "Agent": {
                "AgentId": arn.resource_id,
                "InstanceId": instance_id,
                "Arn": arn.raw,
            }
        }

    def to_node(self, arn: ARN, raw: Mapping[str, object]):
        payload = raw.get("Agent") if isinstance(raw, Mapping) else {}
        props = dict(payload) if isinstance(payload, Mapping) else {}
        props.setdefault("Arn", arn.raw)
        props.setdefault("AgentId", arn.resource_id)

        refs: Set[ARN] = set()
        instance_id = arn.subresource_parent_id("instance")
        if instance_id:
            refs.add(
                ARN.from_parts(
                    "connect",
                    f"instance/{instance_id}",
                    region=arn.region,
                    account_id=arn.account_id,
                    partition=arn.partition,
                )
            )

        return ResourceNode(
            logical_id=f"Agent_{arn.resource_id}",
            service=self.service,
            cfn_type=self.cfn_type,
            properties=props,
            referenced_arns=refs,
            classification=NodeClassification.RESOURCE,
            arns={"Primary": arn},
        )


@register_resolver("connect:transfer-destination")
class ConnectTransferDestinationResolver(ConnectInstanceChild):
    """
    Synthetic resolver for transfer-destination ARNs (no public describe API).
    """

    service = "connect"
    resource_type = "transfer-destination"
    resource_name = "TransferDestination"
    cfn_type = None
    deployment_mode = "boto3"

    list_operation = None
    describe_operation = None
    id_fields: list[str] = []
    summary_list_path = None
    summary_arn_field = None

    def fetch_resource(self, arn: ARN):
        instance_id = arn.subresource_parent_id("instance")
        return {
            "TransferDestination": {
                "TransferDestinationId": arn.resource_id,
                "InstanceId": instance_id,
                "Arn": arn.raw,
            }
        }

    def to_node(self, arn: ARN, raw: Mapping[str, object]):
        payload = raw.get("TransferDestination") if isinstance(raw, Mapping) else {}
        props = dict(payload) if isinstance(payload, Mapping) else {}
        props.setdefault("Arn", arn.raw)
        props.setdefault("TransferDestinationId", arn.resource_id)

        refs: Set[ARN] = set()
        instance_id = arn.subresource_parent_id("instance")
        if instance_id:
            refs.add(
                ARN.from_parts(
                    "connect",
                    f"instance/{instance_id}",
                    region=arn.region,
                    account_id=arn.account_id,
                    partition=arn.partition,
                )
            )

        return ResourceNode(
            logical_id=f"TransferDestination_{arn.resource_id}",
            service=self.service,
            cfn_type=self.cfn_type,
            properties=props,
            referenced_arns=refs,
            classification=NodeClassification.RESOURCE,
            arns={"Primary": arn},
        )


@register_resolver("connect:unknown")
class ConnectUnknownResolver(ConnectInstanceChild):
    """
    Fallback synthetic resolver for unexpected Connect ARN shapes to avoid
    emitting Unresolved nodes during deep discovery.
    """

    service = "connect"
    resource_type = "unknown"
    resource_name = "Unknown"
    cfn_type = None
    deployment_mode = "boto3"

    list_operation = None
    describe_operation = None
    id_fields: list[str] = []
    summary_list_path = None
    summary_arn_field = None

    def fetch_resource(self, arn: ARN):
        instance_id = arn.subresource_parent_id("instance")
        return {
            "Unknown": {
                "Arn": arn.raw,
                "InstanceId": instance_id,
                "Resource": arn.resource,
            }
        }

    def to_node(self, arn: ARN, raw: Mapping[str, object]):
        payload = raw.get("Unknown") if isinstance(raw, Mapping) else {}
        props = dict(payload) if isinstance(payload, Mapping) else {}
        props.setdefault("Arn", arn.raw)
        props.setdefault("Resource", arn.resource)

        refs: Set[ARN] = set()
        instance_id = arn.subresource_parent_id("instance")
        if instance_id:
            refs.add(
                ARN.from_parts(
                    "connect",
                    f"instance/{instance_id}",
                    region=arn.region,
                    account_id=arn.account_id,
                    partition=arn.partition,
                )
            )

        return ResourceNode(
            logical_id=f"ConnectUnknown_{arn.resource_id}",
            service=self.service,
            cfn_type=self.cfn_type,
            properties=props,
            referenced_arns=refs,
            classification=NodeClassification.RESOURCE,
            arns={"Primary": arn},
        )


@register_resolver("connect:agent-group")
class ConnectAgentGroupResolver(ConnectInstanceChild):
    """
    Synthetic resolver for agent-group ARNs (no native describe API).
    """

    service = "connect"
    resource_type = "agent-group"
    resource_name = "AgentGroup"
    cfn_type = None
    deployment_mode = "boto3"

    list_operation = None
    describe_operation = None
    id_fields: list[str] = []
    summary_list_path = None
    summary_arn_field = None

    def fetch_resource(self, arn: ARN):
        instance_id = arn.subresource_parent_id("instance")
        return {
            "AgentGroup": {
                "AgentGroupId": arn.resource_id,
                "InstanceId": instance_id,
                "Arn": arn.raw,
            }
        }

    def to_node(self, arn: ARN, raw: Mapping[str, object]):
        payload = raw.get("AgentGroup") if isinstance(raw, Mapping) else {}
        props = dict(payload) if isinstance(payload, Mapping) else {}
        props.setdefault("Arn", arn.raw)
        props.setdefault("AgentGroupId", arn.resource_id)

        refs: Set[ARN] = set()
        instance_id = arn.subresource_parent_id("instance")
        if instance_id:
            refs.add(
                ARN.from_parts(
                    "connect",
                    f"instance/{instance_id}",
                    region=arn.region,
                    account_id=arn.account_id,
                    partition=arn.partition,
                )
            )

        return ResourceNode(
            logical_id=f"AgentGroup_{arn.resource_id}",
            service=self.service,
            cfn_type=self.cfn_type,
            properties=props,
            referenced_arns=refs,
            classification=NodeClassification.RESOURCE,
            arns={"Primary": arn},
        )

