import { ConnectClient, DescribeUserHierarchyGroupCommand } from '@aws-sdk/client-connect'
import type { ParsedARN } from '../../arn'
import type { Credentials } from '../../CredentialsProvider'
import { BaseResolver } from '../baseResolver'
import { instanceId } from './_shared'

type AgentHierarchyData = {
    HierarchyGroupId?: string
    HierarchyGroupArn?: string
    Name?: string
    LevelId?: string
    HierarchyPath?: object
    InstanceArn?: string
}

export class ConnectAgentHierarchyResolver extends BaseResolver<ConnectClient, AgentHierarchyData> {
    readonly service = 'connect'
    readonly resourceType = 'agent-hierarchy'
    readonly cfnType = 'AWS::Connect::UserHierarchyGroup'

    protected createClient(region: string, creds: Credentials): ConnectClient {
        return new ConnectClient({ region, credentials: creds })
    }

    protected async fetchResource(
        client: ConnectClient,
        arn: ParsedARN
    ): Promise<AgentHierarchyData | null> {
        const instId = instanceId(arn)
        const res = await client.send(
            new DescribeUserHierarchyGroupCommand({
                InstanceId: instId,
                HierarchyGroupId: arn.resourceId
            })
        )
        const g = res.HierarchyGroup
        if (!g) return null
        return {
            HierarchyGroupId: g.Id,
            HierarchyGroupArn: g.Arn,
            Name: g.Name,
            LevelId: g.LevelId,
            HierarchyPath: g.HierarchyPath,
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

export default ConnectAgentHierarchyResolver
