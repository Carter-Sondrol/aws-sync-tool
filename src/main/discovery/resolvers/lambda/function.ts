import {
    GetFunctionCommand,
    type GetFunctionCommandOutput,
    LambdaClient
} from '@aws-sdk/client-lambda'

import type { ParsedARN } from '../../arn'
import type { Credentials } from '../../CredentialsProvider'
import type { GraphNode, Refrence } from '../../../graph-types'
import type { ResolverRegistry } from '../../registry'
import { BaseResolver } from '../baseResolver'

export class LambdaFunctionResolver extends BaseResolver<LambdaClient, GetFunctionCommandOutput> {
    readonly service = 'lambda'
    readonly resourceType = 'function'
    readonly cfnType = 'AWS::Lambda::Function'

    // Signal that this resolver has deferred work (env var name resolution)
    completeDeferred = false

    protected createClient(region: string, creds: Credentials): LambdaClient {
        return new LambdaClient({ region, credentials: creds })
    }

    protected async fetchResource(
        client: LambdaClient,
        arn: ParsedARN
    ): Promise<GetFunctionCommandOutput | null> {
        return client.send(new GetFunctionCommand({ FunctionName: arn.resourceId }))
    }

    /**
     * Deferred discovery: resolve Lambda env var values that may be resource names
     * (e.g., DynamoDB table names, S3 bucket names) rather than ARNs.
     */
    async deferredDiscovery(node: GraphNode, registry: ResolverRegistry): Promise<Set<Refrence>> {
        const data = node.data as unknown as GetFunctionCommandOutput | undefined
        if (!data) return new Set()

        const env = data?.Configuration?.Environment?.Variables
        if (!env) return new Set()

        const refs = new Set<Refrence>()

        for (const [key, value] of Object.entries(env)) {
            if (typeof value !== 'string' || value.startsWith('arn:')) continue

            // Try resolving as a DynamoDB table name
            const tableArn = await registry.resolveByName('dynamodb', 'table', value)
            if (tableArn) {
                refs.add({
                    arn: tableArn,
                    path: ['Configuration', 'Environment', 'Variables', key]
                })
                continue
            }

            // Try resolving as an S3 bucket name
            const bucketArn = await registry.resolveByName('s3', 'bucket', value)
            if (bucketArn) {
                refs.add({
                    arn: bucketArn,
                    path: ['Configuration', 'Environment', 'Variables', key]
                })
            }

            // Could add SQS queue, SNS topic, etc. here
        }

        return refs
    }

    logicalId(data: Record<string, unknown> | undefined, arn: ParsedARN): string {
        const cfg = data?.Configuration as { FunctionName?: string } | undefined
        return cfg?.FunctionName ?? arn.resourceId
    }

    label(data: Record<string, unknown> | undefined, arn: ParsedARN): string {
        return this.logicalId(data, arn)
    }
}

export default LambdaFunctionResolver
