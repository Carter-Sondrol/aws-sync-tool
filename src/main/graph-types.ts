import type { ParsedARN } from './discovery/arn'

// ─── Reference types ──────────────────────────────────────────────────────────

/** Raw reference discovered during resource fetch - before graph resolution */
export interface DiscoveredRef {
    /** The parsed ARN found in the data */
    arn: ParsedARN
    /** Field path in source node's data where this ARN appears */
    path: string[]
}

/** Resolved reference - maps a discovered ref to a known graph node */
export interface ResolvedRef {
    /** Path in source data where the reference lives */
    sourcePath: string[]
    /** Logical ID of the target node (if resolved) */
    targetLogicalId?: string
    /** Original ARN that was found */
    originalArn: ParsedARN
    /** Whether this reference was successfully resolved to a graph node */
    resolved: boolean
    /** Which property of the target this ref resolves to (e.g. 'arn', 'resourceId') */
    matchedParameter?: string
}

// ─── Parameter configuration ──────────────────────────────────────────────────

/** Describes how a data field should be treated during sync/export */
export interface ParamConfig {
    /** Does this value vary per environment/account? */
    dynamic: boolean
    /** CDK-style reference path to another node's property, e.g. '$.MyQueue.QueueUrl' */
    edge?: string
}

// ─── Graph node ───────────────────────────────────────────────────────────────

// ─── Environment snapshot ─────────────────────────────────────────────────────

/** Per-environment snapshot of a node's data. One entry per account that owns this resource. */
export interface EnvSnapshot {
    /** The ARN for this resource in this specific environment */
    arn: ParsedARN
    /** Raw fetched data from AWS API */
    data?: Record<string, unknown>
    /** References discovered during fetch */
    discoveredRefs?: DiscoveredRef[]
    /** Whether this env's copy should be included in sync/export */
    included?: boolean
}

// ─── Resource linking ─────────────────────────────────────────────────────────

/** Source entry for a manual resource link — maps an ARN to inclusion status */
export interface LinkSource {
    /** ARN of the source resource */
    arn: string
    /** Whether this source should be included in sync/export */
    included: boolean
}

/** Manual link that merges multiple resources under a unified logicalId */
export interface ResourceLink {
    /** Unified logicalId for the merged node */
    unifiedId: string
    /** Optional human-readable label override */
    label?: string
    /** Source ARNs to merge into this node */
    sources: LinkSource[]
}

// ─── Graph node ───────────────────────────────────────────────────────────────

export interface GraphNode {
    /** Stable identifier for this logical resource */
    logicalId: string
    /** Human-readable label */
    label: string
    /** Parsed ARN structure (canonical — from deployable source or first added) */
    arn: ParsedARN
    /** CloudFormation resource type */
    cfnType?: string

    /** Should this node be included in CDK export? */
    included: boolean
    /** Should this node be hidden from graph visualization? */
    hidden: boolean
    /** Resource classification for display purposes */
    classification?: 'resource' | 'aws-managed'

    /** Raw fetched data from AWS API (ARNs still present as strings) */
    data?: Record<string, unknown>

    /** References discovered during fetch - raw ARNs with field paths */
    discoveredRefs: DiscoveredRef[]

    /** Post-discovery: which refs map to known nodes in the graph */
    resolvedRefs?: ResolvedRef[]

    /** Per-field parameter configuration (inferred from edges) */
    paramConfig?: Record<string, ParamConfig>

    /** Optional stack grouping for CDK export */
    stackId?: string

    /** Error state if resolution failed */
    error?: string

    // ─── Multi-environment fields (populated by Graph class) ──────────────

    /** Per-account snapshots of this node's data. Populated when nodes are merged across envs. */
    envData?: Map<string, EnvSnapshot>
    /** Dot-notation field paths that differ across environments */
    dynamicFields?: string[]

    // Internal: resolver reference (not serialized)
    _resolver?: object
}

// ─── Graph edge ───────────────────────────────────────────────────────────────

export interface GraphEdge {
    id: string
    sourceLogicalId: string
    targetLogicalId: string
    type: 'reference' | 'dependency' | 'contains'
    /** Field path in source node where this reference appears */
    sourcePath?: string[]
}

// ─── Graph data ───────────────────────────────────────────────────────────────

export interface GraphData {
    nodes: Map<string, GraphNode> // keyed by logicalId
    edges: GraphEdge[]
    metadata: {
        createdAt?: string
        updatedAt?: string
        visitedARNs: Set<string> // raw ARN strings for dedup
        seedArns: string[] // original seed ARNs
    }
}

// ─── Serialization helpers ────────────────────────────────────────────────────

/** Convert ParsedARN to a serializable form */
export function serializeARN(arn: ParsedARN): string {
    return arn.raw
}

/** Convert GraphData to JSON-safe format for persistence/debugging */
export function serializeGraphData(graph: GraphData): Record<string, unknown> {
    const nodes: Record<string, unknown> = {}

    for (const [logicalId, node] of graph.nodes) {
        nodes[logicalId] = {
            logicalId: node.logicalId,
            label: node.label,
            arn: serializeARN(node.arn),
            cfnType: node.cfnType,
            included: node.included,
            hidden: node.hidden,
            discoveredRefs: node.discoveredRefs.map((ref) => ({
                arn: serializeARN(ref.arn),
                path: ref.path
            })),
            resolvedRefs: node.resolvedRefs?.map((ref) => ({
                sourcePath: ref.sourcePath,
                targetLogicalId: ref.targetLogicalId,
                originalArn: serializeARN(ref.originalArn),
                resolved: ref.resolved
            })),
            paramConfig: node.paramConfig,
            error: node.error,
            // Include a truncated version of data for debugging (first 1024 chars)
            dataPreview: node.data ? JSON.stringify(node.data).slice(0, 1024) + '...' : undefined
        }
    }

    return {
        nodes,
        edges: graph.edges.map((edge) => ({
            id: edge.id,
            sourceLogicalId: edge.sourceLogicalId,
            targetLogicalId: edge.targetLogicalId,
            type: edge.type,
            sourcePath: edge.sourcePath
        })),
        metadata: {
            createdAt: graph.metadata.createdAt,
            updatedAt: graph.metadata.updatedAt,
            visitedARNs: Array.from(graph.metadata.visitedARNs),
            seedArns: graph.metadata.seedArns
        }
    }
}

// ─── Legacy types (for gradual migration) ─────────────────────────────────────

export interface Refrence {
    arn: ParsedARN
    path: string[]
}

export interface ResourceMapping {
    arn?: string
    managed_by?: string
    [key: string]: unknown
}

export type MappingTable = Record<string, Record<string, ResourceMapping>>

export interface GeneratedStubSummary {
    cfnType: string
    resolverFile?: string
    syncerFile?: string
    probeSucceeded: boolean
    error?: string
}

export interface DiscoveryErrorCounts {
    notFound: number
    accessDenied: number
    noResolver: number
    invalidParameter: number
    other: number
}

export interface DiscoveryProgress {
    phase: 'idle' | 'running' | 'complete' | 'error'
    resolved: number
    total: number
    currentArn?: string
    envId?: string
    error?: string
    errors?: DiscoveryErrorCounts
    generatedStubs?: GeneratedStubSummary[]
}
