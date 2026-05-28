import {
    GetBucketLocationCommand,
    GetBucketNotificationConfigurationCommand,
    GetBucketTaggingCommand,
    ListBucketsCommand,
    S3Client
} from '@aws-sdk/client-s3'
import type { ParsedARN } from '../../arn'
import type { Credentials } from '../../CredentialsProvider'
import { BaseResolver } from '../baseResolver'

type BucketData = {
    BucketName?: string
    Region?: string
    Tags?: object[]
    LambdaFunctionConfigurations?: object[]
    TopicConfigurations?: object[]
    QueueConfigurations?: object[]
}

export class S3BucketResolver extends BaseResolver<S3Client, BucketData> {
    readonly service = 's3'
    readonly resourceType = 'bucket'
    readonly cfnType = 'AWS::S3::Bucket'

    // S3 is global — us-east-1 client used for initial location detection
    protected createClient(_region: string, creds: Credentials): S3Client {
        return new S3Client({ region: 'us-east-1', credentials: creds })
    }

    protected async fetchResource(client: S3Client, arn: ParsedARN): Promise<BucketData | null> {
        const bucketName = arn.resourceId || arn.resource.split('/')[0]

        let region = 'us-east-1'
        try {
            const loc = await client.send(new GetBucketLocationCommand({ Bucket: bucketName }))
            region = loc.LocationConstraint ?? 'us-east-1'
        } catch {
            // fall back to us-east-1
        }

        // Get region-specific client for subsequent calls
        const regionalClient = region === 'us-east-1' ? client : await this.client(region)

        const data: BucketData = { BucketName: bucketName, Region: region }

        await Promise.allSettled([
            regionalClient.send(new GetBucketTaggingCommand({ Bucket: bucketName })).then((res) => {
                data.Tags = res.TagSet
            }),
            regionalClient
                .send(new GetBucketNotificationConfigurationCommand({ Bucket: bucketName }))
                .then((res) => {
                    data.LambdaFunctionConfigurations = res.LambdaFunctionConfigurations
                    data.TopicConfigurations = res.TopicConfigurations
                    data.QueueConfigurations = res.QueueConfigurations
                })
        ])

        return data
    }

    logicalId(data: Record<string, unknown> | undefined, arn: ParsedARN): string {
        return (data?.BucketName as string | undefined) ?? arn.resourceId
    }

    label(data: Record<string, unknown> | undefined, arn: ParsedARN): string {
        return this.logicalId(data, arn)
    }

    async list(
        _regions: string[],
        _accountId: string
    ): Promise<Array<{ arn: string; name: string }>> {
        const creds = await this.getCredentials()
        const client = new S3Client({ region: 'us-east-1', credentials: creds })
        const res = await client.send(new ListBucketsCommand({}))
        return (res.Buckets ?? [])
            .filter((b) => b.Name)
            .map((b) => ({ arn: `arn:aws:s3:::${b.Name}`, name: b.Name! }))
    }
}

export default S3BucketResolver
