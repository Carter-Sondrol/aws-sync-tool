import type { GraphNode, MappingTable, GraphEdge } from '../../graph-types'

export interface GeneratedFile {
    path: string
    content: string
}

export interface LambdaArtifact {
    arn: string
    id: string
    type: 'function' | 'layer'
    region: string
    functionName?: string
    layerName?: string
    layerVersion?: number
}

export interface CdkProjectOutput {
    files: GeneratedFile[]
    artifacts: LambdaArtifact[]
}

export interface CdkGeneratorInput {
    nodes: GraphNode[]
    edges: GraphEdge[]
    stackName: string
    mapping?: MappingTable
    targetAccountId?: string
}

export interface GenContext {
    /** Secondary index: raw ARN string → node. Used to resolve ARN values found in node data. */
    nodeByArn: Map<string, GraphNode>
    /** Set of logicalIds for synced (in-stack) nodes with data. Primary identity key. */
    inScopeIds: Set<string>
    /** Set of raw ARN strings for synced (in-stack) nodes with data. Parallel to inScopeIds. */
    inScopeArns: Set<string>
    nodeId(n: GraphNode): string
    connectInstArnExpr: string
    connectParamDecl: string | null
    connectInstanceNode?: GraphNode
    logicalIdToNode: Map<string, GraphNode>
    targetAccountId: string
    mapping: MappingTable
    /** ARNs of excluded nodes actually referenced via arns.ts during generation. */
    arnsUsed: Set<string>
}

export type GenResult = string | { code: string; files?: GeneratedFile[] }

export interface CdkGenerator {
    service: string
    resourceType: string
    genSynced?(node: GraphNode, ctx: GenContext): GenResult
    genReferenced?(node: GraphNode, ctx: GenContext): string
    genPreamble?(nodes: GraphNode[], ctx: GenContext): string | null
    sortNodes?(nodes: GraphNode[]): GraphNode[]
}
