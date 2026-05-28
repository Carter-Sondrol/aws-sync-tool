import {
    ApiGatewayV2Client,
    GetApiCommand,
    GetApisCommand,
    GetIntegrationsCommand,
    GetRoutesCommand
} from '@aws-sdk/client-apigatewayv2'
import type { ParsedARN } from '../../arn'
import type { Credentials } from '../../CredentialsProvider'
import { BaseResolver } from '../baseResolver'

type ApiData = {
    ApiId?: string
    Name?: string
    ProtocolType?: string
    ApiEndpoint?: string
    LambdaIntegrations?: Array<{ routeKey: string; lambdaArn: string }>
    LambdaArns?: string[]
}

export class ApiGatewayV2ApisResolver extends BaseResolver<ApiGatewayV2Client, ApiData> {
    readonly service = 'apigateway'
    readonly resourceType = 'apis'
    readonly cfnType = 'AWS::ApiGatewayV2::Api'

    protected createClient(region: string, creds: Credentials): ApiGatewayV2Client {
        return new ApiGatewayV2Client({ region, credentials: creds })
    }

    protected async fetchResource(
        client: ApiGatewayV2Client,
        arn: ParsedARN
    ): Promise<ApiData | null> {
        const apiId = arn.resourceId

        const [apiRes, routesRes, integrationsRes] = await Promise.all([
            client.send(new GetApiCommand({ ApiId: apiId })),
            client.send(new GetRoutesCommand({ ApiId: apiId })),
            client.send(new GetIntegrationsCommand({ ApiId: apiId }))
        ])

        const integrationArns = new Map<string, string>()
        for (const integration of integrationsRes.Items ?? []) {
            const uri = integration.IntegrationUri
            if (uri?.startsWith('arn:aws:lambda:') && integration.IntegrationId) {
                integrationArns.set(integration.IntegrationId, uri)
            }
        }

        const lambdaIntegrations: Array<{ routeKey: string; lambdaArn: string }> = []
        for (const route of routesRes.Items ?? []) {
            const integrationId = route.Target?.replace('integrations/', '')
            if (!integrationId) continue
            const lambdaArn = integrationArns.get(integrationId)
            if (lambdaArn && route.RouteKey) {
                lambdaIntegrations.push({ routeKey: route.RouteKey, lambdaArn })
            }
        }

        return {
            ApiId: apiId,
            Name: apiRes.Name,
            ProtocolType: apiRes.ProtocolType,
            ApiEndpoint: apiRes.ApiEndpoint,
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
                const client = new ApiGatewayV2Client({ region: r, credentials: creds })
                let nextToken: string | undefined
                do {
                    const res = await client.send(
                        new GetApisCommand({ MaxResults: '100', NextToken: nextToken })
                    )
                    for (const api of res.Items ?? []) {
                        if (api.ApiId)
                            results.push({
                                arn: `arn:aws:apigateway:${r}::/apis/${api.ApiId}`,
                                name: api.Name ?? api.ApiId
                            })
                    }
                    nextToken = res.NextToken
                } while (nextToken)
            })
        )
        return results
    }
}

export default ApiGatewayV2ApisResolver
