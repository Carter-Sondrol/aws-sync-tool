import { GetTopicAttributesCommand, ListTopicsCommand, SNSClient } from '@aws-sdk/client-sns'
import type { ParsedARN } from '../../arn'
import type { Credentials } from '../../CredentialsProvider'
import { BaseResolver } from '../baseResolver'

type TopicData = {
    TopicName: string
    TopicArn: string
    DisplayName?: string
    FifoTopic: boolean
    ContentBasedDeduplication: boolean
    KmsMasterKeyId?: string
}

export class SNSTopicResolver extends BaseResolver<SNSClient, TopicData> {
    readonly service = 'sns'
    readonly resourceType = 'topic'
    readonly cfnType = 'AWS::SNS::Topic'

    protected createClient(region: string, creds: Credentials): SNSClient {
        return new SNSClient({ region, credentials: creds })
    }

    protected async fetchResource(client: SNSClient, arn: ParsedARN): Promise<TopicData | null> {
        const res = await client.send(new GetTopicAttributesCommand({ TopicArn: arn.raw }))
        const attrs = res.Attributes ?? {}
        return {
            TopicName: arn.resourceId,
            TopicArn: attrs.TopicArn ?? arn.raw,
            DisplayName: attrs.DisplayName || undefined,
            FifoTopic: attrs.FifoTopic === 'true',
            ContentBasedDeduplication: attrs.ContentBasedDeduplication === 'true',
            KmsMasterKeyId: attrs.KmsMasterKeyId || undefined
        }
    }

    logicalId(data: Record<string, unknown> | undefined, arn: ParsedARN): string {
        return (data?.TopicName as string | undefined) ?? arn.resourceId
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
                const client = new SNSClient({ region: r, credentials: creds })
                let nextToken: string | undefined
                do {
                    const res = await client.send(new ListTopicsCommand({ NextToken: nextToken }))
                    for (const topic of res.Topics ?? []) {
                        if (!topic.TopicArn) continue
                        const name = topic.TopicArn.split(':').pop() ?? topic.TopicArn
                        results.push({ arn: topic.TopicArn, name })
                    }
                    nextToken = res.NextToken
                } while (nextToken)
            })
        )
        return results
    }
}

export default SNSTopicResolver
