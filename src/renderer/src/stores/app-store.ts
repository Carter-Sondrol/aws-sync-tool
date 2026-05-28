import { create } from 'zustand'
import type {
    GeneratedStubSummary,
    MappingTable,
    ParamConfig,
    ResourceMapping
} from '../../../main/graph-types'
import type { MatchCandidate } from '../utils/match-utils'

export type { GeneratedStubSummary, MappingTable, MatchCandidate, ParamConfig, ResourceMapping }

function loadStoredSeedArns(): string[] {
    try {
        const stored = JSON.parse(localStorage.getItem('awsync.seedArns') ?? '[]') as unknown
        return Array.isArray(stored) ? stored.filter((v) => typeof v === 'string') : []
    } catch {
        return []
    }
}

function loadStoredUiScale(): number {
    const s = Number(localStorage.getItem('awsync.uiScale') ?? '1')
    return Number.isFinite(s) ? Math.min(1.35, Math.max(0.8, s)) : 1
}

function loadStoredActiveEnvId(): string | null {
    return localStorage.getItem('awsync.activeEnvId')
}

// ─── Environment Configuration ────────────────────────────────────────────────

export interface EnvironmentConfig {
    id: string
    label: string
    profileName?: string
    region: string
    regions?: string[]
    accountId?: string
}

// ─── Graph Node & Edge ────────────────────────────────────────────────────────

export interface GraphNode {
    arn: string
    logicalId: string
    label: string
    service: string
    resourceType: string
    cfnType?: string
    included: boolean
    hidden: boolean
    paramConfig?: Record<string, ParamConfig>
    discoveryState: 'pending' | 'resolved' | 'placeholder'
    classification: 'resource' | 'aws-managed'
    data: Record<string, unknown>
    referencedArns: string[]
    stackId?: string
}

export interface GraphEdge {
    id: string
    source: string
    target: string
    type: string
    labels?: string[]
    sourceParam?: string
}

// ─── Discovery Progress ───────────────────────────────────────────────────────

export interface DiscoveryProgress {
    phase: 'idle' | 'running' | 'complete' | 'error'
    resolved: number
    total: number
    currentArn?: string
    envId?: string
    error?: string
    generatedStubs?: GeneratedStubSummary[]
}

// ─── Store interface ─────────────────────────────────────────────────────────

type GraphSnapshot = { nodes: Map<string, GraphNode>; edges: GraphEdge[] }
const EMPTY_GRAPH_SNAPSHOT: GraphSnapshot = { nodes: new Map(), edges: [] }

interface AppStore {
    // Environments
    environments: EnvironmentConfig[]
    activeEnvId: string | null
    setEnvironments: (environments: EnvironmentConfig[]) => void
    addEnvironment: (env: EnvironmentConfig) => void
    removeEnvironment: (id: string) => void
    setActiveEnvId: (id: string | null) => void

    // Graphs (per environment)
    graphs: Map<string, GraphSnapshot>
    graph: GraphSnapshot
    setGraph: (envId: string, graph: GraphSnapshot) => void
    clearGraph: () => void
    updateNode: (arn: string, patch: Partial<GraphNode>) => void
    updateNodes: (arns: string[], patch: Partial<Pick<GraphNode, 'included' | 'hidden'>>) => void

    // Node selection & sync
    selectedNodeArns: string[]
    setSelectedNodeArns: (arns: string[]) => void
    toggleNodeSelection: (arn: string) => void
    clearSelection: () => void

    syncedNodeArns: string[]
    toggleNodeSync: (arn: string) => void

    // Node collapse state
    collapsedNodeArns: Set<string>
    toggleCollapseNode: (arn: string) => void
    isNodeCollapsed: (arn: string) => boolean

    // Node pin state (pins position in force graph)
    pinnedNodeArns: Set<string>
    togglePinNode: (arn: string) => void
    isNodePinned: (arn: string) => boolean

    // Sidebar panels
    sidebarTab: 'accounts' | 'discovery' | 'resources' | 'export'
    setSidebarTab: (tab: 'accounts' | 'discovery' | 'resources' | 'export') => void

    // Dialogs
    addResourcePanelOpen: boolean
    setAddResourcePanelOpen: (open: boolean) => void

    // Discovery
    seedArns: string[]
    setSeedArns: (arns: string[]) => void
    addSeedArn: (arn: string) => void
    removeSeedArn: (arn: string) => void

    discoveryProgresses: Record<string, DiscoveryProgress>
    setDiscoveryProgress: (envId: string, progress: DiscoveryProgress) => void

    // UI preferences
    uiScale: number
    setUiScale: (scale: number) => void

    // Mapping table (keyed by EnvironmentConfig.id)
    mapping: MappingTable
    setMapping: (mapping: MappingTable) => void
    updateResourceMapping: (envId: string, logicalId: string, data: ResourceMapping) => void
    removeResourceMapping: (envId: string, logicalId: string) => void

