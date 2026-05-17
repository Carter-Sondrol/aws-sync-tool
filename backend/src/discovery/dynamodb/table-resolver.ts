import { DynamoDBClient, DescribeTableCommand } from '@aws-sdk/client-dynamodb';
import { registerResolver } from '../../resolvers/registry.js';
import type { ResourceResolver, ResolverOutput } from '../../resolvers/resolver-types.js';
import type { ParsedARN } from '../../arn.js';
import { NodeClassification } from '../../discovery/discovery-node.js';

const dynamodbTableResolver: ResourceResolver = {
  service: 'dynamodb',
  resourceType: 'table',
  cfnType: 'AWS::DynamoDB::Table',

  async fetch(arn: ParsedARN, credentials: () => Promise<{ accessKeyId: string; secretAccessKey: string; sessionToken?: string }>): Promise<ResolverOutput> {
    const creds = await credentials();
    const client = new DynamoDBClient({
      region: arn.region || 'us-east-1',
      credentials: creds,
    });
    const res = await client.send(new DescribeTableCommand({ TableName: arn.resourceId }));
    const table = res.Table;
    if (!table) throw new Error('Table not found in response');

    const data: Record<string, unknown> = {
      TableName: table.TableName,
      TableArn: table.TableArn,
      TableStatus: table.TableStatus,
      KeySchema: table.KeySchema,
      AttributeDefinitions: table.AttributeDefinitions,
      ProvisionedThroughput: table.ProvisionedThroughput,
      BillingMode: (table as any).BillingMode,
      ItemCount: table.ItemCount,
      TableSizeBytes: table.TableSizeBytes,
      StreamSpecification: table.StreamSpecification,
      SSEDescription: table.SSEDescription,
    };

    return {
      data,
      logicalId: String(data.TableName ?? arn.resourceId),
      classification: NodeClassification.RESOURCE,
    };
  },
};

registerResolver('dynamodb:table', dynamodbTableResolver);
