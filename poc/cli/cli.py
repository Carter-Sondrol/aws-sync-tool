from __future__ import annotations
import argparse
import importlib
import pkgutil
import logging

def load_commands(subparsers):
    import poc.cli.commands as commands_pkg

    for module_info in pkgutil.iter_modules(commands_pkg.__path__):
        module = importlib.import_module(f"cli.commands.{module_info.name}")
        if hasattr(module, "register"):
            module.register(subparsers)

def main():
    parser = argparse.ArgumentParser(
        prog="aws-graph",
        description="AWS Seed-Based Dependency Graph Tool",
    )

    parser.add_argument("--profile", help="AWS profile override")
    parser.add_argument("--region", help="AWS region override")
    parser.add_argument("--account", help="Target AWS account override")
    parser.add_argument(
        "--verbose", "-v",
        action="store_true",
        help="Enable verbose/debug output"
    )
    # Hidden arg used by VS Code debug launcher; accepted to avoid argparse errors
    parser.add_argument("--launcher-json", help=argparse.SUPPRESS)

    subparsers = parser.add_subparsers(
        title="commands",
        dest="command",
        required=True,
    )

    load_commands(subparsers)
    args = parser.parse_args()

    logging.basicConfig(
        level=logging.DEBUG if args.verbose else logging.INFO,
        format="%(levelname)s %(name)s: %(message)s" if args.verbose else "%(message)s",
    )

    # Make overrides globally accessible
    args._global_profile = args.profile
    args._global_region = args.region
    args._global_account = args.account

    if hasattr(args, "handler"):
        return args.handler(args)
    parser.print_help()

if __name__ == "__main__":
    main()
