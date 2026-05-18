import { ConnectClient, GetTaskTemplateCommand } from '@aws-sdk/client-connect';
import { registerResolver } from '../../resolvers/registry.js';
import { getCachedClient } from '../../resolvers/client-cache.js';
import type { ResourceResolver, ResolverOutput } from '../../resolvers/resolver-types.js';
import type { ParsedARN } from '../../../../packages/types/src/arn.js';
import { NodeClassification } from '../../discovery/discovery-node.js';
import { extractConnectInstanceId } from './helpers.js';
import { buildARN } from '../../../../packages/types/src/arn.js';

const connectTaskTemplateResolver: ResourceResolver = {
  service: 'connect',
  resourceType: 'task-template',
  cfnType: 'AWS::Connect::TaskTemplate',

  async fetch(arn: ParsedARN, credentials: () => Promise<{ accessKeyId: string; secretAccessKey: string; sessionToken?: string }>): Promise<Record<string, unknown> | null> {
    const creds = await credentials();
    const client = getCachedClient(ConnectClient, arn.region || 'us-east-1', creds) as ConnectClient;
    const res = await client.send(
      new GetTaskTemplateCommand({
        InstanceId: extractConnectInstanceId(arn),
        TaskTemplateId: arn.resourceId,
      }),
    );
    const data: Record<string, unknown> = {
      InstanceId: res.InstanceId,
      Id: res.Id,
      Arn: res.Arn,
      Name: res.Name,
      Description: res.Description,
      ContactFlowId: res.ContactFlowId,
      SelfAssignFlowId: res.SelfAssignFlowId,
      Constraints: res.Constraints,
      Status: res.Status,
      CreatedTime: res.CreatedTime,
    };

    const instanceId = extractConnectInstanceId(arn);
    if (instanceId) {
      data.InstanceArn = buildARN('connect', `instance/${instanceId}`, arn.region, arn.accountId, arn.partition);
    }

    return data;
  },
};

registerResolver('connect:task-template', connectTaskTemplateResolver);
