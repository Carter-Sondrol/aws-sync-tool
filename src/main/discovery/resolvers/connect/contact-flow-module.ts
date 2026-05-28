import { ConnectClient, DescribeContactFlowModuleCommand } from '@aws-sdk/client-connect'
import type { ParsedARN } from '../../arn'
import type { Credentials } from '../../CredentialsProvider'
import { BaseResolver } from '../baseResolver'
import { instanceId } from './_shared'

type ContactFlowModuleData = {
    Id?: string
    Arn?: string
    Name?: string
    Status?: string
    Description?: string
    Content?: string
    Tags?: object
    InstanceArn?: string
}

export class ConnectContactFlowModuleResolver extends BaseResolver<
    ConnectClient,
    ContactFlowModuleData
> {
    readonly service = 'connect'
    readonly resourceType = 'contact-flow-module'
    readonly cfnType = 'AWS::Connect::ContactFlowModule'

    protected createClient(region: string, creds: Credentials): ConnectClient {
        return new ConnectClient({ region, credentials: creds })
    }

    protected async fetchResource(
        client: ConnectClient,
        arn: ParsedARN
    ): Promise<ContactFlowModuleData | null> {
        const instId = instanceId(arn)
        const res = await client.send(
            new DescribeContactFlowModuleCommand({
                InstanceId: instId,
                ContactFlowModuleId: arn.resourceId
            })
        )
        const m = res.ContactFlowModule
        if (!m) return null
        return {
            Id: m.Id,
            Arn: m.Arn,
            Name: m.Name,
            Status: m.Status,
            Description: m.Description,
            Content: m.Content,
            Tags: m.Tags,
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

export default ConnectContactFlowModuleResolver
