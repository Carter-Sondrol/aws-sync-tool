import { SetQueueAttributesCommand, SQSClient } from '@aws-sdk/client-sqs'
import { parseARN } from '../../discovery/arn'
import type { Credentials } from '../../discovery/CredentialsProvider'
import { registerSyncer } from '../registry'
import type { ResourceSyncer, SyncPushResult } from '../syncer'

function getClient(region: string, creds: Credentials): SQSClient {
    return new SQSClient({ region, credentials: creds })
}

function queueUrlFromArn(arn: string): string | null {
    const p = parseARN(arn)
    if (!p) return null
    return `https://sqs.${p.region}.amazonaws.com/${p.accountId}/${p.resourceId}`
}

const sqsQueueSyncer: ResourceSyncer = {
    service: 'sqs',
    resourceType: 'queue',

    async push(
        sourceData,
        _sourceArn,
        targetArn,
        _sourceCreds,
        targetCredentials
    ): Promise<SyncPushResult> {
        const changes: string[] = []
        const skipped: string[] = []

        const targetParsed = parseARN(targetArn)
        if (!targetParsed)
            return { ok: false, changes, skipped, error: 'Could not parse target ARN' }

        const queueUrl = queueUrlFromArn(targetArn)
        if (!queueUrl)
            return {
                ok: false,
                changes,
                skipped,
                error: 'Could not construct queue URL from target ARN'
            }

        const creds = await targetCredentials()
        const client = getClient(targetParsed.region || 'us-east-1', creds)

        const attributes: Record<string, string> = {}

        if (typeof sourceData.VisibilityTimeout === 'number') {
            attributes.VisibilityTimeout = String(sourceData.VisibilityTimeout)
            changes.push('visibilityTimeout')
        }
        if (typeof sourceData.MaximumMessageSize === 'number') {
            attributes.MaximumMessageSize = String(sourceData.MaximumMessageSize)
            changes.push('maximumMessageSize')
        }
        if (typeof sourceData.MessageRetentionPeriod === 'number') {
            attributes.MessageRetentionPeriod = String(sourceData.MessageRetentionPeriod)
            changes.push('messageRetentionPeriod')
        }
        if (typeof sourceData.DelaySeconds === 'number') {
            attributes.DelaySeconds = String(sourceData.DelaySeconds)
            changes.push('delaySeconds')
        }
        if (typeof sourceData.ReceiveMessageWaitTimeSeconds === 'number') {
            attributes.ReceiveMessageWaitTimeSeconds = String(
                sourceData.ReceiveMessageWaitTimeSeconds
            )
            changes.push('receiveMessageWaitTimeSeconds')
        }
        if (typeof sourceData.RedrivePolicy === 'string' && sourceData.RedrivePolicy) {
            attributes.RedrivePolicy = sourceData.RedrivePolicy
            changes.push('redrivePolicy')
        }
        if (typeof sourceData.KmsMasterKeyId === 'string' && sourceData.KmsMasterKeyId) {
            attributes.KmsMasterKeyId = sourceData.KmsMasterKeyId
            changes.push('kmsMasterKeyId')
        }

        if (Object.keys(attributes).length === 0) {
            skipped.push('no updatable attributes in source data')
            return { ok: true, changes, skipped }
        }

        await client.send(
            new SetQueueAttributesCommand({ QueueUrl: queueUrl, Attributes: attributes })
        )
        return { ok: true, changes, skipped }
    }
}

registerSyncer('sqs:queue', sqsQueueSyncer)
