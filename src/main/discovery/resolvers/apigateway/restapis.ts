import {
    APIGatewayClient,
    GetResourcesCommand,
    GetRestApiCommand,
    GetRestApisCommand,
    type Resource
} from '@aws-sdk/client-api-gateway'
import type { ParsedARN } from '../../arn'
import type { Credentials } from '../../CredentialsProvider'
import { BaseResolver } from '../baseResolver'

type RestApiData = {
    RestApiId?: string
    Name?: string
    Description?: string
    EndpointConfiguration?: object
    RootResourceId?: string
    LambdaIntegrations?: Array<{ path: string; method: string; lambdaArn: string }>
    LambdaArns?: string[]
}

function extractLambdaArn(integrationUri: string): string | null {
    // Integration URI: arn:aws:apigateway:{region}:lambda:path/2015-03-31/functions/{lambda-arn}/invocations
    const match = integrationUri.match(/\/functions\/(arn:[^/]+)\/invocations/)
    return match?.[1] ?? null
}

function collectLambdaIntegrations(
    resources: Resource[]
): Array<{ path: string; method: string; lambdaArn: string }> {
    const integrations: Array<{ path: string; method: string; lambdaArn: string }> = []
    for (const resource of resources) {
        if (!resource.resourceMethods) continue
        for (const [method, methodData] of Object.entries(resource.resourceMethods)) {
            const uri = methodData?.methodIntegration?.uri
            if (!uri) continue
            const lambdaArn = extractLambdaArn(uri)
            if (lambdaArn) {
                integrations.push({ path: resource.path ?? '/', method, lambdaArn })
            }
        }
    }
    return integrations
}

export class ApiGatewayRestApisResolver extends BaseResolver<APIGatewayClient, RestApiData> {
    readonly service = 'apigateway'
    readonly resourceType = 'restapis'
    readonly cfnType = 'AWS::ApiGateway::RestApi'

    protected createClient(region: string, creds: Credentials): APIGatewayClient {
        return new APIGatewayClient({ region, credentials: creds })
    }

    protected async fetchResource(
        client: APIGatewayClient,
        arn: ParsedARN
    ): Promise<RestApiData | null> {
        const apiId = arn.resourceId

        const [apiRes, resourcesRes] = await Promise.all([
            client.send(new GetRestApiCommand({ restApiId: apiId })),
            client.send(
                new GetResourcesCommand({ restApiId: apiId, embed: ['methods'], limit: 500 })
            )
        ])

        const resources = resourcesRes.items ?? []
        const rootResource = resources.find((r) => r.path === '/')
        const lambdaIntegrations = collectLambdaIntegrations(resources)

        return {
            RestApiId: apiId,
            Name: apiRes.name,
            Description: apiRes.description,
            EndpointConfiguration: apiRes.endpointConfiguration,
            RootResourceId: rootResource?.id,
            LambdaIntegrations: lambdaIntegrations,
            LambdaArns: lambdaIntegrations.map((i) => i.lambdaArn)
        }
    }

    logicalId(data: Record<string, unknown> | undefined, arn: ParsedARN): string {
        return (data?.Name as string | undefined) ?? arn.resourceId
    }

    label(data: Record<string, unknown> | undefined, arn: ParsedARN): string {
        return this.logicalId(data, arn)
    }

    async list(
        regions: string[],
        _accountId: string
    ): Promise<Array<{ arn: string; name: string }>> {
        const results: Array<{ arn: string; name: string }> = []
        await Promise.allSettled(
            regions.map(async (r) => {
                const creds = await this.getCredentials()
                const client = new APIGatewayClient({ region: r, credentials: creds })
                let position: string | undefined
                do {
                    const res = await client.send(new GetRestApisCommand({ limit: 100, position }))
                    for (const api of res.items ?? []) {
                        if (api.id)
                            results.push({
                                arn: `arn:aws:apigateway:${r}::/restapis/${api.id}`,
                                name: api.name ?? api.id
                            })
                    }
                    position = res.position
                } while (position)
            })
        )
        return results
    }
}

export default ApiGatewayRestApisResolver
