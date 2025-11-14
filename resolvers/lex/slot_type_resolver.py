from __future__ import annotations

from typing import Set
from botocore.exceptions import ClientError
from mypy_boto3_lexv2_models import LexModelsV2Client
from mypy_boto3_lexv2_models.type_defs import DescribeSlotTypeResponseTypeDef

from resolvers.registry import register_resolver
from resolvers.lex.base_lex import BaseLexResolver
from graph.resource_node import ResourceNode
from utils.arn import ARN


@register_resolver("lex:slot-type")
class LexSlotTypeResolver(BaseLexResolver[LexModelsV2Client, DescribeSlotTypeResponseTypeDef]):
    resource_type = "slot-type"
    cfn_type = "AWS::Lex::SlotType"

    def fetch_resource(self, arn: ARN) -> DescribeSlotTypeResponseTypeDef:
        bot_id, slot_id = arn.resource_hierarchy()[1:]
        try:
            return self.client.describe_slot_type(  # type: ignore
                botId=bot_id[1],
                slotTypeId=slot_id[1],
                botVersion="DRAFT",
                localeId="en_US",
            )
        except ClientError:
            self.log.error("Failed to fetch Lex SlotType %s", arn, exc_info=True)
            raise

    def to_node(self, arn: ARN, raw: DescribeSlotTypeResponseTypeDef) -> ResourceNode:
        slot = raw.get("slotType", raw)

        props = {
            "slotTypeName": slot.get("slotTypeName"),
            "description": slot.get("description"),
            "valueSelectionSetting": slot.get("valueSelectionSetting"),
        }

        refs: Set[ARN] = set()

        node = self.make_node(
            arn,
            logical_id=f"LexSlotType{slot.get('slotTypeName', arn.resource_id)}",
            properties=props,
            metadata={"Source": "describe_slot_type", "EmbeddedReferenceCount": len(refs)},
        )

        return node
