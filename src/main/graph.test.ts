import { describe, it, expect } from 'vitest'
import { mergeResolvedRefs, Graph } from './graph'
import { parseARN } from './discovery/arn'
import type { ResolvedRef } from './graph-types'
import type { GraphNode } from './graph-types'

const DUMMY_ARN = parseARN('arn:aws:lambda:us-east-1:123456789012:function:test')!

function ref(path: string, targetId: string | undefined, resolved: boolean): ResolvedRef {
    return {
        sourcePath: path.split('.'),
        targetLogicalId: targetId,
        originalArn: DUMMY_ARN,
        resolved,
    }
}

describe('mergeResolvedRefs', () => {
    it('returns incoming when existing is empty', () => {
        const incoming = [ref('FunctionArn', 'MyFn', true)]
        expect(mergeResolvedRefs([], incoming)).toEqual(incoming)
    })

    it('returns existing when incoming is empty', () => {
        const existing = [ref('FunctionArn', 'MyFn', true)]
        expect(mergeResolvedRefs(existing, [])).toEqual(existing)
    })

    it('deduplicates same path + same target', () => {
        const a = [ref('FunctionArn', 'MyFn', true)]
        const b = [ref('FunctionArn', 'MyFn', true)]
        expect(mergeResolvedRefs(a, b)).toHaveLength(1)
    })

    it('resolved incoming wins over unresolved existing', () => {
        const existing = [ref('FunctionArn', undefined, false)]
        const incoming = [ref('FunctionArn', 'MyFn', true)]
        const result = mergeResolvedRefs(existing, incoming)
        expect(result).toHaveLength(1)
        expect(result[0].resolved).toBe(true)
        expect(result[0].targetLogicalId).toBe('MyFn')
    })

    it('keeps existing resolved when incoming is unresolved', () => {
        const existing = [ref('FunctionArn', 'MyFn', true)]
        const incoming = [ref('FunctionArn', undefined, false)]
        const result = mergeResolvedRefs(existing, incoming)
        expect(result).toHaveLength(1)
        expect(result[0].resolved).toBe(true)
    })

    it('keeps both when both resolved but different targets', () => {
        const a = [ref('FunctionArn', 'FnA', true)]
        const b = [ref('FunctionArn', 'FnB', true)]
        const result = mergeResolvedRefs(a, b)
        expect(result).toHaveLength(2)
        const ids = result.map((r) => r.targetLogicalId).sort()
        expect(ids).toEqual(['FnA', 'FnB'])
    })

    it('appends refs with new paths', () => {
        const a = [ref('FunctionArn', 'MyFn', true)]
        const b = [ref('RoleArn', 'MyRole', true)]
        const result = mergeResolvedRefs(a, b)
        expect(result).toHaveLength(2)
    })

    it('keeps only one entry when both refs are unresolved for the same path', () => {
        const a = [ref('FunctionArn', undefined, false)]
        const b = [ref('FunctionArn', undefined, false)]
        const result = mergeResolvedRefs(a, b)
        expect(result).toHaveLength(1)
        expect(result[0].resolved).toBe(false)
    })
})

function makeNode(logicalId: string, arnStr: string, refArns: string[] = []): GraphNode {
    const arn = parseARN(arnStr)!
    return {
        logicalId,
        label: logicalId,
        arn,
        included: true,
        hidden: false,
        discoveredRefs: refArns.map((a, i) => ({ arn: parseARN(a)!, path: [`Ref${i}`] })),
    }
}

describe('Graph.resolveReferences accumulation', () => {
    it('accumulates resolvedRefs from two envs without overwriting', () => {
        const graph = new Graph()
        const fnArnA = 'arn:aws:lambda:us-west-2:111111111111:function:fn'
        const fnArnB = 'arn:aws:lambda:us-west-2:222222222222:function:fn'
        const roleArnA = 'arn:aws:iam::111111111111:role/role'
        const roleArnB = 'arn:aws:iam::222222222222:role/role'

        graph.addNode(makeNode('MyFn', fnArnA, [roleArnA]), '111111111111')
        graph.addNode(makeNode('MyFn', fnArnB, [roleArnB]), '222222222222')
        graph.addNode(makeNode('MyRole', roleArnA), '111111111111')
        graph.addNode(makeNode('MyRole', roleArnB), '222222222222')

        graph.resolveReferences('111111111111')
        graph.resolveReferences('222222222222')

        const fn = graph.nodes.get('MyFn')!
        // Both envs resolve to the same logicalId — should deduplicate to 1 entry
        expect(fn.resolvedRefs).toHaveLength(1)
        expect(fn.resolvedRefs![0].resolved).toBe(true)
        expect(fn.resolvedRefs![0].targetLogicalId).toBe('MyRole')
    })

    it('does not duplicate refs when called twice for same env', () => {
        const graph = new Graph()
        const fnArn = 'arn:aws:lambda:us-west-2:111111111111:function:fn'
        const roleArn = 'arn:aws:iam::111111111111:role/role'

        graph.addNode(makeNode('MyFn', fnArn, [roleArn]), '111111111111')
        graph.addNode(makeNode('MyRole', roleArn), '111111111111')

        graph.resolveReferences('111111111111')
        graph.resolveReferences('111111111111')

        expect(graph.nodes.get('MyFn')!.resolvedRefs).toHaveLength(1)
    })

    it('keeps resolved ref from env A when env B cannot resolve the same path', () => {
        const graph = new Graph()
        const fnArnA = 'arn:aws:lambda:us-west-2:111111111111:function:fn'
        const fnArnB = 'arn:aws:lambda:us-west-2:222222222222:function:fn'
        const roleArnA = 'arn:aws:iam::111111111111:role/role'

        // MyFn exists in both envs — both have a discoveredRef pointing to the role
        // But MyRole only exists in env A (111111111111), not in env B (222222222222)
        graph.addNode(makeNode('MyFn', fnArnA, [roleArnA]), '111111111111')
        graph.addNode(makeNode('MyFn', fnArnB, [roleArnA]), '222222222222')  // env B's fn still refs env A's role ARN
        graph.addNode(makeNode('MyRole', roleArnA), '111111111111')  // only in env A

        graph.resolveReferences('111111111111')  // resolves: env A's role ARN → MyRole
        graph.resolveReferences('222222222222')  // env B has no nodes → roleArnA not in its index → unresolved

        const fn = graph.nodes.get('MyFn')!
        // The resolved ref from env A must be preserved (not overwritten by env B's unresolved)
        expect(fn.resolvedRefs).toHaveLength(1)
        expect(fn.resolvedRefs![0].resolved).toBe(true)
        expect(fn.resolvedRefs![0].targetLogicalId).toBe('MyRole')
    })
})
