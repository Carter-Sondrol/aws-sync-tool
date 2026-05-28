import { ConnectClient, DescribeViewCommand } from '@aws-sdk/client-connect'
import type { ParsedARN } from '../../arn'
import type { Credentials } from '../../CredentialsProvider'
import { BaseResolver } from '../baseResolver'
import { instanceId } from './_shared'

type ViewData = {
    ViewId?: string
    ViewArn?: string
    Name?: string
    Status?: string
    Type?: string
    Description?: string
    Version?: number
    VersionDescription?: string
    Template?: string
    Actions?: string[]
    Tags?: Record<string, string>
    InstanceArn?: string
}

export class ConnectViewResolver extends BaseResolver<ConnectClient, ViewData> {
    readonly service = 'connect'
    readonly resourceType = 'view'
    readonly cfnType = 'AWS::Connect::View'

    protected createClient(region: string, creds: Credentials): ConnectClient {
        return new ConnectClient({ region, credentials: creds })
    }

    protected async fetchResource(client: ConnectClient, arn: ParsedARN): Promise<ViewData | null> {
        const instId = instanceId(arn)
        const res = await client.send(
            new DescribeViewCommand({
                InstanceId: instId,
                ViewId: arn.resourceId
            })
        )
        const v = res.View
        if (!v) return null
        return {
            ViewId: v.Id,
            ViewArn: v.Arn,
            Name: v.Name,
            Status: v.Status,
            Type: v.Type,
            Description: v.Description,
            Version: v.Version,
            VersionDescription: v.VersionDescription,
            Template: v.Content?.Template,
            Actions: v.Content?.Actions,
            Tags: v.Tags,
            InstanceArn: `arn:${arn.partition}:connect:${arn.region}:${arn.accountId}:instance/${instId}`
        }
    }

    logicalId(data: Record<string, unknown> | undefined, arn: ParsedARN): string {
        return (data?.Name as string | undefined) ?? arn.resourceId
    }

    label(data: Record<string, unknown> | undefined, arn: ParsedARN): string {
        return this.logicalId(data, arn)
    }
}

export default ConnectViewResolver
