import { LambdaClient, GetLayerVersionCommand } from "@aws-sdk/client-lambda";
import { registerResolver } from "../../resolvers/registry.js";
import { getCachedClient } from "../../resolvers/client-cache.js";
import type {
	ResourceResolver,
} from "../../resolvers/resolver-types.js";
import type { ParsedARN } from "../../../../packages/types/src/arn.js";

const lambdaLayerResolver: ResourceResolver = {
	service: "lambda",
	resourceType: "layer",
	cfnType: "AWS::Lambda::LayerVersion",

	async fetch(
		arn: ParsedARN,
		credentials: () => Promise<{
			accessKeyId: string;
			secretAccessKey: string;
			sessionToken?: string;
		}>,
	): Promise<Record<string, unknown> | null> {
		const creds = await credentials();
		const client = new LambdaClient({
			region: arn.region || "us-east-1",
			credentials: creds,
		});
		const [layerName, versionStr] = arn.resourceId.split(":");
		const res = await client.send(
			new GetLayerVersionCommand({
				LayerName: layerName,
				VersionNumber: versionStr ? parseInt(versionStr, 10) : undefined,
			}),
		);
		const data: Record<string, unknown> = {
			LayerArn: res.LayerArn,
			LayerVersionArn: res.LayerVersionArn,
			Version: res.Version,
			Description: res.Description,
			LicenseInfo: res.LicenseInfo,
			CreatedDate: res.CreatedDate,
			CompatibleRuntimes: res.CompatibleRuntimes,
			CompatibleArchitectures: res.CompatibleArchitectures,
		};

		return data;
	},
};

registerResolver("lambda:layer", lambdaLayerResolver);
