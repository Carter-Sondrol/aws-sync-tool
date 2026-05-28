import type { ParsedARN } from './discovery/arn'
import { RESOURCE_ID_PATHS } from './discovery/resource-config'
import { getLogger } from './logging'
import type {
    GraphData,
    GraphEdge,
    GraphNode,
    EnvSnapshot,
    ParamConfig,
    ResourceLink,
    LinkSource,
    ResolvedRef,
} from './graph-types'

const log = getLogger('graph')

// Re-export for backward compatibility
export type { EnvSnapshot }

/** Describes which top-level fields differ across environments */
export interface DynamicField {
    /** Dot-notation path to the differing field */
    path: string
    /** Per-env values for this field (accountId → value) */
    values: Record<string, unknown>
}

/** Graph metadata tracked during discovery */
export interface GraphMetadata {
    createdAt?: string
    updatedAt?: string
    visitedARNs: Set<string>
    seedArns: string[]
}

// ─── Utility helpers ────────────────────────────────────────────────────────

/** Compare two objects recursively to find differing leaf paths */
function findDifferences(
    a: Record<string, unknown>,
    b: Record<string, unknown>,
    prefix: string = ''
): DynamicField[] {
    const diffs: DynamicField[] = []
    const allKeys = new Set([...Object.keys(a), ...Object.keys(b)])

    for (const key of allKeys) {
        const path = prefix ? `${prefix}.${key}` : key
        const valA = a[key]
        const valB = b[key]

        if (valA === undefined && valB === undefined) continue
        if (valA === undefined || valB === undefined) {
            diffs.push({ path, values: {} }) // One side missing — mark as dynamic
            continue
        }

        if (
            typeof valA === 'object' &&
            typeof valB === 'object' &&
            valA !== null &&
            valB !== null
        ) {
            // Recurse into nested objects
            diffs.push(
                ...findDifferences(
                    valA as Record<string, unknown>,
                    valB as Record<string, unknown>,
                    path
                )
            )
        } else if (JSON.stringify(valA) !== JSON.stringify(valB)) {
            diffs.push({ path, values: {} })
        }
    }

    return diffs
}

// ─── ResolvedRef merge helper ─────────────────────────────────────────────────

/** Merge incoming resolved refs into existing, deduplicating by sourcePath. */
export function mergeResolvedRefs(existing: ResolvedRef[], incoming: ResolvedRef[]): ResolvedRef[] {
    const byPath = new Map<string, ResolvedRef>()
    for (const r of existing) {
        byPath.set(r.sourcePath.join('.'), r)
    }
    for (const r of incoming) {
        const key = r.sourcePath.join('.')
        const cur = byPath.get(key)
        if (!cur) {
            byPath.set(key, r)
        } else if (r.resolved && !cur.resolved) {
            byPath.set(key, r)
        } else if (r.resolved && cur.resolved && r.targetLogicalId !== cur.targetLogicalId) {
            byPath.set(`${key}#${r.targetLogicalId ?? 'unknown'}`, r)
        }
    }
    return Array.from(byPath.values())
}

// ─── Graph class ──────────────────────────────────────────────────────────────

export class Graph {
    public nodes: Map<string, GraphNode> // keyed by logicalId
    public edges: GraphEdge[]
    public metadata: GraphMetadata

    constructor(existing?: Partial<Graph>) {
        this.nodes = existing?.nodes ?? new Map()
        this.edges = existing?.edges ?? []
        this.metadata = existing?.metadata ?? { visitedARNs: new Set(), seedArns: [] }
    }

    // ─── Node management ────────────────────────────────────────────────

