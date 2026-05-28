import { parseARN } from '../discovery/arn'
import type { GraphNode, ResourceMapping } from '../graph-types'
import { Graph } from '../graph'
import { readJSON, writeJSON } from '../utils'
import { getLogger } from '../logging'
import { LinkService } from './link-service'

const log = getLogger('graph-service')

/** Raw JSON format — nodes stored as plain Record for persistence. */
interface RawGraphData {
    nodes: Record<string, GraphNode>
    edges: any[]
    meta?: {
        visitedArns?: string[]
        seedArns?: string[]
        createdAt?: string
        updatedAt?: string
    }
}

const EMPTY_RAW: RawGraphData = { nodes: {}, edges: [] }

/** Deserialize raw JSON into a Graph instance */
function rawToGraph(raw: unknown): Graph {
    if (!raw || typeof raw !== 'object') return new Graph()
    const g = raw as any
    if (!g.nodes) return new Graph()

    const nodes = new Map<string, GraphNode>()
    for (const [key, node] of Object.entries(g.nodes)) {
        const n = node as any
        let migrated = n

        // Migrate legacy status field to included/hidden
        if ('status' in n && typeof n.status === 'string') {
            const { status, ...rest } = n
            const included = status === 'synced' || status === 'referenced'
            const hidden = status === 'ignored'
            migrated = { ...rest, included, hidden }
        } else if (!('included' in n)) {
            migrated = { ...migrated, included: true, hidden: false }
        }

        // Parse string ARN into ParsedARN object if needed
        if (typeof migrated.arn === 'string') {
            const parsed = parseARN(migrated.arn)
            if (parsed) {
                migrated = { ...migrated, arn: parsed }
            }
        }

        // Parse string discoveredRefs ARNs
        if (Array.isArray(migrated.discoveredRefs)) {
            migrated.discoveredRefs = migrated.discoveredRefs.map((ref: any) => {
                if (typeof ref.arn === 'string') {
                    const parsed = parseARN(ref.arn)
                    return { ...ref, arn: parsed || ref.arn }
                }
                return ref
            })
        }

        // Parse string resolvedRefs ARNs
        if (Array.isArray(migrated.resolvedRefs)) {
            migrated.resolvedRefs = migrated.resolvedRefs.map((ref: any) => {
                if (typeof ref.originalArn === 'string') {
                    const parsed = parseARN(ref.originalArn)
                    return { ...ref, originalArn: parsed || ref.originalArn }
                }
                return ref
            })
        }

        // Reconstruct envData Map from JSON (Maps serialize as plain objects)
        if (migrated.envData && !(migrated.envData instanceof Map)) {
            const map = new Map<string, any>()
            for (const [accountId, snapshot] of Object.entries(migrated.envData)) {
                // If the snapshot was serialized as an array [key, value], unwrap it
                const entry = Array.isArray(snapshot) ? snapshot[1] : snapshot
                if (entry) map.set(accountId, entry)
            }
            migrated.envData = map
        }

        nodes.set(key, migrated as GraphNode)
    }

    const graph = new Graph()
    graph.nodes = nodes
    graph.edges = g.edges ?? []
    graph.metadata = {
        visitedARNs: new Set(g.meta?.visitedArns ?? g.metadata?.visitedARNs ?? []),
        seedArns: g.meta?.seedArns ?? g.metadata?.seedArns ?? [],
        createdAt: g.meta?.createdAt ?? g.metadata?.createdAt,
        updatedAt: g.meta?.updatedAt ?? g.metadata?.updatedAt
    }
    return graph
}

function rawToEmpty(): Graph {
    return new Graph()
}

type AllRawGraphs = Record<string, RawGraphData>

function migrateRawGraphs(raw: unknown): AllRawGraphs {
    if (!raw || typeof raw !== 'object') return {}
    // If root has 'nodes' key it's the old single-graph format
    if ('nodes' in (raw as object)) {
        const single = rawToGraph(raw)
        const envs = readJSON<EnvironmentConfig[]>('environments.json', [])
        const primaryId = envs[0]?.id
        if (!primaryId) return {}
        // Serialize back to raw format keyed by envId
        return { [primaryId]: graphToRaw(single) }
    }
    return raw as AllRawGraphs
}

