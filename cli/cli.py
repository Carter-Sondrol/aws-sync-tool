from __future__ import annotations
import argparse
import importlib
import pkgutil


def load_commands(subparsers):
    import cli.commands as commands_pkg

    for module_info in pkgutil.iter_modules(commands_pkg.__path__):
        module = importlib.import_module(f"cli.commands.{module_info.name}")
        if hasattr(module, "register"):
            module.register(subparsers)


def main():
    parser = argparse.ArgumentParser(
        prog="aws-graph",
        description="AWS Seed-Based Dependency Graph Tool",
    )

    parser.add_argument(
        "--profile",
        help="AWS profile to use (overrides default)",
    )

    parser.add_argument(
        "--region",
        help="AWS region override for session (resolvers still use ARN.region when appropriate)",
    )

    parser.add_argument(
        "--account",
        help="AWS account override (useful for graph remapping / cross-account sync)",
    )

    parser.add_argument(
        "--verbose",
        "-v",
        action="store_true",
        help="Enable verbose/debug output",
    )

    subparsers = parser.add_subparsers(
        title="commands",
        dest="command",
        required=True,
    )

    load_commands(subparsers)
    args = parser.parse_args()

    if args.verbose:
        import logging

        logging.basicConfig(
            level=logging.DEBUG,
            format="%(levelname)s %(name)s: %(message)s",
        )
    else:
        import logging

        logging.basicConfig(
            level=logging.INFO,
            format="%(message)s",
        )

    if hasattr(args, "handler"):
        return args.handler(args)
    parser.print_help()


if __name__ == "__main__":
    main()