    /**
     * Add a node to the graph. On logicalId collision with same service:type,
     * merges the environment data into the existing node rather than overwriting.
     * On collision with a different service:type, disambiguates the logicalId.
     * @returns the result ('added' or 'merged') and the effectiveLogicalId actually
     *   used as the storage key — callers must use effectiveLogicalId when the
     *   disambiguated path is taken, as it differs from node.logicalId.
     */
    addNode(
        node: GraphNode,
        accountId: string
    ): { result: 'added' | 'merged'; effectiveLogicalId: string } {
        const existing = this.nodes.get(node.logicalId)

        if (!existing) {
            // New node — initialize envData with this account's snapshot
            const envData = new Map<string, EnvSnapshot>()
            envData.set(accountId, {
                arn: node.arn,
                data: node.data,
                discoveredRefs: node.discoveredRefs ?? []
            })

            const stored: GraphNode = {
                ...node,
                envData
            }
            this.nodes.set(node.logicalId, stored)
            log.info(`addNode: added ${node.arn.service}:${node.arn.resourceType} "${node.logicalId}" included=${node.included}`)
            return { result: 'added', effectiveLogicalId: node.logicalId }
        }

        // Collision — check if same service:type (mergeable) or different (edge case)
        const existingKey = `${existing.arn.service}:${existing.arn.resourceType}`
        const newKey = `${node.arn.service}:${node.arn.resourceType}`

        if (existingKey !== newKey) {
            // Different service:type with same logicalId — disambiguate
            const effectiveLogicalId = this.disambiguateAndAdd(node, accountId)
            log.debug(`addNode: disambiguated "${node.logicalId}" (${newKey}) → "${effectiveLogicalId}" (collision with ${existingKey})`)
            return { result: 'added', effectiveLogicalId }
        }

        // Same service:type — merge environment data
        log.debug(`addNode: merged ${node.arn.service}:${node.arn.resourceType} "${node.logicalId}" (account=${accountId})`)
        this.mergeEnvSnapshot(existing, node, accountId)
        return { result: 'merged', effectiveLogicalId: node.logicalId }
    }

    /**
     * Handle a different-service:type collision: resolve a non-clashing logicalId,
     * build envData, store the node, and return the effective storage key.
     */
    private disambiguateAndAdd(node: GraphNode, accountId: string): string {
        const disambiguatedId = this.resolveDisambiguatedId(node.logicalId, node.arn)
        const envData = new Map<string, EnvSnapshot>()
        envData.set(accountId, {
            arn: node.arn,
            data: node.data,
            discoveredRefs: node.discoveredRefs ?? []
        })

        const stored: GraphNode = {
            ...node,
            logicalId: disambiguatedId,
            envData
        }
        this.nodes.set(disambiguatedId, stored)
        return disambiguatedId
    }

    /**
     * Merge a new environment snapshot into an existing same-service:type node,
     * recomputing dynamicFields and updating display properties.
     */
    private mergeEnvSnapshot(existing: GraphNode, node: GraphNode, accountId: string): void {
        const existingEnvData = existing.envData ?? this.legacyToEnvData(existing, accountId)
        existingEnvData.set(accountId, {
            arn: node.arn,
            data: node.data,
            discoveredRefs: node.discoveredRefs ?? []
        })

        // Update dynamic fields by comparing snapshots
        existing.dynamicFields = this.computeDynamicFields(existingEnvData)
        existing.envData = existingEnvData

        // Keep non-env-specific properties from the new node (included, hidden, etc.)
        // but preserve computed ones from existing (resolvedRefs, paramConfig, stackId)
        existing.label = node.label ?? existing.label
        existing.cfnType = node.cfnType ?? existing.cfnType
        existing.classification = node.classification ?? existing.classification
    }

    /** Disambiguate a colliding logicalId by appending service:type suffix */
    private resolveDisambiguatedId(logicalId: string, arn: ParsedARN): string {
        const suffix = (arn.resourceType || arn.service || '').replace(/:/g, '-')
        let candidate = `${logicalId}-${suffix}`
        let counter = 2
        while (this.nodes.has(candidate)) {
            candidate = `${logicalId}-${suffix}-${counter}`
            counter++
        }
        return candidate
    }

    /** Convert legacy node format (single env data) to envData map */
    private legacyToEnvData(node: GraphNode, accountId: string): Map<string, EnvSnapshot> {
        const envData = new Map<string, EnvSnapshot>()
        // Infer accountId from existing ARN if not provided
        const sourceId = accountId || node.arn.accountId || 'unknown'
        envData.set(sourceId, {
            arn: node.arn,
            data: node.data,
            discoveredRefs: node.discoveredRefs ?? []
        })
        return envData
    }

