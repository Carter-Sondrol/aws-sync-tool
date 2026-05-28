import { describe, it, expect } from 'vitest'
import { resolveRef } from './shared'
import { parseARN } from '../../discovery/arn'
import type { GenContext } from './types'
import type { GraphNode } from '../../graph-types'

const ACCT_A = '111111111111'
const ACCT_B = '222222222222'

function makeCtx(targetAccountId: string, nodes: GraphNode[]): GenContext {
    const logicalIdToNode = new Map(nodes.map((n) => [n.logicalId, n]))
    const nodeByArn = new Map<string, GraphNode>()
    for (const n of nodes) {
        nodeByArn.set(n.arn.raw, n)
        if (n.envData) {
            for (const snap of n.envData.values()) nodeByArn.set(snap.arn.raw, n)
        }
    }
    return {
        nodeByArn,
        inScopeIds: new Set(),
        inScopeArns: new Set(),
        nodeId: (n) => n.logicalId,
        connectInstArnExpr: 'arns.ConnectInstance',
        connectParamDecl: null,
        logicalIdToNode,
        targetAccountId,
        mapping: {},
        arnsUsed: new Set(),
    }
}

function makeExcludedNode(logicalId: string, arnA: string, arnB?: string): GraphNode {
    const envData = new Map<string, { arn: ReturnType<typeof parseARN> }>()
    envData.set(ACCT_A, { arn: parseARN(arnA)! })
    if (arnB) envData.set(ACCT_B, { arn: parseARN(arnB)! })
    return {
        logicalId,
        label: logicalId,
        arn: parseARN(arnA)!,
        included: false,
        hidden: false,
        discoveredRefs: [],
        envData: envData as any,
    }
}

function makeSourceNode(logicalId: string, arnStr: string, targetLogicalId: string, refArnStr: string): GraphNode {
    return {
        logicalId,
        label: logicalId,
        arn: parseARN(arnStr)!,
        included: true,
        hidden: false,
        discoveredRefs: [],
        resolvedRefs: [{
            sourcePath: ['RefArn'],
            targetLogicalId,
            originalArn: parseARN(refArnStr)!,
            resolved: true,
        }],
    }
}

describe('resolveTarget env ARN', () => {
    it('uses target env ARN when envData has an entry for targetAccountId', () => {
        const arnA = 'arn:aws:lambda:us-west-2:111111111111:function:fn'
        const arnB = 'arn:aws:lambda:us-west-2:222222222222:function:fn'
        const target = makeExcludedNode('MyFn', arnA, arnB)
        const source = makeSourceNode('Source', 'arn:aws:lambda:us-west-2:222222222222:function:source', 'MyFn', arnA)

        const ctx = makeCtx(ACCT_B, [target, source])
        const result = resolveRef(source, ['RefArn'], ctx)

        expect(result).toBe('arns.MyFn')
        expect(ctx.arnsUsed.has(arnB)).toBe(true)
        expect(ctx.arnsUsed.has(arnA)).toBe(false)
    })

    it('emits REPLACE placeholder when no envData entry for targetAccountId', () => {
        const arnA = 'arn:aws:lambda:us-west-2:111111111111:function:fn'
        // target only has envData for ACCT_A, not ACCT_B
        const target = makeExcludedNode('MyFn', arnA)
        const source = makeSourceNode('Source', 'arn:aws:lambda:us-west-2:222222222222:function:source', 'MyFn', arnA)

        const ctx = makeCtx(ACCT_B, [target, source])
        const result = resolveRef(source, ['RefArn'], ctx)

        expect(result).toBe('"REPLACE:MyFn"')
    })
})
