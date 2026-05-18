import { ConnectClient, DescribeQuickConnectCommand } from '@aws-sdk/client-connect';
import { registerResolver } from '../../resolvers/registry.js';
import { getCachedClient } from '../../resolvers/client-cache.js';
import type { ResourceResolver, ResolverOutput } from '../../resolvers/resolver-types.js';
import type { ParsedARN } from '../../../../packages/types/src/arn.js';
import { NodeClassification } from '../../discovery/discovery-node.js';
import { extractConnectInstanceId } from './helpers.js';
import { buildARN } from '../../../../packages/types/src/arn.js';

const connectQuickConnectResolver: ResourceResolver = {
  service: 'connect',
  resourceType: 'quick-connect',
  cfnType: 'AWS::Connect::QuickConnect',

  async fetch(arn: ParsedARN, credentials: () => Promise<{ accessKeyId: string; secretAccessKey: string; sessionToken?: string }>): Promise<Record<string, unknown> | null> {
    const creds = await credentials();
    const client = getCachedClient(ConnectClient, arn.region || 'us-east-1', creds) as ConnectClient;
    const res = await client.send(
      new DescribeQuickConnectCommand({
        InstanceId: extractConnectInstanceId(arn),
        QuickConnectId: arn.resourceId,
      }),
    );
    const qc = res.QuickConnect;
    const data: Record<string, unknown> = {
      QuickConnectId: qc?.QuickConnectId,
      QuickConnectARN: qc?.QuickConnectARN,
      Name: qc?.Name,
      Description: qc?.Description,
      QuickConnectConfig: qc?.QuickConnectConfig,
      Tags: qc?.Tags,
      LastModifiedTime: qc?.LastModifiedTime,
      LastModifiedRegion: qc?.LastModifiedRegion,
    };

    const instanceId = extractConnectInstanceId(arn);
    if (instanceId) {
      data.InstanceArn = buildARN('connect', `instance/${instanceId}`, arn.region, arn.accountId, arn.partition);
    }

    return data;
  },
};

registerResolver('connect:quick-connect', connectQuickConnectResolver);
