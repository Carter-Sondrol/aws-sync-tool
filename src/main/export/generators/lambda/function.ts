import { decodeRefToken } from '../../../discovery/arn'
import type { GraphNode } from '../../../graph-types'
import { resolveArnRef, resolveParamRef, RUNTIME_MAP, iamRoleRef, lambdaLayerRef } from '../shared'
import type { CdkGenerator, GenContext } from '../types'

function genSynced(node: GraphNode, ctx: GenContext): string {
    const d = node.data
    if (!d) return ''
    const id = ctx.nodeId(node)
    const runtime = RUNTIME_MAP[String(d.Runtime)] ?? 'lambda.Runtime.NODEJS_18_X'
    const envVars = ((d.Environment as Record<string, unknown>)?.Variables ?? {}) as Record<
        string,
        string
    >

    const envLines = Object.entries(envVars).map(([k, v]) => {
        const decoded = typeof v === 'string' ? (decodeRefToken(v) ?? v) : String(v)
        const paramKey = `Environment.Variables.${k}`
        const config = node.paramConfig?.[paramKey]
        // Check mapping override first (supports $.LogicalId.prop syntax)
        const mappingVal = ctx.mapping[ctx.targetAccountId]?.[node.logicalId]?.[k]
        const mappingStr = typeof mappingVal === 'string' ? mappingVal : undefined
        if (mappingStr) {
            const paramRef = resolveParamRef(mappingStr, ctx)
            if (paramRef) return `        ${k}: ${paramRef},`
            return `        ${k}: ${JSON.stringify(mappingStr)},`
        }
        if (config?.edge) {
            const edgeRef = resolveParamRef(config.edge, ctx)
            if (edgeRef) return `        ${k}: ${edgeRef},`
        }
        // Fall back to discovered value
        const ref = decoded.startsWith('arn:') ? resolveArnRef(decoded, ctx) : null
        return `        ${k}: ${ref ?? JSON.stringify(decoded)},`
    })

    const roleArnRaw = String(d.Role ?? '')
    const roleArn = roleArnRaw ? (decodeRefToken(roleArnRaw) ?? roleArnRaw) : ''
    const roleCode = roleArn ? `      role: ${iamRoleRef(roleArn, ctx, `${id}Exec`)},` : ''

    const archStr = Array.isArray(d.Architectures)
        ? String((d.Architectures as string[])[0])
        : 'x86_64'
    const arch = archStr === 'arm64' ? '      architecture: lambda.Architecture.ARM_64,' : ''

    const layerRefs = ((d.Layers as Array<{ Arn?: string }>) ?? [])
        .map((l, i) => {
            const raw = l.Arn
            if (!raw) return null
            const decoded = decodeRefToken(raw) ?? raw
            if (!decoded.startsWith('arn:')) return null
            // lambdaLayerRef handles in-scope, cross-stack, and excluded cases
            return `        ${lambdaLayerRef(decoded, ctx, `${id}Layer${i}`)},`
        })
    const layersCode = layerRefs.length ? `      layers: [\n${layerRefs.join('\n')}\n      ],` : ''

    return `    const ${id} = new lambda.Function(this, '${id}', {
      functionName: ${JSON.stringify(d.FunctionName)},
      runtime: ${runtime},
      handler: ${JSON.stringify(d.Handler)},
      code: lambda.Code.fromAsset(path.join(__dirname, '../src/${id}')),
      timeout: cdk.Duration.seconds(${d.Timeout ?? 30}),
      memorySize: ${d.MemorySize ?? 128},
      environment: {
${envLines.join('\n')}
        ...(envOverrides.${id} ?? {}),
      },
${roleCode}
${layersCode}
${arch}
    });`
}

function genReferenced(node: GraphNode, ctx: GenContext): string {
    const id = ctx.nodeId(node)
    return `    const ${id} = lambda.Function.fromFunctionArn(this, '${id}', arns.${id});`
}

const generator: CdkGenerator = {
    service: 'lambda',
    resourceType: 'function',
    genSynced,
    genReferenced,
}

export default generator
