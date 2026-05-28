import { ConnectClient, DescribeQueueCommand } from '@aws-sdk/client-connect'
import type { ParsedARN } from '../../arn'
import type { Credentials } from '../../CredentialsProvider'
import { BaseResolver } from '../baseResolver'
import { instanceId } from './_shared'

type OutboundCallerConfig = {
    OutboundCallerIdName?: string
    OutboundCallerIdNumberId?: string
    OutboundFlowId?: string
}

type OutboundEmailConfig = {
    OutboundEmailAddressId?: string
}

type QueueData = {
    QueueId?: string
    QueueArn?: string
    Name?: string
    Description?: string
    Status?: string
    HoursOfOperationId?: string
    MaxContacts?: number
    OutboundCallerConfig?: OutboundCallerConfig
    OutboundEmailConfig?: OutboundEmailConfig
    Tags?: object
    InstanceArn?: string
}

export class ConnectQueueResolver extends BaseResolver<ConnectClient, QueueData> {
    readonly service = 'connect'
    readonly resourceType = 'queue'
    readonly cfnType = 'AWS::Connect::Queue'

    protected createClient(region: string, creds: Credentials): ConnectClient {
        return new ConnectClient({ region, credentials: creds })
    }

    protected async fetchResource(
        client: ConnectClient,
        arn: ParsedARN
    ): Promise<QueueData | null> {
        const instId = instanceId(arn)
        const res = await client.send(
            new DescribeQueueCommand({ InstanceId: instId, QueueId: arn.resourceId })
        )
        const q = res.Queue
        if (!q) return null
        return {
            QueueId: q.QueueId,
            QueueArn: q.QueueArn,
            Name: q.Name,
            Description: q.Description,
            // SDK type inconsistency — QueueStatus is the actual field name
            Status: ((q as Record<string, unknown>).QueueStatus as string | undefined) ?? q.Status,
            HoursOfOperationId: q.HoursOfOperationId,
            MaxContacts: q.MaxContacts,
            OutboundCallerConfig: q.OutboundCallerConfig
                ? {
                      OutboundCallerIdName: q.OutboundCallerConfig.OutboundCallerIdName,
                      OutboundCallerIdNumberId: q.OutboundCallerConfig.OutboundCallerIdNumberId,
                      OutboundFlowId: q.OutboundCallerConfig.OutboundFlowId
                  }
                : undefined,
            OutboundEmailConfig: q.OutboundEmailConfig
                ? {
                      OutboundEmailAddressId: q.OutboundEmailConfig.OutboundEmailAddressId
                  }
                : undefined,
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

export default ConnectQueueResolver
