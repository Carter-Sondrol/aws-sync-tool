import logging


def register_all(registry):
    import importlib
    import inspect
    import pkgutil

    import resolvers as root_pkg
    from resolvers.base_resolver import BaseResolver

    for _, module_name, _ in pkgutil.walk_packages(
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

            # Every AWS resource resolver MUST declare `resource_type`
            # We skip classes without one — avoids accidental fallback resolvers.
            if not rtype:
                logging.debug(f"[Registry] Skipping resolver {obj.__name__}: no resource_type")
                continue

            key = f"{service}:{rtype}"
            registry.register(key, obj)

