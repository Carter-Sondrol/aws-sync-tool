import type { ResourceResolver } from './resolver-types.js';

const registry = new Map<string, ResourceResolver>();

export function registerResolver(name: string, resolver: ResourceResolver): void {
  if (registry.has(name)) {
    throw new Error(`Resolver '${name}' already registered.`);
  }
  registry.set(name, resolver);
}

export function getResolver(name: string): ResourceResolver | undefined {
  return registry.get(name);
}

export function getAllResolvers(): Map<string, ResourceResolver> {
  return new Map(registry);
}

export function hasResolver(name: string): boolean {
  return registry.has(name);
}

export function getResolversByService(service: string): Map<string, ResourceResolver> {
  const result = new Map<string, ResourceResolver>();
  for (const [key, resolver] of registry) {
    if (key.startsWith(service + ':')) {
      result.set(key, resolver);
    }
  }
  return result;
}

export function getAllServices(): string[] {
  const services = new Set<string>();
  for (const key of registry.keys()) {
    const svc = key.split(':')[0];
    services.add(svc);
  }
  return Array.from(services).sort();
}
