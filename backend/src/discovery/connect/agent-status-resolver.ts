import { ConnectClient, DescribeAgentStatusCommand } from '@aws-sdk/client-connect';
import { registerResolver } from '../../resolvers/registry.js';
import { getCachedClient } from '../../resolvers/client-cache.js';
import type { ResourceResolver, ResolverOutput } from '../../resolvers/resolver-types.js';
import type { ParsedARN } from '../../../../packages/types/src/arn.js';
import { NodeClassification } from '../../discovery/discovery-node.js';
import { extractConnectInstanceId } from './helpers.js';
import { buildARN } from '../../../../packages/types/src/arn.js';

const connectAgentStatusResolver: ResourceResolver = {
  service: 'connect',
  resourceType: 'agent-status',
  cfnType: 'AWS::Connect::AgentStatus',

  async fetch(arn: ParsedARN, credentials: () => Promise<{ accessKeyId: string; secretAccessKey: string; sessionToken?: string }>): Promise<Record<string, unknown> | null> {
    const creds = await credentials();
    const client = getCachedClient(ConnectClient, arn.region || 'us-east-1', creds) as ConnectClient;
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

    return data;
  },
};

registerResolver('connect:agent-status', connectAgentStatusResolver);
