import {
    DescribeKeyCommand,
    GetKeyPolicyCommand,
    GetKeyRotationStatusCommand,
    KMSClient,
    ListKeysCommand
} from '@aws-sdk/client-kms'
import type { ParsedARN } from '../../arn'
import type { Credentials } from '../../CredentialsProvider'
import { BaseResolver } from '../baseResolver'

type KeyData = {
    KeyId?: string
    Arn?: string
    Description?: string
    Enabled?: boolean
    KeyUsage?: string
    KeyState?: string
    KeyManager?: string
    KeySpec?: string
    MultiRegion?: boolean
    KeyPolicy?: string
    EnableKeyRotation?: boolean
}

export class KMSKeyResolver extends BaseResolver<KMSClient, KeyData> {
    readonly service = 'kms'
    readonly resourceType = 'key'
    readonly cfnType = 'AWS::KMS::Key'

    protected createClient(region: string, creds: Credentials): KMSClient {
        return new KMSClient({ region, credentials: creds })
    }

    protected async fetchResource(client: KMSClient, arn: ParsedARN): Promise<KeyData | null> {
        const keyId = arn.resourceId
        const meta = await client.send(new DescribeKeyCommand({ KeyId: keyId }))
        const k = meta.KeyMetadata
        if (!k) return null

        const [policyRes, rotationRes] = await Promise.allSettled([
            client.send(new GetKeyPolicyCommand({ KeyId: keyId, PolicyName: 'default' })),
            client.send(new GetKeyRotationStatusCommand({ KeyId: keyId }))
        ])

        return {
            KeyId: k.KeyId,
            Arn: k.Arn,
            Description: k.Description,
            Enabled: k.Enabled,
            KeyUsage: k.KeyUsage,
            KeyState: k.KeyState,
            KeyManager: k.KeyManager,
            KeySpec: k.KeySpec,
            MultiRegion: k.MultiRegion,
            KeyPolicy: policyRes.status === 'fulfilled' ? policyRes.value.Policy : undefined,
            EnableKeyRotation:
                rotationRes.status === 'fulfilled'
                    ? rotationRes.value.KeyRotationEnabled
                    : undefined
        }
    }

    logicalId(data: Record<string, unknown> | undefined, arn: ParsedARN): string {
        if (data?.Description && typeof data.Description === 'string') return data.Description
        return arn.resourceId
    }

    label(data: Record<string, unknown> | undefined, arn: ParsedARN): string {
        if (data?.Description && typeof data.Description === 'string') return data.Description
        return `key/${arn.resourceId.slice(0, 8)}…`
    }

    async list(
        regions: string[],
        _accountId: string
    ): Promise<Array<{ arn: string; name: string }>> {
        const results: Array<{ arn: string; name: string }> = []
        await Promise.allSettled(
            regions.map(async (r) => {
                const creds = await this.getCredentials()
                const client = new KMSClient({ region: r, credentials: creds })
                let nextMarker: string | undefined
                do {
                    const res = await client.send(
                        new ListKeysCommand({ Limit: 1000, Marker: nextMarker })
                    )
                    for (const k of res.Keys ?? []) {
                        if (!k.KeyArn || !k.KeyId) continue
                        results.push({ arn: k.KeyArn, name: k.KeyId })
                    }
                    nextMarker = res.NextMarker
                } while (nextMarker)
            })
        )
        return results
    }
}

export default KMSKeyResolver
