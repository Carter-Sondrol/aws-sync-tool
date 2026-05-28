import {
    ConnectClient,
    DescribeInstanceCommand,
    DescribeUserHierarchyStructureCommand,
    ListAgentStatusesCommand,
    ListContactFlowModulesCommand,
    ListContactFlowsCommand,
    ListEvaluationFormsCommand,
    ListHoursOfOperationsCommand,
    ListInstancesCommand,
    ListIntegrationAssociationsCommand,
    ListPhoneNumbersV2Command,
    ListPredefinedAttributesCommand,
    ListPromptsCommand,
    ListQueuesCommand,
    ListQuickConnectsCommand,
    ListRoutingProfilesCommand,
    ListRulesCommand,
    ListSecurityProfilesCommand,
    ListTaskTemplatesCommand,
    ListUserHierarchyGroupsCommand,
    ListUsersCommand,
    ListViewsCommand
} from '@aws-sdk/client-connect'
import type { ParsedARN } from '../../arn'
import type { Credentials } from '../../CredentialsProvider'
import { BaseResolver } from '../baseResolver'
import { instanceId } from './_shared'

export class ConnectInstanceResolver extends BaseResolver<ConnectClient, Record<string, unknown>> {
    readonly service = 'connect'
    readonly resourceType = 'instance'
    readonly cfnType = 'AWS::Connect::Instance'

    protected createClient(region: string, creds: Credentials): ConnectClient {
        return new ConnectClient({ region, credentials: creds })
    }

