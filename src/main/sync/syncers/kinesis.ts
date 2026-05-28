import {
    DecreaseStreamRetentionPeriodCommand,
    DescribeStreamSummaryCommand,
    IncreaseStreamRetentionPeriodCommand,
    KinesisClient,
    UpdateShardCountCommand
} from '@aws-sdk/client-kinesis'
import { parseARN } from '../../discovery/arn'
import type { Credentials } from '../../discovery/CredentialsProvider'
import { registerSyncer } from '../registry'
import type { ResourceSyncer, SyncPushResult } from '../syncer'

function getClient(region: string, creds: Credentials): KinesisClient {
    return new KinesisClient({ region, credentials: creds })
}

const kinesisStreamSyncer: ResourceSyncer = {
    service: 'kinesis',
    resourceType: 'stream',

    async push(
        sourceData,
        _sourceArn,
        targetArn,
        _sourceCreds,
        targetCredentials
    ): Promise<SyncPushResult> {
        const changes: string[] = []
        const skipped: string[] = ['streamName (immutable)', 'streamType (immutable)']

        const targetParsed = parseARN(targetArn)
        const streamName = targetParsed?.resourceId ?? targetArn
        const region = targetParsed?.region || 'us-east-1'

        const creds = await targetCredentials()
        const client = getClient(region, creds)

        // Fetch current target state so we can diff before making calls
        const current = await client.send(
            new DescribeStreamSummaryCommand({ StreamName: streamName })
        )
        const summary = current.StreamDescriptionSummary
        if (!summary)
            return { ok: false, changes, skipped, error: 'Could not describe target stream' }

        const isOnDemand = summary.StreamModeDetails?.StreamMode === 'ON_DEMAND'
        const sourceMode = (sourceData.StreamModeDetails as Record<string, string> | undefined)
            ?.StreamMode

        // Shard count — only for PROVISIONED streams
        const sourceShards =
            typeof sourceData.OpenShardCount === 'number' ? sourceData.OpenShardCount : null
        if (sourceShards !== null && !isOnDemand && sourceMode !== 'ON_DEMAND') {
            const currentShards = summary.OpenShardCount ?? 0
            if (sourceShards !== currentShards) {
                await client.send(
                    new UpdateShardCountCommand({
                        StreamName: streamName,
                        TargetShardCount: sourceShards,
                        ScalingType: 'UNIFORM_SCALING'
                    })
                )
                changes.push(`shardCount:${currentShards}→${sourceShards}`)
            }
        } else if (isOnDemand) {
            skipped.push('shardCount (ON_DEMAND stream, managed automatically)')
        }

        // Retention period
        const sourceRetention =
            typeof sourceData.RetentionPeriodHours === 'number'
                ? sourceData.RetentionPeriodHours
                : null
        if (sourceRetention !== null) {
            const currentRetention = summary.RetentionPeriodHours ?? 24
            if (sourceRetention > currentRetention) {
                await client.send(
                    new IncreaseStreamRetentionPeriodCommand({
                        StreamName: streamName,
                        RetentionPeriodHours: sourceRetention
                    })
                )
                changes.push(`retentionPeriod:${currentRetention}h→${sourceRetention}h`)
            } else if (sourceRetention < currentRetention) {
                await client.send(
                    new DecreaseStreamRetentionPeriodCommand({
                        StreamName: streamName,
                        RetentionPeriodHours: sourceRetention
                    })
                )
                changes.push(`retentionPeriod:${currentRetention}h→${sourceRetention}h`)
            }
        }

        return { ok: true, changes, skipped }
    }
}

registerSyncer('kinesis:stream', kinesisStreamSyncer)
