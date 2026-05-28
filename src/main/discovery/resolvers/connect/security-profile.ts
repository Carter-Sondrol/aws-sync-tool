import {
    ConnectClient,
    DescribeSecurityProfileCommand,
    ListSecurityProfilePermissionsCommand
} from '@aws-sdk/client-connect'
import type { ParsedARN } from '../../arn'
import type { Credentials } from '../../CredentialsProvider'
import { BaseResolver } from '../baseResolver'
import { instanceId } from './_shared'

type SecurityProfileData = {
    SecurityProfileId?: string
    SecurityProfileArn?: string
    SecurityProfileName?: string
    Description?: string
    Permissions?: string[]
    Tags?: object
    InstanceArn?: string
}

export class ConnectSecurityProfileResolver extends BaseResolver<
    ConnectClient,
    SecurityProfileData
> {
    readonly service = 'connect'
    readonly resourceType = 'security-profile'
    readonly cfnType = 'AWS::Connect::SecurityProfile'

    protected createClient(region: string, creds: Credentials): ConnectClient {
        return new ConnectClient({ region, credentials: creds })
    }

    protected async fetchResource(
        client: ConnectClient,
        arn: ParsedARN
    ): Promise<SecurityProfileData | null> {
        const instId = instanceId(arn)
        const res = await client.send(
            new DescribeSecurityProfileCommand({
                InstanceId: instId,
                SecurityProfileId: arn.resourceId
            })
        )
        const p = res.SecurityProfile
        if (!p) return null

        const permissions: string[] = []
        let nextToken: string | undefined
        do {
            const permsRes = await client.send(
                new ListSecurityProfilePermissionsCommand({
                    InstanceId: instId,
                    SecurityProfileId: arn.resourceId,
                    NextToken: nextToken
                })
            )
            permissions.push(...(permsRes.Permissions ?? []))
            nextToken = permsRes.NextToken
        } while (nextToken)

        return {
            SecurityProfileId: p.Id,
            SecurityProfileArn: p.Arn,
            SecurityProfileName: p.SecurityProfileName,
            Description: p.Description,
            Permissions: permissions.length ? permissions : undefined,
            Tags: p.Tags,
            InstanceArn: `arn:${arn.partition}:connect:${arn.region}:${arn.accountId}:instance/${instId}`
        }
    }

    logicalId(data: Record<string, unknown> | undefined, arn: ParsedARN): string {
        return (data?.SecurityProfileName as string | undefined) ?? arn.resourceId
    }

    label(data: Record<string, unknown> | undefined, arn: ParsedARN): string {
        return this.logicalId(data, arn)
    }
}

export default ConnectSecurityProfileResolver
