import { Hono } from "hono";
import { resolveCredentials } from "../credentials/index.js";
import { accountStore } from "../credentials/account-store.js";
import {
	getResolver,
	getAllServices,
	getResolversByService,
} from "../resolvers/registry.js";
import { resolveResource } from "../resolvers/resolve-resource.js";
import type { DiscoveryEngine } from "../graph/discovery-engine.js";
import { toDiscoveredNode } from "../discovery/node-serializer.js";
import { downloadLambdaCode } from "../services/lambda-code-service.js";

export function createDiscoveryRouter(discoveryEngine: DiscoveryEngine) {
	const router = new Hono();

	router.post("/describe", async (c) => {
		try {
			const body = await c.req.json<{ arn: string; accountId: string }>();
			const { arn, accountId } = body;
			console.log(`[API] POST /describe arn=${arn} accountId=${accountId}`);

			if (!arn) {
				return c.json({ error: "ARN is required" });
			}

			const account = accountStore.get(accountId);
			if (!account) {
				console.log(`[API] Account not found: ${accountId}`);
				return c.json({ error: "Account not found" });
			}

			const creds = await resolveCredentials({
				profileName: account.profileName as string,
				region: (account.region as string) || "us-east-1",
			});

			const { parseARN, canonicalForGraph } = await import("../arn.js");

			const parsed = parseARN(arn);
			if (!parsed) {
				return c.json({ error: `Failed to parse ARN: ${arn}` });
			}

			const canonical = canonicalForGraph(arn);
			if (!canonical) {
				return c.json({ error: `Failed to canonicalize ARN: ${arn}` });
			}

			const resolver =
				getResolver(`${parsed.service}:${parsed.resourceType}`) ||
				getResolver(parsed.service);
			if (!resolver) {
				return c.json({
					error: `No resolver for ${parsed.service}:${parsed.resourceType}`,
				});
			}

			const credFn = async () => ({
				accessKeyId: creds.accessKeyId,
				secretAccessKey: creds.secretAccessKey,
				sessionToken: creds.sessionToken,
			});

			const node = await resolveResource(resolver, parsed, credFn);

			if (!node) {
				return c.json({ error: "Failed to resolve resource" });
			}

			return c.json({ data: toDiscoveredNode(canonical, node) });
		} catch (err) {
			return c.json({
				error: err instanceof Error ? err.message : String(err),
			});
		}
	});

	router.post("/expand", async (c) => {
		try {
			const body = await c.req.json<{
				seedArns: string[];
				accountId: string;
				maxDepth?: number;
				excludedServices?: string[];
			}>();
			const { seedArns, accountId } = body;
			console.log(
				`[API] POST /expand seeds=${seedArns.length}, account=${accountId}`,
			);

			if (!seedArns || !Array.isArray(seedArns) || seedArns.length === 0) {
				return c.json({ error: "seedArns array is required" });
			}

			const account = accountStore.get(accountId);
			if (!account) {
				console.log(`[API] Account not found: ${accountId}`);
				return c.json({ error: "Account not found" });
			}

			const credsStart = Date.now();
			console.log(
				`[API] Resolving credentials for profile=${account.profileName}, region=${account.region || "us-east-1"}`,
			);
			const creds = await resolveCredentials({
				profileName: account.profileName as string,
				region: (account.region as string) || "us-east-1",
			});
			console.log(`[API] Credentials resolved in ${Date.now() - credsStart}ms`);

			const credFn = async () => ({
				accessKeyId: creds.accessKeyId,
				secretAccessKey: creds.secretAccessKey,
				sessionToken: creds.sessionToken,
			});

			discoveryEngine.discover(seedArns, credFn);

			return c.json({
				data: {
					phase: "running",
					seedCount: seedArns.length,
					resolved: 0,
					totalFound: seedArns.length,
				},
			});
		} catch (err) {
			return c.json({
				error: err instanceof Error ? err.message : String(err),
			});
		}
	});

	router.post("/expand-node", async (c) => {
		try {
			const body = await c.req.json<{
				arn: string;
				accountId: string;
				maxDepth?: number;
				excludedServices?: string[];
			}>();
			const { arn, accountId } = body;
			console.log(
				`[API] POST /expand-node arn=${arn}, account=${accountId}`,
			);

			if (!arn) {
				return c.json({ error: "arn is required" });
			}

			const account = accountStore.get(accountId);
			if (!account) {
				console.log(`[API] Account not found: ${accountId}`);
				return c.json({ error: "Account not found" });
			}

			const creds = await resolveCredentials({
				profileName: account.profileName as string,
				region: (account.region as string) || "us-east-1",
			});

			const credFn = async () => ({
				accessKeyId: creds.accessKeyId,
				secretAccessKey: creds.secretAccessKey,
				sessionToken: creds.sessionToken,
			});

			discoveryEngine.discover([arn], credFn);

			return c.json({
				data: {
					phase: "running",
					seedCount: 1,
					resolved: 0,
					totalFound: 1,
					currentArn: arn,
				},
			});
		} catch (err) {
			return c.json({
				error: err instanceof Error ? err.message : String(err),
			});
		}
	});

	router.get("/services", (_c) => {
		const services = getAllServices();
		const result = services.map((svc) => {
			const resolvers = getResolversByService(svc);
			return {
				service: svc,
				resourceTypes: Array.from(resolvers.keys()),
			};
		});
		return _c.json({ data: result });
	});

	router.post("/list", async (c) => {
		try {
			const body = await c.req.json<{
				resourceType: string;
				accountId: string;
			}>();
			const { resourceType, accountId } = body;

			if (!resourceType) {
				return c.json({
					error: 'resourceType is required (e.g. "lambda:function")',
				});
			}

			const account = accountStore.get(accountId);
			if (!account) {
				return c.json({ error: "Account not found" });
			}

			const region = (account.region as string) || "us-east-1";
			const creds = await resolveCredentials({
				profileName: account.profileName as string,
				region,
			});
			// TODO: Task 6 — replace with route-level lister
			const resolverClass = getResolver(resourceType) as unknown as new (
				region: string,
				credFn: () => Promise<{
					accessKeyId: string;
					secretAccessKey: string;
					sessionToken?: string;
				}>,
			) => { listAllResources(region: string): Promise<string[]> };
			if (!resolverClass) {
				return c.json({ error: `No resolver for ${resourceType}` });
			}

			const credFn = async () => ({
				accessKeyId: creds.accessKeyId,
				secretAccessKey: creds.secretAccessKey,
				sessionToken: creds.sessionToken,
			});

			const resolver = new resolverClass(region || "us-east-1", credFn);
			const arns = await resolver.listAllResources(region);

			return c.json({ data: { resourceType, arns, count: arns.length } });
		} catch (err) {
			return c.json({
				error: err instanceof Error ? err.message : String(err),
			});
		}
	});

	router.get("/status", (c) => {
		const progress = discoveryEngine.getProgress();
		return c.json({ data: progress });
	});

	router.post("/download-lambda-code", async (c) => {
		try {
			const body = await c.req.json<{ arn: string; accountId: string }>();
			const { arn, accountId } = body;

			if (!arn) {
				return c.json({ error: "arn is required" }, 400);
			}

			const account = accountStore.get(accountId);
			if (!account) {
				return c.json({ error: "Account not found" }, 404);
			}

			const creds = await resolveCredentials({
				profileName: account.profileName as string,
				region: (account.region as string) || "us-east-1",
			});

			const { functionName, codeBuffer } = await downloadLambdaCode({
				arn,
				credentials: creds,
			});

			return c.body(codeBuffer, 200, {
				"Content-Type": "application/zip",
				"Content-Disposition": `attachment; filename="${functionName}.zip"`,
			});
		} catch (err) {
			return c.json(
				{ error: err instanceof Error ? err.message : String(err) },
				500,
			);
		}
	});

	router.post("/resolve", async (c) => {
		try {
			const body = await c.req.json<{ arn: string; accountId: string }>();
			const { arn, accountId } = body;

			if (!arn) {
				return c.json({ error: "arn is required" });
			}

			const account = accountStore.get(accountId);
			if (!account) {
				return c.json({ error: "Account not found" });
			}

			const creds = await resolveCredentials({
				profileName: account.profileName as string,
				region: (account.region as string) || "us-east-1",
			});

			const node = await discoveryEngine.resolveNode(arn, creds);

			if (!node) {
				return c.json({ error: "Failed to resolve node" });
			}

			return c.json({
				data: toDiscoveredNode(node.primaryArn.raw ?? arn, node),
			});
		} catch (err) {
			return c.json({
				error: err instanceof Error ? err.message : String(err),
			});
		}
	});

	return router;
}
