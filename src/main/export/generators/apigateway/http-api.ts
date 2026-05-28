import type { CdkGenerator } from '../types'
import { lambdaFunctionRef } from '../shared'

const generator: CdkGenerator = {
    service: 'apigateway',
    resourceType: 'apis',
    genSynced(node, ctx) {
        const d = node.data
        if (!d) return ''
        const id = ctx.nodeId(node)
        const integrations =
            (d.LambdaIntegrations as Array<{ routeKey: string; lambdaArn: string }>) ?? []

        if (integrations.length === 0) {
            return `    const ${id} = new apigatewayv2.HttpApi(this, '${id}', {
      apiName: ${JSON.stringify(d.Name)},
    });
    // TODO: add Lambda integrations — none discovered`
        }

        const routeLines = integrations.map((i, idx) => {
            const fnRef = lambdaFunctionRef(i.lambdaArn, ctx, `${id}Route${idx}`)
            const parts = i.routeKey.split(' ')
            const method = parts[0] === '$default' ? null : parts[0]
            const path = parts[1] ?? '/'
            const integrationVar = `${id}Integration${idx}`
            if (method) {
                return `    const ${integrationVar} = new apigatewayv2integrations.HttpLambdaIntegration(${JSON.stringify(integrationVar)}, ${fnRef});
    ${id}.addRoutes({ path: ${JSON.stringify(path)}, methods: [apigatewayv2.HttpMethod.${method}], integration: ${integrationVar} });`
            }
            // $default route
            return `    const ${integrationVar} = new apigatewayv2integrations.HttpLambdaIntegration(${JSON.stringify(integrationVar)}, ${fnRef});
    ${id}.addRoutes({ path: '/{proxy+}', methods: [apigatewayv2.HttpMethod.ANY], integration: ${integrationVar} });`
        })

        return `    const ${id} = new apigatewayv2.HttpApi(this, '${id}', {
      apiName: ${JSON.stringify(d.Name)},
    });
${routeLines.join('\n')}`
    },
    genReferenced(node, ctx) {
        const id = ctx.nodeId(node)
        return `    const ${id} = apigatewayv2.HttpApi.fromHttpApiAttributes(this, '${id}', {
      httpApiId: arns.${id},
    });`
    },
}

export default generator