    /** Compute which fields differ across environment snapshots */
    private computeDynamicFields(envData: Map<string, EnvSnapshot>): string[] {
        const entries = Array.from(envData.entries())
        if (entries.length < 2) return []

        const firstSnapshot = entries[0][1]
        const allPaths = new Set<string>()

        // Collect all differing paths across all pairs
        for (let i = 1; i < entries.length; i++) {
            const secondSnapshot = entries[i][1]
            if (!firstSnapshot?.data || !secondSnapshot.data) continue

            const diffs = findDifferences(firstSnapshot.data, secondSnapshot.data)
            for (const d of diffs) {
                allPaths.add(d.path)
            }
        }

        return Array.from(allPaths)
    }

    // ─── Lookup ─────────────────────────────────────────────────────────

    getNode(logicalId: string): GraphNode | undefined {
        return this.nodes.get(logicalId)
    }

    /** Find a node by its ARN in any environment */
    getNodeByArn(arnRaw: string): GraphNode | undefined {
        for (const node of this.nodes.values()) {
            if (!node.envData) continue
            for (const snapshot of node.envData.values()) {
                if (snapshot.arn.raw === arnRaw) return node
            }
        }
        return undefined
    }

    /** Get the ARN for a specific node + environment */
    getArnForEnv(logicalId: string, accountId: string): ParsedARN | undefined {
        const node = this.nodes.get(logicalId)
        if (!node?.envData) return undefined
        return node.envData.get(accountId)?.arn
    }

    /** Get all account IDs present in the graph */
    getEnvs(): string[] {
        const envs = new Set<string>()
        for (const node of this.nodes.values()) {
            if (node.envData) {
                for (const accountId of node.envData.keys()) {
                    envs.add(accountId)
                }
            }
        }
        return Array.from(envs)
    }

    // ─── Reference resolution ──────────────────────────────────────────────

    /**
     * Build an ARN → logicalId index for a specific environment.
     * Used to resolve discovered refs to known graph nodes.
     */
    private buildArnIndex(accountId: string): Map<string, string> {
        const arnToLogicalId = new Map<string, string>()
        for (const [logicalId, node] of this.nodes) {
            if (!node.envData?.has(accountId)) continue
            const arnRaw = node.envData.get(accountId)!.arn.raw
            arnToLogicalId.set(arnRaw, logicalId)
        }
        return arnToLogicalId
    }

    /**
     * Infer the primary identifier path for a target resource type.
     * E.g. DynamoDB table → ["TableName"], SQS queue → ["QueueName"], etc.
     */
    private resolveTargetPath(arn: ParsedARN): string[] {
        const key = `${arn.service}:${arn.resourceType}`
        return RESOURCE_ID_PATHS[key] || [arn.resourceType || 'Id']
    }

    /**
     * Resolve references for a specific environment.
     * Maps discovered ARNs to known graph nodes and sets resolvedRefs on each node.
     */
    resolveReferences(accountId: string): void {
        const arnToLogicalId = this.buildArnIndex(accountId)
        let totalRefs = 0
        let resolvedCount = 0

        for (const node of this.nodes.values()) {
            if (!node.envData?.has(accountId)) continue
            const snapshot = node.envData.get(accountId)!

            const newRefs: ResolvedRef[] = (snapshot.discoveredRefs ?? []).map((ref) => {
                totalRefs++
                const targetLogicalId = ref.arn?.raw ? arnToLogicalId.get(ref.arn.raw) : undefined
                const resolved = ref.arn?.raw ? !!arnToLogicalId.has(ref.arn.raw) : false

                if (resolved) {
                    resolvedCount++
                    log.debug(`ref resolved: ${ref.arn.raw} → ${targetLogicalId}`)
                } else {
                    log.debug(`ref unresolved: ${ref.arn?.raw ?? 'null'}`)
                }

                return {
                    sourcePath: ref.path,
                    targetLogicalId,
                    originalArn: ref.arn,
                    resolved,
                    targetPath: resolved ? this.resolveTargetPath(ref.arn) : undefined
                }
            })
            node.resolvedRefs = mergeResolvedRefs(node.resolvedRefs ?? [], newRefs)
        }
        log.info(`resolveReferences [${accountId}]: ${resolvedCount}/${totalRefs} refs resolved`)
    }

    // ─── Edge building ────────────────────────────────────────────────────

