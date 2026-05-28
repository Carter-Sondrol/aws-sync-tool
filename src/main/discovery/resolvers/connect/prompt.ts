import { ConnectClient, DescribePromptCommand } from '@aws-sdk/client-connect'
import type { ParsedARN } from '../../arn'
import type { Credentials } from '../../CredentialsProvider'
import { BaseResolver } from '../baseResolver'
import { instanceId } from './_shared'

type PromptData = {
    PromptId?: string
    PromptARN?: string
    Name?: string
    Description?: string
    Tags?: Record<string, string>
    InstanceArn?: string
}

export class ConnectPromptResolver extends BaseResolver<ConnectClient, PromptData> {
    readonly service = 'connect'
    readonly resourceType = 'prompt'
    readonly cfnType = 'AWS::Connect::Prompt'

    protected createClient(region: string, creds: Credentials): ConnectClient {
        return new ConnectClient({ region, credentials: creds })
    }

    protected async fetchResource(
        client: ConnectClient,
        arn: ParsedARN
    ): Promise<PromptData | null> {
        const instId = instanceId(arn)
        const res = await client.send(
            new DescribePromptCommand({ InstanceId: instId, PromptId: arn.resourceId })
        )
        const p = res.Prompt
        if (!p) return null
        return {
            PromptId: p.PromptId,
            PromptARN: p.PromptARN,
            Name: p.Name,
            Description: p.Description,
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

export default ConnectPromptResolver
