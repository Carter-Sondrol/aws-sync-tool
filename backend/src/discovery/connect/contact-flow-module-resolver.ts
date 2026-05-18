import { ConnectClient, DescribeContactFlowModuleCommand } from '@aws-sdk/client-connect';
import { registerResolver } from '../../resolvers/registry.js';
import { getCachedClient } from '../../resolvers/client-cache.js';
import type { ResourceResolver, ResolverOutput } from '../../resolvers/resolver-types.js';
import type { ParsedARN } from '../../../../packages/types/src/arn.js';
import { NodeClassification } from '../../discovery/discovery-node.js';
import { extractConnectInstanceId } from './helpers.js';
import { buildARN } from '../../../../packages/types/src/arn.js';

const connectContactFlowModuleResolver: ResourceResolver = {
  service: 'connect',
  resourceType: 'contact-flow-module',
  cfnType: 'AWS::Connect::ContactFlowModule',

  async fetch(arn: ParsedARN, credentials: () => Promise<{ accessKeyId: string; secretAccessKey: string; sessionToken?: string }>): Promise<Record<string, unknown> | null> {
    const creds = await credentials();
    const client = getCachedClient(ConnectClient, arn.region || 'us-east-1', creds) as ConnectClient;
    const res = await client.send(
      new DescribeContactFlowModuleCommand({
        InstanceId: extractConnectInstanceId(arn),
        ContactFlowModuleId: arn.resourceId,
      }),
    );
    const data: Record<string, unknown> = {
      Id: res.ContactFlowModule?.Id,
      Arn: res.ContactFlowModule?.Arn,
      Name: res.ContactFlowModule?.Name,
      State: res.ContactFlowModule?.State,
      Description: res.ContactFlowModule?.Description,
      Status: res.ContactFlowModule?.Status,
      Content: res.ContactFlowModule?.Content,
      Tags: res.ContactFlowModule?.Tags,
    };

    const instanceId = extractConnectInstanceId(arn);
    if (instanceId) {
      data.InstanceArn = buildARN('connect', `instance/${instanceId}`, arn.region, arn.accountId, arn.partition);
    }

    return data;
  },
};

registerResolver('connect:contact-flow-module', connectContactFlowModuleResolver);
