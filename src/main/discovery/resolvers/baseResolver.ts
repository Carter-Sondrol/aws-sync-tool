import type { DiscoveredRef, GraphNode } from '../../graph-types'
import { type ParsedARN, parseARN } from '../arn'
import type { Credentials, CredentialsProvider } from '../CredentialsProvider'
import type { ResolverRegistry } from '../registry'

export const ACCESS_DENIED = new Set([
    'AccessDenied',
    'AccessDeniedException',
    'AuthorizationError',
    'UnauthorizedOperation'
])

export const NOT_FOUND = new Set([
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

// ─── Base class ───────────────────────────────────────────────────────────────
// Keyed by `service:region:accessKeyId` to avoid re-constructing SDK clients.
export const clientCache = new Map<string, object>()

export function getAWSClient(service: string, region: string, credentials: Credentials): object {
    const key = `${service}:${region}:${credentials.accessKeyId}`
    if (!clientCache.has(key)) {
        const Client = require(`@aws-sdk/client-${service}`)[`${service}Client`]
        clientCache.set(key, new Client({ region, credentials }))
    }
    return clientCache.get(key)! // ! because we just set it above
}

export interface ResourceResolver {
    service: string
    resourceType: string
    cfnType: string

    fetch(arn: ParsedARN): Promise<Record<string, unknown> | null>
    logicalId(data: Record<string, unknown> | undefined, arn: ParsedARN): string
    label?(data: Record<string, unknown> | undefined, arn: ParsedARN): string

    list?(
        regions: string[],
        accountId: string
    ): Promise<Array<{ arn: string; name: string; type?: string }>>

    resolveByName?(name: string): Promise<ParsedARN | null>

    extractReferences(data: Record<string, unknown>): Promise<Set<DiscoveredRef>>
    resolveResource(arn: ParsedARN): Promise<GraphNode | null>

    completeDeferred: boolean
    deferredDiscovery?(_node: GraphNode, _registry: ResolverRegistry): Promise<Set<DiscoveredRef>>
}

export type ResolverFactory = (getCredentials: CredentialsProvider) => ResourceResolver
export const _resolverFactories = new Map<string, ResolverFactory>()
export function registerResolver(key: string, factory: ResolverFactory): void {
    _resolverFactories.set(key, factory)
}

export abstract class BaseResolver<TClient extends object, TData extends object>
    implements ResourceResolver
{
    abstract readonly service: string
    abstract readonly resourceType: string
    abstract readonly cfnType: string

    constructor(protected readonly getCredentials: CredentialsProvider) {}

    protected abstract createClient(region: string, creds: Credentials): TClient
    protected abstract fetchResource(client: TClient, arn: ParsedARN): Promise<TData | null>

    protected async client(region: string): Promise<TClient> {
        const creds = await this.getCredentials()
        const key = `${this.service}:${region}:${creds.accessKeyId}`
        if (!clientCache.has(key)) {
            clientCache.set(key, this.createClient(region, creds))
        }
        return clientCache.get(key) as TClient
    }

    async fetch(arn: ParsedARN): Promise<Record<string, unknown> | null> {
        const c = await this.client(arn.region || 'us-east-1')
        const result = await this.fetchResource(c, arn)
        return result as unknown as Record<string, unknown> | null
    }

    logicalId(_data: Record<string, unknown> | undefined, arn: ParsedARN): string {
        return arn.resourceId
    }

    label(data: Record<string, unknown> | undefined, arn: ParsedARN): string {
        return this.logicalId(data, arn)
    }

    /** Override to customize reference extraction (e.g., resolve env var names). */
    async extractReferences(data: Record<string, unknown>): Promise<Set<DiscoveredRef>> {
        return this.extractRecursiveReferences(data)
    }

    /** Set to false when the resolver has deferred work that needs running after initial discovery. */
    completeDeferred = true

    /**
     * Deferred reference resolution — runs after BFS completes.
     * Use this to resolve non-ARN references (e.g., Lambda env var table names)
     * by calling registry.resolveByName() or making Describe API calls.
     */
    async deferredDiscovery(
        _node: GraphNode,
        _registry: ResolverRegistry
    ): Promise<Set<DiscoveredRef>> {
        return new Set()
    }

    // Recursive reference extraction — walks data tree, collects ARNs with their field paths.
    extractRecursiveReferences(
        data: Record<string, unknown>,
        arns?: Set<DiscoveredRef>,
        path: string[] = []
    ): Set<DiscoveredRef> {
        arns = arns ?? new Set<DiscoveredRef>()

        for (const [key, value] of Object.entries(data)) {
            const currentPath = [...path, key]
            if (typeof value === 'string') {
                const parsed = parseARN(value)
                if (parsed) arns.add({ arn: parsed, path: currentPath })
            } else if (typeof value === 'object' && value !== null) {
                // Recurse into nested objects and arrays
                this.extractRecursiveReferences(value as Record<string, unknown>, arns, currentPath)
            }
        }
        return arns
    }

    async resolveResource(arn: ParsedARN): Promise<GraphNode | null> {
        for (let attempt = 0; attempt <= MAX_ATTEMPTS; attempt++) {
            try {
                const data = await this.fetch(arn)
                if (data === null) return null

                // Extract references from data
                const referencedResources = await this.extractReferences(data)

                return {
                    logicalId: this.logicalId(data, arn),
                    label: this.label(data, arn),
                    cfnType: this.cfnType,
                    arn,
                    included: true,
                    hidden: false,
                    data,
                    discoveredRefs: Array.from(referencedResources),
                    _resolver: this
                }
            } catch (err: unknown) {
                const code =
                    (err as { code?: string; name?: string }).code ??
                    (err as { name?: string }).name ??
                    ''

                if (THROTTLED.has(code) && attempt < MAX_ATTEMPTS) {
                    await new Promise((r) => setTimeout(r, (attempt + 1) * 1000))
                    continue
                }

                if (ACCESS_DENIED.has(code) || NOT_FOUND.has(code)) {
                    return this.createPlaceholder(arn, code)
                }

                console.error(`[${this.service}] Error resolving ${arn.raw}:`, err)
                return this.createPlaceholder(arn, code)
            }
        }

        console.error(
            `[${this.service}] Failed to resolve ${arn.raw} after ${MAX_ATTEMPTS} attempts`
        )
        return null
    }

    private createPlaceholder(arn: ParsedARN, error: string): GraphNode {
        return {
            logicalId: arn.resourceId || arn.raw.slice(-20),
            label: arn.resourceId || arn.raw.slice(-20),
            cfnType: this.cfnType,
            arn,
            included: false,
            hidden: false,
            discoveredRefs: [],
            data: {},
            error
        }
    }
}
