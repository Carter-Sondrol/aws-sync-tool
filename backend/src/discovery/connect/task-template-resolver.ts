import { ConnectClient, GetTaskTemplateCommand } from '@aws-sdk/client-connect';
import { registerResolver } from '../../resolvers/registry.js';
import type { ResourceResolver, ResolverOutput } from '../../resolvers/resolver-types.js';
import type { ParsedARN } from '../../arn.js';
import { NodeClassification } from '../../discovery/discovery-node.js';
import { extractConnectInstanceId } from './helpers.js';
import { buildARN } from '../../arn.js';

const connectTaskTemplateResolver: ResourceResolver = {
  service: 'connect',
  resourceType: 'task-template',
  cfnType: 'AWS::Connect::TaskTemplate',

  async fetch(arn: ParsedARN, credentials: () => Promise<{ accessKeyId: string; secretAccessKey: string; sessionToken?: string }>): Promise<ResolverOutput> {
    const creds = await credentials();
    const client = new ConnectClient({
      region: arn.region || 'us-east-1',
      credentials: creds,
    });
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

    return {
      data,
      logicalId: String(data.Name ?? arn.resourceId),
      classification: NodeClassification.RESOURCE,
    };
  },
};

registerResolver('connect:task-template', connectTaskTemplateResolver);
