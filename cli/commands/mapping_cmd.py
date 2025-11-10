from __future__ import annotations
import logging
from pathlib import Path
from cli.mapping_utils import load_mapping_table, export_mapping_csv

logger = logging.getLogger(__name__)


def run(ctx, args) -> int:
    """Manage mapping table utilities (e.g., export to CSV)."""
    match args.action:
        case "export-csv":
            store = load_mapping_table(ctx.session, args.table)
            out_path = Path(args.out)
            export_mapping_csv(store, out_path)
            logger.info("Mapping CSV written to %s", out_path)
            return 0
        case _:
            logger.error("Unknown mapping action: %s", args.action)
            return 1
