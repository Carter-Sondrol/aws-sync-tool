import { CloudFormationClient } from '@aws-sdk/client-cloudformation'
import { parseARN } from '../../discovery/arn'
import type { Credentials } from '../../discovery/CredentialsProvider'
import { registerSyncer } from '../registry'
import type { ResourceSyncer, SyncPushResult } from '../syncer'

const clientCache = new Map<string, CloudFormationClient>()

function getClient(region: string, creds: Credentials): CloudFormationClient {
    const key = `${region}:${creds.accessKeyId}`
    if (!clientCache.has(key))
        clientCache.set(key, new CloudFormationClient({ region, credentials: creds }))
    return clientCache.get(key)!
}

const cloudformationStackSyncer: ResourceSyncer = {
    service: 'cloudformation',
    resourceType: 'stack',

    async push(
        sourceData,
        sourceArn,
        targetArn,
        sourceCredentials,
        targetCredentials
    ): Promise<SyncPushResult> {
        const changes: string[] = []
        const skipped: string[] = []
        const sourceRegion = parseARN(sourceArn)?.region ?? 'us-east-1'
        const targetRegion = parseARN(targetArn)?.region ?? 'us-east-1'
        const [sourceCreds, targetCreds] = await Promise.all([
            sourceCredentials(),
            targetCredentials()
        ])
        const sourceClient = getClient(sourceRegion, sourceCreds)
        const targetClient = getClient(targetRegion, targetCreds)
        void sourceClient
        void targetClient
        void sourceData
        // TODO: implement push using CreateStackCommand / UpdateStackCommand
        return { ok: false, changes, skipped, error: 'Not implemented' }
    }
}

registerSyncer('cloudformation:stack', cloudformationStackSyncer)
