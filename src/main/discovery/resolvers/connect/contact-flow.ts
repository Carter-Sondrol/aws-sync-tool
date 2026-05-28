import { ConnectClient, DescribeContactFlowCommand } from '@aws-sdk/client-connect'
import type { ParsedARN } from '../../arn'
import type { Credentials } from '../../CredentialsProvider'
import { BaseResolver } from '../baseResolver'
import { instanceId } from './_shared'

type ContactFlowData = {
    Id?: string
    Arn?: string
    Name?: string
    Type?: string
    Status?: string
    Description?: string
    Content?: string
    Tags?: object
    InstanceArn?: string
}

export class ConnectContactFlowResolver extends BaseResolver<ConnectClient, ContactFlowData> {
    readonly service = 'connect'
    readonly resourceType = 'contact-flow'
    readonly cfnType = 'AWS::Connect::ContactFlow'

    protected createClient(region: string, creds: Credentials): ConnectClient {
        return new ConnectClient({ region, credentials: creds })
    }

    protected async fetchResource(
        client: ConnectClient,
        arn: ParsedARN
    ): Promise<ContactFlowData | null> {
        const instId = instanceId(arn)
        const res = await client.send(
            new DescribeContactFlowCommand({ InstanceId: instId, ContactFlowId: arn.resourceId })
        )
        const f = res.ContactFlow
        if (!f) return null
        return {
            Id: f.Id,
            Arn: f.Arn,
            Name: f.Name,
            Type: f.Type,
            Status: f.Status,
            Description: f.Description,
            Content: f.Content,
            Tags: f.Tags,
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

export default ConnectContactFlowResolver
