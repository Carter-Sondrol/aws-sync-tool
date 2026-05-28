import {
    GetPolicyCommand,
    GetPolicyVersionCommand,
    IAMClient,
    ListPoliciesCommand
} from '@aws-sdk/client-iam'
import type { ParsedARN } from '../../arn'
import type { Credentials } from '../../CredentialsProvider'
import { BaseResolver } from '../baseResolver'

type PolicyData = {
    PolicyName?: string
    PolicyId?: string
    Arn?: string
    Path?: string
    DefaultVersionId?: string
    AttachmentCount?: number
    IsAttachable?: boolean
    Description?: string
    CreateDate?: string
    Document?: string
}

export class IAMPolicyResolver extends BaseResolver<IAMClient, PolicyData> {
    readonly service = 'iam'
    readonly resourceType = 'policy'
    readonly cfnType = 'AWS::IAM::ManagedPolicy'

    // IAM is global
    protected createClient(_region: string, creds: Credentials): IAMClient {
        return new IAMClient({ region: 'us-east-1', credentials: creds })
    }

    protected async fetchResource(client: IAMClient, arn: ParsedARN): Promise<PolicyData | null> {
        const policyRes = await client.send(new GetPolicyCommand({ PolicyArn: arn.raw }))
        const policy = policyRes.Policy
        if (!policy) return null

        let document: string | undefined
        if (policy.DefaultVersionId) {
            try {
                const versionRes = await client.send(
                    new GetPolicyVersionCommand({
                        PolicyArn: arn.raw,
                        VersionId: policy.DefaultVersionId
                    })
                )
                document = versionRes.PolicyVersion?.Document
                    ? decodeURIComponent(versionRes.PolicyVersion.Document)
                    : undefined
            } catch {
                // non-critical
            }
        }

        return {
            PolicyName: policy.PolicyName,
            PolicyId: policy.PolicyId,
            Arn: policy.Arn,
            Path: policy.Path,
            DefaultVersionId: policy.DefaultVersionId,
            AttachmentCount: policy.AttachmentCount,
            IsAttachable: policy.IsAttachable,
            Description: policy.Description,
            CreateDate: policy.CreateDate?.toISOString(),
            Document: document
        }
    }

    logicalId(data: Record<string, unknown> | undefined, arn: ParsedARN): string {
        return (data?.PolicyName as string | undefined) ?? arn.resourceId
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
            const res = await client.send(
                new ListPoliciesCommand({ Scope: 'Local', Marker: marker, MaxItems: 100 })
            )
            for (const p of res.Policies ?? []) {
                if (p.Arn) results.push({ arn: p.Arn, name: p.PolicyName ?? p.Arn })
            }
            marker = res.Marker
        } while (marker)
        return results
    }
}

export default IAMPolicyResolver
