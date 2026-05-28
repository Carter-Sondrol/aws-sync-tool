import type { StreamDescriptionSummary } from '@aws-sdk/client-kinesis'
import {
    DescribeStreamSummaryCommand,
    KinesisClient,
    ListStreamsCommand
} from '@aws-sdk/client-kinesis'
import type { ParsedARN } from '../../arn'
import type { Credentials } from '../../CredentialsProvider'
import { BaseResolver } from '../baseResolver'

export class KinesisStreamResolver extends BaseResolver<KinesisClient, StreamDescriptionSummary> {
    readonly service = 'kinesis'
    readonly resourceType = 'stream'
    readonly cfnType = 'AWS::Kinesis::Stream'

    protected createClient(region: string, creds: Credentials): KinesisClient {
        return new KinesisClient({ region, credentials: creds })
    }

    protected async fetchResource(
        client: KinesisClient,
        arn: ParsedARN
    ): Promise<StreamDescriptionSummary | null> {
        const res = await client.send(
            new DescribeStreamSummaryCommand({ StreamName: arn.resourceId })
        )
        return res.StreamDescriptionSummary ?? null
    }

    logicalId(data: Record<string, unknown> | undefined, arn: ParsedARN): string {
        return (data?.StreamName as string | undefined) ?? arn.resourceId
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
                const client = new KinesisClient({ region: r, credentials: creds })
                let nextToken: string | undefined
                do {
                    const res = await client.send(
                        new ListStreamsCommand({ Limit: 100, NextToken: nextToken })
                    )
                    for (const s of res.StreamSummaries ?? []) {
                        if (!s.StreamARN || !s.StreamName) continue
                        results.push({ arn: s.StreamARN, name: s.StreamName })
                    }
                    nextToken = res.NextToken
                } while (nextToken)
            })
        )
        return results
    }
}

export default KinesisStreamResolver
