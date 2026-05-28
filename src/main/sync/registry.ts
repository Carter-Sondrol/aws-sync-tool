import type { ResourceSyncer } from './syncer'

const registry = new Map<string, ResourceSyncer>()

export function registerSyncer(key: string, syncer: ResourceSyncer): void {
    registry.set(key, syncer)
}

export function getSyncer(key: string): ResourceSyncer | undefined {
    return registry.get(key)
}
