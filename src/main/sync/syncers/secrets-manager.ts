import { SecretsManagerClient, UpdateSecretCommand } from '@aws-sdk/client-secrets-manager'
import { parseARN } from '../../discovery/arn'
import type { Credentials } from '../../discovery/CredentialsProvider'
import { registerSyncer } from '../registry'
import type { ResourceSyncer, SyncPushResult } from '../syncer'

function getClient(region: string, creds: Credentials): SecretsManagerClient {
    return new SecretsManagerClient({ region, credentials: creds })
}

const secretsManagerSyncer: ResourceSyncer = {
    service: 'secretsmanager',
    resourceType: 'secret',

    async push(
        sourceData,
        _sourceArn,
        targetArn,
        _sourceCreds,
        targetCredentials
    ): Promise<SyncPushResult> {
        const changes: string[] = []
        const skipped: string[] = ['secretValue (environment-specific, not synced)']

        const targetParsed = parseARN(targetArn)
        const creds = await targetCredentials()
        const client = getClient(targetParsed?.region || 'us-east-1', creds)

        const update: { SecretId: string; Description?: string; KmsKeyId?: string } = {
            SecretId: targetArn
        }

        if (typeof sourceData.Description === 'string' && sourceData.Description) {
            update.Description = sourceData.Description
            changes.push('description')
        }
        if (typeof sourceData.KmsKeyId === 'string' && sourceData.KmsKeyId) {
            update.KmsKeyId = sourceData.KmsKeyId
            changes.push('kmsKeyId')
        }

        if (changes.length === 0) {
            skipped.push('no updatable metadata in source data')
            return { ok: true, changes, skipped }
        }

        await client.send(new UpdateSecretCommand(update))
        return { ok: true, changes, skipped }
    }
}

registerSyncer('secretsmanager:secret', secretsManagerSyncer)
