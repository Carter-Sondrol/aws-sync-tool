import { ConnectClient, DescribeEvaluationFormCommand } from '@aws-sdk/client-connect'
import type { ParsedARN } from '../../arn'
import type { Credentials } from '../../CredentialsProvider'
import { BaseResolver } from '../baseResolver'
import { instanceId } from './_shared'

type EvaluationFormData = {
    EvaluationFormId?: string
    EvaluationFormArn?: string
    EvaluationFormVersion?: number
    Title?: string
    Description?: string
    Status?: string
    Items?: object[]
    ScoringStrategy?: object
    Tags?: Record<string, string>
    InstanceArn?: string
}

export class ConnectEvaluationFormResolver extends BaseResolver<ConnectClient, EvaluationFormData> {
    readonly service = 'connect'
    readonly resourceType = 'evaluation-form'
    readonly cfnType = 'AWS::Connect::EvaluationForm'

    protected createClient(region: string, creds: Credentials): ConnectClient {
        return new ConnectClient({ region, credentials: creds })
    }

    protected async fetchResource(
        client: ConnectClient,
        arn: ParsedARN
    ): Promise<EvaluationFormData | null> {
        const instId = instanceId(arn)
        const res = await client.send(
            new DescribeEvaluationFormCommand({
                InstanceId: instId,
                EvaluationFormId: arn.resourceId
            })
        )
        const f = res.EvaluationForm
        if (!f) return null
        return {
            EvaluationFormId: f.EvaluationFormId,
            EvaluationFormArn: f.EvaluationFormArn,
            EvaluationFormVersion: f.EvaluationFormVersion,
            Title: f.Title,
            Description: f.Description,
            Status: f.Status,
            Items: f.Items as object[] | undefined,
            ScoringStrategy: f.ScoringStrategy,
            Tags: f.Tags,
            InstanceArn: `arn:${arn.partition}:connect:${arn.region}:${arn.accountId}:instance/${instId}`
        }
    }

    logicalId(data: Record<string, unknown> | undefined, arn: ParsedARN): string {
        return (data?.Title as string | undefined) ?? arn.resourceId
    }

    label(data: Record<string, unknown> | undefined, arn: ParsedARN): string {
        return this.logicalId(data, arn)
    }
}

export default ConnectEvaluationFormResolver
