import type { DiscoveredRef, GraphNode } from '../graph-types'
import type { ParsedARN } from './arn'
import type { CredentialsProvider } from './CredentialsProvider'
import type { ResourceResolver } from './resolvers/baseResolver'

// ─── Resolver contract (re-exported for convenience) ──────────────────────────
export type { ResourceResolver } from './resolvers/baseResolver'

export type ResolverFactory = (getCredentials: CredentialsProvider) => ResourceResolver
export const _resolverFactories = new Map<string, ResolverFactory>()
export function registerResolver(key: string, factory: ResolverFactory): void {
    _resolverFactories.set(key, factory)
}

// ─── Resolve pipeline (standalone for engine + stub-generator) ────────────────

export interface ResolveResult {
    node: GraphNode
}

const ACCESS_DENIED = new Set([
    'AccessDenied',
    'AccessDeniedException',
    'AuthorizationError',
    'UnauthorizedOperation'
])

const NOT_FOUND = new Set([
    'NoSuchEntity',
    'ResourceNotFoundException',
    'NotFoundException',
    'NoSuchBucket',
    'NoSuchKey'
])

const THROTTLED = new Set([
    'TooManyRequestsException',
    'ThrottlingException',
    'RequestLimitExceeded',
    'ServiceUnavailable'
])

const MAX_ATTEMPTS = 3

/** Resolve a resource using any ResourceResolver. Returns { node } or null. */
export async function resolveResource(
    resolver: ResourceResolver,
    arn: ParsedARN
): Promise<ResolveResult | null> {
    for (let attempt = 0; attempt <= MAX_ATTEMPTS; attempt++) {
        try {
            const data = await resolver.fetch(arn)
            if (data === null) return null

            const logicalId = resolver.logicalId(data, arn)
            const label = resolver.label?.(data, arn) ?? logicalId

            // Extract discovered references
            const discoveredRefs: DiscoveredRef[] = []
            for (const ref of await resolver.extractReferences(data)) {
                discoveredRefs.push({
                    arn: ref.arn,
                    path: ref.path
                })
            }

            const node: GraphNode = {
                arn,
                logicalId,
                label,
                cfnType: resolver.cfnType,
                included: true,
                hidden: false,
                data,
                discoveredRefs,
                _resolver: resolver
            }

            return { node }
        } catch (err: unknown) {
            const code =
                (err as { code?: string; name?: string }).code ??
                (err as { name?: string }).name ??
                ''

            if (THROTTLED.has(code) && attempt < MAX_ATTEMPTS) {
                await new Promise((r) => setTimeout(r, (attempt + 1) * 1000))
                continue
            }
            if (ACCESS_DENIED.has(code) || NOT_FOUND.has(code)) return null

            console.error(`[${resolver.service}] Error resolving ${arn.raw}:`, err)
            return null
        }
    }
    return null
}
