import { describe, it, expect, beforeEach } from 'vitest'
import { GraphService } from './graph-service'
import { Graph } from '../graph'
import { parseARN } from '../discovery/arn'
import type { GraphNode } from '../graph-types'
import { setDataStore } from '../utils'
import type { DataStore } from '../store'

function makeMemStore(init: Record<string, unknown> = {}): DataStore {
    const data = new Map<string, unknown>(Object.entries(init))
    return {
        readJSON<T>(filename: string, fallback: T): T {
            return (data.has(filename) ? data.get(filename) : fallback) as T
        },
        writeJSON(filename: string, value: unknown): void {
            data.set(filename, value)
        },
    }
}

function makeNode(logicalId: string, arnStr: string): GraphNode {
    return {
        logicalId,
        label: logicalId,
        arn: parseARN(arnStr)!,
        included: true,
        hidden: false,
        discoveredRefs: [],
    }
}

describe('GraphService.merge', () => {
    let service: GraphService

    beforeEach(() => {
        setDataStore(makeMemStore({ 'links.json': { version: '1', links: [] } }))
        service = new GraphService()
    })

    it('merges same-logicalId nodes from two envs into one node with two envData entries', () => {
        const graphA = new Graph()
        graphA.addNode(makeNode('MyFn', 'arn:aws:lambda:us-west-2:111111111111:function:fn'), '111111111111')
        service.save('env-a', graphA)

        const graphB = new Graph()
        graphB.addNode(makeNode('MyFn', 'arn:aws:lambda:us-west-2:222222222222:function:fn'), '222222222222')
        service.save('env-b', graphB)

        const unified = service.merge(['env-a', 'env-b'])

        expect(unified.nodes.size).toBe(1)
        const node = unified.nodes.get('MyFn')!
        expect(node.envData?.has('111111111111')).toBe(true)
        expect(node.envData?.has('222222222222')).toBe(true)
    })

    it('saves unified graph retrievable via loadUnified()', () => {
        const graph = new Graph()
        graph.addNode(makeNode('MyFn', 'arn:aws:lambda:us-west-2:111111111111:function:fn'), '111111111111')
        service.save('env-a', graph)
        service.merge(['env-a'])

        const unified = service.loadUnified()
        expect(unified.nodes.size).toBe(1)
    })

    it('returns empty graph for empty envIds list', () => {
        const unified = service.merge([])
        expect(unified.nodes.size).toBe(0)
    })

    it('resolves references within merged graph', () => {
        const roleArn = 'arn:aws:iam::111111111111:role/role'
        const fnArn = 'arn:aws:lambda:us-west-2:111111111111:function:fn'

        const graph = new Graph()
        graph.addNode(
            {
                ...makeNode('MyFn', fnArn),
                discoveredRefs: [{ arn: parseARN(roleArn)!, path: ['RoleArn'] }],
            },
            '111111111111'
        )
        graph.addNode(makeNode('MyRole', roleArn), '111111111111')
        service.save('env-a', graph)

        const unified = service.merge(['env-a'])
        const fn = unified.nodes.get('MyFn')!
        expect(fn.resolvedRefs?.some((r) => r.targetLogicalId === 'MyRole')).toBe(true)
    })

    it('getAccountId returns the account ID inferred from graph ARNs', () => {
        const graph = new Graph()
        graph.addNode(makeNode('MyFn', 'arn:aws:lambda:us-west-2:111111111111:function:fn'), '111111111111')
        service.save('env-a', graph)

        expect(service.getAccountId('env-a')).toBe('111111111111')
    })

    it('getAccountId returns undefined for unknown env', () => {
        expect(service.getAccountId('nonexistent')).toBeUndefined()
    })
})
