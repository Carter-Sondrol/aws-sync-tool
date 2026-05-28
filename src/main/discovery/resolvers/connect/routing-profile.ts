import {
    ConnectClient,
    DescribeRoutingProfileCommand,
    ListRoutingProfileManualAssignmentQueuesCommand,
    ListRoutingProfileQueuesCommand
} from '@aws-sdk/client-connect'
import type { ParsedARN } from '../../arn'
import type { Credentials } from '../../CredentialsProvider'
import { BaseResolver } from '../baseResolver'
import { instanceId } from './_shared'

type RoutingProfileQueueConfig = {
    QueueId: string
    QueueArn: string
    QueueName: string
    Priority: number
    Delay: number
    Channel: string
}

type RoutingProfileManualAssignmentQueueConfig = {
    QueueId: string
    Channel: string
}

type RoutingProfileData = {
    RoutingProfileId?: string
    RoutingProfileArn?: string
    Name?: string
    Description?: string
    DefaultOutboundQueueId?: string
    DefaultOutboundQueueArn?: string
    AgentAvailabilityTimer?: string
    MediaConcurrencies?: object[]
    QueueConfigs?: RoutingProfileQueueConfig[]
    ManualAssignmentQueueConfigs?: RoutingProfileManualAssignmentQueueConfig[]
    Tags?: object
    InstanceArn?: string
}

export class ConnectRoutingProfileResolver extends BaseResolver<ConnectClient, RoutingProfileData> {
    readonly service = 'connect'
    readonly resourceType = 'routing-profile'
    readonly cfnType = 'AWS::Connect::RoutingProfile'

    protected createClient(region: string, creds: Credentials): ConnectClient {
        return new ConnectClient({ region, credentials: creds })
    }

    protected async fetchResource(
        client: ConnectClient,
        arn: ParsedARN
    ): Promise<RoutingProfileData | null> {
        const instId = instanceId(arn)
        const [describeRes, queuesRes, manualQueuesRes] = await Promise.all([
            client.send(
                new DescribeRoutingProfileCommand({
                    InstanceId: instId,
                    RoutingProfileId: arn.resourceId
                })
            ),
            client.send(
                new ListRoutingProfileQueuesCommand({
                    InstanceId: instId,
                    RoutingProfileId: arn.resourceId
                })
            ),
            client.send(
                new ListRoutingProfileManualAssignmentQueuesCommand({
                    InstanceId: instId,
                    RoutingProfileId: arn.resourceId
                })
            )
        ])
        const p = describeRes.RoutingProfile
        if (!p) return null
        const queueConfigs: RoutingProfileQueueConfig[] = (
            queuesRes.RoutingProfileQueueConfigSummaryList ?? []
        ).map((q) => ({
            QueueId: q.QueueId ?? '',
            QueueArn: q.QueueArn ?? '',
            QueueName: q.QueueName ?? '',
            Priority: q.Priority ?? 1,
            Delay: q.Delay ?? 0,
            Channel: q.Channel ?? ''
        }))
        const manualQueueConfigs: RoutingProfileManualAssignmentQueueConfig[] = (
            manualQueuesRes.RoutingProfileManualAssignmentQueueConfigSummaryList ?? []
        ).map((q) => ({
            QueueId: q.QueueId ?? '',
            Channel: q.Channel ?? ''
        }))
        return {
            RoutingProfileId: p.RoutingProfileId,
            RoutingProfileArn: p.RoutingProfileArn,
            Name: p.Name,
            Description: p.Description,
            DefaultOutboundQueueId: p.DefaultOutboundQueueId,
            DefaultOutboundQueueArn: p.DefaultOutboundQueueId
                ? `arn:${arn.partition}:connect:${arn.region}:${arn.accountId}:instance/${instId}/queue/${p.DefaultOutboundQueueId}`
                : undefined,
            AgentAvailabilityTimer: (p as Record<string, unknown>).AgentAvailabilityTimer as
                | string
                | undefined,
            MediaConcurrencies: p.MediaConcurrencies as object[] | undefined,
            QueueConfigs: queueConfigs,
            ManualAssignmentQueueConfigs: manualQueueConfigs.length
                ? manualQueueConfigs
                : undefined,
            Tags: p.Tags,
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

export default ConnectRoutingProfileResolver
