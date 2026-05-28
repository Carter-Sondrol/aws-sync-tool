import {
    DisableKeyRotationCommand,
    EnableKeyRotationCommand,
    GetKeyPolicyCommand,
    GetKeyRotationStatusCommand,
    KMSClient,
    PutKeyPolicyCommand,
    UpdateKeyDescriptionCommand
} from '@aws-sdk/client-kms'
import { parseARN } from '../../discovery/arn'
import type { Credentials } from '../../discovery/CredentialsProvider'
import { registerSyncer } from '../registry'
import type { ResourceSyncer, SyncPushResult } from '../syncer'

function getClient(region: string, creds: Credentials): KMSClient {
    return new KMSClient({ region, credentials: creds })
}

const kmsKeySyncer: ResourceSyncer = {
    service: 'kms',
    resourceType: 'key',

    async push(
        sourceData,
        _sourceArn,
        targetArn,
        _sourceCreds,
        targetCredentials
    ): Promise<SyncPushResult> {
        const changes: string[] = []
        const skipped: string[] = ['keyMaterial (immutable)', 'keySpec (immutable)']

        // AWS-managed keys cannot be updated
        if (sourceData.KeyManager === 'AWS') {
            return { ok: true, changes, skipped: [...skipped, 'all (AWS-managed key, read-only)'] }
        }

        const targetParsed = parseARN(targetArn)
        const keyId = targetParsed?.resourceId ?? targetArn
        const region = targetParsed?.region || 'us-east-1'

        const creds = await targetCredentials()
        const client = getClient(region, creds)

        // Update description
        if (typeof sourceData.Description === 'string') {
            await client.send(
                new UpdateKeyDescriptionCommand({
                    KeyId: keyId,
                    Description: sourceData.Description
                })
            )
            changes.push('description')
        }

        // Sync key policy
        if (typeof sourceData.KeyPolicy === 'string' && sourceData.KeyPolicy) {
            try {
                // Get current target policy name (usually 'default')
                const currentPolicy = await client.send(
                    new GetKeyPolicyCommand({ KeyId: keyId, PolicyName: 'default' })
                )
                const policyName = currentPolicy.PolicyName ?? 'default'
                await client.send(
                    new PutKeyPolicyCommand({
                        KeyId: keyId,
                        PolicyName: policyName,
                        Policy: sourceData.KeyPolicy
                    })
                )
                changes.push('keyPolicy')
            } catch {
                skipped.push('keyPolicy (failed to retrieve target policy name)')
            }
        }

        // Sync key rotation
        if (typeof sourceData.EnableKeyRotation === 'boolean') {
            const currentRotation = await client.send(
                new GetKeyRotationStatusCommand({ KeyId: keyId })
            )
            if (sourceData.EnableKeyRotation && !currentRotation.KeyRotationEnabled) {
                await client.send(new EnableKeyRotationCommand({ KeyId: keyId }))
                changes.push('keyRotation:enabled')
            } else if (!sourceData.EnableKeyRotation && currentRotation.KeyRotationEnabled) {
                await client.send(new DisableKeyRotationCommand({ KeyId: keyId }))
                changes.push('keyRotation:disabled')
            }
        }

        return { ok: true, changes, skipped }
    }
}

registerSyncer('kms:key', kmsKeySyncer)
