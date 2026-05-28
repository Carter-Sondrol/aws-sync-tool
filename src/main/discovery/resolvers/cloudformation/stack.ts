import {
    CloudFormationClient,
    DescribeStackResourcesCommand,
    DescribeStacksCommand,
    ListStacksCommand
} from '@aws-sdk/client-cloudformation'
import type { ParsedARN } from '../../arn'
import type { Credentials } from '../../CredentialsProvider'
import { BaseResolver } from '../baseResolver'

type StackData = {
    StackId?: string
    StackName?: string
    Description?: string
    StackStatus?: string
    CreationTime?: string
    LastUpdatedTime?: string
    Parameters?: object[]
    Outputs?: object[]
    Tags?: object[]
    ResourceSummary?: object[]
    _childArns?: string[]
}

function resourceArnFromPhysicalId(
    resourceType: string | undefined,
    physicalId: string | undefined,
    stackArn: ParsedARN
): string | null {
    if (!resourceType || !physicalId) return null
    if (physicalId.startsWith('arn:')) return physicalId

    const { partition, region, accountId } = stackArn

    switch (resourceType) {
        case 'AWS::S3::Bucket':
            return `arn:${partition}:s3:::${physicalId}`
        case 'AWS::DynamoDB::Table':
            return `arn:${partition}:dynamodb:${region}:${accountId}:table/${physicalId}`
        case 'AWS::Lambda::Function':
            return `arn:${partition}:lambda:${region}:${accountId}:function:${physicalId}`
        case 'AWS::IAM::Role':
            return `arn:${partition}:iam::${accountId}:role/${physicalId}`
        case 'AWS::IAM::ManagedPolicy':
            return `arn:${partition}:iam::${accountId}:policy/${physicalId}`
        case 'AWS::ApiGateway::RestApi':
            return `arn:${partition}:apigateway:${region}::/restapis/${physicalId}`
        case 'AWS::ApiGatewayV2::Api':
            return `arn:${partition}:apigateway:${region}::/apis/${physicalId}`
        default:
            return null
    }
}

export class CloudFormationStackResolver extends BaseResolver<CloudFormationClient, StackData> {
    readonly service = 'cloudformation'
    readonly resourceType = 'stack'
    readonly cfnType = 'AWS::CloudFormation::Stack'

    protected createClient(region: string, creds: Credentials): CloudFormationClient {
        return new CloudFormationClient({ region, credentials: creds })
    }

    protected async fetchResource(
        client: CloudFormationClient,
        arn: ParsedARN
    ): Promise<StackData | null> {
        const stackName = arn.resourceId

        const [stackResponse, resourcesResponse] = await Promise.all([
            client.send(new DescribeStacksCommand({ StackName: stackName })),
            client.send(new DescribeStackResourcesCommand({ StackName: stackName }))
        ])

        const stack = stackResponse.Stacks?.[0]
        if (!stack) return null
        const resources = resourcesResponse.StackResources ?? []

        const childArns = resources
            .map((r) => resourceArnFromPhysicalId(r.ResourceType, r.PhysicalResourceId, arn))
            .filter((a): a is string => Boolean(a))

        return {
            StackId: stack.StackId,
            StackName: stack.StackName,
            Description: stack.Description,
            StackStatus: stack.StackStatus,
            CreationTime: stack.CreationTime?.toISOString(),
            LastUpdatedTime: stack.LastUpdatedTime?.toISOString(),
            Parameters: stack.Parameters,
            Outputs: stack.Outputs,
            Tags: stack.Tags,
            ResourceSummary: resources.map((r) => ({
                LogicalResourceId: r.LogicalResourceId,
                ResourceType: r.ResourceType,
                ResourceStatus: r.ResourceStatus
            })),
            _childArns: childArns.length > 0 ? childArns : undefined
        }
    }

    logicalId(data: Record<string, unknown> | undefined, arn: ParsedARN): string {
        return (data?.StackName as string | undefined) ?? arn.resourceId
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
                const client = new CloudFormationClient({ region: r, credentials: creds })
                let nextToken: string | undefined
                do {
                    const res = await client.send(
                        new ListStacksCommand({
                            NextToken: nextToken,
                            StackStatusFilter: [
                                'CREATE_COMPLETE',
                                'UPDATE_COMPLETE',
                                'UPDATE_ROLLBACK_COMPLETE',
                                'IMPORT_COMPLETE',
                                'IMPORT_ROLLBACK_COMPLETE'
                            ]
                        })
                    )
                    for (const stack of res.StackSummaries ?? []) {
                        if (stack.StackId)
                            results.push({
                                arn: stack.StackId,
                                name: stack.StackName ?? stack.StackId
                            })
                    }
                    nextToken = res.NextToken
                } while (nextToken)
            })
        )
        return results
    }
}

export default CloudFormationStackResolver
