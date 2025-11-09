import boto3
import csv
import logging
from pathlib import Path
from utils.arn import ARN
from utils.mapping_store import MappingRecord, MappingStore

logger = logging.getLogger(__name__)

def load_mapping_table(session: boto3.Session, table_name: str) -> MappingStore:
    dynamodb = session.client("dynamodb")
    paginator = dynamodb.get_paginator("scan")
    store = MappingStore()

    for page in paginator.paginate(TableName=table_name):
        for item in page.get("Items", []):
            logical_id = (item.get("LogicalId", {}) or item.get("Key", {})).get("S")
            if not logical_id or logical_id.startswith("RESOURCE"):
                continue

            account_map = (item.get("AccountMap", {}) or item.get("Values", {})).get("M", {})
            metadata = {
                k: v.get("S") or v.get("N") or str(v)
                for k, v in item.get("Metadata", {}).get("M", {}).items()
            }

            for account_id, arn_entry in account_map.items():
                arn_str = arn_entry.get("S")
                if not arn_str:
                    continue
                arn_obj = ARN(arn_str)
                rec = MappingRecord(
                    logical_id=logical_id,
                    service=arn_obj.service,
                    cfn_type=metadata.get("CFNType", "Unknown"),
                    properties={},
                    referenced_arns=set(),
                    arns={"Primary": arn_obj},
                    metadata=metadata,
                    reference_only=False,
                    account_id=account_id,
                )
                store.put(rec)
    logger.info("Loaded %d logical IDs from mapping table %s", len(store._by_logical), table_name)
    return store


def export_mapping_csv(store: MappingStore, out_path: Path):
    all_accounts = sorted({r.account_id for r in store.iter_all()})
    fieldnames = ["LogicalId"] + all_accounts
    rows = []

    for lid, per_acct in store._by_logical.items():
        row = {"LogicalId": lid}
        for acct in all_accounts:
            rec = per_acct.get(acct)
            if rec:
                row[acct] = str(list(rec.arns.values())[0])
        rows.append(row)

    out_path.parent.mkdir(parents=True, exist_ok=True)
    with open(out_path, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)
    logger.info("Mapping CSV written to %s", out_path)
