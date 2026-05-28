import {
    AttachRolePolicyCommand,
    CreatePolicyVersionCommand,
    DeletePolicyVersionCommand,
    DeleteRolePolicyCommand,
    DetachRolePolicyCommand,
    IAMClient,
    ListAttachedRolePoliciesCommand,
    ListPolicyVersionsCommand,
    ListRolePoliciesCommand,
    PutRolePolicyCommand,
    UpdateAssumeRolePolicyCommand,
    UpdateRoleCommand
} from '@aws-sdk/client-iam'
import { parseARN } from '../../discovery/arn'
import type { Credentials } from '../../discovery/CredentialsProvider'
import { registerSyncer } from '../registry'
import type { ResourceSyncer, SyncPushResult } from '../syncer'

function getClient(creds: Credentials): IAMClient {
    return new IAMClient({ region: 'us-east-1', credentials: creds })
}

const iamRoleSyncer: ResourceSyncer = {
    service: 'iam',
    resourceType: 'role',

    async push(
        sourceData,
        _sourceArn,
        targetArn,
        _sourceCredentials,
        targetCredentials
    ): Promise<SyncPushResult> {
        const changes: string[] = []
        const skipped: string[] = []

        const targetRoleName = parseARN(targetArn)?.resourceId ?? targetArn
        const creds = await targetCredentials()
        const client = getClient(creds)

        // Assume role policy document
        if (typeof sourceData.AssumeRolePolicyDocument === 'string') {
            await client.send(
                new UpdateAssumeRolePolicyCommand({
                    RoleName: targetRoleName,
                    PolicyDocument: sourceData.AssumeRolePolicyDocument
                })
            )
            changes.push('assumeRolePolicyDocument')
        }

        // Role metadata
        const roleUpdate: { RoleName: string; Description?: string; MaxSessionDuration?: number } =
            { RoleName: targetRoleName }
        if (typeof sourceData.Description === 'string') {
            roleUpdate.Description = sourceData.Description
            changes.push('description')
        }
        if (typeof sourceData.MaxSessionDuration === 'number') {
            roleUpdate.MaxSessionDuration = sourceData.MaxSessionDuration
            changes.push('maxSessionDuration')
        }
        if (roleUpdate.Description !== undefined || roleUpdate.MaxSessionDuration !== undefined) {
            await client.send(new UpdateRoleCommand(roleUpdate))
        }

        // Attached managed policies — reconcile to match source
        const sourceAttached =
            (sourceData.AttachedManagedPolicies as Array<{ PolicyArn?: string }> | undefined) ?? []
        const sourceArns = new Set(
            sourceAttached.map((p) => p.PolicyArn).filter(Boolean) as string[]
        )

        const currentAttached = await client.send(
            new ListAttachedRolePoliciesCommand({ RoleName: targetRoleName })
        )
        const currentArns = new Set(
            (currentAttached.AttachedPolicies ?? [])
                .map((p) => p.PolicyArn)
                .filter(Boolean) as string[]
        )

        await Promise.all([
            ...[...currentArns]
                .filter((a) => !sourceArns.has(a))
                .map(async (arn) => {
                    await client.send(
                        new DetachRolePolicyCommand({ RoleName: targetRoleName, PolicyArn: arn })
                    )
                    changes.push(`detach:${arn}`)
                }),
            ...[...sourceArns]
                .filter((a) => !currentArns.has(a))
                .map(async (arn) => {
                    await client.send(
                        new AttachRolePolicyCommand({ RoleName: targetRoleName, PolicyArn: arn })
                    )
                    changes.push(`attach:${arn}`)
                })
        ])

        // Inline policies — reconcile to match source
        const sourceInline = (sourceData.InlinePolicies as Record<string, string> | undefined) ?? {}
        const currentInlineRes = await client.send(
            new ListRolePoliciesCommand({ RoleName: targetRoleName })
        )
        const currentInlineNames = new Set(currentInlineRes.PolicyNames ?? [])

        // Delete inline policies not in source
        await Promise.all(
            [...currentInlineNames]
                .filter((n) => !(n in sourceInline))
                .map(async (name) => {
                    await client.send(
                        new DeleteRolePolicyCommand({ RoleName: targetRoleName, PolicyName: name })
                    )
                    changes.push(`deleteInline:${name}`)
                })
        )

        // Upsert inline policies from source
        await Promise.all(
            Object.entries(sourceInline).map(async ([name, doc]) => {
                await client.send(
                    new PutRolePolicyCommand({
                        RoleName: targetRoleName,
                        PolicyName: name,
                        PolicyDocument: doc
                    })
                )
                changes.push(`putInline:${name}`)
            })
        )

        return { ok: true, changes, skipped }
    }
}

const iamPolicySyncer: ResourceSyncer = {
    service: 'iam',
    resourceType: 'policy',

    async push(
        sourceData,
        _sourceArn,
        targetArn,
        _sourceCredentials,
        targetCredentials
    ): Promise<SyncPushResult> {
        const changes: string[] = []
        const skipped: string[] = []

        if (typeof sourceData.Document !== 'string') {
            return { ok: false, changes, skipped, error: 'No policy document in source data' }
        }

        const creds = await targetCredentials()
        const client = getClient(creds)

        // Create new version and set as default
        await client.send(
            new CreatePolicyVersionCommand({
                PolicyArn: targetArn,
                PolicyDocument: sourceData.Document,
                SetAsDefault: true
            })
        )
        changes.push('document')

        // Prune old non-default versions (max 5 total allowed)
        const versions = await client.send(new ListPolicyVersionsCommand({ PolicyArn: targetArn }))
        const toDelete = (versions.Versions ?? [])
            .filter((v) => !v.IsDefaultVersion)
            .sort((a, b) => (a.CreateDate?.getTime() ?? 0) - (b.CreateDate?.getTime() ?? 0))
            .slice(0, -4) // keep the 4 most recent non-default versions

        await Promise.all(
            toDelete.map((v) =>
                client.send(
                    new DeletePolicyVersionCommand({
                        PolicyArn: targetArn,
                        VersionId: v.VersionId!
                    })
                )
            )
        )
        if (toDelete.length > 0) changes.push(`pruned:${toDelete.length} old versions`)

        return { ok: true, changes, skipped }
    }
}

registerSyncer('iam:role', iamRoleSyncer)
registerSyncer('iam:policy', iamPolicySyncer)
