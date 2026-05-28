import { PutParameterCommand, SSMClient } from '@aws-sdk/client-ssm'
import { parseARN } from '../../discovery/arn'
import type { Credentials } from '../../discovery/CredentialsProvider'
import { registerSyncer } from '../registry'
import type { ResourceSyncer, SyncPushResult } from '../syncer'

function getClient(region: string, creds: Credentials): SSMClient {
    return new SSMClient({ region, credentials: creds })
}

const ssmParameterSyncer: ResourceSyncer = {
    service: 'ssm',
    resourceType: 'parameter',

    async push(
        sourceData,
        _sourceArn,
        targetArn,
        _sourceCreds,
        targetCredentials
    ): Promise<SyncPushResult> {
        const changes: string[] = []
        const skipped: string[] = []

        if (sourceData.Type === 'SecureString') {
            skipped.push('value (SecureString — not decrypted during discovery)')
            return { ok: true, changes, skipped }
        }

        if (typeof sourceData.Value !== 'string') {
            return { ok: false, changes, skipped, error: 'No parameter value in source data' }
        }

        const targetParsed = parseARN(targetArn)
        if (!targetParsed)
            return { ok: false, changes, skipped, error: 'Could not parse target ARN' }

        // Derive parameter name from target ARN: resource = 'parameter/path/to/name'
        const targetName = targetParsed.resource.slice('parameter'.length)

        const creds = await targetCredentials()
        const client = getClient(targetParsed.region || 'us-east-1', creds)

        await client.send(
            new PutParameterCommand({
                Name: targetName,
                Value: sourceData.Value,
                Type: (sourceData.Type as 'String' | 'StringList') ?? 'String',
                Overwrite: true,
                DataType: typeof sourceData.DataType === 'string' ? sourceData.DataType : undefined
            })
        )

        changes.push('value')
        if (sourceData.Type) changes.push('type')
        return { ok: true, changes, skipped }
    }
}

registerSyncer('ssm:parameter', ssmParameterSyncer)
