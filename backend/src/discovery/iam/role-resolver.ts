import { IAMClient, GetRoleCommand } from '@aws-sdk/client-iam';
import { registerResolver } from '../../resolvers/registry.js';
import type { ResourceResolver, ResolverOutput } from '../../resolvers/resolver-types.js';
import type { ParsedARN } from '../../arn.js';
import { NodeClassification } from '../../discovery/discovery-node.js';

const iamRoleResolver: ResourceResolver = {
  service: 'iam',
  resourceType: 'role',
  cfnType: 'AWS::IAM::Role',

  async fetch(arn: ParsedARN, credentials: () => Promise<{ accessKeyId: string; secretAccessKey: string; sessionToken?: string }>): Promise<ResolverOutput> {
    const creds = await credentials();
    const client = new IAMClient({
      region: 'us-east-1',
      credentials: creds,
    });
    const res = await client.send(new GetRoleCommand({ RoleName: arn.resourceId }));
    const role = res.Role;
    if (!role) throw new Error('Role not found in response');

    const data: Record<string, unknown> = {
      RoleName: role.RoleName,
      RoleId: role.RoleId,
      Arn: role.Arn,
      CreateDate: role.CreateDate?.toISOString(),
      Path: role.Path,
      MaxSessionDuration: role.MaxSessionDuration,
      PermissionsBoundary: role.PermissionsBoundary,
      AssumeRolePolicyDocument: role.AssumeRolePolicyDocument,
      Tags: role.Tags,
    };

    const roleName = String(data.RoleName ?? '');
    const isManaged = roleName.startsWith('AWSServiceRoleFor') || (data.Arn as string)?.includes(':aws:');

    return {
      data,
      logicalId: roleName || arn.resourceId,
      classification: isManaged ? NodeClassification.AWS_MANAGED : NodeClassification.RESOURCE,
      referenceOnly: isManaged,
      metadata: { roleName },
    };
  },
};

registerResolver('iam:role', iamRoleResolver);
