import { ConnectClient, DescribeHoursOfOperationCommand } from '@aws-sdk/client-connect';
import { registerResolver } from '../../resolvers/registry.js';
import { getCachedClient } from '../../resolvers/client-cache.js';
import type { ResourceResolver, ResolverOutput } from '../../resolvers/resolver-types.js';
import type { ParsedARN } from '../../../../packages/types/src/arn.js';
import { NodeClassification } from '../../discovery/discovery-node.js';
import { extractConnectInstanceId } from './helpers.js';
import { buildARN } from '../../../../packages/types/src/arn.js';

const connectHoursOfOperationResolver: ResourceResolver = {
  service: 'connect',
  resourceType: 'hours-of-operation',
  cfnType: 'AWS::Connect::HoursOfOperation',

  async fetch(arn: ParsedARN, credentials: () => Promise<{ accessKeyId: string; secretAccessKey: string; sessionToken?: string }>): Promise<Record<string, unknown> | null> {
    const creds = await credentials();
    const client = getCachedClient(ConnectClient, arn.region || 'us-east-1', creds) as ConnectClient;
    const res = await client.send(
      new DescribeHoursOfOperationCommand({
        InstanceId: extractConnectInstanceId(arn),
        HoursOfOperationId: arn.resourceId,
      }),
    );
    const data: Record<string, unknown> = {
      HoursOfOperationId: res.HoursOfOperation?.HoursOfOperationId,
      HoursOfOperationArn: res.HoursOfOperation?.HoursOfOperationArn,
      Name: res.HoursOfOperation?.Name,
      Description: res.HoursOfOperation?.Description,
      TimeZone: res.HoursOfOperation?.TimeZone,
      Config: res.HoursOfOperation?.Config,
      ParentHoursOfOperations: res.HoursOfOperation?.ParentHoursOfOperations,
      Tags: res.HoursOfOperation?.Tags,
    };

    const instanceId = extractConnectInstanceId(arn);
    if (instanceId) {
      data.InstanceArn = buildARN('connect', `instance/${instanceId}`, arn.region, arn.accountId, arn.partition);
    }

    return data;
  },
};

registerResolver('connect:hours-of-operation', connectHoursOfOperationResolver);
