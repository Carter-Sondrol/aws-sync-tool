import { DynamoDBClient, DescribeTableCommand } from "@aws-sdk/client-dynamodb";
import { registerResolver } from "../../resolvers/registry.js";
import { getCachedClient } from "../../resolvers/client-cache.js";
import type {
	ResourceResolver,
} from "../../resolvers/resolver-types.js";
import type { ParsedARN } from "../../../../packages/types/src/arn.js";

const dynamodbTableResolver: ResourceResolver = {
	service: "dynamodb",
	resourceType: "table",
	cfnType: "AWS::DynamoDB::Table",

	async fetch(
		arn: ParsedARN,
		credentials: () => Promise<{
			accessKeyId: string;
			secretAccessKey: string;
			sessionToken?: string;
		}>,
	): Promise<Record<string, unknown> | null> {
		const creds = await credentials();
		const client = new DynamoDBClient({
			region: arn.region || "us-east-1",
			credentials: creds,
		});
		const res = await client.send(
			new DescribeTableCommand({ TableName: arn.resourceId }),
		);
		const table = res.Table;
		if (!table) throw new Error("Table not found in response");

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

		return data;
	},
};

registerResolver("dynamodb:table", dynamodbTableResolver);
