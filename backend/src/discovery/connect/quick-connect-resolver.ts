import { ConnectClient, DescribeQuickConnectCommand } from '@aws-sdk/client-connect';
import { registerResolver } from '../../resolvers/registry.js';
import type { ResourceResolver, ResolverOutput } from '../../resolvers/resolver-types.js';
import type { ParsedARN } from '../../arn.js';
import { NodeClassification } from '../../discovery/discovery-node.js';
import { extractConnectInstanceId } from './helpers.js';
import { buildARN } from '../../arn.js';

const connectQuickConnectResolver: ResourceResolver = {
  service: 'connect',
  resourceType: 'quick-connect',
  cfnType: 'AWS::Connect::QuickConnect',

  async fetch(arn: ParsedARN, credentials: () => Promise<{ accessKeyId: string; secretAccessKey: string; sessionToken?: string }>): Promise<ResolverOutput> {
    const creds = await credentials();
    const client = new ConnectClient({
      region: arn.region || 'us-east-1',
      credentials: creds,
    });
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

    return {
      data,
      logicalId: String(data.Name ?? arn.resourceId),
      classification: NodeClassification.RESOURCE,
    };
  },
};

registerResolver('connect:quick-connect', connectQuickConnectResolver);
