import logging


def register_all(registry):
    """
    Register all resolvers generated under the resolvers package.
    Mirrors the behavior of resolvers.register_all but scoped to this
    experimental set of metadata-driven resolvers.
    """
    import importlib
    import inspect
    import pkgutil

    import resolvers as root_pkg
    from resolvers.base_resolver import BaseResolver

    for _, module_name, _ in pkgutil.iter_modules(
        root_pkg.__path__, prefix="resolvers."
    ):
        module = importlib.import_module(module_name)

        for name, obj in inspect.getmembers(module, inspect.isclass):
            if not issubclass(obj, BaseResolver) or obj is BaseResolver:
                continue

            service = getattr(obj, "service", None)
            rtype = getattr(obj, "resource_type", None)

            if not service:
                continue

            if not rtype:
                logging.debug(f"[Registry] Skipping resolver {obj.__name__}: no resource_type")
                continue

            key = f"{service}:{rtype}"
            registry.register(key, obj)
