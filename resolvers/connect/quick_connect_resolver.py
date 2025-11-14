from __future__ import annotations
from typing import Set
from botocore.exceptions import ClientError
from mypy_boto3_connect import ConnectClient
from mypy_boto3_connect.type_defs import DescribeQuickConnectResponseTypeDef

from resolvers.registry import register_resolver
from resolvers.connect.base_connect import BaseConnectResolver
from graph.resource_node import ResourceNode
from utils.arn import ARN


@register_resolver("connect:quick-connect")
class QuickConnectResolver(BaseConnectResolver[ConnectClient, DescribeQuickConnectResponseTypeDef]):
    resource_type = "quick-connect"
    cfn_type = "AWS::Connect::QuickConnect"

    def fetch_resource(self, arn: ARN) -> DescribeQuickConnectResponseTypeDef:
        self.ensure_instance_id(arn)
        sub_id = arn.subresource_id()
        try:
            if not self.instance_id or not sub_id:
                raise ValueError(f"Invalid ARN {arn}")
            return self.client.describe_quick_connect(
                InstanceId=self.instance_id,
                QuickConnectId=sub_id,
            )
        except ClientError:
            self.log.error("Failed to fetch %s", arn, exc_info=True)
            raise

    def to_node(self, arn: ARN, raw: DescribeQuickConnectResponseTypeDef) -> ResourceNode:
        qc = raw.get("QuickConnect", {}) or {}
        cfg = qc.get("QuickConnectConfig", {}) or {}
        refs: Set[ARN] = set()

        inst_arn = qc.get("InstanceArn") or self.instance_arn
        if inst_arn:
            refs.add(ARN.parse_cached(inst_arn))
        
        # QueueConfig → QueueArn
        queue_cfg = cfg.get("QueueConfig") or {}
        queue_arn = queue_cfg.get("QueueArn")
        if queue_arn and ARN.is_valid(queue_arn):
            refs.add(ARN.parse_cached(queue_arn))

        # ContactFlowConfig → ContactFlowArn
        flow_cfg = cfg.get("ContactFlowConfig") or {}
        flow_arn = flow_cfg.get("ContactFlowArn")
        if flow_arn and ARN.is_valid(flow_arn):
            refs.add(ARN.parse_cached(flow_arn))

        props = {
            "Name": qc.get("Name"),
            "Description": qc.get("Description"),
            "QuickConnectConfig": cfg,
            "InstanceArn": inst_arn,
            "Tags": qc.get("Tags", {}),
        }

        node = self.make_node(
            arn,
            logical_id=f"ConnectQuickConnect{self.make_logical_id(qc.get('Name'))}",
            properties=props,
            metadata={"Source": "describe_quick_connect", "EmbeddedReferenceCount": len(refs)},
        )
        node.referenced_arns |= refs
        return node
