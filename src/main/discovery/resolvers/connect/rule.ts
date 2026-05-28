import { ConnectClient, DescribeRuleCommand } from '@aws-sdk/client-connect'
import type { ParsedARN } from '../../arn'
import type { Credentials } from '../../CredentialsProvider'
import { BaseResolver } from '../baseResolver'
import { instanceId } from './_shared'

type RuleData = {
    RuleId?: string
    RuleArn?: string
    Name?: string
    TriggerEventSource?: object
    Function?: string
    Actions?: object[]
    PublishStatus?: string
    Tags?: object
    InstanceArn?: string
}

export class ConnectRuleResolver extends BaseResolver<ConnectClient, RuleData> {
    readonly service = 'connect'
    readonly resourceType = 'rule'
    readonly cfnType = 'AWS::Connect::Rule'

    protected createClient(region: string, creds: Credentials): ConnectClient {
        return new ConnectClient({ region, credentials: creds })
    }

    protected async fetchResource(client: ConnectClient, arn: ParsedARN): Promise<RuleData | null> {
        const instId = instanceId(arn)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const res = await client.send(
            new DescribeRuleCommand({ InstanceId: instId, RuleId: arn.resourceId } as any)
        )
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const r = (res as any).Rule
        if (!r) return null
        return {
            RuleId: r.RuleId,
            RuleArn: r.RuleArn,
            Name: r.Name,
            TriggerEventSource: r.TriggerEventSource,
            Function: r.Function,
            Actions: r.Actions,
            PublishStatus: r.PublishStatus,
            Tags: r.Tags,
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

export default ConnectRuleResolver
