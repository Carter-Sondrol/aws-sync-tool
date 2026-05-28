import {
    QConnectClient,
    UpdateKnowledgeBaseTemplateUriCommand,
    UpdateMessageTemplateCommand,
    UpdateMessageTemplateMetadataCommand,
    UpdateQuickResponseCommand
} from '@aws-sdk/client-qconnect'
import { parseARN } from '../../discovery/arn'
import type { Credentials } from '../../discovery/CredentialsProvider'
import { registerSyncer } from '../registry'
import type { ResourceSyncer, SyncPushResult } from '../syncer'

function getClient(region: string, creds: Credentials): QConnectClient {
    return new QConnectClient({ region, credentials: creds })
}

function regionFromArn(arn: string): string {
    return parseARN(arn)?.region ?? 'us-east-1'
}

// QConnect ARN formats (flat, no knowledge-base segment):
// Quick Response: arn:aws:qconnect:region:account:quick-response/QR_ID
// Message Template: arn:aws:qconnect:region:account:message-template/MT_ID
// Knowledge Base: arn:aws:qconnect:region:account:knowledge-base/KB_ID

function quickResponseIdFromArn(arn: string): string {
    return parseARN(arn)?.resourceId ?? arn
}

function messageTemplateIdFromArn(arn: string): string {
    return parseARN(arn)?.resourceId ?? arn
}

function knowledgeBaseIdFromArn(arn: string): string {
    return parseARN(arn)?.resourceId ?? arn
}

// ─── Message Template ──────────────────────────────────────────────────────────

const messageTemplateSyncer: ResourceSyncer = {
    service: 'qconnect',
    resourceType: 'message-template',

    async push(
        sourceData,
        _sourceArn,
        targetArn,
        _sourceCredentials,
        targetCredentials
    ): Promise<SyncPushResult> {
        const changes: string[] = []
        const skipped: string[] = []

        const creds = await targetCredentials()
        const client = getClient(regionFromArn(targetArn), creds)
        const kbId = sourceData.knowledgeBaseId as string | undefined
        const mtId = messageTemplateIdFromArn(targetArn)

        if (!kbId) {
            return { ok: false, changes, skipped, error: 'Missing knowledgeBaseId in source data' }
        }

        const ops: Array<Promise<void>> = []

        if (sourceData.content || sourceData.language || sourceData.defaultAttributes) {
            const contentUpdate = {
                knowledgeBaseId: kbId,
                messageTemplateId: mtId,
                content: sourceData.content,
                language: sourceData.language as string | undefined,
                defaultAttributes: sourceData.defaultAttributes
            }
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ops.push(
                client.send(new UpdateMessageTemplateCommand(contentUpdate as any)).then(() => {
                    if (sourceData.content) changes.push('content')
                    if (sourceData.language) changes.push('language')
                    if (sourceData.defaultAttributes) changes.push('defaultAttributes')
                })
            )
        }

        if (typeof sourceData.name === 'string' || typeof sourceData.description === 'string') {
            ops.push(
                client
                    .send(
                        new UpdateMessageTemplateMetadataCommand({
                            knowledgeBaseId: kbId,
                            messageTemplateId: mtId,
                            name: sourceData.name as string | undefined,
                            description: sourceData.description as string | undefined
                        })
                    )
                    .then(() => {
                        changes.push('name/description')
                    })
            )
        }

        if (ops.length === 0) {
            skipped.push('no updatable fields in source data')
            return { ok: true, changes, skipped }
        }

        await Promise.all(ops)
        return { ok: true, changes, skipped }
    }
}

// ─── Quick Response ────────────────────────────────────────────────────────────

const quickResponseSyncer: ResourceSyncer = {
    service: 'qconnect',
    resourceType: 'quick-response',

    async push(
        sourceData,
        _sourceArn,
        targetArn,
        _sourceCredentials,
        targetCredentials
    ): Promise<SyncPushResult> {
        const changes: string[] = []
        const skipped: string[] = []

        const creds = await targetCredentials()
        const client = getClient(regionFromArn(targetArn), creds)
        const kbId = sourceData.knowledgeBaseId as string | undefined
        const qrId = quickResponseIdFromArn(targetArn)

        if (!kbId) {
            return { ok: false, changes, skipped, error: 'Missing knowledgeBaseId in source data' }
        }

        const update: Record<string, unknown> = { knowledgeBaseId: kbId, quickResponseId: qrId }
        if (typeof sourceData.name === 'string') {
            update.name = sourceData.name
            changes.push('name')
        }
        if (sourceData.contents) {
            update.content = sourceData.contents
            changes.push('content')
        }
        if (typeof sourceData.description === 'string') {
            update.description = sourceData.description
            changes.push('description')
        }
        if (typeof sourceData.shortcutKey === 'string') {
            update.shortcutKey = sourceData.shortcutKey
            changes.push('shortcutKey')
        }
        if (typeof sourceData.isActive === 'boolean') {
            update.isActive = sourceData.isActive
            changes.push('isActive')
        }
        if (typeof sourceData.language === 'string') {
            update.language = sourceData.language
            changes.push('language')
        }
        if (Array.isArray(sourceData.channels)) {
            update.channels = sourceData.channels
            changes.push('channels')
        }
        if (sourceData.groupingConfiguration) {
            update.groupingConfiguration = sourceData.groupingConfiguration
            changes.push('groupingConfiguration')
        }

        if (changes.length === 0) {
            skipped.push('no updatable fields in source data')
            return { ok: true, changes, skipped }
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await client.send(new UpdateQuickResponseCommand(update as any))
        return { ok: true, changes, skipped }
    }
}

// ─── Knowledge Base ────────────────────────────────────────────────────────────

const knowledgeBaseSyncer: ResourceSyncer = {
    service: 'qconnect',
    resourceType: 'knowledge-base',

    async push(
        sourceData,
        _sourceArn,
        targetArn,
        _sourceCredentials,
        targetCredentials
    ): Promise<SyncPushResult> {
        const changes: string[] = []
        const skipped: string[] = []

        const kbId = knowledgeBaseIdFromArn(targetArn)

        // Only EXTERNAL type knowledge bases support template URI updates
        if (typeof sourceData.templateUri === 'string') {
            const creds = await targetCredentials()
            const client = getClient(regionFromArn(targetArn), creds)
            await client.send(
                new UpdateKnowledgeBaseTemplateUriCommand({
                    knowledgeBaseId: kbId,
                    templateUri: sourceData.templateUri
                })
            )
            changes.push('templateUri')
        } else {
            skipped.push(
                'name and type are immutable after creation; templateUri not in source data'
            )
        }

        return { ok: true, changes, skipped }
    }
}

// ─── Register all ──────────────────────────────────────────────────────────────

registerSyncer('qconnect:message-template', messageTemplateSyncer)
registerSyncer('qconnect:quick-response', quickResponseSyncer)
registerSyncer('qconnect:knowledge-base', knowledgeBaseSyncer)
