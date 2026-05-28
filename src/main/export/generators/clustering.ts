import type { GraphNode, GraphEdge } from '../../graph-types'

/** Options for the clusterStacks algorithm. */
export interface ClusterOptions {
    /** Max nodes per stack before forcing a split (default: 480). */
    softLimit?: number
    /** Minimum connected-component size to warrant its own stack (default: 40). */
    minClusterSize?: number
    /** Name of the default/main stack. */
    defaultKey?: string
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

/** Default options. */
const DEFAULTS: Required<ClusterOptions> = {
    softLimit: 480,
    minClusterSize: 40,
    defaultKey: 'MainStack',
}

/** Union-Find for connected-component detection. */
class UnionFind {
    private parent = new Map<string, string>()
    private rank = new Map<string, number>()

    find(x: string): string {
        if (!this.parent.has(x)) this.parent.set(x, x)
        if (this.parent.get(x) !== x) {
            const root = this.find(this.parent.get(x)!)
            this.parent.set(x, root)
        }
        return this.parent.get(x)!
    }

    union(a: string, b: string): void {
        const ra = this.find(a)
        const rb = this.find(b)
        if (ra === rb) return

        const rankA = this.rank.get(ra) ?? 0
        const rankB = this.rank.get(rb) ?? 0

        if (rankA < rankB) {
            this.parent.set(ra, rb)
        } else if (rankA > rankB) {
            this.parent.set(rb, ra)
        } else {
            this.parent.set(rb, ra)
            this.rank.set(ra, rankA + 1)
        }
    }
}

/**
 * Cluster included nodes into stack groups based on connected components.
 *
 * Nodes that are strongly connected via edges form one component and should
 * stay in the same stack. Small components are merged into the default stack.
 */
export function clusterStacks(
    nodes: GraphNode[],
    edges: GraphEdge[],
    options: ClusterOptions = {}
): ClusterResult {
    const opts = { ...DEFAULTS, ...options }
    const defaultKey = opts.defaultKey || 'MainStack'

    // Build adjacency via union-find
    const uf = new UnionFind()
    for (const node of nodes) {
        uf.find(node.logicalId)
    }
    for (const edge of edges) {
        uf.union(edge.sourceLogicalId, edge.targetLogicalId)
    }

    // Group nodes by root
    const components = new Map<string, GraphNode[]>()
    for (const node of nodes) {
        const root = uf.find(node.logicalId)
        const comp = components.get(root) ?? []
        comp.push(node)
        components.set(root, comp)
    }

    // Assign stacks: large components get their own stack, small ones go to default
    const groups = new Map<string, GraphNode[]>()
    let clusterIndex = 0

    for (const [, component] of components) {
        if (component.length < opts.minClusterSize) {
            // Merge into default stack
            const def = groups.get(defaultKey) ?? []
            def.push(...component)
            groups.set(defaultKey, def)
        } else {
            clusterIndex++
            const key = `${opts.defaultKey}Cluster${clusterIndex}`
            groups.set(key, component)
        }
    }

    // Ensure default stack exists even if empty
    if (!groups.has(defaultKey)) {
        groups.set(defaultKey, [])
    }

    // Build info summary
    const info: Array<{ stack: string; count: number; types: string[] }> = []
    for (const [stack, groupNodes] of groups) {
        const types = new Set<string>()
        for (const n of groupNodes) {
            const svc = n.arn?.service || 'unknown'
            const rt = n.arn?.resourceType || 'unknown'
            types.add(`${svc}:${rt}`)
        }
        info.push({ stack, count: groupNodes.length, types: Array.from(types) })
    }

    return { groups, info }
}
