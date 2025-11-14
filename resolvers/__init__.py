def register_all(registry):
    import resolvers as root_pkg
    import pkgutil, importlib, inspect
    from resolvers.base_resolver import BaseResolver

    for _, module_name, _ in pkgutil.walk_packages(root_pkg.__path__, prefix="resolvers."):
        module = importlib.import_module(module_name)

        for name, obj in inspect.getmembers(module, inspect.isclass):
            if not issubclass(obj, BaseResolver) or obj is BaseResolver:
                continue

            service = getattr(obj, "service", None)
            rtype = getattr(obj, "resource_type", None)

            if not service:
                continue

            if rtype:
                key = f"{service}:{rtype}"
            else:
                key = service

            registry.register(key, obj)
