from __future__ import annotations
import argparse
import logging
import argcomplete

def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(
        prog="firstfire-sync",
        description="Sync AWS resources and export to CDK/CloudFormation."
    )

    # AWS / mapping table
    p.add_argument("--profile", help="AWS profile name")
    p.add_argument("--role", help="Optional IAM Role ARN to assume")
    p.add_argument("--region", help="AWS region to use (default: autodetect)")

    # New: single seed ARN option
    p.add_argument("--seed-arn", help="Optional single ARN to use as seed instead of mapping table")
    p.add_argument("--mapping-table", help="Name of DynamoDB mapping table")

    # Output options
    p.add_argument("--output", "-o", help="Write resulting graph JSON to file")
    p.add_argument("--export-csv", help="Write updated mapping CSV (default: ./resource_mapping_updated.csv)")
    p.add_argument("--export", choices=["cfn", "cdk", "both"], help="Export format: CloudFormation, CDK, or both")

    # CDK options
    p.add_argument("--cdk-out", default="output/cdk_app", help="Directory to write generated CDK app")
    p.add_argument("--cdk-stack-name", default="FirstFireAutoStack", help="Name of generated CDK stack")
    p.add_argument("--cdk-app-name", default="FirstFireCDKApp", help="Name of generated CDK app")

    # Misc
    p.add_argument("--visualize", "-V", action="store_true", help="Open interactive visualization")
    p.add_argument("--debug-links", action="store_true", help="Show inferred cross-service links")
    p.add_argument("--verbose", "-v", action="count", default=0, help="Increase logging verbosity")
    p.add_argument("--install-completion", choices=["bash", "zsh", "fish"], help="Install shell completions")

    return p

def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = build_parser()
    try:
        argcomplete.autocomplete(parser)
    except Exception:
        pass
    return parser.parse_args(argv)


def configure_logging(verbosity: int):
    level = logging.WARNING
    if verbosity == 1:
        level = logging.INFO
    elif verbosity >= 2:
        level = logging.DEBUG
    logging.basicConfig(level=level, format="[%(levelname)s] %(message)s")
