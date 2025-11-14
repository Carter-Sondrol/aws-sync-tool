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


@register_resolver("iam:policy")
class IAMPolicyResolver(BaseResolver[IAMClient, GetPolicyResponseTypeDef]):
    service = "iam"
    resource_type = "policy"
    cfn_type = "AWS::IAM::ManagedPolicy"

    # -------------------------------------------------------------
    def fetch_resource(self, arn: ARN) -> GetPolicyResponseTypeDef:
        """
        ARN: arn:aws:iam::aws:policy/... or arn:aws:iam::<acct>:policy/...
        """
        try:
            return self.client.get_policy(PolicyArn=str(arn))
        except ClientError:
            self.log.error("Failed to fetch IAM Policy %s", arn, exc_info=True)
            raise

    # -------------------------------------------------------------
    def to_node(self, arn: ARN, raw: GetPolicyResponseTypeDef) -> ResourceNode:
        meta = raw.get("Policy", {})
        policy_name = meta.get("PolicyName", arn.resource_name())
        refs: Set[ARN] = set()

        # Determine if AWS-managed (global) policy
        is_aws_managed = arn.is_aws_managed()

        # ------------------------------------------------------------------
        # 1. AWS-managed policies → reference-only, minimal properties
        # ------------------------------------------------------------------
        if is_aws_managed:
            logical = f"IAMPolicy{policy_name}"

            return self.make_node(
                arn,
                logical_id=logical,
                properties={
                    "PolicyName": policy_name,
                    "Arn": str(arn),
                },
                metadata={
                    "Source": "get_policy",
                    "aws_managed": True,
                },
                reference_only=True,
            )

        # ------------------------------------------------------------------
        # 2. Customer-managed policies → fetch full default version
        # ------------------------------------------------------------------
        version_id = meta.get("DefaultVersionId")
        doc = {}

        if version_id:
            try:
                version: GetPolicyVersionResponseTypeDef = (
                    self.client.get_policy_version(
                        PolicyArn=str(arn),
                        VersionId=version_id,
                    )
                )
                doc = version.get("PolicyVersion", {}).get("Document", {})
            except ClientError:
                self.log.warning(
                    "Failed to fetch default version %s for policy %s",
                    version_id,
                    arn,
                )

        props = {
            "PolicyName": policy_name,
            "Description": meta.get("Description"),
            "DefaultVersionId": version_id,
            "PolicyDocument": doc,
            "Arn": str(arn),
        }

        # Extract referenced ARNs inside policy document
        auto_refs = extract_dependencies(props)
        refs |= auto_refs

        logical = f"IAMPolicy{policy_name}"

        node = self.make_node(
            arn,
            logical_id=logical,
            properties=props,
            reference_only=False,
            metadata={"Source": "get_policy"},
        )

        node.referenced_arns |= refs
        return node
