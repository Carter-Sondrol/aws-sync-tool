from __future__ import annotations
import logging
from typing import Any, Dict, Set
from mypy_boto3_lexv2_models.type_defs import DescribeSlotTypeResponseTypeDef
from resolvers.lex.base_lex import BaseLexSubResolver
from utils.arn import ARN, extract_dependencies
from graph.dependency_graph import ResourceNode

logger = logging.getLogger(__name__)

class LexSlotTypeResolver(BaseLexSubResolver[DescribeSlotTypeResponseTypeDef]):
    """Resolves Lex V2 slot types."""

    resource_type = "slot-type"
    cfn_type = "AWS::Lex::SlotType"

    def fetch(self, arn: ARN) -> DescribeSlotTypeResponseTypeDef:
        parts = arn.resource_parts
        bot_id, locale_id, slot_type_id = parts[1], parts[3], parts[-1]
        return self.client.describe_slot_type(botId=bot_id, botVersion="DRAFT", localeId=locale_id, slotTypeId=slot_type_id)

    def parse(self, arn: ARN, raw: DescribeSlotTypeResponseTypeDef) -> ResourceNode[dict[str, Any]]:
        slot_type = raw.get("slotType", raw)
        refs: Set[ARN] = extract_dependencies(slot_type)
        props: Dict[str, Any] = {
            "SlotTypeName": slot_type.get("slotTypeName"),
            "Description": slot_type.get("description"),
            "SlotTypeValues": slot_type.get("slotTypeValues"),
            "ParentSlotTypeSignature": slot_type.get("parentSlotTypeSignature"),
        }
        return ResourceNode(
            logical_id=f"LexSlotType{slot_type.get('slotTypeName', arn.resource_id)}",
            service="lex",
            cfn_type=self.cfn_type,
            properties=props,
            referenced_arns=refs,
            arns={"SlotType": arn},
            metadata={"CreationDateTime": slot_type.get("creationDateTime")},
        )
