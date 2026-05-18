import { LambdaClient, GetFunctionCommand } from "@aws-sdk/client-lambda";
import { registerResolver } from "../../resolvers/registry.js";
import { getCachedClient } from "../../resolvers/client-cache.js";
import type {
	ResourceResolver,
} from "../../resolvers/resolver-types.js";
import type { ParsedARN } from "../../../../packages/types/src/arn.js";

const lambdaFunctionResolver: ResourceResolver = {
	service: "lambda",
	resourceType: "function",
	cfnType: "AWS::Lambda::Function",

	async fetch(
		arn: ParsedARN,
		credentials: () => Promise<{
			accessKeyId: string;
			secretAccessKey: string;
			sessionToken?: string;
		}>,
	): Promise<Record<string, unknown> | null> {
		const creds = await credentials();
		const client = getCachedClient(
			LambdaClient,
			arn.region || "us-east-1",
			creds,
		) as LambdaClient;
		const res = await client.send(
			new GetFunctionCommand({ FunctionName: arn.resourceId }),
		);
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

		return data;
	},
};

registerResolver("lambda:function", lambdaFunctionResolver);
