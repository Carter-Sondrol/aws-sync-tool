import {
    CloudFrontClient,
    GetDistributionCommand,
    ListDistributionsCommand
} from '@aws-sdk/client-cloudfront'
import type { ParsedARN } from '../../arn'
import type { Credentials } from '../../CredentialsProvider'
import { BaseResolver } from '../baseResolver'

type DistributionData = {
    DistributionId?: string
    DomainName?: string
    Status?: string
    Enabled?: boolean
    Comment?: string
    PriceClass?: string
    HttpVersion?: string
    DefaultRootObject?: string
    Aliases?: string[]
    Origins?: object[]
    RawConfig?: object
}

export class CloudFrontDistributionResolver extends BaseResolver<
    CloudFrontClient,
    DistributionData
> {
    readonly service = 'cloudfront'
    readonly resourceType = 'distribution'
    readonly cfnType = 'AWS::CloudFront::Distribution'

    // CloudFront is global — always use us-east-1
    protected createClient(_region: string, creds: Credentials): CloudFrontClient {
        return new CloudFrontClient({ region: 'us-east-1', credentials: creds })
    }

    protected async fetchResource(
        client: CloudFrontClient,
        arn: ParsedARN
    ): Promise<DistributionData | null> {
        const res = await client.send(new GetDistributionCommand({ Id: arn.resourceId }))
        const dist = res.Distribution
        if (!dist) return null
        const cfg = dist.DistributionConfig
        return {
            DistributionId: dist.Id,
            DomainName: dist.DomainName,
            Status: dist.Status,
            Enabled: cfg?.Enabled,
            Comment: cfg?.Comment || undefined,
            PriceClass: cfg?.PriceClass,
            HttpVersion: cfg?.HttpVersion,
            DefaultRootObject: cfg?.DefaultRootObject || undefined,
            Aliases: cfg?.Aliases?.Items ?? [],
            Origins: cfg?.Origins?.Items?.map((o) => ({
                Id: o.Id,
                DomainName: o.DomainName,
                S3OriginConfig: o.S3OriginConfig,
                CustomOriginConfig: o.CustomOriginConfig
            })),
            RawConfig: cfg
        }
    }

    logicalId(data: Record<string, unknown> | undefined, arn: ParsedARN): string {
        if (data?.Comment && typeof data.Comment === 'string') return data.Comment
        if (data?.DistributionId && typeof data.DistributionId === 'string')
            return data.DistributionId
        return arn.resourceId
    }

    label(data: Record<string, unknown> | undefined, arn: ParsedARN): string {
        if (data?.DomainName && typeof data.DomainName === 'string') return data.DomainName
        return this.logicalId(data, arn)
    }

    async list(
        _regions: string[],
        _accountId: string
    ): Promise<Array<{ arn: string; name: string }>> {
        const results: Array<{ arn: string; name: string }> = []
        const creds = await this.getCredentials()
        const client = new CloudFrontClient({ region: 'us-east-1', credentials: creds })
        let marker: string | undefined
        do {
            const res = await client.send(
                new ListDistributionsCommand({ Marker: marker, MaxItems: 100 })
            )
            const list = res.DistributionList
            for (const item of list?.Items ?? []) {
                if (!item.ARN || !item.Id) continue
                const name = item.Comment || item.DomainName || item.Id
                results.push({ arn: item.ARN, name })
            }
            marker = list?.IsTruncated ? list.NextMarker : undefined
        } while (marker)
        return results
    }
}

export default CloudFrontDistributionResolver
