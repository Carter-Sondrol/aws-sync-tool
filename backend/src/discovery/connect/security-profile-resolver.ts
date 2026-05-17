import { ConnectClient, DescribeSecurityProfileCommand } from '@aws-sdk/client-connect';
import { registerResolver } from '../../resolvers/registry.js';
import type { ResourceResolver, ResolverOutput } from '../../resolvers/resolver-types.js';
import type { ParsedARN } from '../../arn.js';
import { NodeClassification } from '../../discovery/discovery-node.js';
import { extractConnectInstanceId } from './helpers.js';
import { buildARN } from '../../arn.js';

const connectSecurityProfileResolver: ResourceResolver = {
  service: 'connect',
  resourceType: 'security-profile',
  cfnType: 'AWS::Connect::SecurityProfile',

  async fetch(arn: ParsedARN, credentials: () => Promise<{ accessKeyId: string; secretAccessKey: string; sessionToken?: string }>): Promise<ResolverOutput> {
    const creds = await credentials();
    const client = new ConnectClient({
      region: arn.region || 'us-east-1',
      credentials: creds,
    });
    const res = await client.send(
      new DescribeSecurityProfileCommand({
        InstanceId: extractConnectInstanceId(arn),
        SecurityProfileId: arn.resourceId,
      }),
    );
    const data: Record<string, unknown> = {
      Id: res.SecurityProfile?.Id,
      Arn: res.SecurityProfile?.Arn,
      SecurityProfileName: res.SecurityProfile?.SecurityProfileName,
      Description: res.SecurityProfile?.Description,
      OrganizationResourceId: res.SecurityProfile?.OrganizationResourceId,
      Tags: res.SecurityProfile?.Tags,
    };

    const instanceId = extractConnectInstanceId(arn);
    if (instanceId) {
      data.InstanceArn = buildARN('connect', `instance/${instanceId}`, arn.region, arn.accountId, arn.partition);
    }

    return {
      data,
      logicalId: String(data.SecurityProfileName ?? arn.resourceId),
      classification: NodeClassification.RESOURCE,
    };
  },
};

registerResolver('connect:security-profile', connectSecurityProfileResolver);