    /** Build edges from resolved refs (global — same across all environments) */
    buildEdges(): void {
        this.edges = []
        for (const node of this.nodes.values()) {
            if (!node.resolvedRefs) continue
            for (const ref of node.resolvedRefs) {
                if (!ref.targetLogicalId || !ref.resolved) continue
                this.edges.push({
                    id: `${node.logicalId}>>${ref.targetLogicalId}`,
                    sourceLogicalId: node.logicalId,
                    targetLogicalId: ref.targetLogicalId,
                    type: 'reference',
                    sourcePath: ref.sourcePath
                })
                log.debug(`edge: ${node.logicalId} >> ${ref.targetLogicalId} (${ref.sourcePath?.join('.')})`)
            }
        }
        log.info(`buildEdges: ${this.edges.length} edges built`)
    }

    // ─── Parameter inference ──────────────────────────────────────────────

    /**
     * Infer paramConfig for nodes based on their outgoing references.
     * Fields that reference other nodes in the graph become params.
     */
    inferParameters(): void {
        let paramCount = 0
        for (const node of this.nodes.values()) {
            if (!node.resolvedRefs?.length) continue
            const config: Record<string, ParamConfig> = {}

            for (const ref of node.resolvedRefs) {
                if (!ref.targetLogicalId || !ref.resolved) continue
                const target = this.nodes.get(ref.targetLogicalId)
                if (!target) continue

                config[ref.sourcePath.join('.')] = {
                    dynamic: true, // All cross-node refs are dynamic by definition
                    edge: `$.${ref.targetLogicalId}.arn`
                }
            }

            if (Object.keys(config).length > 0) {
                node.paramConfig = config
                paramCount += Object.keys(config).length
            }
        }
        log.info(`inferParameters: ${paramCount} params inferred`)
    }

    // ─── Resource linking ─────────────────────────────────────────────────

