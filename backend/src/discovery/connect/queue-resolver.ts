import { ConnectClient, DescribeQueueCommand } from "@aws-sdk/client-connect";
import { registerResolver } from "../../resolvers/registry.js";
import { getCachedClient } from "../../resolvers/client-cache.js";
import type {
	ResourceResolver,
} from "../../resolvers/resolver-types.js";
import type { ParsedARN } from "../../../../packages/types/src/arn.js";
import { extractConnectInstanceId } from "./helpers.js";
import { buildARN } from "../../../../packages/types/src/arn.js";

const connectQueueResolver: ResourceResolver = {
	service: "connect",
	resourceType: "queue",
	cfnType: "AWS::Connect::Queue",

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
		const instanceId = extractConnectInstanceId(arn);

		let queueId = arn.resourceId;
		const parts = arn.resourceParts;
		if (
			parts.length >= 5 &&
			parts[0] === "instance" &&
			parts[2] === "queue" &&
			parts[3] === "agent"
		) {
			queueId = parts[3] === "agent" ? parts[2] : queueId;
		}

		try {
			const res = await client.send(
				new DescribeQueueCommand({
					InstanceId: instanceId,
					QueueId: queueId,
				}),
			);
			const data: Record<string, unknown> = {
				QueueId: res.Queue?.QueueId,
				QueueArn: res.Queue?.QueueArn,
				Name: res.Queue?.Name,
				Description: res.Queue?.Description,
				Status: res.Queue?.Status,
				MaxContacts: res.Queue?.MaxContacts,
				HoursOfOperationId: res.Queue?.HoursOfOperationId,
				OutboundCallerConfig: res.Queue?.OutboundCallerConfig,
				OutboundEmailConfig: res.Queue?.OutboundEmailConfig,
				Tags: res.Queue?.Tags,
			};

			// Include instance ARN so extractARNs picks up the parent reference
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
		} catch (err: unknown) {
			const error = err as { code?: string; name?: string };
			if (
				error.code === "ResourceNotFoundException" ||
				error.name === "ResourceNotFoundException"
			) {
				const data: Record<string, unknown> = {
					QueueId: arn.resourceId,
					InstanceId: instanceId,
					Arn: arn.raw,
					Synthetic: true,
				};
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
			}
			throw err;
		}
	},
};

registerResolver("connect:queue", connectQueueResolver);
