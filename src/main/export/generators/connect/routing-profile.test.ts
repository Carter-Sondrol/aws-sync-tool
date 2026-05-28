import { describe, it, expect } from 'vitest'
import generator from './routing-profile'
import { parseARN } from '../../../discovery/arn'
import type { GenContext } from '../types'
import type { GraphNode } from '../../../graph-types'

const INSTANCE_ARN = 'arn:aws:connect:us-west-2:111111111111:instance/inst-1'
const QUEUE_A_ARN = `${INSTANCE_ARN}/queue/queue-a`
const QUEUE_B_ARN = `${INSTANCE_ARN}/queue/queue-b`

function makeIncludedNode(logicalId: string, arnStr: string): GraphNode {
    return {
        logicalId,
        label: logicalId,
        arn: parseARN(arnStr)!,
        included: true,
        hidden: false,
        discoveredRefs: [],
    }
}

function makeCtx(nodes: GraphNode[]): GenContext {
    const nodeByArn = new Map<string, GraphNode>()
    for (const n of nodes) nodeByArn.set(n.arn.raw, n)
    return {
        nodeByArn,
        inScopeIds: new Set(nodes.map((n) => n.logicalId)),
        inScopeArns: new Set(nodes.map((n) => n.arn.raw)),
        nodeId: (n) => n.logicalId,
        connectInstArnExpr: 'arns.ConnectInstance',
        connectParamDecl: null,
        logicalIdToNode: new Map(nodes.map((n) => [n.logicalId, n])),
        targetAccountId: '111111111111',
        mapping: {},
        arnsUsed: new Set(),
    }
}

describe('routing-profile generator', () => {
    it('deduplicates queue configs that collapse to the same (queueArn, channel) tuple', () => {
        const defaultQueue = makeIncludedNode('QDefault', QUEUE_A_ARN)
        const queueB = makeIncludedNode('QueueB', QUEUE_B_ARN)
        const ctx = makeCtx([defaultQueue, queueB])

        const rpNode: GraphNode = {
            logicalId: 'RP1',
            label: 'RP1',
            arn: parseARN(`${INSTANCE_ARN}/routing-profile/rp-1`)!,
            included: true,
            hidden: false,
            discoveredRefs: [],
            data: {
                Name: 'RP1',
                InstanceArn: INSTANCE_ARN,
                DefaultOutboundQueueArn: QUEUE_A_ARN,
                MediaConcurrencies: [{ Channel: 'VOICE', Concurrency: 1 }],
                QueueConfigs: [
                    { QueueArn: QUEUE_B_ARN, Priority: 1, Delay: 0, Channel: 'VOICE' },
                    { QueueArn: QUEUE_B_ARN, Priority: 1, Delay: 0, Channel: 'VOICE' },
                    { QueueArn: QUEUE_B_ARN, Priority: 1, Delay: 0, Channel: 'CHAT' },
                ],
            },
        }

        const result = generator.genSynced!(rpNode, ctx)
        const code = typeof result === 'string' ? result : result.code
        const voiceCount = (code.match(/channel: "VOICE", queueArn: QueueB\.attrQueueArn/g) || []).length
        const chatCount = (code.match(/channel: "CHAT", queueArn: QueueB\.attrQueueArn/g) || []).length
        expect(voiceCount).toBe(1)
        expect(chatCount).toBe(1)
    })
})