    /**
     * Apply manual resource links to merge nodes under a unified logicalId.
     *
     * For each link:
     * - Finds all source nodes by ARN
     * - Creates/updates a node at `unifiedId` with merged envData from all sources
     * - Sets per-source `included` flags in envData snapshots
     * - Removes original nodes (they're now part of the unified node)
     * - Rewires edges to point to the unifiedId
     */
    applyLinks(links: ResourceLink[]): {
        applied: string[]
        errors: { link: string; reason: string }[]
    } {
        const applied: string[] = []
        const errors: { link: string; reason: string }[] = []

        for (const link of links) {
            if (link.sources.length < 1) {
                errors.push({ link: link.unifiedId, reason: 'No sources defined' })
                continue
            }

            // Check if this link was already applied (idempotency)
            const existingUnified = this.nodes.get(link.unifiedId)
            const sourceArns = new Set(link.sources.map((s) => s.arn))
            if (existingUnified?.envData) {
                // Check if all source ARNs are already in envData
                let allPresent = true
                for (const srcArn of sourceArns) {
                    const found = existingUnified.envData
                        .values()
                        .some((snap) => snap.arn.raw === srcArn)
                    if (!found) {
                        allPresent = false
                        break
                    }
                }
                if (allPresent) {
                    // Link already applied — just update base properties from deployable source
                    const deployableSnapshot = [...existingUnified.envData.values()].find(
                        (s) => s.included
                    )
                    if (deployableSnapshot) {
                        existingUnified.arn = deployableSnapshot.arn
                        existingUnified.label = link.label || existingUnified.label
                    }
                    applied.push(link.unifiedId)
                    continue
                }
            } else {
                log.debug(`applyLinks: ${link.unifiedId} — unified=${!!existingUnified}, envData=${!!existingUnified?.envData}`)
            }

            // Find all source nodes and collect their data
            const foundSources: Array<{
                node: GraphNode
                source: LinkSource
            }> = []

            for (const source of link.sources) {
                const node = this.getNodeByArn(source.arn)
                if (!node) {
                    errors.push({ link: link.unifiedId, reason: `ARN not found: ${source.arn}` })
                    continue
                }
                // Skip nodes that are already the unified node itself (from partial re-apply)
                if (node.logicalId === link.unifiedId) {
                    continue
                }
                foundSources.push({ node, source })
            }

            if (foundSources.length === 0) {
                // All sources are either missing or already merged — check if envData is complete
                if (
                    existingUnified?.envData &&
                    [...sourceArns].every((a) =>
                        existingUnified!.envData!.values().some((s) => s.arn.raw === a)
                    )
                ) {
                    applied.push(link.unifiedId)
                }
                continue
            }

            // Build or update the unified node
            let unifiedNode: GraphNode

            if (existingUnified) {
                unifiedNode = {
                    ...existingUnified,
                    envData: new Map(existingUnified.envData ?? [])
                }
            } else {
                // Prefer a deployable source for base properties; fall back to first
                const deployableSource =
                    foundSources.find((s) => s.source.included) ?? foundSources[0]
                const first = foundSources[0].node
                const firstEnvData = first.envData ?? new Map()
                unifiedNode = {
                    logicalId: link.unifiedId,
                    label: link.label || deployableSource.node.label,
                    arn: deployableSource.node.arn,
                    cfnType: deployableSource.node.cfnType,
                    // Base included is true if ANY source is deployable
                    included: foundSources.some((s) => s.source.included),
                    hidden: deployableSource.node.hidden ?? false,
                    classification: deployableSource.node.classification,
                    data: deployableSource.node.data,
                    discoveredRefs: deployableSource.node.discoveredRefs ?? [],
                    resolvedRefs: deployableSource.node.resolvedRefs,
                    paramConfig: deployableSource.node.paramConfig,
                    stackId: deployableSource.node.stackId,
                    error: deployableSource.node.error,
                    envData: new Map(firstEnvData),
                    dynamicFields: deployableSource.node.dynamicFields
                }
            }

            // Ensure envData exists
            if (!unifiedNode.envData) {
                unifiedNode.envData = new Map()
            }

            // Merge envData from all sources, applying per-source included flags
            for (const { node, source } of foundSources) {
                if (!node.envData) continue
                for (const [accountId, snapshot] of node.envData.entries()) {
                    const existingSnapshot = unifiedNode.envData!.get(accountId)
                    unifiedNode.envData.set(accountId, {
                        arn: snapshot.arn,
                        data: existingSnapshot?.data ?? snapshot.data,
                        discoveredRefs: snapshot.discoveredRefs,
                        included: source.included // Apply the link's inclusion flag
                    })
                }
            }

            this.nodes.set(link.unifiedId, unifiedNode)

            // Remove original nodes (unless they're already part of another link)
            const originalIds = new Set(foundSources.map((s) => s.node.logicalId))
            for (const origId of originalIds) {
                if (origId !== link.unifiedId) {
                    this.nodes.delete(origId)
                }
            }

            // Rewire edges to point to the unifiedId
            for (const origId of originalIds) {
                if (origId === link.unifiedId) continue
                this.edges = this.edges.map((edge) => {
                    if (edge.sourceLogicalId === origId) {
                        return {
                            ...edge,
                            sourceLogicalId: link.unifiedId,
                            id: `${link.unifiedId}>>${edge.targetLogicalId}`
                        }
                    }
                    if (edge.targetLogicalId === origId) {
                        return {
                            ...edge,
                            targetLogicalId: link.unifiedId,
                            id: `${edge.sourceLogicalId}>>${link.unifiedId}`
                        }
                    }
                    return edge
                })
            }

            applied.push(link.unifiedId)
        }

        log.info(`applyLinks: ${applied.length} applied, ${errors.length} errors`)
        return { applied, errors }
    }

    // ─── Serialization helpers ────────────────────────────────────────────

    /** Convert to GraphData format for persistence and consumers */
    toGraphData(accountId?: string): GraphData {
        const nodes = new Map<string, GraphNode>()

        for (const [logicalId, node] of this.nodes) {
            // If accountId specified, use that env's data; otherwise use first available
            let snapshot: EnvSnapshot | undefined
            if (node.envData && accountId && node.envData.has(accountId)) {
                snapshot = node.envData.get(accountId)
            } else if (node.envData) {
                snapshot = node.envData.values().next().value
            }

            nodes.set(logicalId, {
                logicalId: node.logicalId,
                label: node.label,
                arn: snapshot?.arn ?? node.arn,
                cfnType: node.cfnType,
                included: node.included,
                hidden: node.hidden,
                classification: node.classification,
                data: snapshot?.data ?? node.data,
                discoveredRefs: snapshot?.discoveredRefs ?? node.discoveredRefs ?? [],
                resolvedRefs: node.resolvedRefs,
                paramConfig: node.paramConfig,
                stackId: node.stackId,
                error: node.error,
                envData: node.envData,
                dynamicFields: node.dynamicFields
            })
        }

        return {
            nodes,
            edges: this.edges,
            metadata: { ...this.metadata }
        }
    }
}
