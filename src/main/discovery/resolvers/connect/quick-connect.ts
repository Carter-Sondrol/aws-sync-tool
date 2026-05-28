import { ConnectClient, DescribeQuickConnectCommand } from '@aws-sdk/client-connect'
import type { ParsedARN } from '../../arn'
import type { Credentials } from '../../CredentialsProvider'
import { BaseResolver } from '../baseResolver'
import { instanceId } from './_shared'

type QuickConnectData = {
    QuickConnectId?: string
    QuickConnectARN?: string
    Name?: string
    Description?: string
    QuickConnectConfig?: object
    Tags?: object
    InstanceArn?: string
}

export class ConnectQuickConnectResolver extends BaseResolver<ConnectClient, QuickConnectData> {
    readonly service = 'connect'
    readonly resourceType = 'quick-connect'
    readonly cfnType = 'AWS::Connect::QuickConnect'

    protected createClient(region: string, creds: Credentials): ConnectClient {
        return new ConnectClient({ region, credentials: creds })
    }

    protected async fetchResource(
        client: ConnectClient,
        arn: ParsedARN
    ): Promise<QuickConnectData | null> {
        const instId = instanceId(arn)
        const res = await client.send(
            new DescribeQuickConnectCommand({
                InstanceId: instId,
                QuickConnectId: arn.resourceId
            })
        )
        const q = res.QuickConnect
        if (!q) return null
        return {
            QuickConnectId: q.QuickConnectId,
            QuickConnectARN: q.QuickConnectARN,
            Name: q.Name,
            Description: q.Description,
            QuickConnectConfig: q.QuickConnectConfig,
            Tags: q.Tags,
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

export default ConnectQuickConnectResolver
