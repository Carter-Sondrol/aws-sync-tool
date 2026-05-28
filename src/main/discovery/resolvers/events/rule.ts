import {
    DescribeRuleCommand,
    EventBridgeClient,
    ListRulesCommand
} from '@aws-sdk/client-eventbridge'
import type { ParsedARN } from '../../arn'
import type { Credentials } from '../../CredentialsProvider'
import { BaseResolver } from '../baseResolver'

type RuleData = {
    Name?: string
    Arn?: string
    EventPattern?: string
    ScheduleExpression?: string
    State?: string
    Description?: string
    RoleArn?: string
    EventBusName?: string
}

// ARN resource = 'rule/name' (default bus) or 'rule/bus-name/rule-name' (custom bus)
function parseRuleArn(arn: ParsedARN): { ruleName: string; eventBusName?: string } {
    const parts = arn.resource.split('/')
    return {
        ruleName: parts[parts.length - 1] ?? arn.resourceId,
        eventBusName: parts.length >= 3 ? parts[1] : undefined
    }
}

export class EventBridgeRuleResolver extends BaseResolver<EventBridgeClient, RuleData> {
    readonly service = 'events'
    readonly resourceType = 'rule'
    readonly cfnType = 'AWS::Events::Rule'

    protected createClient(region: string, creds: Credentials): EventBridgeClient {
        return new EventBridgeClient({ region, credentials: creds })
    }

    protected async fetchResource(
        client: EventBridgeClient,
        arn: ParsedARN
    ): Promise<RuleData | null> {
        const { ruleName, eventBusName } = parseRuleArn(arn)
        const res = await client.send(
            new DescribeRuleCommand({ Name: ruleName, EventBusName: eventBusName })
        )
        return {
            Name: res.Name,
            Arn: res.Arn,
            EventPattern: res.EventPattern || undefined,
            ScheduleExpression: res.ScheduleExpression || undefined,
            State: res.State,
            Description: res.Description || undefined,
            RoleArn: res.RoleArn || undefined,
            EventBusName: res.EventBusName
        }
    }

    logicalId(data: Record<string, unknown> | undefined, arn: ParsedARN): string {
        return (data?.Name as string | undefined) ?? parseRuleArn(arn).ruleName
    }

    label(data: Record<string, unknown> | undefined, arn: ParsedARN): string {
        return this.logicalId(data, arn)
    }

    async list(
        regions: string[],
        _accountId: string
    ): Promise<Array<{ arn: string; name: string }>> {
        const results: Array<{ arn: string; name: string }> = []
        await Promise.allSettled(
            regions.map(async (r) => {
                const creds = await this.getCredentials()
                const client = new EventBridgeClient({ region: r, credentials: creds })
                let nextToken: string | undefined
                do {
                    const res = await client.send(
                        new ListRulesCommand({ Limit: 100, NextToken: nextToken })
                    )
                    for (const rule of res.Rules ?? []) {
                        if (!rule.Arn || !rule.Name) continue
                        results.push({ arn: rule.Arn, name: rule.Name })
                    }
                    nextToken = res.NextToken
                } while (nextToken)
            })
        )
        return results
    }
}

export default EventBridgeRuleResolver
