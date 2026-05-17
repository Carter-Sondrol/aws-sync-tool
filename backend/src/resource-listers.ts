import {
	LambdaClient,
	ListFunctionsCommand,
	ListLayersCommand,
} from "@aws-sdk/client-lambda";
import {
	IAMClient,
	ListRolesCommand,
	ListPoliciesCommand,
} from "@aws-sdk/client-iam";
import { S3Client, ListBucketsCommand } from "@aws-sdk/client-s3";
import {
	DynamoDBClient,
	ListTablesCommand,
	DescribeTableCommand,
} from "@aws-sdk/client-dynamodb";
import { ConnectClient, ListInstancesCommand } from "@aws-sdk/client-connect";

/** Credentials shape for listing resources. */
export interface ListCredentials {
	accessKeyId: string;
	secretAccessKey: string;
	sessionToken?: string;
}

/** A function that lists all ARNs of a given resource type in an account. */
export type ResourceLister = (
	region: string,
	credentials: ListCredentials,
) => Promise<string[]>;

const listers = new Map<string, ResourceLister>();

export function registerLister(name: string, lister: ResourceLister): void {
	if (listers.has(name)) {
		throw new Error(`Lister '${name}' already registered.`);
	}
	listers.set(name, lister);
}

export function getLister(name: string): ResourceLister | undefined {
	return listers.get(name);
}

/** Return all registered lister names (e.g. "lambda:function"). */
export function getAllListerNames(): string[] {
	return Array.from(listers.keys());
}

// ── Lambda ──────────────────────────────────────────────────────────────

registerLister("lambda:function", async (region, creds) => {
	const client = new LambdaClient({ region, credentials: creds });
	const arns: string[] = [];
	let marker: string | undefined;
	do {
		const res = await client.send(
			new ListFunctionsCommand({ Marker: marker, MaxItems: 50 }),
		);
		for (const fn of res.Functions || []) {
			if (fn.FunctionArn) arns.push(fn.FunctionArn);
		}
		marker = res.NextMarker;
	} while (marker);
	return arns;
});

registerLister("lambda:layer", async (region, creds) => {
	const client = new LambdaClient({ region, credentials: creds });
	const arns: string[] = [];
	let marker: string | undefined;
	do {
		const res = await client.send(
			new ListLayersCommand({ Marker: marker, MaxItems: 50 }),
		);
		for (const layer of res.Layers || []) {
			if (layer.LayerArn) arns.push(layer.LayerArn);
		}
		marker = res.NextMarker;
	} while (marker);
	return arns;
});

// ── IAM ─────────────────────────────────────────────────────────────────

registerLister("iam:role", async (_region, creds) => {
	const client = new IAMClient({ region: "us-east-1", credentials: creds });
	const arns: string[] = [];
	let marker: string | undefined;
	do {
		const res = await client.send(
			new ListRolesCommand({ Marker: marker, MaxItems: 100 }),
		);
		for (const role of res.Roles || []) {
			if (role.Arn) arns.push(role.Arn);
		}
		marker = res.Marker;
	} while (marker);
	return arns;
});

registerLister("iam:policy", async (_region, creds) => {
	const client = new IAMClient({ region: "us-east-1", credentials: creds });
	const arns: string[] = [];
	let marker: string | undefined;
	do {
		const res = await client.send(
			new ListPoliciesCommand({ Scope: "All", Marker: marker, MaxItems: 100 }),
		);
		for (const policy of res.Policies || []) {
			if (policy.Arn) arns.push(policy.Arn);
		}
		marker = res.Marker;
	} while (marker);
	return arns;
});

// ── S3 ──────────────────────────────────────────────────────────────────

registerLister("s3:bucket", async (_region, creds) => {
	const client = new S3Client({ region: "us-east-1", credentials: creds });
	const res = await client.send(new ListBucketsCommand({}));
	return (res.Buckets || []).map((b) => `arn:aws:s3:::${b.Name}`);
});

// ── DynamoDB ────────────────────────────────────────────────────────────

registerLister("dynamodb:table", async (region, creds) => {
	const client = new DynamoDBClient({ region, credentials: creds });
	const tableNames: string[] = [];
	let exclusiveStart: string | undefined;
	do {
		const res = await client.send(
			new ListTablesCommand({ ExclusiveStartTableName: exclusiveStart }),
		);
		tableNames.push(...(res.TableNames || []));
		exclusiveStart = res.LastEvaluatedTableName;
	} while (exclusiveStart);

	if (tableNames.length === 0) return [];

	// Describe first table to extract account ID for ARN construction
	const desc = await client.send(
		new DescribeTableCommand({ TableName: tableNames[0] }),
	);
	const sampleArn = desc.Table?.TableArn;
	if (!sampleArn) return [];
	const accountId = sampleArn.split(":")[4];
	return tableNames.map(
		(name) => `arn:aws:dynamodb:${region}:${accountId}:table/${name}`,
	);
});

// ── Connect ─────────────────────────────────────────────────────────────

registerLister("connect:instance", async (region, creds) => {
	const client = new ConnectClient({ region, credentials: creds });
	const arns: string[] = [];
	try {
		const res = await client.send(new ListInstancesCommand({}));
		for (const inst of res.InstanceSummaryList || []) {
			if (inst.Arn) arns.push(inst.Arn);
		}
	} catch (err: unknown) {
		const error = err as { code?: string; name?: string };
		const code = error.code ?? error.name ?? "";
		if (code === "AccessDenied" || code === "AccessDeniedException") {
			console.warn(
				"[connect:instance] AccessDenied on ListInstances — use describe-only mode",
			);
		} else {
			console.warn("[connect:instance] ListInstances failed:", error);
		}
	}
	return arns;
});

// Connect subresources (queues, contact-flows, routing-profiles, etc.)
// don't have top-level list APIs — they require an InstanceId.
// They are discovered through the instance resolver's fetch output instead.
