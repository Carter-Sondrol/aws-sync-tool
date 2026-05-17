import { ConnectClient, DescribeRuleCommand } from '@aws-sdk/client-connect';
import { registerResolver } from '../../resolvers/registry.js';
import type { ResourceResolver, ResolverOutput } from '../../resolvers/resolver-types.js';
import type { ParsedARN } from '../../arn.js';
import { NodeClassification } from '../../discovery/discovery-node.js';
import { extractConnectInstanceId } from './helpers.js';
import { buildARN } from '../../arn.js';

const connectRuleResolver: ResourceResolver = {
  service: 'connect',
  resourceType: 'rule',
  cfnType: 'AWS::Connect::Rule',

  async fetch(arn: ParsedARN, credentials: () => Promise<{ accessKeyId: string; secretAccessKey: string; sessionToken?: string }>): Promise<ResolverOutput> {
    const creds = await credentials();
    const client = new ConnectClient({
      region: arn.region || 'us-east-1',
      credentials: creds,
    });
    const res = await client.send(
      new DescribeRuleCommand({
        InstanceId: extractConnectInstanceId(arn),
        RuleId: arn.resourceId,
      }),
    );
    const rule = res.Rule;
    const data: Record<string, unknown> = {
      Name: rule?.Name,
      RuleId: rule?.RuleId,
      RuleArn: rule?.RuleArn,
      TriggerEventSource: rule?.TriggerEventSource,
      Function: rule?.Function,
      Actions: rule?.Actions,
      Tags: rule?.Tags,
    };

    const instanceId = extractConnectInstanceId(arn);
    if (instanceId) {
      data.InstanceArn = buildARN('connect', `instance/${instanceId}`, arn.region, arn.accountId, arn.partition);
    }

    return {
      data,
      logicalId: String(data.Name ?? arn.resourceId),
      classification: NodeClassification.RESOURCE,
    };
  },
};

registerResolver('connect:rule', connectRuleResolver);
