import { ConnectClient, GetTaskTemplateCommand } from '@aws-sdk/client-connect'
import type { ParsedARN } from '../../arn'
import type { Credentials } from '../../CredentialsProvider'
import { BaseResolver } from '../baseResolver'
import { instanceId } from './_shared'

type TaskTemplateData = {
    TaskTemplateId?: string
    TaskTemplateArn?: string
    Name?: string
    Description?: string
    Status?: string
    ContactFlowId?: string
    Fields?: object[]
    Constraints?: object
    Defaults?: object
    Tags?: object
    InstanceArn?: string
}

export class ConnectTaskTemplateResolver extends BaseResolver<ConnectClient, TaskTemplateData> {
    readonly service = 'connect'
    readonly resourceType = 'task-template'
    readonly cfnType = 'AWS::Connect::TaskTemplate'

    protected createClient(region: string, creds: Credentials): ConnectClient {
        return new ConnectClient({ region, credentials: creds })
    }

    protected async fetchResource(
        client: ConnectClient,
        arn: ParsedARN
    ): Promise<TaskTemplateData | null> {
        const instId = instanceId(arn)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const res = await client.send(
            new GetTaskTemplateCommand({
                InstanceId: instId,
                TaskTemplateId: arn.resourceId
            } as any)
        )
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const t = res as any
        if (!t?.Id) return null
        return {
            TaskTemplateId: t.Id,
            TaskTemplateArn: t.Arn,
            Name: t.Name,
            Description: t.Description,
            Status: t.Status,
            ContactFlowId: t.ContactFlowId,
            Fields: t.Fields,
            Constraints: t.Constraints,
            Defaults: t.Defaults,
            Tags: t.Tags,
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

export default ConnectTaskTemplateResolver
