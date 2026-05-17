import { ConnectClient, DescribeUserHierarchyGroupCommand } from '@aws-sdk/client-connect';
import { registerResolver } from '../../resolvers/registry.js';
import type { ResourceResolver, ResolverOutput } from '../../resolvers/resolver-types.js';
import type { ParsedARN } from '../../arn.js';
import { NodeClassification } from '../../discovery/discovery-node.js';
import { extractConnectInstanceId } from './helpers.js';
import { buildARN } from '../../arn.js';

const connectUserHierarchyGroupResolver: ResourceResolver = {
  service: 'connect',
  resourceType: 'user-hierarchy-group',
  cfnType: 'AWS::Connect::UserHierarchyGroup',

  async fetch(arn: ParsedARN, credentials: () => Promise<{ accessKeyId: string; secretAccessKey: string; sessionToken?: string }>): Promise<ResolverOutput> {
    const creds = await credentials();
    const client = new ConnectClient({
      region: arn.region || 'us-east-1',
      credentials: creds,
    });
    const res = await client.send(
      new DescribeUserHierarchyGroupCommand({
        InstanceId: extractConnectInstanceId(arn),
        HierarchyGroupId: arn.resourceId,
      }),
    );
    const hg = res.HierarchyGroup;
    const data: Record<string, unknown> = {
      Id: hg?.Id,
      Arn: hg?.Arn,
      Name: hg?.Name,
      LevelId: hg?.LevelId,
      HierarchyPath: hg?.HierarchyPath,
      Tags: hg?.Tags,
      LastModifiedTime: hg?.LastModifiedTime,
      LastModifiedRegion: hg?.LastModifiedRegion,
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

registerResolver('connect:user-hierarchy-group', connectUserHierarchyGroupResolver);
