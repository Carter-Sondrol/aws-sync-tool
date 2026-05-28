import { GetQueueAttributesCommand, ListQueuesCommand, SQSClient } from '@aws-sdk/client-sqs'
import type { ParsedARN } from '../../arn'
import type { Credentials } from '../../CredentialsProvider'
import { BaseResolver } from '../baseResolver'

type QueueData = {
    QueueName: string
    QueueArn: string
    VisibilityTimeout?: number
    MaximumMessageSize?: number
    MessageRetentionPeriod?: number
    DelaySeconds?: number
    ReceiveMessageWaitTimeSeconds?: number
    FifoQueue: boolean
    ContentBasedDeduplication: boolean
    RedrivePolicy?: string
    KmsMasterKeyId?: string
}

export class SQSQueueResolver extends BaseResolver<SQSClient, QueueData> {
    readonly service = 'sqs'
    readonly resourceType = 'queue'
    readonly cfnType = 'AWS::SQS::Queue'

    protected createClient(region: string, creds: Credentials): SQSClient {
        return new SQSClient({ region, credentials: creds })
    }

    protected async fetchResource(client: SQSClient, arn: ParsedARN): Promise<QueueData | null> {
        const queueUrl = `https://sqs.${arn.region}.amazonaws.com/${arn.accountId}/${arn.resourceId}`
        const res = await client.send(
            new GetQueueAttributesCommand({ QueueUrl: queueUrl, AttributeNames: ['All'] })
        )
        const attrs = res.Attributes ?? {}
        return {
            QueueName: arn.resourceId,
            QueueArn: attrs.QueueArn ?? arn.raw,
            VisibilityTimeout:
                attrs.VisibilityTimeout !== undefined ? Number(attrs.VisibilityTimeout) : undefined,
            MaximumMessageSize:
                attrs.MaximumMessageSize !== undefined
                    ? Number(attrs.MaximumMessageSize)
                    : undefined,
            MessageRetentionPeriod:
                attrs.MessageRetentionPeriod !== undefined
                    ? Number(attrs.MessageRetentionPeriod)
                    : undefined,
            DelaySeconds: attrs.DelaySeconds !== undefined ? Number(attrs.DelaySeconds) : undefined,
            ReceiveMessageWaitTimeSeconds:
                attrs.ReceiveMessageWaitTimeSeconds !== undefined
                    ? Number(attrs.ReceiveMessageWaitTimeSeconds)
                    : undefined,
            FifoQueue: attrs.FifoQueue === 'true',
            ContentBasedDeduplication: attrs.ContentBasedDeduplication === 'true',
            RedrivePolicy: attrs.RedrivePolicy,
            KmsMasterKeyId: attrs.KmsMasterKeyId
        }
    }

    logicalId(data: Record<string, unknown> | undefined, arn: ParsedARN): string {
        return (data?.QueueName as string | undefined) ?? arn.resourceId
    }

    label(data: Record<string, unknown> | undefined, arn: ParsedARN): string {
        return this.logicalId(data, arn)
    }

    async list(
        regions: string[],
        accountId: string
    ): Promise<Array<{ arn: string; name: string }>> {
        const results: Array<{ arn: string; name: string }> = []
        await Promise.allSettled(
            regions.map(async (r) => {
                const creds = await this.getCredentials()
                const client = new SQSClient({ region: r, credentials: creds })
                let nextToken: string | undefined
                do {
                    const res = await client.send(
                        new ListQueuesCommand({ MaxResults: 1000, NextToken: nextToken })
                    )
                    for (const url of res.QueueUrls ?? []) {
                        const name = url.split('/').pop() ?? url
                        results.push({ arn: `arn:aws:sqs:${r}:${accountId}:${name}`, name })
                    }
                    nextToken = res.NextToken
                } while (nextToken)
            })
        )
        return results
    }
}

export default SQSQueueResolver
