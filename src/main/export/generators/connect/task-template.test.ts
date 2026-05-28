import { describe, it, expect } from 'vitest'
import generator from './task-template'
import { parseARN } from '../../../discovery/arn'
import type { GenContext } from '../types'
import type { GraphNode } from '../../../graph-types'

const SRC_ACCT = '111111111111'
const TGT_ACCT = '222222222222'
const SRC_INST = `arn:aws:connect:us-west-2:${SRC_ACCT}:instance/i-src`
const TGT_INST = `arn:aws:connect:us-west-2:${TGT_ACCT}:instance/i-tgt`
const SRC_CF_ID = 'src-cf-1'
const TGT_CF_ID = 'tgt-cf-1'
const SRC_CF_ARN = `${SRC_INST}/contact-flow/${SRC_CF_ID}`
const TGT_CF_ARN = `${TGT_INST}/contact-flow/${TGT_CF_ID}`

function makeFlowNode(): GraphNode {
    const envData = new Map<string, { arn: ReturnType<typeof parseARN> }>()
    envData.set(SRC_ACCT, { arn: parseARN(SRC_CF_ARN)! })
    envData.set(TGT_ACCT, { arn: parseARN(TGT_CF_ARN)! })
    return {
        logicalId: 'MyFlow',
        label: 'MyFlow',
        arn: parseARN(SRC_CF_ARN)!,
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

describe('connect task-template generator', () => {
    it('uses target-env contact-flow ARN when source flow is excluded but linked', () => {
        const flow = makeFlowNode()
        const ctx = makeCtx([flow])
        const tt: GraphNode = {
            logicalId: 'TT1',
            label: 'TT1',
            arn: parseARN(`${SRC_INST}/task-template/tt1`)!,
            included: true,
            hidden: false,
            discoveredRefs: [],
            data: {
                Name: 'TT1',
                InstanceArn: SRC_INST,
                ContactFlowId: SRC_CF_ID,
                Fields: [],
            },
        }
        const result = generator.genSynced!(tt, ctx)
        const code = typeof result === 'string' ? result : result.code
        expect(code).toContain(TGT_CF_ARN)
        expect(code).not.toContain(SRC_CF_ARN)
    })

    it('skips template when contact-flow has no target counterpart and no QUICK_CONNECT field', () => {
        const ctx = makeCtx([])
        const tt: GraphNode = {
            logicalId: 'OrphanTT',
            label: 'OrphanTT',
            arn: parseARN(`${SRC_INST}/task-template/orphan`)!,
            included: true,
            hidden: false,
            discoveredRefs: [],
            data: {
                Name: 'OrphanTT',
                InstanceArn: SRC_INST,
                ContactFlowId: 'nonexistent-flow',
                Fields: [],
            },
        }
        const result = generator.genSynced!(tt, ctx)
        const code = typeof result === 'string' ? result : result.code
        expect(code).toContain('skipping')
        expect(code).not.toContain('new connect.CfnTaskTemplate')
    })

    it('keeps template without contactFlowArn when a QUICK_CONNECT field is present', () => {
        const ctx = makeCtx([])
        const tt: GraphNode = {
            logicalId: 'QcTT',
            label: 'QcTT',
            arn: parseARN(`${SRC_INST}/task-template/qc`)!,
            included: true,
            hidden: false,
            discoveredRefs: [],
            data: {
                Name: 'QcTT',
                InstanceArn: SRC_INST,
                ContactFlowId: 'missing',
                Fields: [{ Id: { Name: 'q' }, Type: 'QUICK_CONNECT' }],
            },
        }
        const result = generator.genSynced!(tt, ctx)
        const code = typeof result === 'string' ? result : result.code
        expect(code).toContain('new connect.CfnTaskTemplate')
        expect(code).not.toContain('contactFlowArn:')
    })
})
