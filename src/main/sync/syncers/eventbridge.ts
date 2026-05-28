import { EventBridgeClient, PutRuleCommand } from '@aws-sdk/client-eventbridge'
import { parseARN } from '../../discovery/arn'
import type { Credentials } from '../../discovery/CredentialsProvider'
import { registerSyncer } from '../registry'
import type { ResourceSyncer, SyncPushResult } from '../syncer'

function getClient(region: string, creds: Credentials): EventBridgeClient {
    return new EventBridgeClient({ region, credentials: creds })
}

const eventBridgeRuleSyncer: ResourceSyncer = {
    service: 'events',
    resourceType: 'rule',

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

        // Derive rule name (and optional bus name) from target ARN resource = 'rule/name' or 'rule/bus/name'
        const parts = targetParsed.resource.split('/')
        const ruleName = parts[parts.length - 1]
        const eventBusName = parts.length >= 3 ? parts[1] : undefined

        const creds = await targetCredentials()
        const client = getClient(targetParsed.region || 'us-east-1', creds)

        const input: {
            Name: string
            EventBusName?: string
            ScheduleExpression?: string
            EventPattern?: string
            State?: string
            Description?: string
            RoleArn?: string
        } = { Name: ruleName, EventBusName: eventBusName }

        if (typeof sourceData.ScheduleExpression === 'string' && sourceData.ScheduleExpression) {
            input.ScheduleExpression = sourceData.ScheduleExpression
            changes.push('scheduleExpression')
        }
        if (typeof sourceData.EventPattern === 'string' && sourceData.EventPattern) {
            input.EventPattern = sourceData.EventPattern
            changes.push('eventPattern')
        }
        if (typeof sourceData.State === 'string') {
            input.State = sourceData.State
            changes.push('state')
        }
        if (typeof sourceData.Description === 'string') {
            input.Description = sourceData.Description
            changes.push('description')
        }
        if (typeof sourceData.RoleArn === 'string' && sourceData.RoleArn) {
            input.RoleArn = sourceData.RoleArn
            changes.push('roleArn')
        }

        if (changes.length === 0) {
            skipped.push('no updatable fields in source data')
            return { ok: true, changes, skipped }
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await client.send(new PutRuleCommand(input as any))
        return { ok: true, changes, skipped }
    }
}

registerSyncer('events:rule', eventBridgeRuleSyncer)
