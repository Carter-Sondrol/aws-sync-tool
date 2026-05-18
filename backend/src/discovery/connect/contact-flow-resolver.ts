import {
	ConnectClient,
	DescribeContactFlowCommand,
} from "@aws-sdk/client-connect";
import { registerResolver } from "../../resolvers/registry.js";
import { getCachedClient } from "../../resolvers/client-cache.js";
import type {
	ResourceResolver,
} from "../../resolvers/resolver-types.js";
import type { ParsedARN } from "../../../../packages/types/src/arn.js";
import { extractConnectInstanceId } from "./helpers.js";
import { buildARN } from "../../../../packages/types/src/arn.js";

const connectContactFlowResolver: ResourceResolver = {
	service: "connect",
	resourceType: "contact-flow",
	cfnType: "AWS::Connect::ContactFlow",

	async fetch(
		arn: ParsedARN,
		credentials: () => Promise<{
			accessKeyId: string;
			secretAccessKey: string;
			sessionToken?: string;
		}>,
	): Promise<Record<string, unknown> | null> {
		const creds = await credentials();
		const client = new ConnectClient({
			region: arn.region || "us-east-1",
			credentials: creds,
		});
		const res = await client.send(
			new DescribeContactFlowCommand({
				InstanceId: extractConnectInstanceId(arn),
				ContactFlowId: arn.resourceId,
			}),
		);
		const data: Record<string, unknown> = {
			Id: res.ContactFlow?.Id,
			Arn: res.ContactFlow?.Arn,
			Name: res.ContactFlow?.Name,
			Type: res.ContactFlow?.Type,
			Description: res.ContactFlow?.Description,
			Status: res.ContactFlow?.Status,
			Content: res.ContactFlow?.Content,
			Tags: res.ContactFlow?.Tags,
		};

		// Include instance ARN so extractARNs picks up the parent reference
		const instanceId = extractConnectInstanceId(arn);
		if (instanceId) {
			data.InstanceArn = buildARN(
				"connect",
				`instance/${instanceId}`,
				arn.region,
				arn.accountId,
				arn.partition,
			);
		}

		return data;
	},
};

registerResolver("connect:contact-flow", connectContactFlowResolver);
