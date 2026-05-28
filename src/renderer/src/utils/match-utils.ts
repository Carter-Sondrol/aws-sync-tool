import type { GraphEdge, GraphNode } from './stores/app-store'

export interface MatchCandidate {
    sourceLogicalId: string
    sourceLabel: string
    sourceArn: string
    targetLogicalId: string
    targetLabel: string
    targetArn: string
    strategy: 'exact' | 'topology' | 'fuzzy'
    confidence: number
}

type GraphData = { nodes: Map<string, GraphNode>; edges: GraphEdge[] }

export function findMatches(sourceGraph: GraphData, targetGraph: GraphData): MatchCandidate[] {
    const sourceByLogicalId = buildIndex(sourceGraph)
    const targetByLogicalId = buildIndex(targetGraph)
    const matchedSourceIds = new Set<string>()
    const matchedTargetIds = new Set<string>()
    const results: MatchCandidate[] = []

    // Exact logicalId match
    for (const [lid, srcNodes] of sourceByLogicalId) {
        if (targetByLogicalId.has(lid)) {
            for (const src of srcNodes) {
                if (matchedSourceIds.has(src.arn)) continue
                const tgt = targetByLogicalId.get(lid)![0]
                if (matchedTargetIds.has(tgt.arn)) continue
                results.push({
                    sourceLogicalId: src.logicalId,
                    sourceLabel: src.label,
                    sourceArn: src.arn,
                    targetLogicalId: tgt.logicalId,
                    targetLabel: tgt.label,
                    targetArn: tgt.arn,
                    strategy: 'exact',
                    confidence: 1.0
                })
                matchedSourceIds.add(src.arn)
                matchedTargetIds.add(tgt.arn)
            }
        }
    }

    // Topology match — same parent children count + edge pattern
    const sourceTopology = buildTopologyIndex(sourceGraph, matchedSourceIds)
    const targetTopology = buildTopologyIndex(targetGraph, matchedTargetIds)
    for (const [sig, srcGroups] of sourceTopology) {
        if (targetTopology.has(sig)) {
            const tgtGroups = targetTopology.get(sig)!
            for (const src of srcGroups) {
                if (matchedSourceIds.has(src.arn)) continue
                const tgt = tgtGroups.find((t) => !matchedTargetIds.has(t.arn))
                if (!tgt) continue
                results.push({
                    sourceLogicalId: src.logicalId,
                    sourceLabel: src.label,
                    sourceArn: src.arn,
                    targetLogicalId: tgt.logicalId,
                    targetLabel: tgt.label,
                    targetArn: tgt.arn,
                    strategy: 'topology',
                    confidence: 0.75
                })
                matchedSourceIds.add(src.arn)
                matchedTargetIds.add(tgt.arn)
            }
        }
    }

    // Fuzzy label match — token overlap >= threshold
    const remainingSource = Array.from(sourceGraph.nodes.values()).filter(
        (n) => !matchedSourceIds.has(n.arn) && n.classification === 'resource'
    )
    const remainingTarget = Array.from(targetGraph.nodes.values()).filter(
        (n) => !matchedTargetIds.has(n.arn) && n.classification === 'resource'
    )

    for (const src of remainingSource) {
        const best = findBestFuzzyMatch(src, remainingTarget)
        if (best && best.confidence >= 0.5) {
            results.push({
                sourceLogicalId: src.logicalId,
                sourceLabel: src.label,
                sourceArn: src.arn,
                targetLogicalId: best.node.logicalId,
                targetLabel: best.node.label,
                targetArn: best.node.arn,
                strategy: 'fuzzy',
                confidence: best.confidence
            })
            matchedTargetIds.add(best.node.arn)
        }
    }

    return results.sort((a, b) => b.confidence - a.confidence)
}

function buildIndex(graph: GraphData): Map<string, GraphNode[]> {
    const index = new Map<string, GraphNode[]>()
    for (const node of graph.nodes.values()) {
        if (node.classification !== 'resource') continue
        const existing = index.get(node.logicalId) || []
        existing.push(node)
        index.set(node.logicalId, existing)
    }
    return index
}

function buildTopologyIndex(graph: GraphData, excludedArns: Set<string>): Map<string, GraphNode[]> {
    const parentChildren = new Map<string, { parentId: string; children: string[] }>()
    for (const edge of graph.edges) {
        if (excludedArns.has(edge.sourceLogicalId) || excludedArns.has(edge.targetLogicalId))
            continue
        const src = graph.nodes.get(edge.sourceLogicalId)
        const tgt = graph.nodes.get(edge.targetLogicalId)
        if (!src || !tgt) continue
        const sig = `${src.service}::${tgt.service}::${tgt.resourceType}`
        if (!parentChildren.has(sig)) {
            parentChildren.set(sig, { parentId: edge.sourceLogicalId, children: [] })
        }
        parentChildren.get(sig)!.children.push(edge.targetLogicalId)
    }

    const index = new Map<string, GraphNode[]>()
    for (const [sig, group] of parentChildren) {
        if (group.children.length < 2) continue
        const childCountSig = `${sig}::${group.children.length}`
        for (const childArn of group.children) {
            const node = graph.nodes.get(childArn)
            if (node && !excludedArns.has(childArn)) {
                const existing = index.get(childCountSig) || []
                existing.push(node)
                index.set(childCountSig, existing)
            }
        }
    }
    return index
}

function findBestFuzzyMatch(
    source: GraphNode,
    targets: GraphNode[]
): { node: GraphNode; confidence: number } | null {
    const srcTokens = tokenize(source.label + ' ' + source.logicalId)
    let best: { node: GraphNode; confidence: number } | null = null

    for (const tgt of targets) {
        const tgtTokens = tokenize(tgt.label + ' ' + tgt.logicalId)
        const conf = tokenOverlap(srcTokens, tgtTokens)
        if (conf > (best?.confidence ?? 0)) {
            best = { node: tgt, confidence: conf }
        }
    }
    return best
}

function tokenize(str: string): Set<string> {
    return new Set(
        str
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .split(/\s+/)
            .filter(Boolean)
    )
}

function tokenOverlap(a: Set<string>, b: Set<string>): number {
    let hits = 0
    for (const token of a) {
        if (b.has(token)) hits++
    }
    const union = new Set([...a, ...b])
    return union.size > 0 ? hits / union.size : 0
}
