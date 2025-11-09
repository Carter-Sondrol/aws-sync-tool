from __future__ import annotations

import logging
from typing import Any, Dict, Optional, Union, cast

from boto3 import Session
from mypy_boto3_iam import IAMClient
from mypy_boto3_iam.type_defs import (
    GetRoleResponseTypeDef,
    GetUserResponseTypeDef,
    GetGroupResponseTypeDef,
    GetPolicyResponseTypeDef,
    GetPolicyVersionResponseTypeDef,
    GetInstanceProfileResponseTypeDef,
)
from botocore.exceptions import ClientError

from resolvers.base import BaseResolver
from utils.arn import ARN, extract_dependencies
from graph.dependency_graph import ResourceNode

logger = logging.getLogger(__name__)

IAMResponse = Union[
    GetRoleResponseTypeDef,
    GetUserResponseTypeDef,
    GetGroupResponseTypeDef,
    GetPolicyResponseTypeDef,
    GetPolicyVersionResponseTypeDef,
    GetInstanceProfileResponseTypeDef,
]


class IAMResolver(BaseResolver[IAMClient, IAMResponse]):
    """Resolver for AWS IAM resources (Roles, Policies, InstanceProfiles, Users, Groups)."""

    # ------------------------------------------------------------------
    # Fetch
    # ------------------------------------------------------------------
    def fetch(self, arn: ARN) -> IAMResponse:
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
                return self.client.get_instance_profile(
                    InstanceProfileName=arn.resource_id
                )
            elif rtype == "policy-version":
                policy_arn, version_id = arn.resource.split(":", 1)
                return self.client.get_policy_version(
                    PolicyArn=f"arn:{arn.partition}:{arn.service}:{arn.region}:{arn.account_id}:{policy_arn}",
                    VersionId=version_id,
                )
            else:
                logger.warning(f"Unknown IAM resource type for ARN: {arn}")
                return {"UnknownArn": str(arn)}  # type: ignore
        except ClientError as e:
            logger.error(f"Failed to fetch {arn}: {e}")
            raise

    # ------------------------------------------------------------------
    # Parse
    # ------------------------------------------------------------------
    def parse(self, arn: ARN, raw: IAMResponse) -> ResourceNode[dict[str, Any]]:
        """Convert an IAM boto3 response into a ResourceNode."""
        rtype = arn.resource_type
        if rtype == "role":
            return self._parse_role(arn, cast(GetRoleResponseTypeDef, raw))
        elif rtype == "policy":
            return self._parse_policy(arn, cast(GetPolicyResponseTypeDef, raw))
        elif rtype == "instance-profile":
            return self._parse_instance_profile(
                arn, cast(GetInstanceProfileResponseTypeDef, raw)
            )
        elif rtype == "user":
            return self._parse_user(arn, cast(GetUserResponseTypeDef, raw))
        elif rtype == "group":
            return self._parse_group(arn, cast(GetGroupResponseTypeDef, raw))
        else:
            return self._parse_unknown(arn, raw)

    # ------------------------------------------------------------------
    # Roles
    # ------------------------------------------------------------------
    def _parse_role(self, arn: ARN, raw: GetRoleResponseTypeDef) -> ResourceNode[dict[str, Any]]:
        role = raw.get("Role", {})
        refs: set[ARN] = set()

        role_name = role.get("RoleName", "")
        arn_str = role.get("Arn", "")

        # ------------------------------------------------------------------
        # Classify role
        # ------------------------------------------------------------------
        is_service_linked = (
            "/aws-service-role/" in arn_str.lower()
            or role_name.startswith("AWSServiceRoleFor")
        )
        is_aws_managed = arn.is_aws_managed() and not is_service_linked

        # ------------------------------------------------------------------
        # Only collect references for customer-managed
        # ------------------------------------------------------------------
        if not (is_aws_managed or is_service_linked):
            assume_doc = role.get("AssumeRolePolicyDocument", {})
            refs |= extract_dependencies(assume_doc)

            paginator = self.client.get_paginator("list_attached_role_policies")
            for page in paginator.paginate(RoleName=role_name):
                for p in page.get("AttachedPolicies", []):
                    parsed = ARN.try_parse(p.get("PolicyArn"))
                    if parsed:
                        refs.add(parsed)

        props = {
            "RoleName": role_name,
            "Arn": arn_str,
            "Path": role.get("Path"),
            "Description": role.get("Description"),
            "ManagedBy": (
                "Service" if is_service_linked else
                "AWS" if is_aws_managed else
                "Customer"
            ),
            "AssumeRolePolicyDocument": role.get("AssumeRolePolicyDocument"),
        }

        # ------------------------------------------------------------------
        # Node classification
        # ------------------------------------------------------------------
        if is_service_linked:
            cfn_type = "AWS::IAM::ServiceLinkedRole"
            metadata = {"implicit_aws_managed": True, "service_linked": True}
            reference_only = False
        elif is_aws_managed:
            cfn_type = "AWS::IAM::Role"
            metadata = {"aws_managed": True}
            reference_only = True
        else:
            cfn_type = "AWS::IAM::Role"
            metadata = {"aws_managed": False}
            reference_only = False

        return ResourceNode(
            logical_id=f"IAMRole{role_name}",
            service="iam",
            cfn_type=cfn_type,
            properties=props,
            referenced_arns=refs,
            arns={"Role": arn},
            metadata=metadata,
            reference_only=reference_only,
        )

    # ------------------------------------------------------------------
    # Managed Policies
    # ------------------------------------------------------------------
    def _parse_policy(
        self, arn: ARN, raw: GetPolicyResponseTypeDef
    ) -> ResourceNode[dict[str, Any]]:
        pol = raw.get("Policy", {})
        aws_managed = arn.is_aws_managed()

        props = {
            "PolicyName": pol.get("PolicyName"),
            "Arn": pol.get("Arn"),
            "ManagedBy": "AWS" if aws_managed else "Customer",
            "Description": pol.get("Description"),
            "AttachmentCount": pol.get("AttachmentCount"),
        }

        return ResourceNode(
            logical_id=f"IAMPolicy{pol.get('PolicyName')}",
            service="iam",
            cfn_type="AWS::IAM::ManagedPolicy",
            properties=props,
            referenced_arns=set(),
            arns={"Policy": arn},
            metadata={"aws_managed": aws_managed},
            reference_only=aws_managed,
        )

    # ------------------------------------------------------------------
    # Instance Profiles
    # ------------------------------------------------------------------
    def _parse_instance_profile(
        self, arn: ARN, raw: GetInstanceProfileResponseTypeDef
    ) -> ResourceNode[dict[str, Any]]:
        profile = raw.get("InstanceProfile", {})
        refs: set[ARN] = set()
        for r in profile.get("Roles", []):
            role_arn = r.get("Arn")
            if role_arn:
                parsed = ARN.try_parse(role_arn)
                if parsed:
                    refs.add(parsed)
        props = {
            "InstanceProfileName": profile.get("InstanceProfileName"),
            "Arn": profile.get("Arn"),
            "Path": profile.get("Path"),
            "Roles": [r.get("Arn") for r in profile.get("Roles", [])],
        }
        return ResourceNode(
            logical_id=f"IAMInstanceProfile{profile.get('InstanceProfileName')}",
            service="iam",
            cfn_type="AWS::IAM::InstanceProfile",
            properties=props,
            referenced_arns=refs,
            arns={"InstanceProfile": arn},
        )

    # ------------------------------------------------------------------
    # Users
    # ------------------------------------------------------------------
    def _parse_user(
        self, arn: ARN, raw: GetUserResponseTypeDef
    ) -> ResourceNode[dict[str, Any]]:
        user = raw.get("User", {})
        refs: set[ARN] = extract_dependencies(user)
        props = {
            "UserName": user.get("UserName"),
            "Arn": user.get("Arn"),
            "Path": user.get("Path"),
        }
        return ResourceNode(
            logical_id=f"IAMUser{user.get('UserName')}",
            service="iam",
            cfn_type="AWS::IAM::User",
            properties=props,
            referenced_arns=refs,
            arns={"User": arn},
        )

    # ------------------------------------------------------------------
    # Groups
    # ------------------------------------------------------------------
    def _parse_group(
        self, arn: ARN, raw: GetGroupResponseTypeDef
    ) -> ResourceNode[dict[str, Any]]:
        group = raw.get("Group", {})
        refs: set[ARN] = extract_dependencies(group)
        props = {
            "GroupName": group.get("GroupName"),
            "Arn": group.get("Arn"),
            "Path": group.get("Path"),
        }
        return ResourceNode(
            logical_id=f"IAMGroup{group.get('GroupName')}",
            service="iam",
            cfn_type="AWS::IAM::Group",
            properties=props,
            referenced_arns=refs,
            arns={"Group": arn},
        )

    # ------------------------------------------------------------------
    # Unknown
    # ------------------------------------------------------------------
    def _parse_unknown(
        self, arn: ARN, raw: dict[str, Any]
    ) -> ResourceNode[dict[str, Any]]:
        return ResourceNode(
            logical_id=f"IAMUnknown{arn.resource_id}",
            service="iam",
            cfn_type="AWS::IAM::Unknown",
            properties={"Raw": raw},
            referenced_arns=set(),
            arns={"Unknown": arn},
            metadata={"unresolved": True},
            reference_only=True,
        )