    // Resource matching
    matchCandidates: MatchCandidate[]
    confirmedMatchSourceArns: Set<string>
    rejectedMatchSourceArns: Set<string>
    matchPanelOpen: boolean
    matchTargetEnvId: string | null
    setMatchCandidates: (candidates: MatchCandidate[]) => void
    confirmMatch: (sourceArn: string) => void
    rejectMatch: (sourceArn: string) => void
    clearMatchState: () => void
    setMatchPanelOpen: (open: boolean) => void
    setMatchTargetEnvId: (envId: string | null) => void
}

export const useAppStore = create<AppStore>((set, get) => ({
    // Environments
    environments: [],
    activeEnvId: loadStoredActiveEnvId(),
    setEnvironments: (environments) =>
        set((state) => {
            const valid = (id: string | null) => !!id && environments.some((e) => e.id === id)
            const activeEnvId = valid(state.activeEnvId)
                ? state.activeEnvId
                : (environments[0]?.id ?? null)
            if (activeEnvId && activeEnvId !== state.activeEnvId) {
                localStorage.setItem('awsync.activeEnvId', activeEnvId)
            }
            return {
                environments,
                activeEnvId,
                graph: activeEnvId
                    ? (state.graphs.get(activeEnvId) ?? EMPTY_GRAPH_SNAPSHOT)
                    : EMPTY_GRAPH_SNAPSHOT
            }
        }),
    addEnvironment: (env) =>
        set((state) => {
            localStorage.setItem('awsync.activeEnvId', env.id)
            return { environments: [...state.environments, env], activeEnvId: env.id }
        }),
    removeEnvironment: (id) =>
        set((state) => {
            const next = state.environments.filter((e) => e.id !== id)
            const newActiveId = state.activeEnvId === id ? (next[0]?.id ?? null) : state.activeEnvId
            if (newActiveId) localStorage.setItem('awsync.activeEnvId', newActiveId)
            else localStorage.removeItem('awsync.activeEnvId')
            return {
                environments: next,
                activeEnvId: newActiveId,
                graph: newActiveId
                    ? (state.graphs.get(newActiveId) ?? EMPTY_GRAPH_SNAPSHOT)
                    : EMPTY_GRAPH_SNAPSHOT
            }
        }),
    setActiveEnvId: (id) =>
        set((state) => {
            if (id) localStorage.setItem('awsync.activeEnvId', id)
            else localStorage.removeItem('awsync.activeEnvId')
            return {
                activeEnvId: id,
                graph: (id ? state.graphs.get(id) : undefined) ?? EMPTY_GRAPH_SNAPSHOT
            }
        }),

    // Graphs
    graphs: new Map(),
    graph: EMPTY_GRAPH_SNAPSHOT,
    setGraph: (envId, snapshot) =>
        set((state) => {
            const newGraphs = new Map(state.graphs)
            newGraphs.set(envId, snapshot)
            return {
                graphs: newGraphs,
                graph: envId === state.activeEnvId ? snapshot : state.graph
            }
        }),
    clearGraph: () =>
        set((state) => {
            if (!state.activeEnvId) return state
            const newGraphs = new Map(state.graphs)
            newGraphs.set(state.activeEnvId, EMPTY_GRAPH_SNAPSHOT)
            return {
                graphs: newGraphs,
                graph: EMPTY_GRAPH_SNAPSHOT,
                selectedNodeArns: [],
                syncedNodeArns: []
            }
        }),
    updateNode: (arn, patch) =>
        set((state) => {
            const node = state.graph.nodes.get(arn)
            if (!node) return state
            const newNodes = new Map(state.graph.nodes)
            newNodes.set(arn, { ...node, ...patch })
            const newSnapshot: GraphSnapshot = { ...state.graph, nodes: newNodes }
            const newGraphs = new Map(state.graphs)
            if (state.activeEnvId) newGraphs.set(state.activeEnvId, newSnapshot)
            return { graph: newSnapshot, graphs: newGraphs }
        }),
    updateNodes: (arns, patch) =>
        set((state) => {
            const newNodes = new Map(state.graph.nodes)
            for (const arn of arns) {
                const node = newNodes.get(arn)
                if (node) newNodes.set(arn, { ...node, ...patch })
            }
            const newSnapshot: GraphSnapshot = { ...state.graph, nodes: newNodes }
            const newGraphs = new Map(state.graphs)
            if (state.activeEnvId) newGraphs.set(state.activeEnvId, newSnapshot)
            return { graph: newSnapshot, graphs: newGraphs }
        }),

    // Node selection
    selectedNodeArns: [],
    setSelectedNodeArns: (arns) => set({ selectedNodeArns: arns }),
    toggleNodeSelection: (arn) =>
        set((state) => {
            const s = new Set(state.selectedNodeArns)
            s.has(arn) ? s.delete(arn) : s.add(arn)
            return { selectedNodeArns: Array.from(s) }
        }),
    clearSelection: () => set({ selectedNodeArns: [] }),

    syncedNodeArns: [],
    toggleNodeSync: (arn) =>
        set((state) => {
            const s = new Set(state.syncedNodeArns)
            s.has(arn) ? s.delete(arn) : s.add(arn)
            return { syncedNodeArns: Array.from(s) }
        }),

    // Collapse state
    collapsedNodeArns: new Set(),
    toggleCollapseNode: (arn) =>
        set((state) => {
            const s = new Set(state.collapsedNodeArns)
            s.has(arn) ? s.delete(arn) : s.add(arn)
            return { collapsedNodeArns: s }
        }),
    isNodeCollapsed: (arn) => get().collapsedNodeArns.has(arn),

    // Pin state
    pinnedNodeArns: new Set(),
    togglePinNode: (arn) =>
        set((state) => {
            const s = new Set(state.pinnedNodeArns)
            s.has(arn) ? s.delete(arn) : s.add(arn)
            return { pinnedNodeArns: s }
        }),
    isNodePinned: (arn) => get().pinnedNodeArns.has(arn),

    // Sidebar
    sidebarTab: 'accounts',
    setSidebarTab: (tab) => set({ sidebarTab: tab }),

    addResourcePanelOpen: false,
    setAddResourcePanelOpen: (open) => set({ addResourcePanelOpen: open }),

    // Discovery
    seedArns: loadStoredSeedArns(),
    setSeedArns: (arns) => {
        const unique = [...new Set(arns)]
        localStorage.setItem('awsync.seedArns', JSON.stringify(unique))
        set({ seedArns: unique })
    },
    addSeedArn: (arn) =>
        set((state) => {
            const seedArns = [...new Set([...state.seedArns, arn])]
            localStorage.setItem('awsync.seedArns', JSON.stringify(seedArns))
            return { seedArns }
        }),
    removeSeedArn: (arn) =>
        set((state) => {
            const seedArns = state.seedArns.filter((s) => s !== arn)
            localStorage.setItem('awsync.seedArns', JSON.stringify(seedArns))
            return { seedArns }
        }),

    discoveryProgresses: {},
    setDiscoveryProgress: (envId, progress) =>
        set((state) => ({
            discoveryProgresses: { ...state.discoveryProgresses, [envId]: progress }
        })),

    uiScale: loadStoredUiScale(),
    setUiScale: (scale) => {
        const clamped = Math.min(1.35, Math.max(0.8, scale))
        localStorage.setItem('awsync.uiScale', String(clamped))
        set({ uiScale: clamped })
    },

    // Mapping
    mapping: {},
    setMapping: (mapping) => set({ mapping }),
    updateResourceMapping: (envId, logicalId, data) =>
        set((state) => ({
            mapping: {
                ...state.mapping,
                [envId]: { ...(state.mapping[envId] ?? {}), [logicalId]: data }
            }
        })),
    removeResourceMapping: (envId, logicalId) =>
        set((state) => {
            const acct = state.mapping[envId]
            if (!acct) return state
            const { [logicalId]: _, ...rest } = acct
            const { [envId]: __, ...tableRest } = state.mapping
            return {
                mapping: Object.keys(rest).length > 0 ? { ...tableRest, [envId]: rest } : tableRest
            }
        }),

    // Match state
    matchCandidates: [],
    confirmedMatchSourceArns: new Set(),
    rejectedMatchSourceArns: new Set(),
    matchPanelOpen: false,
    matchTargetEnvId: null,
    setMatchCandidates: (candidates) => set({ matchCandidates: candidates }),
    confirmMatch: (sourceArn) =>
        set((state) => ({
            confirmedMatchSourceArns: new Set([...state.confirmedMatchSourceArns, sourceArn]),
            rejectedMatchSourceArns: new Set(
                [...state.rejectedMatchSourceArns].filter((a) => a !== sourceArn)
            )
        })),
    rejectMatch: (sourceArn) =>
        set((state) => ({
            rejectedMatchSourceArns: new Set([...state.rejectedMatchSourceArns, sourceArn]),
            confirmedMatchSourceArns: new Set(
                [...state.confirmedMatchSourceArns].filter((a) => a !== sourceArn)
            )
        })),
    clearMatchState: () =>
        set({
            matchCandidates: [],
            confirmedMatchSourceArns: new Set(),
            rejectedMatchSourceArns: new Set(),
            matchPanelOpen: false,
            matchTargetEnvId: null
        }),
    setMatchPanelOpen: (open) => set({ matchPanelOpen: open }),
    setMatchTargetEnvId: (envId) => set({ matchTargetEnvId: envId })
}))
