import {
    GetRoleCommand,
    GetRolePolicyCommand,
    IAMClient,
    ListAttachedRolePoliciesCommand,
    ListRolePoliciesCommand,
    ListRolesCommand
} from '@aws-sdk/client-iam'
import type { ParsedARN } from '../../arn'
import type { Credentials } from '../../CredentialsProvider'
import { BaseResolver } from '../baseResolver'

type RoleData = {
    RoleName?: string
    RoleId?: string
    Arn?: string
    Path?: string
    CreateDate?: string
    AssumeRolePolicyDocument?: string
    Description?: string
    MaxSessionDuration?: number
    Tags?: object[]
    AttachedManagedPolicies?: Array<{ PolicyName?: string; PolicyArn?: string }>
    InlinePolicies?: Record<string, string>
}

export class IAMRoleResolver extends BaseResolver<IAMClient, RoleData> {
    readonly service = 'iam'
    readonly resourceType = 'role'
    readonly cfnType = 'AWS::IAM::Role'

    // IAM is global
    protected createClient(_region: string, creds: Credentials): IAMClient {
        return new IAMClient({ region: 'us-east-1', credentials: creds })
    }

    protected async fetchResource(client: IAMClient, arn: ParsedARN): Promise<RoleData | null> {
        const roleName = arn.resourceId
        const res = await client.send(new GetRoleCommand({ RoleName: roleName }))
        const role = res.Role
        if (!role) return null

        const [attachedRes, inlineNamesRes] = await Promise.allSettled([
            client.send(new ListAttachedRolePoliciesCommand({ RoleName: roleName })),
            client.send(new ListRolePoliciesCommand({ RoleName: roleName }))
        ])

        const attachedManagedPolicies =
            attachedRes.status === 'fulfilled'
                ? (attachedRes.value.AttachedPolicies ?? []).map((p) => ({
                      PolicyName: p.PolicyName,
                      PolicyArn: p.PolicyArn
                  }))
                : []

        const inlinePolicies: Record<string, string> = {}
        if (inlineNamesRes.status === 'fulfilled') {
            const names = inlineNamesRes.value.PolicyNames ?? []
            await Promise.allSettled(
                names.map(async (name) => {
                    try {
                        const docRes = await client.send(
                            new GetRolePolicyCommand({ RoleName: roleName, PolicyName: name })
                        )
                        if (docRes.PolicyDocument) {
                            inlinePolicies[name] = decodeURIComponent(docRes.PolicyDocument)
                        }
                    } catch {
                        // non-critical
                    }
                })
            )
        }

        return {
            RoleName: role.RoleName,
            RoleId: role.RoleId,
            Arn: role.Arn,
            Path: role.Path,
            CreateDate: role.CreateDate?.toISOString(),
            AssumeRolePolicyDocument: role.AssumeRolePolicyDocument
                ? decodeURIComponent(role.AssumeRolePolicyDocument)
                : undefined,
            Description: role.Description,
            MaxSessionDuration: role.MaxSessionDuration,
            Tags: role.Tags,
            AttachedManagedPolicies: attachedManagedPolicies,
            InlinePolicies: inlinePolicies
        }
    }

    logicalId(data: Record<string, unknown> | undefined, arn: ParsedARN): string {
        return (data?.RoleName as string | undefined) ?? arn.resourceId
    }

    label(data: Record<string, unknown> | undefined, arn: ParsedARN): string {
        return this.logicalId(data, arn)
    }

    async list(
        _regions: string[],
        _accountId: string
    ): Promise<Array<{ arn: string; name: string }>> {
        const creds = await this.getCredentials()
        const client = new IAMClient({ region: 'us-east-1', credentials: creds })
        const results: Array<{ arn: string; name: string }> = []
        let marker: string | undefined
        do {
            const res = await client.send(new ListRolesCommand({ Marker: marker, MaxItems: 100 }))
            for (const r of res.Roles ?? []) {
                if (r.Arn) results.push({ arn: r.Arn, name: r.RoleName ?? r.Arn })
            }
            marker = res.Marker
        } while (marker)
        return results
    }
}

export default IAMRoleResolver
