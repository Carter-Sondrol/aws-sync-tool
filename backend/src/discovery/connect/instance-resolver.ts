import {
  ConnectClient,
  DescribeInstanceCommand,
  ListQueuesCommand,
  ListContactFlowsCommand,
  ListContactFlowModulesCommand,
  ListRoutingProfilesCommand,
  ListUsersCommand,
  ListSecurityProfilesCommand,
  ListHoursOfOperationsCommand,
  ListUserHierarchyGroupsCommand,
  ListPhoneNumbersCommand,
  ListQuickConnectsCommand,
  ListTaskTemplatesCommand,
  ListRulesCommand,
  ListViewsCommand,
  ListPromptsCommand,
  ListAgentStatusesCommand,
  ListEvaluationFormsCommand,
} from '@aws-sdk/client-connect';
import { registerResolver } from '../../resolvers/registry.js';
import type { ResourceResolver, ResolverOutput } from '../../resolvers/resolver-types.js';
import type { ParsedARN } from '../../arn.js';
import { NodeClassification } from '../../discovery/discovery-node.js';
import { buildARN } from '../../arn.js';
import { extractConnectInstanceId } from './helpers.js';

const connectInstanceResolver: ResourceResolver = {
  service: 'connect',
  resourceType: 'instance',
  cfnType: 'AWS::Connect::Instance',

  async fetch(arn: ParsedARN, credentials: () => Promise<{ accessKeyId: string; secretAccessKey: string; sessionToken?: string }>): Promise<ResolverOutput> {
    const creds = await credentials();
    const instanceId = extractConnectInstanceId(arn);
    const client = new ConnectClient({
      region: arn.region || 'us-east-1',
      credentials: creds,
    });

    const res = await client.send(new DescribeInstanceCommand({ InstanceId: instanceId }));
    const data: Record<string, unknown> = {
      InstanceId: res.Instance?.Id,
      InstanceArn: res.Instance?.Arn,
      InstanceAlias: res.Instance?.InstanceAlias,
      IdentityManagementType: res.Instance?.IdentityManagementType,
      CreatedTime: res.Instance?.CreatedTime,
      ServiceRole: res.Instance?.ServiceRole,
      InstanceStatus: res.Instance?.InstanceStatus,
    };

    // Discover subresources (replaces deepChildrenAsync)
    const subresourceArns: string[] = [];
    if (instanceId) {
      const listCalls = [
        async () => { const r = await client.send(new ListQueuesCommand({ InstanceId: instanceId })); return r.QueueSummaryList || []; },
        async () => { const r = await client.send(new ListContactFlowsCommand({ InstanceId: instanceId })); return r.ContactFlowSummaryList || []; },
        async () => { const r = await client.send(new ListContactFlowModulesCommand({ InstanceId: instanceId })); return r.ContactFlowModulesSummaryList || []; },
        async () => { const r = await client.send(new ListRoutingProfilesCommand({ InstanceId: instanceId })); return r.RoutingProfileSummaryList || []; },
        async () => { const r = await client.send(new ListUsersCommand({ InstanceId: instanceId })); return r.UserSummaryList || []; },
        async () => { const r = await client.send(new ListSecurityProfilesCommand({ InstanceId: instanceId })); return r.SecurityProfileSummaryList || []; },
        async () => { const r = await client.send(new ListHoursOfOperationsCommand({ InstanceId: instanceId })); return r.HoursOfOperationSummaryList || []; },
        async () => { const r = await client.send(new ListUserHierarchyGroupsCommand({ InstanceId: instanceId })); return r.UserHierarchyGroupSummaryList || []; },
        async () => { const r = await client.send(new ListQuickConnectsCommand({ InstanceId: instanceId })); return r.QuickConnectSummaryList || []; },
        async () => { const r = await client.send(new ListTaskTemplatesCommand({ InstanceId: instanceId })); return r.TaskTemplates || []; },
        async () => { const r = await client.send(new ListRulesCommand({ InstanceId: instanceId })); return r.RuleSummaryList || []; },
        async () => { const r = await client.send(new ListViewsCommand({ InstanceId: instanceId })); return r.ViewsSummaryList || []; },
        async () => { const r = await client.send(new ListPromptsCommand({ InstanceId: instanceId })); return r.PromptSummaryList || []; },
        async () => { const r = await client.send(new ListPhoneNumbersCommand({ InstanceId: instanceId })); return r.PhoneNumberSummaryList || []; },
        async () => { const r = await client.send(new ListAgentStatusesCommand({ InstanceId: instanceId } as any)); return r.AgentStatusSummaryList || []; },
        async () => { const r = await client.send(new ListEvaluationFormsCommand({ InstanceId: instanceId } as any)); return r.EvaluationFormSummaryList || []; },
      ];

      for (const call of listCalls) {
        try {
          const items = await call();
          for (const item of items) {
            const itemAny = item as Record<string, unknown>;
            const arnVal = itemAny.Arn as string | undefined;
            const ruleArn = itemAny.RuleArn as string | undefined;
            const formArn = itemAny.EvaluationFormArn as string | undefined;
            if (arnVal) subresourceArns.push(arnVal);
            else if (ruleArn) subresourceArns.push(ruleArn);
            else if (formArn) subresourceArns.push(formArn);
          }
        } catch (e) {
          console.warn(`[connect:instance] deep discovery call failed:`, e);
        }
      }

      try {
        const structureArn = buildARN('connect', `instance/${instanceId}/user-hierarchy-structure/${instanceId}`, arn.region, arn.accountId);
        subresourceArns.push(structureArn);
      } catch (e) {
        console.warn(`[connect:instance] failed to construct hierarchy structure ARN:`, e);
      }
    }

    if (subresourceArns.length > 0) {
      data._subresourceArns = subresourceArns;
    }

    return {
      data,
      logicalId: String(data.InstanceAlias ?? data.InstanceId ?? arn.resourceId),
      classification: NodeClassification.RESOURCE,
    };
  },
};

registerResolver('connect:instance', connectInstanceResolver);
