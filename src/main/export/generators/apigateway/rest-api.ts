import type { CdkGenerator } from '../types'
import { lambdaFunctionRef } from '../shared'

const generator: CdkGenerator = {
    service: 'apigateway',
    resourceType: 'restapis',
    genSynced(node, ctx) {
        const d = node.data
        if (!d) return ''
        const id = ctx.nodeId(node)
        const integrations =
            (d.LambdaIntegrations as Array<{ path: string; method: string; lambdaArn: string }>) ?? []

        const stageName = String(d.StageName ?? 'prod')

        if (integrations.length === 0) {
            return `    const ${id} = new apigateway.RestApi(this, '${id}', {
      restApiName: ${JSON.stringify(d.Name)},
      deployOptions: { stageName: ${JSON.stringify(stageName)} },
    });
    // TODO: add Lambda integrations — none discovered`
        }

        const routeLines = integrations.map((i, idx) => {
            const fnRef = lambdaFunctionRef(i.lambdaArn, ctx, `${id}Route${idx}`)
            const varName = `${id}Integration${idx}`
            const resourcePath =
                i.path === '/' ? `${id}.root` : `${id}.root.resourceForPath(${JSON.stringify(i.path)})`
            return `    const ${varName} = new apigateway.LambdaIntegration(${fnRef}, { proxy: true });
    ${resourcePath}.addMethod(${JSON.stringify(i.method)}, ${varName});`
        })

        return `    const ${id} = new apigateway.RestApi(this, '${id}', {
      restApiName: ${JSON.stringify(d.Name)},
      deployOptions: { stageName: ${JSON.stringify(stageName)} },
      ${d.Description ? `description: ${JSON.stringify(d.Description)},` : ''}
    });
${routeLines.join('\n')}`
    },
    genReferenced(node, ctx) {
        const d = node.data
        if (!d) return ''
        const id = ctx.nodeId(node)
        const rootResourceId = d.RootResourceId as string | undefined
        if (rootResourceId) {
            return `    const ${id} = apigateway.RestApi.fromRestApiAttributes(this, '${id}', {
      restApiId: arns.${id},
      rootResourceId: ${JSON.stringify(rootResourceId)},
    });`
        }
        return `    const ${id} = apigateway.RestApi.fromRestApiId(this, '${id}', arns.${id});`
    },
}

export default generator
