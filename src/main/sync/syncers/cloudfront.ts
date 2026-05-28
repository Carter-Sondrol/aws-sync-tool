import {
    CloudFrontClient,
    GetDistributionConfigCommand,
    UpdateDistributionCommand
} from '@aws-sdk/client-cloudfront'
import { parseARN } from '../../discovery/arn'
import { registerSyncer } from '../registry'
import type { ResourceSyncer, SyncPushResult } from '../syncer'

function resourceIdFromArn(arn: string): string {
    return parseARN(arn)?.resourceId ?? arn
}

// ─── CloudFront Distribution ───────────────────────────────────────────────────

const distributionSyncer: ResourceSyncer = {
    service: 'cloudfront',
    resourceType: 'distribution',

    async push(
        sourceData,
        _sourceArn,
        targetArn,
        _sourceCredentials,
        targetCredentials
    ): Promise<SyncPushResult> {
        const changes: string[] = []
        const skipped: string[] = []

        if (!sourceData.RawConfig) {
            skipped.push('RawConfig not available in source data')
            return { ok: true, changes, skipped }
        }

        const creds = await targetCredentials()
        // CloudFront is global — always us-east-1
        const client = new CloudFrontClient({ region: 'us-east-1', credentials: creds })
        const distributionId = resourceIdFromArn(targetArn)

        const configRes = await client.send(
            new GetDistributionConfigCommand({ Id: distributionId })
        )
        const etag = configRes.ETag
        if (!etag) {
            return {
                ok: false,
                changes,
                skipped,
                error: 'Could not retrieve ETag for distribution'
            }
        }

        await client.send(
            new UpdateDistributionCommand({
                Id: distributionId,
                IfMatch: etag,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                DistributionConfig: sourceData.RawConfig as any
            })
        )
        changes.push('distribution config')

        return { ok: true, changes, skipped }
    }
}

// ─── Register all ──────────────────────────────────────────────────────────────

registerSyncer('cloudfront:distribution', distributionSyncer)
