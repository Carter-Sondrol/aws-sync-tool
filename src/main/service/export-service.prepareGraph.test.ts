import { describe, it, expect, beforeEach } from 'vitest'
import { ExportService } from './export-service'
import { GraphService } from './graph-service'
import { Graph } from '../graph'
import { parseARN } from '../discovery/arn'
import type { GraphNode } from '../graph-types'
import { setDataStore } from '../utils'
import type { DataStore } from '../store'

function makeMemStore(init: Record<string, unknown> = {}): DataStore {
    const data = new Map<string, unknown>(Object.entries(init))
    return {
        readJSON<T>(k: string, fb: T): T {
            return (data.has(k) ? data.get(k) : fb) as T
        },
        writeJSON(k: string, v: unknown): void {
            data.set(k, v)
        },
    } as DataStore
}

function makeNode(logicalId: string, arnStr: string, included = true): GraphNode {
    return {
        logicalId,
        label: logicalId,
        arn: parseARN(arnStr)!,
        included,
        hidden: false,
        discoveredRefs: [],
    }
}

describe('ExportService.prepareGraph', () => {
    let graphSvc: GraphService

    beforeEach(() => {
        setDataStore(
            makeMemStore({
                'links.json': { version: '1', links: [] },
                'environments.json': [
                    { id: 'prod', region: 'us-west-2', profileName: 'p', accountId: '111' },
                    { id: 'staging', region: 'us-west-2', profileName: 's', accountId: '222' },
                ],
            })
        )
        graphSvc = new GraphService()
    })

    it('loads the single env graph when no targetEnvId is given', () => {
        const g = new Graph()
        g.addNode(makeNode('Fn', 'arn:aws:lambda:us-west-2:111:function:fn'), '111')
        graphSvc.save('prod', g)

        const { graph, targetAccountId, sourceAccountId } = ExportService.prepareGraph(
            'prod',
            undefined,
            graphSvc
        )
        expect(graph.nodes.size).toBe(1)
        expect(targetAccountId).toBe('111')
        expect(sourceAccountId).toBe('111')
    })

    it('merges two env graphs when targetEnvId is given and uses target account', () => {
        const gA = new Graph()
        gA.addNode(makeNode('Fn', 'arn:aws:lambda:us-west-2:111:function:fn'), '111')
        graphSvc.save('prod', gA)

        const gB = new Graph()
        gB.addNode(makeNode('OtherFn', 'arn:aws:lambda:us-west-2:222:function:other'), '222')
        graphSvc.save('staging', gB)

        const { targetAccountId, sourceAccountId } = ExportService.prepareGraph(
            'prod',
            'staging',
            graphSvc
        )
        expect(targetAccountId).toBe('222')
        expect(sourceAccountId).toBe('111')
    })

    it('marks AWS-managed nodes (accountId=aws) as not included', () => {
        const g = new Graph()
        g.addNode(makeNode('Fn', 'arn:aws:lambda:us-west-2:111:function:fn'), '111')
        g.addNode(
            makeNode('AwsPolicy', 'arn:aws:iam::aws:policy/AmazonS3ReadOnlyAccess'),
            'aws'
        )
        graphSvc.save('prod', g)

        const { graph } = ExportService.prepareGraph('prod', undefined, graphSvc)
        const awsNode = Array.from(graph.nodes.values()).find(
            (n) => n.arn?.accountId === 'aws'
        )
        expect(awsNode?.included).toBe(false)
    })

    it('marks service-linked roles as not included', () => {
        const g = new Graph()
        g.addNode(
            makeNode(
                'SlrRole',
                'arn:aws:iam::111:role/aws-service-role/elasticloadbalancing/AWSServiceRoleForElasticLoadBalancing'
            ),
            '111'
        )
        graphSvc.save('prod', g)

        const { graph } = ExportService.prepareGraph('prod', undefined, graphSvc)
        const slr = Array.from(graph.nodes.values())[0]
        expect(slr.included).toBe(false)
    })

    it('excludes source nodes whose (service:resourceType:name) appears in target env graph', () => {
        const sourceArn = 'arn:aws:connect:us-west-2:111:instance/i1/hours-of-operation/h1'
        const targetArn = 'arn:aws:connect:us-west-2:222:instance/i2/hours-of-operation/h2'
        const gSrc = new Graph()
        const srcNode = makeNode('TRAHours', sourceArn)
        srcNode.label = 'TRA'
        gSrc.addNode(srcNode, '111')
        graphSvc.save('prod', gSrc)

        const gTgt = new Graph()
        const tgtNode = makeNode('SomethingElse', targetArn)
        tgtNode.label = 'TRA'
        gTgt.addNode(tgtNode, '222')
        graphSvc.save('staging', gTgt)

        const { graph } = ExportService.prepareGraph('prod', 'staging', graphSvc)
        const srcInMerged = Array.from(graph.nodes.values()).find(
            (n) => n.arn?.accountId === '111'
        )
        expect(srcInMerged?.included).toBe(false)
    })

    it('returns the graph unchanged when no exclusion conditions apply', () => {
        const g = new Graph()
        g.addNode(makeNode('Fn', 'arn:aws:lambda:us-west-2:111:function:fn'), '111')
        graphSvc.save('prod', g)

        const { graph } = ExportService.prepareGraph('prod', undefined, graphSvc)
        const fn = Array.from(graph.nodes.values())[0]
        expect(fn.included).toBe(true)
    })
})
