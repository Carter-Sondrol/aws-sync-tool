from __future__ import annotations
from ctypes import cast
from typing import Any, Set, Dict

from botocore.exceptions import ClientError
from mypy_boto3_iam import IAMClient
from mypy_boto3_iam.type_defs import (
    GetRoleResponseTypeDef,
    GetRolePolicyResponseTypeDef,
    GetPolicyResponseTypeDef,
    GetPolicyVersionResponseTypeDef,
    ListAttachedRolePoliciesResponseTypeDef,
    ListRolePoliciesResponseTypeDef,
)

from resolvers.base_resolver import BaseResolver
from resolvers.registry import register_resolver
from graph.resource_node import ResourceNode
from utils.arn import ARN
from utils.arn import extract_dependencies


@register_resolver("iam:role")
class IAMRoleResolver(BaseResolver[IAMClient, GetRoleResponseTypeDef]):
    service = "iam"
    resource_type = "role"
    cfn_type = "AWS::IAM::Role"

    # ---------------------------------------------------------------
    def fetch_resource(self, arn: ARN) -> GetRoleResponseTypeDef:
        name = arn.resource_name()
        try:
            return self.client.get_role(RoleName=name)
        except ClientError:
            self.log.error("Failed to fetch IAM Role %s", arn, exc_info=True)
            raise

    # ---------------------------------------------------------------
    def to_node(self, arn: ARN, raw: GetRoleResponseTypeDef) -> ResourceNode:
        role = raw.get("Role", {})
        role_name = role.get("RoleName")
        refs: Set[ARN] = set()

        # ------------------------------------------------------------------
        # 1. Handle AWS-managed/service-linked IAM roles
        # ------------------------------------------------------------------
        aws_managed = arn.is_aws_managed_like()
        if aws_managed:
            return self.make_node(
                arn,
                logical_id=f"IAMRole{role_name}",
                properties={
                    "RoleName": role_name,
                    "Arn": role.get("Arn"),
                },
                metadata={
                    "Source": "get_role",
                    "aws_managed": True,
                },
                reference_only=True,
            )

        # ------------------------------------------------------------------
        # 2. Inline policies (customer-managed roles only)
        # ------------------------------------------------------------------
        inline_policy_docs: Dict[str, Any] = {}
        try:
            inline_pols = self.client.list_role_policies(RoleName=role_name)
            for pname in inline_pols.get("PolicyNames", []):
                try:
                    pol: GetRolePolicyResponseTypeDef = self.client.get_role_policy(
                        RoleName=role_name, PolicyName=pname
                    )
                    inline_policy_docs[pname] = pol.get("PolicyDocument", {})
                except ClientError:
                    inline_policy_docs[pname] = {}
        except ClientError:
            self.log.warning(f"Failed to fetch inline policies for IAM Role {role}")

        # ------------------------------------------------------------------
        # 3. Attached managed policies
        # ------------------------------------------------------------------
        try:
            attached = self.client.list_attached_role_policies(RoleName=role_name)
            for apol in attached.get("AttachedPolicies", []):
                arn_str = apol.get("PolicyArn")
                if arn_str:
                    try:
                        refs.add(ARN.parse_cached(arn_str))
                    except Exception:
                        pass
        except ClientError:
            self.log.warning(f"Failed to fetch attached policies for IAM Role {role}")
            attached = {"AttachedPolicies": []}

        # ------------------------------------------------------------------
        # 4. Build full properties for customer-managed IAM roles
        # ------------------------------------------------------------------
        props = {
            "RoleName": role_name,
            "Path": role.get("Path"),
            "Description": role.get("Description"),
            "MaxSessionDuration": role.get("MaxSessionDuration"),
            "AssumeRolePolicyDocument": role.get("AssumeRolePolicyDocument", {}),
            "InlinePolicies": inline_policy_docs,
            "AttachedPolicies": attached.get("AttachedPolicies", []),
            "Arn": role.get("Arn"),
        }

        # Extract referenced ARNs from assume role / inline docs
        auto_refs = extract_dependencies(props)
        refs |= auto_refs

        logical_id = f"IAMRole{role_name}"

        node = self.make_node(
            arn,
            logical_id=logical_id,
            properties=props,
            metadata={
                "Source": "get_role",
                "InlinePolicyCount": len(inline_policy_docs),
                "AttachedPolicyCount": len(attached.get("AttachedPolicies", [])),
            },
        )
        node.referenced_arns |= refs
        return node
