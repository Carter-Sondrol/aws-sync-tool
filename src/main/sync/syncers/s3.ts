import {
    GetBucketLocationCommand,
    PutBucketNotificationConfigurationCommand,
    S3Client
} from '@aws-sdk/client-s3'
import type { Credentials } from '../../discovery/CredentialsProvider'
import { registerSyncer } from '../registry'
import type { ResourceSyncer, SyncPushResult } from '../syncer'

const clientCache = new Map<string, S3Client>()

function getClient(region: string, creds: Credentials): S3Client {
    const key = `${region}:${creds.accessKeyId}`
    if (!clientCache.has(key)) {
        clientCache.set(key, new S3Client({ region, credentials: creds }))
    }
    return clientCache.get(key)!
}

async function getBucketRegion(bucketName: string, creds: Credentials): Promise<string> {
    const client = getClient('us-east-1', creds)
    try {
        const loc = await client.send(new GetBucketLocationCommand({ Bucket: bucketName }))
        return loc.LocationConstraint ?? 'us-east-1'
    } catch {
        return 'us-east-1'
    }
}

function bucketNameFromArn(arn: string): string {
    // arn:aws:s3:::bucket-name
    return arn.split(':').pop() ?? arn
}

const s3BucketSyncer: ResourceSyncer = {
    service: 's3',
    resourceType: 'bucket',

    async push(
        sourceData,
        _sourceArn,
        targetArn,
        _sourceCredentials,
        targetCredentials
    ): Promise<SyncPushResult> {
        const changes: string[] = []
        const skipped: string[] = []

        const targetBucket = bucketNameFromArn(targetArn)
        const creds = await targetCredentials()
        const targetRegion = await getBucketRegion(targetBucket, creds)
        const client = getClient(targetRegion, creds)

        // Notification configurations
        const hasNotifications =
            sourceData.LambdaFunctionConfigurations ||
            sourceData.TopicConfigurations ||
            sourceData.QueueConfigurations
        if (hasNotifications) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await client.send(
                new PutBucketNotificationConfigurationCommand({
                    Bucket: targetBucket,
                    NotificationConfiguration: {
                        LambdaFunctionConfigurations:
                            (sourceData.LambdaFunctionConfigurations as never) ?? [],
                        TopicConfigurations: (sourceData.TopicConfigurations as never) ?? [],
                        QueueConfigurations: (sourceData.QueueConfigurations as never) ?? []
                    }
                })
            )
            changes.push('notificationConfiguration')
        } else {
            skipped.push('notificationConfiguration (none on source)')
        }

        skipped.push('bucketName (immutable)', 'region (immutable)')
        return { ok: true, changes, skipped }
    }
}

registerSyncer('s3:bucket', s3BucketSyncer)
