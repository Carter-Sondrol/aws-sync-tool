import type { ParsedARN } from "../arn.js";
import type {
	ResourceResolver,
	ResolverOutput,
	Credentials,
} from "./resolver-types.js";
import type { DiscoveryNode } from "../discovery/discovery-node.js";
import { NodeClassification } from "../discovery/discovery-node.js";
import { extractARNs } from "../arn.js";

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
 * Resolve a single resource ARN to a DiscoveryNode.
 *
 * Shared pipeline that handles:
 * - Retry with exponential backoff on throttling
 * - Error classification (access denied, not found, unexpected)
 * - Node construction (canonical name, ARN extraction, classification)
 *
 * The resolver's `fetch()` method does the actual AWS API call.
 * This function wraps it with retry, error handling, and node construction.
 */
export async function resolveResource(
	resolver: ResourceResolver,
	arn: ParsedARN,
	credentials: () => Promise<Credentials>,
	options?: ResolveOptions,
): Promise<DiscoveryNode | null> {
	const service = resolver.service;
	const t0 = Date.now();

	for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
		try {
			const fetchStart = Date.now();
			console.log(`[Resolver:${service}] fetch → ${arn.raw}`);
			const output = await resolver.fetch(arn, credentials);
			const fetchMs = Date.now() - fetchStart;
			console.log(`[Resolver:${service}] fetch ← done in ${fetchMs}ms`);

			if (
				typeof output !== "object" ||
				output === null ||
				Array.isArray(output)
			) {
				throw new TypeError(
					`fetch returned ${typeof output}, expected ResolverOutput object`,
				);
			}

			const nodeStart = Date.now();
			const node = buildNode(resolver, arn, output, options);
			const nodeMs = Date.now() - nodeStart;

			const totalMs = Date.now() - t0;
			console.log(
				`[Resolver:${service}] ✓ ${arn.raw} → ${node.logicalId} (fetch=${fetchMs}ms, build=${nodeMs}ms, total=${totalMs}ms)`,
			);
			return node;
		} catch (err: unknown) {
			const error = err as {
				code?: string;
				name?: string;
				message?: string;
				$metadata?: { retryAfterSeconds?: number };
			};
			const code = error.code ?? error.name ?? "";

			// Throttle error — wait for retryAfterSeconds (or 1s fallback) and retry
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

	// Exhausted all retries
	return null;
}

/**
 * Build a DiscoveryNode from a resolver output.
 *
 * Extracts referenced ARNs from the data, builds the canonical name,
 * and sets the discovery state to 'resolved'.
 */
function buildNode(
	resolver: ResourceResolver,
	arn: ParsedARN,
	output: ResolverOutput,
	options?: ResolveOptions,
): DiscoveryNode {
	const { data, logicalId, classification, referenceOnly, metadata } = output;

	const referencedArnPaths = extractARNs(data, {
		knownBuckets: options?.knownBuckets,
	});

	return {
		logicalId: logicalId ?? arn.resourceId,
		service: resolver.service,
		cfnType:
			resolver.cfnType ??
			`AWS::${capitalize(resolver.service)}::${capitalize(resolver.resourceType)}`,
		properties: data,
		primaryArn: arn,
		referencedArns: new Set(referencedArnPaths.keys()),
		referencedArnPaths,
		classification: classification ?? NodeClassification.RESOURCE,
		referenceOnly: referenceOnly ?? false,
		metadata: metadata ?? {},
		discoveryState: "resolved" as const,
	};
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
