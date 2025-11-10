from __future__ import annotations

import logging
import re
from typing import Any, Dict, Optional, Union, Iterable, cast, Set

from boto3 import Session
from botocore.exceptions import ClientError
from mypy_boto3_iam import IAMClient
from mypy_boto3_iam.type_defs import (
    GetRoleResponseTypeDef,
    GetUserResponseTypeDef,
    GetGroupResponseTypeDef,
    GetPolicyResponseTypeDef,
    GetPolicyVersionResponseTypeDef,
    GetInstanceProfileResponseTypeDef,
)

from resolvers.base import BaseResolver
from utils.arn import ARN, extract_dependencies
from graph.dependency_graph import ResourceNode

logger = logging.getLogger(__name__)

IAMResponse = (
    GetRoleResponseTypeDef
    | GetUserResponseTypeDef
    | GetGroupResponseTypeDef
    | GetPolicyResponseTypeDef
    | GetPolicyVersionResponseTypeDef
    | GetInstanceProfileResponseTypeDef
)


def _lid(prefix: str, name: str) -> str:
    """Sanitize a name into a stable, CFN-safe logical id suffix."""
    safe = re.sub(r"[^A-Za-z0-9]+", "_", name or "")
    return f"{prefix}{safe}"


class IAMResolver(BaseResolver[IAMClient, IAMResponse]):
    """Resolver for IAM Roles, Policies, InstanceProfiles, Users, and Groups."""

    service = "iam"

    # ------------------------------------------------------------------
    # Discovery
    # ------------------------------------------------------------------
    def list_resources(self) -> Iterable[ARN]:
        """Enumerate IAM ARNs for key resource types (role, policy, user, group, instance-profile)."""
        sts = self.session.client("sts")
        account_id = sts.get_caller_identity().get("Account", "")
        region = self.session.region_name or ""

        def safe_yield(fn_name: str, key: str, arn_fmt: str) -> Iterable[ARN]:
            """Wrapper that ignores paginator type literal warnings."""
            paginator = cast(Any, self.client).get_paginator(fn_name)
            for page in paginator.paginate():
                for item in page.get(key, []):
                    name = (
                        item.get("RoleName")
                        or item.get("UserName")
                        or item.get("GroupName")
                        or item.get("InstanceProfileName")
                        or ""
                    )
                    arn_str = item.get("Arn") or arn_fmt.format(
                        account_id=account_id, region=region, name=name
                    )
                    if arn_str and ARN.is_valid(arn_str):
                        yield ARN.parse_cached(arn_str)

        # NOTE: each of these returns AWS + customer entities interleaved
        yield from safe_yield("list_roles", "Roles", "arn:aws:iam::{account_id}:role/{name}")
        yield from safe_yield("list_policies", "Policies", "arn:aws:iam::{account_id}:policy/{name}")
        yield from safe_yield("list_users", "Users", "arn:aws:iam::{account_id}:user/{name}")
        yield from safe_yield("list_groups", "Groups", "arn:aws:iam::{account_id}:group/{name}")
        yield from safe_yield(
            "list_instance_profiles", "InstanceProfiles", "arn:aws:iam::{account_id}:instance-profile/{name}"
        )

        # ⚠️ Removed: a second manual iterate over list_roles that duplicated entries.

    # ------------------------------------------------------------------
    # Fetch
    # ------------------------------------------------------------------
    def fetch_resource(self, arn: ARN) -> IAMResponse:
        """Fetch IAM entity metadata depending on ARN type."""
        try:
            rtype = arn.resource_type
            if rtype == "role":
                return self.client.get_role(RoleName=arn.resource_id)
            elif rtype == "policy":
                return self.client.get_policy(PolicyArn=str(arn))
            elif rtype == "user":
                return self.client.get_user(UserName=arn.resource_id)
            elif rtype == "group":
                return self.client.get_group(GroupName=arn.resource_id)
            elif rtype == "instance-profile":
                return self.client.get_instance_profile(InstanceProfileName=arn.resource_id)
            elif rtype == "policy-version":
                # arn resource looks like "policy/<name>:<versionId>"
                policy_arn_part, version_id = arn.resource.split(":", 1)
                policy_arn = f"arn:{arn.partition}:{arn.service}:{arn.region}:{arn.account_id}:{policy_arn_part}"
                return self.client.get_policy_version(PolicyArn=policy_arn, VersionId=version_id)
            else:
                self.log.warning("Unknown IAM resource type for %s", arn)
                return cast(IAMResponse, {"UnknownArn": str(arn)})
        except ClientError as e:
            self.log.error("Failed to fetch %s: %s", arn, e)
            return cast(IAMResponse, {"Error": str(e), "Arn": str(arn)})

    # ------------------------------------------------------------------
    # Convert raw data to ResourceNode
    # ------------------------------------------------------------------
    def to_node(self, arn: ARN, raw: IAMResponse) -> ResourceNode:
        """Convert IAM boto3 response into a ResourceNode."""
        rtype = arn.resource_type
        if rtype == "role":
            return self._to_role_node(arn, cast(GetRoleResponseTypeDef, raw))
        elif rtype == "policy":
            return self._to_policy_node(arn, cast(GetPolicyResponseTypeDef, raw))
        elif rtype == "instance-profile":
            return self._to_instance_profile_node(arn, cast(GetInstanceProfileResponseTypeDef, raw))
        elif rtype == "user":
            return self._to_user_node(arn, cast(GetUserResponseTypeDef, raw))
        elif rtype == "group":
            return self._to_group_node(arn, cast(GetGroupResponseTypeDef, raw))
        else:
            # Cast to dict to satisfy type checker
            return self._to_unknown_node(arn, cast(Dict[str, Any], raw))

    # ------------------------------------------------------------------
    # Role node
    # ------------------------------------------------------------------
    def _to_role_node(self, arn: ARN, raw: GetRoleResponseTypeDef) -> ResourceNode:
        role = raw.get("Role", {}) or {}
        role_name = role.get("RoleName", "") or arn.resource_id
        arn_str = role.get("Arn", str(arn))
        refs: Set[ARN] = set()

        # Robust SLR / AWS-managed detection:
        is_service_linked = ("/aws-service-role/" in arn_str.lower()) or role_name.startswith("AWSServiceRoleFor")
        # Some projects add ARN helpers like arn.is_aws_managed(); if available, keep it.
        try:
            is_aws_managed = arn.is_aws_managed() and not is_service_linked  # type: ignore[attr-defined]
        except AttributeError:
            # Fallback heuristic: AWS managed roles are rare; default to False unless explicitly detected.
            is_aws_managed = False

        # Only extract dependencies for customer-managed roles
        if not (is_aws_managed or is_service_linked):
            assume_doc = role.get("AssumeRolePolicyDocument", {})
            refs |= extract_dependencies(assume_doc)

            paginator = self.client.get_paginator("list_attached_role_policies")
            for page in paginator.paginate(RoleName=role_name):
                for p in page.get("AttachedPolicies", []):
                    parsed = ARN.try_parse(p.get("PolicyArn") or "")
                    if parsed:
                        refs.add(parsed)

        props = {
            "RoleName": role_name,
            "Path": role.get("Path"),
            "Description": role.get("Description"),
            "ManagedBy": ("Service" if is_service_linked else "AWS" if is_aws_managed else "Customer"),
            # Keep assume doc only for customer-managed; for SLR/managed we don't need to serialize it.
            "AssumeRolePolicyDocument": None if (is_service_linked or is_aws_managed) else role.get("AssumeRolePolicyDocument"),
        }

        if is_service_linked:
            metadata = {"ServiceLinked": True, "ReferenceOnly": True}
            reference_only = True     # ← CRITICAL: SLRs are external/implicit
        elif is_aws_managed:
            metadata = {"AWSManaged": True}
            reference_only = True
        else:
            metadata = {"AWSManaged": False}
            reference_only = False

        return self.make_node(
            arn,
            logical_id=_lid("IAMRole", role_name),
            properties=props,
            metadata=metadata,
            reference_only=reference_only,
        )

    # ------------------------------------------------------------------
    # Policy node
    # ------------------------------------------------------------------
    def _to_policy_node(self, arn: ARN, raw: GetPolicyResponseTypeDef) -> ResourceNode:
        pol = raw.get("Policy", {}) or {}
        # Prefer ARN helper if present
        try:
            aws_managed = arn.is_aws_managed()  # type: ignore[attr-defined]
        except AttributeError:
            aws_managed = bool(str(arn).startswith("arn:aws:iam::aws:policy/"))

        props = {
            "PolicyName": pol.get("PolicyName"),
            "Description": pol.get("Description"),
            "AttachmentCount": pol.get("AttachmentCount"),
            "ManagedBy": "AWS" if aws_managed else "Customer",
        }

        return self.make_node(
            arn,
            logical_id=_lid("IAMPolicy", pol.get("PolicyName") or arn.resource_id),
            properties=props,
            metadata={"AWSManaged": aws_managed},
            reference_only=aws_managed,  # AWS-managed policies are referenced by ARN only
        )

    # ------------------------------------------------------------------
    # InstanceProfile node
    # ------------------------------------------------------------------
    def _to_instance_profile_node(self, arn: ARN, raw: GetInstanceProfileResponseTypeDef) -> ResourceNode:
        profile = raw.get("InstanceProfile", {}) or {}
        refs: Set[ARN] = set()
        for r in profile.get("Roles", []):
            parsed = ARN.try_parse(r.get("Arn"))
            if parsed:
                refs.add(parsed)

        props = {
            "InstanceProfileName": profile.get("InstanceProfileName"),
            "Path": profile.get("Path"),
            "Roles": [r.get("Arn") for r in profile.get("Roles", [])],
        }

        return self.make_node(
            arn,
            logical_id=_lid("IAMInstanceProfile", profile.get("InstanceProfileName") or arn.resource_id),
            properties=props,
            metadata={"LinkedRoles": len(refs)},
        )

    # ------------------------------------------------------------------
    # User node
    # ------------------------------------------------------------------
    def _to_user_node(self, arn: ARN, raw: GetUserResponseTypeDef) -> ResourceNode:
        user = raw.get("User", {}) or {}
        refs = extract_dependencies(user)
        props = {
            "UserName": user.get("UserName"),
            "Path": user.get("Path"),
        }

        return self.make_node(
            arn,
            logical_id=_lid("IAMUser", user.get("UserName") or arn.resource_id),
            properties=props,
            metadata={"Dependencies": len(refs)},
        )

    # ------------------------------------------------------------------
    # Group node
    # ------------------------------------------------------------------
    def _to_group_node(self, arn: ARN, raw: GetGroupResponseTypeDef) -> ResourceNode:
        group = raw.get("Group", {}) or {}
        refs = extract_dependencies(group)
        props = {
            "GroupName": group.get("GroupName"),
            "Path": group.get("Path"),
        }

        return self.make_node(
            arn,
            logical_id=_lid("IAMGroup", group.get("GroupName") or arn.resource_id),
            properties=props,
            metadata={"Dependencies": len(refs)},
        )

    # ------------------------------------------------------------------
    # Fallback / Unknown node
    # ------------------------------------------------------------------
    def _to_unknown_node(self, arn: ARN, raw: Dict[str, Any]) -> ResourceNode:
        return self.make_node(
            arn,
            logical_id=_lid("IAMUnknown", arn.resource_id),
            properties={"Raw": raw},
            metadata={"Unresolved": True},
            reference_only=True,
        )
