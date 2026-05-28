import type { GraphNode } from '../../../graph-types'
import { RUNTIME_MAP } from '../shared'
import type { CdkGenerator, GenContext } from '../types'

function genSynced(node: GraphNode, ctx: GenContext): string {
    const d = node.data
    if (!d) return ''
    const id = ctx.nodeId(node)
    const runtimes = (d.CompatibleRuntimes as string[] | undefined) ?? []
    const runtimeRefs = runtimes.map((r) => RUNTIME_MAP[r] ?? JSON.stringify(r)).join(', ')
    return `    const ${id} = new lambda.LayerVersion(this, '${id}', {
      layerVersionName: ${JSON.stringify(d.LayerName)},
      code: lambda.Code.fromAsset(path.join(__dirname, '../layers/${id}')),
${runtimeRefs ? `      compatibleRuntimes: [${runtimeRefs}],` : ''}
${d.Description ? `      description: ${JSON.stringify(d.Description)},` : ''}
    });`
}

function genReferenced(node: GraphNode, ctx: GenContext): string {
    const id = ctx.nodeId(node)
    return `    const ${id} = lambda.LayerVersion.fromLayerVersionArn(this, '${id}', arns.${id});`
}

const generator: CdkGenerator = {
    service: 'lambda',
    resourceType: 'layerversion',
    genSynced,
    genReferenced,
}

export default generator
