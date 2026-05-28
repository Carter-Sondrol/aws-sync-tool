import type { DescribeSecretResponse } from '@aws-sdk/client-secrets-manager'
import {
    DescribeSecretCommand,
    ListSecretsCommand,
    SecretsManagerClient
} from '@aws-sdk/client-secrets-manager'
import type { ParsedARN } from '../../arn'
import type { Credentials } from '../../CredentialsProvider'
import { BaseResolver } from '../baseResolver'

export class SecretsManagerSecretResolver extends BaseResolver<
    SecretsManagerClient,
    DescribeSecretResponse
> {
    readonly service = 'secretsmanager'
    readonly resourceType = 'secret'
    readonly cfnType = 'AWS::SecretsManager::Secret'

    protected createClient(region: string, creds: Credentials): SecretsManagerClient {
        return new SecretsManagerClient({ region, credentials: creds })
    }

    protected async fetchResource(
        client: SecretsManagerClient,
        arn: ParsedARN
    ): Promise<DescribeSecretResponse | null> {
        const res = await client.send(new DescribeSecretCommand({ SecretId: arn.raw }))
        return {
            Name: res.Name,
            ARN: res.ARN,
            Description: res.Description || undefined,
            KmsKeyId: res.KmsKeyId || undefined,
            RotationEnabled: res.RotationEnabled,
            RotationLambdaARN: res.RotationLambdaARN || undefined
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
                const client = new SecretsManagerClient({ region: r, credentials: creds })
                let nextToken: string | undefined
                do {
                    const res = await client.send(
                        new ListSecretsCommand({ MaxResults: 100, NextToken: nextToken })
                    )
                    for (const secret of res.SecretList ?? []) {
                        if (!secret.ARN || !secret.Name) continue
                        results.push({ arn: secret.ARN, name: secret.Name })
                    }
                    nextToken = res.NextToken
                } while (nextToken)
            })
        )
        return results
    }
}

export default SecretsManagerSecretResolver
