import { LambdaClient, GetFunctionCommand } from '@aws-sdk/client-lambda';
import { registerResolver } from '../../resolvers/registry.js';
import type { ResourceResolver, ResolverOutput } from '../../resolvers/resolver-types.js';
import type { ParsedARN } from '../../arn.js';
import { NodeClassification } from '../../discovery/discovery-node.js';

const lambdaFunctionResolver: ResourceResolver = {
  service: 'lambda',
  resourceType: 'function',
  cfnType: 'AWS::Lambda::Function',

  async fetch(arn: ParsedARN, credentials: () => Promise<{ accessKeyId: string; secretAccessKey: string; sessionToken?: string }>): Promise<ResolverOutput> {
    const creds = await credentials();
    const client = new LambdaClient({
      region: arn.region || 'us-east-1',
      credentials: creds,
    });
    const res = await client.send(new GetFunctionCommand({ FunctionName: arn.resourceId }));
    const data: Record<string, unknown> = {
      FunctionName: res.Configuration?.FunctionName,
      FunctionArn: res.Configuration?.FunctionArn,
      Runtime: res.Configuration?.Runtime,
      Handler: res.Configuration?.Handler,
      Role: res.Configuration?.Role,
      CodeSize: res.Configuration?.CodeSize,
      Description: res.Configuration?.Description,
      Timeout: res.Configuration?.Timeout,
      MemorySize: res.Configuration?.MemorySize,
      LastModified: res.Configuration?.LastModified,
      Environment: res.Configuration?.Environment,
      VpcConfig: res.Configuration?.VpcConfig,
      Tags: res.Tags,
      CodeSha256: res.Configuration?.CodeSha256,
      Version: res.Configuration?.Version,
      PackageType: res.Configuration?.PackageType,
      Architectures: res.Configuration?.Architectures,
      DeadLetterConfig: res.Configuration?.DeadLetterConfig,
      TracingConfig: res.Configuration?.TracingConfig,
      KmsKeyArn: res.Configuration?.KMSKeyArn,
      Layers: res.Configuration?.Layers,
      LoggingConfig: res.Configuration?.LoggingConfig,
    };

    return {
      data,
      logicalId: String(data.FunctionName ?? arn.resourceId),
      classification: NodeClassification.RESOURCE,
      metadata: { functionName: data.FunctionName },
    };
  },
};

registerResolver('lambda:function', lambdaFunctionResolver);
