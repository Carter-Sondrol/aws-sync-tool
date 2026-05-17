import { S3Client, HeadBucketCommand, GetBucketTaggingCommand, GetBucketPolicyCommand, GetBucketVersioningCommand, GetBucketEncryptionCommand } from '@aws-sdk/client-s3';
import { registerResolver } from '../../resolvers/registry.js';
import type { ResourceResolver, ResolverOutput } from '../../resolvers/resolver-types.js';
import type { ParsedARN } from '../../arn.js';
import { NodeClassification } from '../../discovery/discovery-node.js';

const s3BucketResolver: ResourceResolver = {
  service: 's3',
  resourceType: 'bucket',
  cfnType: 'AWS::S3::Bucket',

  async fetch(arn: ParsedARN, credentials: () => Promise<{ accessKeyId: string; secretAccessKey: string; sessionToken?: string }>): Promise<ResolverOutput> {
    const creds = await credentials();
    const bucketName = arn.resource;
    const client = new S3Client({
      region: 'us-east-1',
      credentials: creds,
    });

    // HeadBucket to verify existence
    await client.send(new HeadBucketCommand({ Bucket: bucketName }));

    // Gather bucket config
    const [tagsResult, policyResult, versioningResult, encryptionResult] = await Promise.all([
      client.send(new GetBucketTaggingCommand({ Bucket: bucketName })).catch(() => null),
      client.send(new GetBucketPolicyCommand({ Bucket: bucketName })).catch(() => null),
      client.send(new GetBucketVersioningCommand({ Bucket: bucketName })).catch(() => null),
      client.send(new GetBucketEncryptionCommand({ Bucket: bucketName })).catch(() => null),
    ]);

    const data: Record<string, unknown> = {
      BucketName: bucketName,
      BucketArn: arn.raw,
      Tags: tagsResult?.TagSet,
      Policy: policyResult?.Policy ? JSON.parse(policyResult.Policy) : undefined,
      Versioning: versioningResult?.Status,
      Encryption: encryptionResult?.ServerSideEncryptionConfiguration?.Rules,
    };

    return {
      data,
      logicalId: String(data.BucketName ?? arn.resourceId),
      classification: NodeClassification.RESOURCE,
    };
  },
};

registerResolver('s3:bucket', s3BucketResolver);
