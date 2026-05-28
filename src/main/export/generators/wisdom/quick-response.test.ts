import { describe, it, expect } from 'vitest'
import generator from './quick-response'
import { parseARN } from '../../../discovery/arn'
import type { GenContext } from '../types'
import type { GraphNode } from '../../../graph-types'

const SRC_ACCT = '111111111111'
const TGT_ACCT = '222222222222'
const SRC_KB_ARN = `arn:aws:wisdom:us-west-2:${SRC_ACCT}:knowledge-base/kb-src`
const TGT_KB_ARN = `arn:aws:wisdom:us-west-2:${TGT_ACCT}:knowledge-base/kb-tgt`
const SRC_INST = `arn:aws:connect:us-west-2:${SRC_ACCT}:instance/i-src`
const TGT_INST = `arn:aws:connect:us-west-2:${TGT_ACCT}:instance/i-tgt`
const SRC_RP_ARN = `${SRC_INST}/routing-profile/rp-src`
const TGT_RP_ARN = `${TGT_INST}/routing-profile/rp-tgt`

function makeKbNode(): GraphNode {
    const envData = new Map<string, { arn: ReturnType<typeof parseARN> }>()
    envData.set(SRC_ACCT, { arn: parseARN(SRC_KB_ARN)! })
    envData.set(TGT_ACCT, { arn: parseARN(TGT_KB_ARN)! })
    return {
        logicalId: 'QuickResponseKB',
        label: 'QuickResponseKB',
        arn: parseARN(SRC_KB_ARN)!,
        included: false,
        hidden: false,
        discoveredRefs: [],
        envData: envData as any,
    }
}

function makeRpNode(): GraphNode {
    const envData = new Map<string, { arn: ReturnType<typeof parseARN> }>()
    envData.set(SRC_ACCT, { arn: parseARN(SRC_RP_ARN)! })
    envData.set(TGT_ACCT, { arn: parseARN(TGT_RP_ARN)! })
    return {
        logicalId: 'AgentRP',
        label: 'AgentRP',
        arn: parseARN(SRC_RP_ARN)!,
        included: false,
        hidden: false,
        discoveredRefs: [],
        envData: envData as any,
    }
}

function makeCtx(nodes: GraphNode[]): GenContext {
    const nodeByArn = new Map<string, GraphNode>()
    for (const n of nodes) {
        nodeByArn.set(n.arn.raw, n)
        if (n.envData) for (const s of n.envData.values()) nodeByArn.set(s.arn.raw, n)
    }
    return {
        nodeByArn,
        inScopeIds: new Set(),
        inScopeArns: new Set(),
        nodeId: (n) => n.logicalId,
        connectInstArnExpr: 'arns.ConnectInstance',
        connectParamDecl: null,
        logicalIdToNode: new Map(nodes.map((n) => [n.logicalId, n])),
        targetAccountId: TGT_ACCT,
        mapping: {},
        arnsUsed: new Set(),
    }
}

describe('wisdom quick-response generator', () => {
    it('skips QuickResponse when both plainText and markdown content are empty', () => {
        const kb = makeKbNode()
        const ctx = makeCtx([kb])
        const qr: GraphNode = {
            logicalId: 'EmptyQR',
            label: 'EmptyQR',
            arn: parseARN(`${SRC_KB_ARN.replace('knowledge-base', 'quick-response')}/qr1`)!,
            included: true,
            hidden: false,
            discoveredRefs: [],
            data: {
                name: 'EmptyQR',
                knowledgeBaseArn: SRC_KB_ARN,
                contents: { plainText: { content: '' } },
            },
        }
        const result = generator.genSynced!(qr, ctx)
        const code = typeof result === 'string' ? result : result.code
        expect(code).toContain('empty content, skipping')
        expect(code).not.toContain('new wisdom.CfnQuickResponse')
    })

    it('rewrites groupingConfiguration values from source ARN to target ARN', () => {
        const kb = makeKbNode()
        const rp = makeRpNode()
        const ctx = makeCtx([kb, rp])
        const qr: GraphNode = {
            logicalId: 'GroupedQR',
            label: 'GroupedQR',
            arn: parseARN(`${SRC_KB_ARN.replace('knowledge-base', 'quick-response')}/qr2`)!,
            included: true,
            hidden: false,
            discoveredRefs: [],
            data: {
                name: 'GroupedQR',
                knowledgeBaseArn: SRC_KB_ARN,
                contents: { plainText: { content: 'hello' } },
                groupingConfiguration: {
                    criteria: 'RoutingProfileArn',
                    values: [SRC_RP_ARN],
                },
            },
        }
        const result = generator.genSynced!(qr, ctx)
        const code = typeof result === 'string' ? result : result.code
        expect(code).toContain(TGT_RP_ARN)
        expect(code).not.toContain(SRC_RP_ARN)
    })

    it('omits groupingConfiguration when no values can be rewritten', () => {
        const kb = makeKbNode()
        const ctx = makeCtx([kb])
        const qr: GraphNode = {
            logicalId: 'OrphanGroupingQR',
            label: 'OrphanGroupingQR',
            arn: parseARN(`${SRC_KB_ARN.replace('knowledge-base', 'quick-response')}/qr3`)!,
            included: true,
            hidden: false,
            discoveredRefs: [],
            data: {
                name: 'OrphanGroupingQR',
                knowledgeBaseArn: SRC_KB_ARN,
                contents: { plainText: { content: 'hi' } },
                groupingConfiguration: {
                    criteria: 'RoutingProfileArn',
                    values: ['arn:aws:connect:us-west-2:111111111111:instance/i-other/routing-profile/unknown'],
                },
            },
        }
        const result = generator.genSynced!(qr, ctx)
        const code = typeof result === 'string' ? result : result.code
        expect(code).not.toContain('groupingConfiguration')
    })
})
