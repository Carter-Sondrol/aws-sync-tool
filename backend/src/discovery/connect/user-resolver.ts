import { ConnectClient, DescribeUserCommand } from '@aws-sdk/client-connect';
import { registerResolver } from '../../resolvers/registry.js';
import type { ResourceResolver, ResolverOutput } from '../../resolvers/resolver-types.js';
import type { ParsedARN } from '../../arn.js';
import { NodeClassification } from '../../discovery/discovery-node.js';
import { extractConnectInstanceId } from './helpers.js';
import { buildARN } from '../../arn.js';

const connectUserResolver: ResourceResolver = {
  service: 'connect',
  resourceType: 'user',
  cfnType: 'AWS::Connect::User',

  async fetch(arn: ParsedARN, credentials: () => Promise<{ accessKeyId: string; secretAccessKey: string; sessionToken?: string }>): Promise<ResolverOutput> {
    const creds = await credentials();
    const client = new ConnectClient({
      region: arn.region || 'us-east-1',
      credentials: creds,
    });
    const res = await client.send(
      new DescribeUserCommand({
        InstanceId: extractConnectInstanceId(arn),
        UserId: arn.resourceId,
      }),
    );
    const data: Record<string, unknown> = {
      Id: res.User?.Id,
      Arn: res.User?.Arn,
      Username: res.User?.Username,
      IdentityInfo: res.User?.IdentityInfo,
      PhoneConfig: res.User?.PhoneConfig,
      DirectoryUserId: res.User?.DirectoryUserId,
      SecurityProfileIds: res.User?.SecurityProfileIds,
      RoutingProfileId: res.User?.RoutingProfileId,
      HierarchyGroupId: res.User?.HierarchyGroupId,
      Tags: res.User?.Tags,
    };

    const instanceId = extractConnectInstanceId(arn);
    if (instanceId) {
      data.InstanceArn = buildARN('connect', `instance/${instanceId}`, arn.region, arn.accountId, arn.partition);
    }

    return {
      data,
      logicalId: String(data.Username ?? arn.resourceId),
      classification: NodeClassification.RESOURCE,
    };
  },
};

registerResolver('connect:user', connectUserResolver);
