import { useMemo } from 'react'
import { type GraphEdge, type GraphNode, useAppStore } from '../stores/app-store'

export const GROUP_NODE_PREFIX = '__group__:'

export interface FGNode {
    id: string
    label: string
    sublabel: string
    color: string
    shape: 'circle' | 'diamond' | 'hexagon' | 'cylinder' | 'rect'
    synced: boolean
    syncedPartial: boolean
    isGroupCollapsed: boolean
    isPlaceholder: boolean
    isAwsManaged: boolean
    isPending: boolean
    isHiddenNode: boolean
    collapsedChildCount: number
    isGroupNode: boolean
    isSubresource: boolean
    nodeRadius: number
    nodeVal: number
}

export interface FGEdge {
    source: string
    target: string
    label?: string
    color: string
    animated: boolean
    dashArray?: string
}

const SERVICE_COLORS: Record<string, string> = {
    lambda: '#f97316',
    dynamodb: '#22c55e',
    connect: '#3b82f6',
    iam: '#a855f7',
    s3: '#eab308',
    apigateway: '#06b6d4',
    cloudwatch: '#78716c',
    ssm: '#64748b',
    secretsmanager: '#ec4899',
    sqs: '#f59e0b',
    sns: '#10b981',
    kinesis: '#8b5cf6'
}

// Short plural labels for group nodes
const RT_LABELS: Record<string, string> = {
    'contact-flow': 'Contact Flows',
    'contact-flow-module': 'Flow Modules',
    queue: 'Queues',
    'routing-profile': 'Routing',
    'hours-of-operation': 'Hours',
    'agent-state': 'Statuses',
    'security-profile': 'Sec. Profiles',
    'quick-connect': 'Quick Connects',
    rule: 'Rules',
    'task-template': 'Templates',
    'hierarchy-group': 'Hierarchy',
    policy: 'Policies',
    'rest-api': 'REST APIs',
    api: 'APIs',
    table: 'Tables',
    function: 'Functions',
    bucket: 'Buckets',
    role: 'Roles'
}

const NODE_RADIUS = 14
const SUB_NODE_RADIUS = 10
const GROUP_NODE_RADIUS = 8

function nodeVal(r: number): number {
    return (r * r) / 16
}

function nodeColor(node: GraphNode): string {
    return SERVICE_COLORS[node.service] ?? '#60a5fa'
}

function nodeShape(node: GraphNode): FGNode['shape'] {
    if (node.service === 'lambda') return 'circle'
    if (node.service === 'dynamodb') return 'cylinder'
    if (node.service === 'iam') return 'diamond'
    if (node.service === 's3') return 'hexagon'
    if (node.service === 'connect') return 'circle'
    if (node.service === 'apigateway') return 'diamond'
    if (node.service === 'cloudwatch') return 'rect'
    if (node.service === 'ssm') return 'rect'
    if (node.service === 'secretsmanager') return 'hexagon'
    if (node.service === 'sqs') return 'cylinder'
    if (node.service === 'sns') return 'circle'
    if (node.service === 'kinesis') return 'cylinder'
    return 'rect'
}

function toFGNode(n: GraphNode, collapsedChildCount: number, isSubresource: boolean): FGNode {
    const r = isSubresource ? SUB_NODE_RADIUS : NODE_RADIUS
    return {
        id: n.arn,
        label: n.label || n.logicalId,
        sublabel: n.service,
        color: nodeColor(n),
        shape: nodeShape(n),
        synced: n.included,
        syncedPartial: false,
        isGroupCollapsed: false,
        isPlaceholder: n.discoveryState === 'placeholder',
        isAwsManaged: n.classification === 'aws-managed',
        isPending: n.discoveryState === 'pending',
        isHiddenNode: n.hidden,
        collapsedChildCount,
        isGroupNode: false,
        isSubresource,
        nodeRadius: r,
        nodeVal: nodeVal(r)
    }
}

function toFGEdge(edge: GraphEdge): FGEdge {
    return {
        source: edge.sourceLogicalId,
        target: edge.targetLogicalId,
        label: edge.labels?.[0] ?? edge.type,
        color: '#475569',
        animated: false,
        dashArray: '0'
    }
}

interface GroupInfo {
    id: string
    parentArn: string
    childService: string
    childResourceType: string
    children: string[]
}

