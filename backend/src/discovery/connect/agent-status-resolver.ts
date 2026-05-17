import { ConnectClient, DescribeAgentStatusCommand } from '@aws-sdk/client-connect';
import { registerResolver } from '../../resolvers/registry.js';
import type { ResourceResolver, ResolverOutput } from '../../resolvers/resolver-types.js';
import type { ParsedARN } from '../../arn.js';
import { NodeClassification } from '../../discovery/discovery-node.js';
import { extractConnectInstanceId } from './helpers.js';
import { buildARN } from '../../arn.js';

const connectAgentStatusResolver: ResourceResolver = {
  service: 'connect',
  resourceType: 'agent-status',
  cfnType: 'AWS::Connect::AgentStatus',

  async fetch(arn: ParsedARN, credentials: () => Promise<{ accessKeyId: string; secretAccessKey: string; sessionToken?: string }>): Promise<ResolverOutput> {
    const creds = await credentials();
    const client = new ConnectClient({
      region: arn.region || 'us-east-1',
      credentials: creds,
    });
    const res = await client.send(
      new DescribeAgentStatusCommand({
        InstanceId: extractConnectInstanceId(arn),
        AgentStatusId: arn.resourceId,
      }),
    );
    const as = res.AgentStatus;
    const data: Record<string, unknown> = {
      AgentStatusId: as?.AgentStatusId,
      AgentStatusARN: as?.AgentStatusARN,
      Name: as?.Name,
      Description: as?.Description,
      Type: as?.Type,
      DisplayOrder: as?.DisplayOrder,
      State: as?.State,
      Tags: as?.Tags,
      LastModifiedTime: as?.LastModifiedTime,
      LastModifiedRegion: as?.LastModifiedRegion,
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

registerResolver('connect:agent-status', connectAgentStatusResolver);
