import { ConnectClient, DescribeContactFlowModuleCommand } from '@aws-sdk/client-connect';
import { registerResolver } from '../../resolvers/registry.js';
import type { ResourceResolver, ResolverOutput } from '../../resolvers/resolver-types.js';
import type { ParsedARN } from '../../arn.js';
import { NodeClassification } from '../../discovery/discovery-node.js';
import { extractConnectInstanceId } from './helpers.js';
import { buildARN } from '../../arn.js';

const connectContactFlowModuleResolver: ResourceResolver = {
  service: 'connect',
  resourceType: 'contact-flow-module',
  cfnType: 'AWS::Connect::ContactFlowModule',

  async fetch(arn: ParsedARN, credentials: () => Promise<{ accessKeyId: string; secretAccessKey: string; sessionToken?: string }>): Promise<ResolverOutput> {
    const creds = await credentials();
    const client = new ConnectClient({
      region: arn.region || 'us-east-1',
      credentials: creds,
    });
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

    return {
      data,
      logicalId: String(data.Name ?? arn.resourceId),
      classification: NodeClassification.RESOURCE,
    };
  },
};

registerResolver('connect:contact-flow-module', connectContactFlowModuleResolver);
