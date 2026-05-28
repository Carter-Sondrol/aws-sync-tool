import { DescribeParametersCommand, GetParameterCommand, SSMClient } from '@aws-sdk/client-ssm'
import type { ParsedARN } from '../../arn'
import type { Credentials } from '../../CredentialsProvider'
import { BaseResolver } from '../baseResolver'

type ParameterData = {
    Name?: string
    Type?: string
    Value?: string
    Version?: number
    ARN?: string
    DataType?: string
}

// ARN resource = 'parameter/path/to/name' → parameter name = '/path/to/name'
function paramName(arn: ParsedARN): string {
    return arn.resource.slice('parameter'.length)
}

export class SSMParameterResolver extends BaseResolver<SSMClient, ParameterData> {
    readonly service = 'ssm'
    readonly resourceType = 'parameter'
    readonly cfnType = 'AWS::SSM::Parameter'

    protected createClient(region: string, creds: Credentials): SSMClient {
        return new SSMClient({ region, credentials: creds })
    }

    protected async fetchResource(
        client: SSMClient,
        arn: ParsedARN
    ): Promise<ParameterData | null> {
        const name = paramName(arn)
        const res = await client.send(
            new GetParameterCommand({ Name: name, WithDecryption: false })
        )
        const p = res.Parameter
        if (!p) return null
        return {
            Name: p.Name,
            Type: p.Type,
            Value: p.Type === 'SecureString' ? undefined : p.Value,
            Version: p.Version,
            ARN: p.ARN,
            DataType: p.DataType
        }
    }

    logicalId(data: Record<string, unknown> | undefined, arn: ParsedARN): string {
        return (data?.Name as string | undefined) ?? paramName(arn)
    }

    label(data: Record<string, unknown> | undefined, arn: ParsedARN): string {
        const name = (data?.Name as string | undefined) ?? paramName(arn)
        return name.split('/').filter(Boolean).pop() ?? name
    }

    async list(
        regions: string[],
        accountId: string
    ): Promise<Array<{ arn: string; name: string }>> {
        const results: Array<{ arn: string; name: string }> = []
        await Promise.allSettled(
            regions.map(async (r) => {
                const creds = await this.getCredentials()
                const client = new SSMClient({ region: r, credentials: creds })
                let nextToken: string | undefined
                do {
                    const res = await client.send(
                        new DescribeParametersCommand({ MaxResults: 50, NextToken: nextToken })
                    )
                    for (const param of res.Parameters ?? []) {
                        if (!param.Name) continue
                        const nameWithSlash = param.Name.startsWith('/')
                            ? param.Name
                            : `/${param.Name}`
                        results.push({
                            arn: `arn:aws:ssm:${r}:${accountId}:parameter${nameWithSlash}`,
                            name: param.Name
                        })
                    }
                    nextToken = res.NextToken
                } while (nextToken)
            })
        )
        return results
    }
}

export default SSMParameterResolver