    protected async fetchResource(
        client: ConnectClient,
        arn: ParsedARN
    ): Promise<Record<string, unknown> | null> {
        const instId = instanceId(arn)
        const res = await client.send(new DescribeInstanceCommand({ InstanceId: instId }))

        const [hierarchyStructureRes] = await Promise.allSettled([
            client.send(new DescribeUserHierarchyStructureCommand({ InstanceId: instId }))
        ])

        const data: Record<string, unknown> = {
            InstanceId: res.Instance?.Id,
            InstanceArn: res.Instance?.Arn,
            InstanceAlias: res.Instance?.InstanceAlias,
            IdentityManagementType: res.Instance?.IdentityManagementType,
            InstanceStatus: res.Instance?.InstanceStatus,
            ServiceRole: res.Instance?.ServiceRole,
            HierarchyStructure:
                hierarchyStructureRes.status === 'fulfilled'
                    ? hierarchyStructureRes.value.HierarchyStructure
                    : undefined
        }

        const childArns: string[] = []
        const childMetadata: Record<string, { name: string }> = {}

        await Promise.allSettled([
            client.send(new ListQueuesCommand({ InstanceId: instId })).then((r) => {
                r.QueueSummaryList?.forEach((q) => {
                    if (q.Arn) {
                        childArns.push(q.Arn)
                        if (q.Name) childMetadata[q.Arn] = { name: q.Name }
                    }
                })
            }),
            client.send(new ListContactFlowsCommand({ InstanceId: instId })).then((r) => {
                r.ContactFlowSummaryList?.forEach((f) => {
                    if (f.Arn) {
                        childArns.push(f.Arn)
                        if (f.Name) childMetadata[f.Arn] = { name: f.Name }
                    }
                })
            }),
            client.send(new ListContactFlowModulesCommand({ InstanceId: instId })).then((r) => {
                r.ContactFlowModulesSummaryList?.forEach((m) => {
                    if (m.Arn) {
                        childArns.push(m.Arn)
                        if (m.Name) childMetadata[m.Arn] = { name: m.Name }
                    }
                })
            }),
            client.send(new ListRoutingProfilesCommand({ InstanceId: instId })).then((r) => {
                r.RoutingProfileSummaryList?.forEach((p) => {
                    if (p.Arn) {
                        childArns.push(p.Arn)
                        if (p.Name) childMetadata[p.Arn] = { name: p.Name }
                    }
                })
            }),
            client.send(new ListSecurityProfilesCommand({ InstanceId: instId })).then((r) => {
                r.SecurityProfileSummaryList?.forEach((p) => {
                    if (p.Arn) {
                        childArns.push(p.Arn)
                        if (p.Name) childMetadata[p.Arn] = { name: p.Name }
                    }
                })
            }),
            client.send(new ListHoursOfOperationsCommand({ InstanceId: instId })).then((r) => {
                r.HoursOfOperationSummaryList?.forEach((h) => {
                    if (h.Arn) {
                        childArns.push(h.Arn)
                        if (h.Name) childMetadata[h.Arn] = { name: h.Name }
                    }
                })
            }),
            client.send(new ListQuickConnectsCommand({ InstanceId: instId })).then((r) => {
                r.QuickConnectSummaryList?.forEach((q) => {
                    if (q.Arn) {
                        childArns.push(q.Arn)
                        if (q.Name) childMetadata[q.Arn] = { name: q.Name }
                    }
                })
            }),
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            client.send(new ListAgentStatusesCommand({ InstanceId: instId } as any)).then((r) => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                ;(r as any).AgentStatusSummaryList?.forEach((s: any) => {
                    if (s.Arn) {
                        childArns.push(s.Arn)
                        if (s.Name) childMetadata[s.Arn] = { name: s.Name }
                    }
                })
            }),
            client.send(new ListUserHierarchyGroupsCommand({ InstanceId: instId })).then((r) => {
                r.UserHierarchyGroupSummaryList?.forEach((g) => {
                    if (g.Arn) {
                        childArns.push(g.Arn)
                        if (g.Name) childMetadata[g.Arn] = { name: g.Name }
                    }
                })
            }),
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            client.send(new ListRulesCommand({ InstanceId: instId } as any)).then((r) => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                ;(r as any).RuleSummaryList?.forEach((rule: any) => {
                    if (rule.RuleArn) {
                        childArns.push(rule.RuleArn)
                        if (rule.Name) childMetadata[rule.RuleArn] = { name: rule.Name }
                    }
                })
            }),
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            client.send(new ListTaskTemplatesCommand({ InstanceId: instId } as any)).then((r) => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                ;(r as any).TaskTemplates?.forEach((t: any) => {
                    if (t.Arn) {
                        childArns.push(t.Arn)
                        if (t.Name) childMetadata[t.Arn] = { name: t.Name }
                    }
                })
            }),
            client.send(new ListEvaluationFormsCommand({ InstanceId: instId })).then((r) => {
                r.EvaluationFormSummaryList?.forEach((f) => {
                    if (f.EvaluationFormArn) {
                        childArns.push(f.EvaluationFormArn)
                        if (f.Title) childMetadata[f.EvaluationFormArn] = { name: f.Title }
                    }
                })
            }),
            client.send(new ListPromptsCommand({ InstanceId: instId })).then((r) => {
                r.PromptSummaryList?.forEach((p) => {
                    if (p.Arn) {
                        childArns.push(p.Arn)
                        if (p.Name) childMetadata[p.Arn] = { name: p.Name }
                    }
                })
            }),
            client.send(new ListViewsCommand({ InstanceId: instId })).then((r) => {
                r.ViewsSummaryList?.forEach((view) => {
                    if (view.Arn) {
                        childArns.push(view.Arn)
                        if (view.Name) childMetadata[view.Arn] = { name: view.Name }
                    }
                })
            }),
            client
                .send(
                    new ListIntegrationAssociationsCommand({
                        InstanceId: instId,
                        IntegrationType: 'WISDOM_KNOWLEDGE_BASE'
                    })
                )
                .then((r) => {
                    r.IntegrationAssociationSummaryList?.forEach((assoc) => {
                        if (assoc.IntegrationArn) {
                            childArns.push(assoc.IntegrationArn)
                        }
                    })
                }),
            client.send(new ListUsersCommand({ InstanceId: instId })).then((r) => {
                r.UserSummaryList?.forEach((u) => {
                    if (u.Arn) {
                        childArns.push(u.Arn)
                        if (u.Username) childMetadata[u.Arn] = { name: u.Username }
                    }
                })
            }),
            client
                .send(
                    new ListPhoneNumbersV2Command({
                        TargetArn: `arn:${arn.partition}:connect:${arn.region}:${arn.accountId}:instance/${instId}`
                    })
                )
                .then((r) => {
                    r.ListPhoneNumbersSummaryList?.forEach((p) => {
                        if (p.PhoneNumberArn) {
                            childArns.push(p.PhoneNumberArn)
                            if (p.PhoneNumber)
                                childMetadata[p.PhoneNumberArn] = { name: p.PhoneNumber }
                        }
                    })
                }),
            client.send(new ListPredefinedAttributesCommand({ InstanceId: instId })).then((r) => {
                r.PredefinedAttributeSummaryList?.forEach((a) => {
                    // Predefined attribute ARN: instance/{id}/predefined-attribute/{name}
                    if (a.Name) {
                        const attrArn = `arn:${arn.partition}:connect:${arn.region}:${arn.accountId}:instance/${instId}/predefined-attribute/${a.Name}`
                        childArns.push(attrArn)
                        childMetadata[attrArn] = { name: a.Name }
                    }
                })
            }),
            // QConnect KBs not surfaced via WISDOM_KNOWLEDGE_BASE integration (MESSAGE_TEMPLATES
            // and QUICK_RESPONSES types are auto-created per instance) — list them directly.
            (async () => {
                const { QConnectClient, ListKnowledgeBasesCommand } = await import(
                    '@aws-sdk/client-qconnect'
                )
                const creds = await this.getCredentials()
                const qc = new QConnectClient({ region: arn.region, credentials: creds })
                let nextToken: string | undefined
                do {
                    const r = await qc.send(
                        new ListKnowledgeBasesCommand({ nextToken, maxResults: 50 })
                    )
                    r.knowledgeBaseSummaries?.forEach((kb) => {
                        if (kb.knowledgeBaseArn) {
                            childArns.push(kb.knowledgeBaseArn)
                            if (kb.name) childMetadata[kb.knowledgeBaseArn] = { name: kb.name }
                        }
                    })
                    nextToken = r.nextToken
                } while (nextToken)
            })()
        ])

        if (childArns.length > 0) data._childArns = childArns
        if (Object.keys(childMetadata).length > 0) data._childMetadata = childMetadata
        return data
    }

    logicalId(data: Record<string, unknown> | undefined, arn: ParsedARN): string {
        if (data?.InstanceAlias && typeof data.InstanceAlias === 'string') return data.InstanceAlias
        if (data?.InstanceId && typeof data.InstanceId === 'string') return data.InstanceId
        return arn.resourceId
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
                const client = new ConnectClient({ region: r, credentials: creds })
                let nextToken: string | undefined
                do {
                    const res = await client.send(
                        new ListInstancesCommand({ MaxResults: 100, NextToken: nextToken })
                    )
                    for (const i of res.InstanceSummaryList ?? []) {
                        if (i.Arn)
                            results.push({ arn: i.Arn, name: i.InstanceAlias ?? i.Id ?? i.Arn })
                    }
                    nextToken = res.NextToken
                } while (nextToken)
            })
        )
        return results
    }
}

export default ConnectInstanceResolver
