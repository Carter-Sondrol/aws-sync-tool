import { ConnectClient, DescribeAgentStatusCommand } from '@aws-sdk/client-connect'
import type { ParsedARN } from '../../arn'
import type { Credentials } from '../../CredentialsProvider'
import { BaseResolver } from '../baseResolver'
import { instanceId } from './_shared'

type AgentStateData = {
    AgentStatusId?: string
    AgentStatusARN?: string
    Name?: string
    Description?: string
    Type?: string
    DisplayOrder?: number
    State?: string
    Tags?: object
    InstanceArn?: string
}

export class ConnectAgentStateResolver extends BaseResolver<ConnectClient, AgentStateData> {
    readonly service = 'connect'
    readonly resourceType = 'agent-state'
    readonly cfnType = 'AWS::Connect::AgentStatus'

    protected createClient(region: string, creds: Credentials): ConnectClient {
        return new ConnectClient({ region, credentials: creds })
    }

    protected async fetchResource(
        client: ConnectClient,
        arn: ParsedARN
    ): Promise<AgentStateData | null> {
        const instId = instanceId(arn)
        const res = await client.send(
            new DescribeAgentStatusCommand({ InstanceId: instId, AgentStatusId: arn.resourceId })
        )
        const s = res.AgentStatus
        if (!s) return null
        return {
            AgentStatusId: s.AgentStatusId,
            AgentStatusARN: s.AgentStatusARN,
            Name: s.Name,
            Description: s.Description,
            Type: s.Type,
            DisplayOrder: s.DisplayOrder,
            State: s.State,
            Tags: s.Tags,
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

export default ConnectAgentStateResolver
