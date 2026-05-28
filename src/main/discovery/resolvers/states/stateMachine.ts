import {
    DescribeStateMachineCommand,
    ListStateMachinesCommand,
    SFNClient
} from '@aws-sdk/client-sfn'
import type { ParsedARN } from '../../arn'
import type { Credentials } from '../../CredentialsProvider'
import { BaseResolver } from '../baseResolver'

type StateMachineData = {
    Name?: string
    StateMachineArn?: string
    Status?: string
    Definition?: string
    RoleArn?: string
    Type?: string
}

export class StepFunctionsStateMachineResolver extends BaseResolver<SFNClient, StateMachineData> {
    readonly service = 'states'
    readonly resourceType = 'stateMachine'
    readonly cfnType = 'AWS::StepFunctions::StateMachine'

    protected createClient(region: string, creds: Credentials): SFNClient {
        return new SFNClient({ region, credentials: creds })
    }

    protected async fetchResource(
        client: SFNClient,
        arn: ParsedARN
    ): Promise<StateMachineData | null> {
        const res = await client.send(new DescribeStateMachineCommand({ stateMachineArn: arn.raw }))
        return {
            Name: res.name,
            StateMachineArn: res.stateMachineArn,
            Status: res.status,
            Definition: res.definition,
            RoleArn: res.roleArn || undefined,
            Type: res.type
        }
    }

    logicalId(data: Record<string, unknown> | undefined, arn: ParsedARN): string {
        return (data?.Name as string | undefined) ?? arn.resourceId
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
                const client = new SFNClient({ region: r, credentials: creds })
                let nextToken: string | undefined
                do {
                    const res = await client.send(
                        new ListStateMachinesCommand({ maxResults: 1000, nextToken })
                    )
                    for (const sm of res.stateMachines ?? []) {
                        if (!sm.stateMachineArn || !sm.name) continue
                        results.push({ arn: sm.stateMachineArn, name: sm.name })
                    }
                    nextToken = res.nextToken
                } while (nextToken)
            })
        )
        return results
    }
}

export default StepFunctionsStateMachineResolver
