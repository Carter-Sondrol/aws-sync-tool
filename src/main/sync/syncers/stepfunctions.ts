import { SFNClient, UpdateStateMachineCommand } from '@aws-sdk/client-sfn'
import { parseARN } from '../../discovery/arn'
import type { Credentials } from '../../discovery/CredentialsProvider'
import { registerSyncer } from '../registry'
import type { ResourceSyncer, SyncPushResult } from '../syncer'

function getClient(region: string, creds: Credentials): SFNClient {
    return new SFNClient({ region, credentials: creds })
}

const stepFunctionsSyncer: ResourceSyncer = {
    service: 'states',
    resourceType: 'stateMachine',

    async push(
        sourceData,
        _sourceArn,
        targetArn,
        _sourceCreds,
        targetCredentials
    ): Promise<SyncPushResult> {
        const changes: string[] = []
        const skipped: string[] = []

        if (typeof sourceData.Definition !== 'string' || !sourceData.Definition) {
            return {
                ok: false,
                changes,
                skipped,
                error: 'No state machine definition in source data'
            }
        }

        const targetParsed = parseARN(targetArn)
        const creds = await targetCredentials()
        const client = getClient(targetParsed?.region || 'us-east-1', creds)

        const update: { stateMachineArn: string; definition?: string; roleArn?: string } = {
            stateMachineArn: targetArn,
            definition: sourceData.Definition
        }
        changes.push('definition')

        if (typeof sourceData.RoleArn === 'string' && sourceData.RoleArn) {
            update.roleArn = sourceData.RoleArn
            changes.push('roleArn')
        }

        await client.send(new UpdateStateMachineCommand(update))
        return { ok: true, changes, skipped }
    }
}

registerSyncer('states:stateMachine', stepFunctionsSyncer)