/** Serialize a Graph instance back to raw JSON-safe format */
function graphToRaw(graph: Graph): RawGraphData {
    const nodes: Record<string, GraphNode> = {}
    for (const [key, node] of graph.nodes) {
        // Convert Maps to plain objects so JSON.stringify doesn't lose the data
        const serialized: any = { ...node }
        if (serialized.envData instanceof Map) {
            serialized.envData = Object.fromEntries(serialized.envData)
        }
        nodes[key] = serialized as GraphNode
    }
    return {
        nodes,
        edges: graph.edges,
        meta: {
            visitedArns: Array.from(graph.metadata.visitedARNs),
            seedArns: graph.metadata.seedArns,
            createdAt: graph.metadata.createdAt,
            updatedAt: graph.metadata.updatedAt
        }
    }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Get service:resourceType from a node (handles both arn.service and top-level .service) */
function getServiceType(node: GraphNode): string {
    const n = node as any
    if (n.service && n.resourceType) return `${n.service}:${n.resourceType}`
    if (node.arn?.service && node.arn?.resourceType)
        return `${node.arn.service}:${node.arn.resourceType}`
    return 'unknown:unknown'
}

/** Get just the service name */
function getService(node: GraphNode): string {
    const n = node as any
    if (n.service) return n.service
    return node.arn?.service ?? 'unknown'
}

// ─── Service ──────────────────────────────────────────────────────────────────

export interface GraphInfo {
    envId: string
    nodeCount: number
    edgeCount: number
}

export interface GraphStats {
    nodeCount: number
    edgeCount: number
    includedCount: number
    hiddenCount: number
    services: string[]
}

export interface MappingEntry {
    envId: string
    logicalId: string
    arn?: string
}

/** Result of clustering included nodes into stack groups by connected components. */
export interface ClusterResult {
    /** Stack key → array of nodes assigned to that stack. */
    groups: Map<string, GraphNode[]>
    /** Human-readable summary per stack. */
    info: Array<{
        stack: string
        count: number
        types: string[]
    }>
}

/** Options for the clusterStacks algorithm. */
export interface ClusterOptions {
    /** Max nodes per stack before forcing a split (default: 480, buffer below CFN's 500). */
    softLimit?: number
    /** Minimum connected-component size to warrant its own stack (default: 40). */
    minClusterSize?: number
    /** Name of the default/main stack. */
    defaultKey?: string
}

export class GraphService {
    loadAll(): Record<string, Graph> {
        const raw = readJSON<unknown>('graphs.json', null)
        const migratedRaw = raw ? migrateRawGraphs(raw) : {}
        const legacy = readJSON<unknown>('graph.json', null)
        if (legacy) Object.assign(migratedRaw, migrateRawGraphs(legacy))

        const result: Record<string, Graph> = {}
        for (const [envId, rawG] of Object.entries(migratedRaw)) {
            result[envId] = rawToGraph(rawG)
        }
        return result
    }

    load(envId: string): Graph {
        return this.loadAll()[envId] ?? rawToEmpty()
    }

    save(envId: string, graph: Graph): void {
        const allRaw = readJSON<AllRawGraphs>('graphs.json', {})
        allRaw[envId] = graphToRaw(graph)
        writeJSON('graphs.json', allRaw)
    }

    clear(envId?: string): void {
        if (envId) {
            this.save(envId, rawToEmpty())
        } else {
            writeJSON('graphs.json', {})
            writeJSON('mapping.json', {})
        }
    }

    /** Export graph data as JSON to a file path */
    export(outputPath: string, envId?: string): void {
        const { writeFileSync } = require('fs')
        const graph = envId ? this.load(envId) : this.loadAll()
        // Serialize Graph instances to raw format for export
        const data = typeof outputPath === 'string' && envId
            ? graphToRaw(graph)
            : Object.fromEntries(
                Object.entries(graph).map(([k, g]) => [k, graphToRaw(g)])
            )
        writeFileSync(outputPath, JSON.stringify(data, null, 2), 'utf-8')
    }

    /** Import graph data from a JSON file */
    import(
        envId: string,
        inputPath: string
    ): { ok: boolean; nodeCount?: number; edgeCount?: number; error?: string } {
        const { readFileSync } = require('fs')
        try {
            const raw = JSON.parse(readFileSync(inputPath, 'utf-8'))
            const graph = rawToGraph(raw)
            this.save(envId, graph)
            return {
                ok: true,
                nodeCount: graph.nodes.size,
                edgeCount: graph.edges.length
            }
        } catch (err) {
            return { ok: false, error: err instanceof Error ? err.message : String(err) }
        }
    }

    /** List all environments that have graph data */
    listEnvironments(): GraphInfo[] {
        const graphs = this.loadAll()
        return Object.entries(graphs).map(([envId, graph]) => ({
            envId,
            nodeCount: graph.nodes.size,
            edgeCount: graph.edges.length
        }))
    }

    /** Get summary stats for a graph */
    stats(envId: string): GraphStats {
        const graph = this.load(envId)
        const services = new Set<string>()
        let includedCount = 0
        let hiddenCount = 0

        for (const node of graph.nodes.values()) {
            if (node.included) includedCount++
            if (node.hidden) hiddenCount++
            services.add(getServiceType(node))
        }

        return {
            nodeCount: graph.nodes.size,
            edgeCount: graph.edges.length,
            includedCount,
            hiddenCount,
            services: Array.from(services)
        }
    }

    /** List nodes in a graph */
    listNodes(envId: string, filter?: { included?: boolean; service?: string }): GraphNode[] {
        const graph = this.load(envId)
        let nodes = Array.from(graph.nodes.values())

        if (filter?.included !== undefined) {
            nodes = nodes.filter((n) => n.included === filter.included)
        }
        if (filter?.service) {
            nodes = nodes.filter((n) => getService(n) === filter.service)
        }
        return nodes
    }

    /** Update a node's included status */
    setIncluded(envId: string, arn: string, included: boolean): void {
        const graph = this.load(envId)
        // Try lookup by ARN across all nodes
        const node = graph.getNodeByArn(arn) ?? Array.from(graph.nodes.values()).find(
            (n) => n.logicalId === arn
        )
        if (!node) throw new Error(`Node not found: ${arn}`)
        node.included = included
        this.save(envId, graph)
    }

    /**
     * Bulk-set included status for all nodes matching a service:resourceType filter.
     * Returns the count of nodes updated.
     */
    setBulkIncluded(
        envId: string,
        filter: { service?: string; resourceType?: string },
        included: boolean
    ): number {
        const graph = this.load(envId)
        let count = 0
        for (const node of graph.nodes.values()) {
            const svc = node.arn?.service || ''
            const type = node.arn?.resourceType || ''
            if (filter.service && svc !== filter.service) continue
            if (filter.resourceType && type !== filter.resourceType) continue
            node.included = included
            count++
        }
        if (count > 0) this.save(envId, graph)
        return count
    }

    /** Summary of included/total counts per service:resourceType */
    inclusionSummary(envId: string): Array<{ type: string; total: number; included: number }> {
        const graph = this.load(envId)
        const byType = new Map<string, { total: number; included: number }>()
        for (const node of graph.nodes.values()) {
            const svc = node.arn?.service || 'unknown'
            const type = node.arn?.resourceType || 'unknown'
            const key = `${svc}:${type}`
            const entry = byType.get(key) ?? { total: 0, included: 0 }
            entry.total++
            if (node.included) entry.included++
            byType.set(key, entry)
        }
        return Array.from(byType.entries())
            .map(([type, counts]) => ({ type, ...counts }))
            .sort((a, b) => a.type.localeCompare(b.type))
    }

    /**
     * Cluster included nodes into stack groups based on connected components.
     *
     * Delegates to the pure `clusterStacks` function from the generators module.
     * Returns a ClusterResult with groups and human-readable info — does NOT mutate the graph.
     */
    clusterStacks(envId: string, options?: ClusterOptions): ClusterResult {
        const { clusterStacks: cluster } = require('../export/generators/clustering')
        const graph = this.load(envId)
        const allNodes = Array.from(graph.nodes.values())
        const synced = allNodes.filter((n) => n.included)
        return cluster(synced, graph.edges, options)
    }

    /** Assign a node to a stack group */
    setStack(envId: string, arn: string, stackId: string): void {
        const graph = this.load(envId)
        const node = graph.getNodeByArn(arn) ?? Array.from(graph.nodes.values()).find(
            (n) => n.logicalId === arn
        )
        if (!node) throw new Error(`Node not found: ${arn}`)
        ;(node as any).stackId = stackId
        this.save(envId, graph)
    }

    // ─── Mapping table ──────────────────────────────────────────────────────

    loadMapping(envId?: string): Record<string, Record<string, any>> {
        const mapping = readJSON<Record<string, Record<string, any>>>('mapping.json', {})
        if (envId) return mapping[envId] ?? {}
        return mapping
    }

    saveMapping(mapping: Record<string, Record<string, any>>): void {
        writeJSON('mapping.json', mapping)
    }

    setMapping(envId: string, logicalId: string, entry: ResourceMapping): void {
        const mapping = this.loadMapping()
        if (!mapping[envId]) mapping[envId] = {}
        mapping[envId][logicalId] = entry
        this.saveMapping(mapping)
    }

    listMappings(envId?: string): MappingEntry[] {
        const mapping = this.loadMapping()
        const entries: MappingEntry[] = []
        for (const [eid, logicals] of Object.entries(mapping)) {
            if (envId && eid !== envId) continue
            for (const [logicalId, entry] of Object.entries(
                logicals as Record<string, ResourceMapping>
            )) {
                entries.push({ envId: eid, logicalId, arn: entry.arn })
            }
        }
        return entries
    }

    exportMapping(outputPath: string): void {
        const { writeFileSync } = require('fs')
        const mapping = this.loadMapping()
        writeFileSync(outputPath, JSON.stringify(mapping, null, 2), 'utf-8')
    }

    /** Build remapping context for sync operations */
    buildRemapping(sourceEnvId: string, targetEnvId: string): any {
        const { buildRemappingContext } = require('../sync/remapping')
        const mappingTable = this.loadMapping()
        const sourceGraph = this.load(sourceEnvId)

        const sourceNodes = new Map<string, GraphNode>()
        for (const node of sourceGraph.nodes.values()) {
            sourceNodes.set(node.arn.raw, node)
        }

        return buildRemappingContext(mappingTable, targetEnvId, sourceNodes)
    }

    /** Infer the primary AWS account ID for an env from its graph node ARNs */
    getAccountId(envId: string): string | undefined {
        return this.load(envId).getEnvs()[0]
    }

    /** Load the unified (merged) graph saved under the "_unified" key */
    loadUnified(): Graph {
        return this.load('_unified')
    }

    /**
     * Merge per-env graphs into a unified graph, resolve references for every
     * known account, apply manual links, build edges and infer parameters.
     * Saves the result under the "_unified" key and returns it.
     */
    merge(envIds: string[]): Graph {
        const unified = new Graph()

        for (const envId of envIds) {
            const perEnvGraph = this.load(envId)
            for (const node of perEnvGraph.nodes.values()) {
                if (node.envData && node.envData.size > 0) {
                    for (const [accountId, snapshot] of node.envData.entries()) {
                        const envNode: GraphNode = {
                            ...node,
                            arn: snapshot.arn,
                            data: snapshot.data,
                            discoveredRefs: snapshot.discoveredRefs ?? [],
                            resolvedRefs: undefined,
                            envData: undefined,
                            dynamicFields: undefined,
                        }
                        unified.addNode(envNode, accountId)
                    }
                } else {
                    unified.addNode(node, node.arn.accountId)
                }
            }
        }

        for (const accountId of unified.getEnvs()) {
            unified.resolveReferences(accountId)
        }

        const rawLinks = new LinkService().list()
        if (rawLinks.length > 0) {
            unified.applyLinks(
                rawLinks.map((l) => ({
                    unifiedId: l.unifiedId,
                    label: l.label,
                    sources: l.sources.map((s) => ({ arn: s.arn, included: s.included })),
                }))
            )
        }

        unified.buildEdges()
        unified.inferParameters()
        this.save('_unified', unified)
        return unified
    }
}
