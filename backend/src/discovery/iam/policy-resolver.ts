import {
	IAMClient,
	GetPolicyCommand,
	GetPolicyVersionCommand,
} from "@aws-sdk/client-iam";
import { registerResolver } from "../../resolvers/registry.js";
import { getCachedClient } from "../../resolvers/client-cache.js";
import type {
	ResourceResolver,
} from "../../resolvers/resolver-types.js";
import type { ParsedARN } from "../../../../packages/types/src/arn.js";

const iamPolicyResolver: ResourceResolver = {
	service: "iam",
	resourceType: "policy",
	cfnType: "AWS::IAM::ManagedPolicy",

	async fetch(
		arn: ParsedARN,
		credentials: () => Promise<{
			accessKeyId: string;
			secretAccessKey: string;
			sessionToken?: string;
		}>,
	): Promise<Record<string, unknown> | null> {
		const creds = await credentials();
		const client = new IAMClient({
			region: "us-east-1",
			credentials: creds,
		});
		const res = await client.send(new GetPolicyCommand({ PolicyArn: arn.raw }));
		const policy = res.Policy;
		if (!policy) throw new Error("Policy not found in response");

		let policyDoc: unknown;
		try {
			const ver = await client.send(
				new GetPolicyVersionCommand({
					PolicyArn: arn.raw,
					VersionId: policy.DefaultVersionId,
				}),
			);
			policyDoc = ver.PolicyVersion?.Document;
		} catch {
			// swallow - policy doc is nice to have but not required
		}

		const data: Record<string, unknown> = {
			PolicyName: policy.PolicyName,
			PolicyId: policy.PolicyId,
			Arn: policy.Arn,
			DefaultVersionId: policy.DefaultVersionId,
			Path: policy.Path,
			AttachmentCount: policy.AttachmentCount,
			PermissionsBoundaryUsageCount: policy.PermissionsBoundaryUsageCount,
			PolicyDocument: policyDoc,
			Tags: policy.Tags,
		};

		const policyArn = data.Arn as string;
		const isManaged = policyArn?.includes(":aws:policy/");

		return data;
	},
};

registerResolver("iam:policy", iamPolicyResolver);
