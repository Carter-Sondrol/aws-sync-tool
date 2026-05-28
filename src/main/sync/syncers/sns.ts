import { SetTopicAttributesCommand, SNSClient } from '@aws-sdk/client-sns'
import { parseARN } from '../../discovery/arn'
import type { Credentials } from '../../discovery/CredentialsProvider'
import { registerSyncer } from '../registry'
import type { ResourceSyncer, SyncPushResult } from '../syncer'

function getClient(region: string, creds: Credentials): SNSClient {
    return new SNSClient({ region, credentials: creds })
}

const snsTopicSyncer: ResourceSyncer = {
    service: 'sns',
    resourceType: 'topic',

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
        const creds = await targetCredentials()
        const client = getClient(targetParsed?.region || 'us-east-1', creds)

        // SetTopicAttributesCommand updates one attribute at a time
        const attrs: Array<[string, string]> = []

        if (typeof sourceData.DisplayName === 'string' && sourceData.DisplayName) {
            attrs.push(['DisplayName', sourceData.DisplayName])
            changes.push('displayName')
        }
        if (typeof sourceData.KmsMasterKeyId === 'string' && sourceData.KmsMasterKeyId) {
            attrs.push(['KmsMasterKeyId', sourceData.KmsMasterKeyId])
            changes.push('kmsMasterKeyId')
        }
        // ContentBasedDeduplication only applies to FIFO topics
        if (
            sourceData.FifoTopic === true &&
            typeof sourceData.ContentBasedDeduplication === 'boolean'
        ) {
            attrs.push(['ContentBasedDeduplication', String(sourceData.ContentBasedDeduplication)])
            changes.push('contentBasedDeduplication')
        }

        if (attrs.length === 0) {
            skipped.push('no updatable attributes in source data')
            return { ok: true, changes, skipped }
        }

        await Promise.all(
            attrs.map(([AttributeName, AttributeValue]) =>
                client.send(
                    new SetTopicAttributesCommand({
                        TopicArn: targetArn,
                        AttributeName,
                        AttributeValue
                    })
                )
            )
        )

        skipped.push('topicName (immutable)')
        return { ok: true, changes, skipped }
    }
}

registerSyncer('sns:topic', snsTopicSyncer)
