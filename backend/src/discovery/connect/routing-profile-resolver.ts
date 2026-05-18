import { ConnectClient, DescribeRoutingProfileCommand } from '@aws-sdk/client-connect';
import { registerResolver } from '../../resolvers/registry.js';
import { getCachedClient } from '../../resolvers/client-cache.js';
import type { ResourceResolver, ResolverOutput } from '../../resolvers/resolver-types.js';
import type { ParsedARN } from '../../../../packages/types/src/arn.js';
import { NodeClassification } from '../../discovery/discovery-node.js';
import { extractConnectInstanceId } from './helpers.js';
import { buildARN } from '../../../../packages/types/src/arn.js';

const connectRoutingProfileResolver: ResourceResolver = {
  service: 'connect',
  resourceType: 'routing-profile',
  cfnType: 'AWS::Connect::RoutingProfile',

  async fetch(arn: ParsedARN, credentials: () => Promise<{ accessKeyId: string; secretAccessKey: string; sessionToken?: string }>): Promise<Record<string, unknown> | null> {
    const creds = await credentials();
    const client = getCachedClient(ConnectClient, arn.region || 'us-east-1', creds) as ConnectClient;
    const res = await client.send(
      new DescribeRoutingProfileCommand({
        InstanceId: extractConnectInstanceId(arn),
        RoutingProfileId: arn.resourceId,
      }),
    );
    const data: Record<string, unknown> = {
      RoutingProfileId: res.RoutingProfile?.RoutingProfileId,
      RoutingProfileArn: res.RoutingProfile?.RoutingProfileArn,
      Name: res.RoutingProfile?.Name,
      Description: res.RoutingProfile?.Description,
      MediaConcurrencies: res.RoutingProfile?.MediaConcurrencies,
      DefaultOutboundQueueId: res.RoutingProfile?.DefaultOutboundQueueId,
      Tags: res.RoutingProfile?.Tags,
    };

    const instanceId = extractConnectInstanceId(arn);
    if (instanceId) {
      data.InstanceArn = buildARN('connect', `instance/${instanceId}`, arn.region, arn.accountId, arn.partition);
    }

    return data;
  },
};

registerResolver('connect:routing-profile', connectRoutingProfileResolver);
