import type { CdkGenerator, GenContext } from '../types'
import type { GraphNode } from '../../../graph-types'
import { decodeRefToken } from '../../../discovery/arn'
import { connectInstanceRef, resolveConnectNodeRef } from './_shared'

const HIERARCHY_LEVELS = ['LevelOne', 'LevelTwo', 'LevelThree', 'LevelFour', 'LevelFive'] as const

function hierarchyParentArn(node: GraphNode): string | undefined {
    const path = node.data?.HierarchyPath as Record<string, { Arn?: string }> | undefined
    if (!path) return undefined
    let currentIdx = -1
    for (let i = 0; i < HIERARCHY_LEVELS.length; i++) {
        if (path[HIERARCHY_LEVELS[i]]) currentIdx = i
    }
    if (currentIdx <= 0) return undefined
    const raw = path[HIERARCHY_LEVELS[currentIdx - 1]]?.Arn
    return raw ? (decodeRefToken(raw) ?? raw) : undefined
}

function topoSortHierarchyGroups(nodes: GraphNode[]): GraphNode[] {
    const byArn = new Map(nodes.map((n) => [n.arn.raw, n]))
    const inDegree = new Map(nodes.map((n) => [n.arn.raw, 0]))
    const children = new Map<string, GraphNode[]>(nodes.map((n) => [n.arn.raw, []]))
    for (const node of nodes) {
        const parent = hierarchyParentArn(node)
        if (parent && byArn.has(parent)) {
            inDegree.set(node.arn.raw, (inDegree.get(node.arn.raw) ?? 0) + 1)
            children.get(parent)!.push(node)
        }
    }
    const queue = nodes.filter((n) => inDegree.get(n.arn.raw) === 0)
    const result: GraphNode[] = []
    while (queue.length) {
        const n = queue.shift()!
        result.push(n)
        for (const child of children.get(n.arn.raw) ?? []) {
            const deg = (inDegree.get(child.arn.raw) ?? 1) - 1
            inDegree.set(child.arn.raw, deg)
            if (deg === 0) queue.push(child)
        }
    }
    return result.length === nodes.length ? result : nodes
}

function genHierarchyStructure(ctx: GenContext): string | null {
    type HLevel = { Id?: string; Arn?: string; Name?: string }
    const instanceNode = ctx.connectInstanceNode
    if (!instanceNode) return null
    const hs = instanceNode.data?.HierarchyStructure as Record<string, HLevel> | undefined
    if (!hs) return null

    const levelKeys = ['LevelOne', 'LevelTwo', 'LevelThree', 'LevelFour', 'LevelFive'] as const
    const cdkKeys = ['levelOne', 'levelTwo', 'levelThree', 'levelFour', 'levelFive'] as const
    const levelLines: string[] = []
    for (let i = 0; i < levelKeys.length; i++) {
        const level = hs[levelKeys[i]]
        if (level?.Name) {
            levelLines.push(`        ${cdkKeys[i]}: { name: ${JSON.stringify(level.Name)} },`)
        }
    }
    if (levelLines.length === 0) return null

    const instanceRef = ctx.connectInstArnExpr
    return `    const ConnectHierarchyStructure = new connect.CfnUserHierarchyStructure(this, 'ConnectHierarchyStructure', {
      instanceArn: ${instanceRef},
      userHierarchyStructure: {
${levelLines.join('\n')}
      },
    });`
}

const generator: CdkGenerator = {
    service: 'connect',
    resourceType: 'agent-hierarchy',

    sortNodes: topoSortHierarchyGroups,

    genPreamble(_nodes, ctx) {
        return genHierarchyStructure(ctx)
    },

    genSynced(node, ctx) {
        const d = node.data
        if (!d) return ''
        const id = ctx.nodeId(node)
        const instanceRef = connectInstanceRef(ctx)

        // Use a sentinel fallback so we can detect unresolved parents.
        // Emitting the source ARN as fallback would fail at deploy with
        // "does not belong to connect instance".
        const PARENT_UNRESOLVED = "'__PARENT_UNRESOLVED__'"
        const rawParentArn = hierarchyParentArn(node)
        let parentExpr = rawParentArn
            ? resolveConnectNodeRef(
                  rawParentArn,
                  ctx,
                  'attrUserHierarchyGroupArn',
                  PARENT_UNRESOLVED
              )
            : undefined
        if (parentExpr === PARENT_UNRESOLVED) parentExpr = undefined

        return `    const ${id} = new connect.CfnUserHierarchyGroup(this, '${id}', {
      instanceArn: ${instanceRef},
      name: ${JSON.stringify(d.Name)},
      ${parentExpr ? `parentGroupArn: ${parentExpr},` : ''}
    });`
    }
}
export default generator
