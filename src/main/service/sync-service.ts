import type { Credentials } from '../discovery/CredentialsProvider'
import type { GraphNode } from '../graph-types'
import { getSyncer } from '../sync/index'
import type { SyncContext, SyncPushResult } from '../sync/syncer'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getServiceType(node: GraphNode): string {
    const n = node as any
    if (n.service && n.resourceType) return `${n.service}:${n.resourceType}`
    if (node.arn?.service && node.arn?.resourceType)
        return `${node.arn.service}:${node.arn.resourceType}`
    return 'unknown:unknown'
}

// ─── Service ──────────────────────────────────────────────────────────────────

export class SyncService {
    async push(
        node: GraphNode,
        sourceArn: string,
        targetArn: string,
        sourceCreds: () => Promise<Credentials>,
        targetCreds: () => Promise<Credentials>,
        context?: SyncContext
    ): Promise<SyncPushResult> {
        const syncerKey = getServiceType(node)
        const syncer = getSyncer(syncerKey)
        if (!syncer) {
            return {
                ok: false,
                changes: [],
                skipped: [],
                error: `No syncer registered for ${syncerKey}`
            }
        }

        try {
            return await syncer.push(
                (node.data as Record<string, unknown>) ?? {},
                sourceArn,
                targetArn,
                sourceCreds,
                targetCreds,
                context
            )
        } catch (err) {
            return {
                ok: false,
                changes: [],
                skipped: [],
                error: err instanceof Error ? err.message : String(err)
            }
        }
    }

    listSyncers(): string[] {
        return [
            'lambda:function',
            'iam:role',
            'iam:policy',
            'connect:instance',
            'connect:user',
            'dynamodb:table',
            's3:bucket',
            'sqs:queue',
            'sns:topic',
            'secretsmanager:secret',
            'ssm:parameter',
            'events:rule',
            'states:stateMachine',
            'kms:key',
            'kinesis:stream',
            'qconnect:view',
            'apigateway:restapi',
            'cloudfront:distribution',
            'cloudformation:stack'
        ]
    }
}
