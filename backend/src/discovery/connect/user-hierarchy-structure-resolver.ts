import { ConnectClient, DescribeUserHierarchyStructureCommand } from '@aws-sdk/client-connect';
import { registerResolver } from '../../resolvers/registry.js';
import type { ResourceResolver, ResolverOutput } from '../../resolvers/resolver-types.js';
import type { ParsedARN } from '../../arn.js';
import { NodeClassification } from '../../discovery/discovery-node.js';
import { extractConnectInstanceId } from './helpers.js';
import { buildARN } from '../../arn.js';

const connectUserHierarchyStructureResolver: ResourceResolver = {
  service: 'connect',
  resourceType: 'user-hierarchy-structure',
  cfnType: null,

  async fetch(arn: ParsedARN, credentials: () => Promise<{ accessKeyId: string; secretAccessKey: string; sessionToken?: string }>): Promise<ResolverOutput> {
    const creds = await credentials();
    const instanceId = extractConnectInstanceId(arn);
    if (!instanceId) {
      throw new Error(`Cannot determine InstanceId from ARN: ${arn.raw}`);
    }
    const client = new ConnectClient({
      region: arn.region || 'us-east-1',
      credentials: creds,
    });
    const res = await client.send(
      new DescribeUserHierarchyStructureCommand({
        InstanceId: instanceId,
      }),
    );
    const hs = res.HierarchyStructure;
    const data: Record<string, unknown> = {
      LevelOne: hs?.LevelOne,
      LevelTwo: hs?.LevelTwo,
      LevelThree: hs?.LevelThree,
      LevelFour: hs?.LevelFour,
      LevelFive: hs?.LevelFive,
    };

    data.InstanceArn = buildARN('connect', `instance/${instanceId}`, arn.region, arn.accountId, arn.partition);

    return {
      data,
      logicalId: `hierarchy-structure-${arn.resourceId}`,
      classification: NodeClassification.RESOURCE,
    };
  },
};

registerResolver('connect:user-hierarchy-structure', connectUserHierarchyStructureResolver);
