import type { ParsedARN } from "../../../packages/types/src/arn.js";
import type { ResourceResolver, Credentials } from "./resolver-types.js";
import type { Node } from "@aws-sync-tool/types";
import { extractARNs } from "../../../packages/types/src/arn.js";

/** AWS SDK error codes that indicate access was denied. */
const ACCESS_DENIED_CODES = new Set([
	"AccessDenied",
	"AccessDeniedException",
	"AuthorizationError",
	"UnauthorizedOperation",
]);

/** AWS SDK error codes that indicate the resource doesn't exist. */
const NOT_FOUND_CODES = new Set([
	"NoSuchEntity",
	"ResourceNotFoundException",
	"NotFoundException",
	"NoSuchBucket",
	"NoSuchKey",
]);

/** AWS SDK error codes that indicate throttling (retryable). */
const THROTTLE_CODES = new Set([
	"TooManyRequestsException",
	"ThrottlingException",
	"RequestLimitExceeded",
	"ServiceUnavailable",
]);

/** Maximum number of retry attempts for throttled requests. */
const MAX_RETRIES = 3;

/** Options for resolving a resource. */
export interface ResolveOptions {
	/** Known S3 bucket names (helps extractARNs identify bucket references). */
	knownBuckets?: Set<string>;
}

/**
 * Resolve a single resource ARN to a Node.
 *
 * Shared pipeline that handles:
 * - Retry with exponential backoff on throttling
 * - Error classification (access denied, not found, unexpected)
 * - Node construction (ARN extraction, classification, data sanitization)
 *
 * The resolver's `fetch()` method does the actual AWS API call.
 * This function wraps it with retry, error handling, and node construction.
 */
export interface ResolveResult {
	node: Node;
	/** ARN → path keys from the source data (for edge labels). */
	arnPaths: Map<string, Set<string>>;
}

export async function resolveResource(
	resolver: ResourceResolver,
	arn: ParsedARN,
	credentials: () => Promise<Credentials>,
	options?: ResolveOptions,
): Promise<ResolveResult | null> {
	const service = resolver.service;
	const t0 = Date.now();

	for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
		try {
			const fetchStart = Date.now();
			console.log(`[Resolver:${service}] fetch → ${arn.raw}`);
			const data = await resolver.fetch(arn, credentials);
			const fetchMs = Date.now() - fetchStart;
			console.log(`[Resolver:${service}] fetch ← done in ${fetchMs}ms`);

			if (data === null) {
				console.warn(`[${service}] Resource not found: ${arn.raw}`);
				return null;
			}

			const nodeStart = Date.now();
			const result = buildNode(resolver, arn, data, options);
			const nodeMs = Date.now() - nodeStart;

			const totalMs = Date.now() - t0;
			console.log(
				`[Resolver:${service}] ✓ ${arn.raw} → ${result.node.logicalId} (fetch=${fetchMs}ms, build=${nodeMs}ms, total=${totalMs}ms)`,
			);
			return result;
		} catch (err: unknown) {
			const error = err as {
				code?: string;
				name?: string;
				message?: string;
				$metadata?: { retryAfterSeconds?: number };
			};
			const code = error.code ?? error.name ?? "";

			if (THROTTLE_CODES.has(code) && attempt < MAX_RETRIES) {
				const retryAfter = (error.$metadata?.retryAfterSeconds ?? 1) * 1000;
				console.warn(
					`[${service}] Throttle detected (${code}), retrying ${attempt + 1}/${MAX_RETRIES + 1} after ~${retryAfter}ms`,
				);
				await new Promise((resolve) => setTimeout(resolve, retryAfter));
				continue;
			}

			if (ACCESS_DENIED_CODES.has(code)) {
				console.warn(
					`[${service}] Access denied fetching ${arn.raw} (${code})`,
				);
				return null;
			}

			if (NOT_FOUND_CODES.has(code)) {
				console.warn(`[${service}] Resource not found: ${arn.raw} (${code})`);
				return null;
			}

			console.error(
				`[${service}] Unexpected error resolving ${arn.raw}:`,
				error,
			);
			return null;
		}
	}

	return null;
}

/**
 * Build a Node from resolver output data.
 *
 * Extracts referenced ARNs from the data, replaces them with placeholders,
 * and sets the discovery state to 'resolved'.
 */
function buildNode(
	resolver: ResourceResolver,
	arn: ParsedARN,
	data: Record<string, unknown>,
	options?: ResolveOptions,
): ResolveResult {
	const { sanitizedData, arnPaths } = extractARNs(data, {
		knownBuckets: options?.knownBuckets,
	});

	const classification = resolver.classify
		? resolver.classify(data, arn)
		: "resource";

	const logicalId = arn.resourceId || arn.resource || arn.raw;

	const node: Node = {
		logicalId,
		service: resolver.service,
		cfnType:
			resolver.cfnType ??
			`AWS::${capitalize(resolver.service)}::${capitalize(resolver.resourceType)}`,
		arn: arn.raw,
		data: sanitizedData,
		referencedArns: Array.from(arnPaths.keys()),
		classification,
		referenceOnly: false,
		metadata: {},
		discoveryState: "resolved" as const,
	};

	return { node, arnPaths };
}

/**
 * Capitalize a string for CloudFormation type naming.
 * e.g. "lambda" → "Lambda", "s3" → "S3", "dynamodb" → "Dynamodb"
 */
function capitalize(str: string): string {
	return str
		.replace(/([a-z])([A-Z])/g, "$1 $2")
		.replace(/\b\w/g, (c) => c.toUpperCase());
}