export function useForceGraphData(): { nodes: FGNode[]; edges: FGEdge[] } {
    const { graph, collapsedNodeArns } = useAppStore()

    const collapsedSet = useMemo(() => collapsedNodeArns, [collapsedNodeArns])

    // ─── Group structure ─────────────────────────────────────────────────────────
    // A group node appears when a parent has 2+ children of the same service:resourceType
    // (same service, different resourceType — catches Connect instance→queues/flows, IAM role→policies)

    const groupStructure = useMemo(() => {
        const groupMap = new Map<string, GroupInfo>()

        for (const edge of graph.edges) {
            const parent = graph.nodes.get(edge.sourceLogicalId)
            const child = graph.nodes.get(edge.targetLogicalId)
            if (!parent || !child) continue
            if (parent.service !== child.service) continue
            if (parent.resourceType === child.resourceType) continue

            const key = `${GROUP_NODE_PREFIX}${edge.sourceLogicalId}:::${child.service}:::${child.resourceType}`
            if (!groupMap.has(key)) {
                groupMap.set(key, {
                    id: key,
                    parentArn: edge.sourceLogicalId,
                    childService: child.service,
                    childResourceType: child.resourceType,
                    children: []
                })
            }
            groupMap.get(key)!.children.push(edge.targetLogicalId)
        }

        // Only keep groups with 2+ children to avoid cluttering single-child relationships
        for (const [key, g] of groupMap) {
            if (g.children.length < 2) groupMap.delete(key)
        }

        return groupMap
    }, [graph.edges, graph.nodes])

    // ─── Collapsed hiding ────────────────────────────────────────────────────────

    const graphRelationships = useMemo(() => {
        const childrenOf = new Map<string, Set<string>>()
        for (const edge of graph.edges) {
            const set = childrenOf.get(edge.sourceLogicalId) ?? new Set<string>()
            set.add(edge.targetLogicalId)
            childrenOf.set(edge.sourceLogicalId, set)
        }
        return { childrenOf }
    }, [graph.edges])

    const foldedGraph = useMemo(() => {
        const hidden = new Set<string>()
        const hiddenCounts = new Map<string, number>()

        const hideExclusiveDescendants = (
            parentArn: string,
            collapsedRootArn: string,
            path = new Set<string>()
        ): void => {
            if (path.has(parentArn)) return
            const nextPath = new Set(path)
            nextPath.add(parentArn)
            const children = graphRelationships.childrenOf.get(parentArn) ?? new Set<string>()
            for (const childArn of children) {
                if (childArn === collapsedRootArn) continue
                if (hidden.has(childArn)) continue
                hidden.add(childArn)
                hiddenCounts.set(collapsedRootArn, (hiddenCounts.get(collapsedRootArn) ?? 0) + 1)
                hideExclusiveDescendants(childArn, collapsedRootArn, nextPath)
            }
        }

        for (const collapsedArn of collapsedSet) {
            if (collapsedArn.startsWith(GROUP_NODE_PREFIX)) {
                const g = groupStructure.get(collapsedArn)
                if (g) {
                    for (const childArn of g.children) {
                        hidden.add(childArn)
                    }
                    hiddenCounts.set(collapsedArn, g.children.length)
                }
            } else {
                hideExclusiveDescendants(collapsedArn, collapsedArn)
            }
        }

        return { hiddenArns: hidden, collapsedChildCounts: hiddenCounts }
    }, [collapsedSet, graphRelationships, groupStructure])

    const { hiddenArns, collapsedChildCounts } = foldedGraph

    // ─── Which ARNs are subresources (children behind group nodes) ───────────────

    const subresourceArns = useMemo(() => {
        const set = new Set<string>()
        for (const g of groupStructure.values()) {
            for (const childArn of g.children) set.add(childArn)
        }
        return set
    }, [groupStructure])

    // ─── Which direct parent→child edges are replaced by group nodes ─────────────

    const replacedEdgeKeys = useMemo(() => {
        const s = new Set<string>()
        for (const g of groupStructure.values()) {
            for (const childArn of g.children) s.add(`${g.parentArn}|||${childArn}`)
        }
        return s
    }, [groupStructure])

    // ─── Which real edges are subsumed by a group connection ─────────────────────
    // If node A has an edge to group member B, but A already connects to the group,
    // don't draw the direct A→B edge — the group path covers it.

    const groupSubsumedEdges = useMemo(() => {
        // Map: arn → set of group ids that contain it
        const arnToGroups = new Map<string, Set<string>>()
        for (const [groupId, g] of groupStructure) {
            for (const childArn of g.children) {
                if (!arnToGroups.has(childArn)) arnToGroups.set(childArn, new Set())
                arnToGroups.get(childArn)!.add(groupId)
            }
        }

        // Map: group id → set of parent ARNs that connect to it
        const groupParents = new Map<string, Set<string>>()
        for (const [groupId, g] of groupStructure) {
            groupParents.set(groupId, new Set([g.parentArn]))
        }

        // Build subsumed edge set: any real edge from a group's parent to a group child
        // is subsumed by the group path.
        const subsumed = new Set<string>()
        for (const [groupId, parents] of groupParents) {
            const g = groupStructure.get(groupId)
            if (!g) continue
            for (const parentArn of parents) {
                for (const childArn of g.children) {
                    subsumed.add(`${parentArn}|||${childArn}`)
                }
            }
        }
        return subsumed
    }, [groupStructure])

    const nodeArns = useMemo(() => new Set(graph.nodes.keys()), [graph.nodes])

    // ─── FG Nodes ────────────────────────────────────────────────────────────────

    const nodes = useMemo<FGNode[]>(() => {
        const result: FGNode[] = []

        // Real nodes
        for (const n of graph.nodes.values()) {
            if (hiddenArns.has(n.arn)) continue
            result.push(
                toFGNode(
                    n,
                    collapsedChildCounts.get(n.arn) ?? 0,
                    subresourceArns.has(n.arn)
                )
            )
        }

        // Synthetic group nodes — visible when parent is visible and group has children
        for (const g of groupStructure.values()) {
            if (hiddenArns.has(g.parentArn)) continue
            const isGroupCollapsed = collapsedSet.has(g.id)
            const visibleChildren = g.children.filter((c) => !hiddenArns.has(c))
            if (visibleChildren.length === 0 && !isGroupCollapsed) continue

            const color = SERVICE_COLORS[g.childService] ?? '#60a5fa'
            const typeLabel = RT_LABELS[g.childResourceType] ?? g.childResourceType

            const includedCount = g.children.reduce(
                (n, arn) => n + (graph.nodes.get(arn)?.included ? 1 : 0),
                0
            )
            const allIncluded = includedCount === g.children.length
            const someIncluded = includedCount > 0

            const displayCount = isGroupCollapsed ? g.children.length : visibleChildren.length

            result.push({
                id: g.id,
                label: typeLabel,
                sublabel: String(displayCount),
                color,
                shape: 'circle',
                synced: allIncluded,
                syncedPartial: someIncluded && !allIncluded,
                isGroupCollapsed,
                isPlaceholder: false,
                isAwsManaged: false,
                isPending: false,
                isHiddenNode: false,
                collapsedChildCount: 0,
                isGroupNode: true,
                isSubresource: false,
                nodeRadius: GROUP_NODE_RADIUS,
                nodeVal: nodeVal(GROUP_NODE_RADIUS)
            })
        }

        return result
    }, [
        graph.nodes,
        hiddenArns,
        collapsedChildCounts,
        subresourceArns,
        groupStructure,
        collapsedSet
    ])

    // ─── FG Edges ────────────────────────────────────────────────────────────────

    const edges = useMemo<FGEdge[]>(() => {
        const result: FGEdge[] = []

        // Real edges — skip replaced ones, group-subsumed ones, and hidden endpoints; dedup same-pair
        const seenEdgeKeys = new Set<string>()
        for (const e of graph.edges) {
            if (e.source === e.target) continue
            if (!nodeArns.has(e.source) || !nodeArns.has(e.target)) continue
            if (hiddenArns.has(e.source) || hiddenArns.has(e.target)) continue
            const eKey = `${e.source}|||${e.target}`
            if (replacedEdgeKeys.has(eKey)) continue
            if (groupSubsumedEdges.has(eKey)) continue
            if (seenEdgeKeys.has(eKey)) continue
            seenEdgeKeys.add(eKey)
            result.push(toFGEdge(e))
        }

        // Synthetic group edges: everything points up — child → group → parent
        for (const g of groupStructure.values()) {
            if (hiddenArns.has(g.parentArn)) continue
            const isGroupCollapsed = collapsedSet.has(g.id)
            const visibleChildren = g.children.filter((c) => !hiddenArns.has(c))
            if (visibleChildren.length === 0 && !isGroupCollapsed) continue

            // Group points TO its parent
            result.push({ source: g.id, target: g.parentArn, color: '#2d3348', animated: false })
            // Children point TO the group
            if (!isGroupCollapsed) {
                for (const childArn of visibleChildren) {
                    result.push({
                        source: childArn,
                        target: g.id,
                        color: '#2d3348',
                        animated: false
                    })
                }
            }
        }

        return result
    }, [
        graph.edges,
        hiddenArns,
        nodeArns,
        replacedEdgeKeys,
        groupSubsumedEdges,
        groupStructure,
        collapsedSet
    ])

    return { nodes, edges }
}
