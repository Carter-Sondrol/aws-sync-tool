const ARN_REGEX =
	/^arn:(?<partition>[^:]+):(?<service>[^:]*):(?<region>[^:]*):(?<account_id>[^:]*):(?<resource>.+)$/;

const ARN_CACHE = new Map<string, ParsedARN>();

export interface ParsedARN {
	raw: string;
	partition: string;
	service: string;
	region: string;
	accountId: string;
	resource: string;
	resourceType: string;
	resourceId: string;
	resourceParts: string[];
}

export function parseARN(value: string): ParsedARN | null {
	const normalized = value.replace(/[/:]+$/, "");

	if (ARN_CACHE.has(normalized)) {
		return ARN_CACHE.get(normalized)!;
	}

	const m = normalized.match(ARN_REGEX);
	if (!m) return null;

	const parts = m.groups!;
	const resourceParts = parts.resource.split(/[:/]/).filter(Boolean);
	const resourceType = extractResourceType(parts.service, resourceParts);
	const resourceId = resourceParts[resourceParts.length - 1] ?? parts.resource;

	const result: ParsedARN = {
		raw: normalized,
		partition: parts.partition,
		service: parts.service,
		region: parts.region,
		accountId: parts.account_id,
		resource: parts.resource,
		resourceType,
		resourceId,
		resourceParts,
	};

	if (ARN_CACHE.size < 4096) {
		ARN_CACHE.set(normalized, result);
	}

	return result;
}

function extractResourceType(service: string, parts: string[]): string {
	if (service === "connect") {
		if (parts.length === 2 && parts[0] === "instance") return "instance";
		if (parts.length >= 3 && parts[0] === "instance") return parts[2];
		return "unknown";
	}

	if (service === "lambda") {
		if (!parts.length) return "unknown";
		if (parts[0] === "function") return "function";
		if (parts[0] === "layer")
			return parts.length >= 3 ? "layerversion" : "layer";
		if (parts[0] === "event-source-mapping") return "eventsourcemapping";
		if (parts[0] === "code-signing-config") return "codesigningconfig";
		if (parts[0] === "runtime") return "runtime";
		return "unknown";
	}

	if (service === "apigateway") {
		if (parts.length >= 3 && parts[0] === "restapis") return parts[2];
		return "restapi";
	}

	if (service === "iam" && parts.length >= 1) return parts[0];

	if (service === "s3") return parts.length > 1 ? "object" : "bucket";

	if (service === "elasticloadbalancing") {
		if (parts[0] === "loadbalancer" || parts[0] === "targetgroup")
			return parts[0];
		return "unknown";
	}

	if (parts.length >= 2) return parts[parts.length - 2];
	return parts[0] ?? "unknown";
}

export function isValidARN(value: string): boolean {
	return ARN_REGEX.test(value.replace(/[/:]+$/, ""));
}

export function tryParseARN(value: string): ParsedARN | null {
	return parseARN(value);
}

export function buildARN(
	service: string,
	resource: string,
	region = "",
	accountId = "",
	partition = "aws",
): string {
	return `arn:${partition}:${service}:${region}:${accountId}:${resource}`;
}

export function isAWSManaged(arn: string): boolean {
	const patterns = [
		"arn:aws:iam::aws:policy/*",
		"arn:aws:iam::aws:role/service-role/*",
		"*AWSServiceRoleFor*",
	];
	const normalized = arn.replace(/[/:]+$/, "");
	return patterns.some((pattern) => fnmatch(normalized, pattern));
}

export function isServiceLinkedRole(arn: string): boolean {
	const parsed = parseARN(arn);
	return (
		parsed?.service === "iam" && parsed.resource.includes("AWSServiceRoleFor")
	);
}

export function remapAccount(
	arn: string,
	targetAccountId: string,
): string | null {
	const parsed = parseARN(arn);
	if (!parsed) return null;
	return buildARN(
		parsed.service,
		parsed.resource,
		parsed.region,
		targetAccountId,
		parsed.partition,
	);
}

export function remapRegion(arn: string, targetRegion: string): string | null {
	const parsed = parseARN(arn);
	if (!parsed) return null;
	return buildARN(
		parsed.service,
		parsed.resource,
		targetRegion,
		parsed.accountId,
		parsed.partition,
	);
}

export function canonicalForGraph(arn: string): string | null {
	const parsed = parseARN(arn);
	if (!parsed) return null;

	if (parsed.resource.includes("*")) {
		if (parsed.service === "s3") {
			const bucket = parsed.resource.split("/", 1)[0];
			if (!bucket || bucket.includes("*")) return null;
			return buildARN(
				parsed.service,
				bucket,
				parsed.region,
				parsed.accountId,
				parsed.partition,
			);
		}
		return null;
	}

	if (parsed.service === "s3" && parsed.resource.includes("/")) {
		const bucket = parsed.resource.split("/", 1)[0];
		return buildARN(
			parsed.service,
			bucket,
			parsed.region,
			parsed.accountId,
			parsed.partition,
		);
	}

	return parsed.raw;
}

export interface ExtractedARNs {
	/** Sanitized copy of the input with ARNs replaced by `__REF_{identifier}__` placeholders. */
	sanitizedData: Record<string, unknown>;
	/** ARN → set of path keys (last JSON segment that led to this ARN). */
	arnPaths: Map<string, Set<string>>;
}

export function extractARNs(
	obj: unknown,
	options: { serviceFilter?: string[]; knownBuckets?: Set<string> } = {},
): ExtractedARNs {
	const arnPaths = new Map<string, Set<string>>();

	function isProbableBucketName(s: string): boolean {
		if (!s || !/^[a-z0-9-]+$/.test(s)) return false;
		if (s.length < 3 || s.length > 63) return false;
		if (s.includes(".") || s.startsWith("arn:")) return false;
		if (!s.includes("-") && !/\d/.test(s)) return false;
		if (
			/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(s)
		)
			return false;
		if (["us-east-1", "us-west-2", "eu-west-1"].includes(s)) return false;
		if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
		return true;
	}

	function inBucketContext(path: string[]): boolean {
		return path.some((p) => p.toLowerCase().includes("bucket"));
	}

	function addReference(arn: string, path: string[]): void {
		const labels = arnPaths.get(arn);
		if (!labels) {
			arnPaths.set(arn, new Set([path.at(-1) ?? ""]));
		} else {
			labels.add(path.at(-1) ?? "");
		}
	}

	function sanitizeValue(value: unknown): unknown {
		if (value == null) return value;

		if (typeof value === "string") {
			// Bucket name detection
			if (
				isProbableBucketName(value) &&
				(options.knownBuckets?.has(value) || inBucketContext([]))
			) {
				if (!options.serviceFilter || options.serviceFilter.includes("s3")) {
					const bucketArn = buildARN("s3", value);
					const canonical = canonicalForGraph(bucketArn);
					if (canonical) return `__REF_${canonical}__`;
				}
				return value;
			}

			// ARN detection
			if (
				!value.startsWith("arn:") ||
				value.length > 512 ||
				value.includes(" ")
			) {
				return value;
			}

			const arn = canonicalForGraph(value);
			if (!arn) return value;

			const parsed = parseARN(arn);
			if (parsed?.service === "lambda" && parsed.resourceType === "runtime") {
				return value;
			}

			if (
				options.serviceFilter &&
				parsed &&
				!options.serviceFilter.includes(parsed.service)
			) {
				return value;
			}

			if (
				parsed?.service === "cloudformation" &&
				!["stack", "stackset", "changeset"].includes(parsed.resourceType)
			) {
				return value;
			}

			return `__REF_${arn}__`;
		}

		if (Array.isArray(value)) {
			return value.map((item) => sanitizeValue(item));
		}

		if (typeof value === "object") {
			const out: Record<string, unknown> = {};
			for (const [k, v] of Object.entries(value)) {
				out[k] = sanitizeValue(v);
			}
			return out;
		}

		return value;
	}

	// Walk to collect ARN paths (for edge labels)
	function walk(value: unknown, path: string[] = []): void {
		if (value == null) return;

		if (typeof value === "string") {
			if (
				isProbableBucketName(value) &&
				(options.knownBuckets?.has(value) || inBucketContext(path))
			) {
				if (!options.serviceFilter || options.serviceFilter.includes("s3")) {
					const bucketArn = buildARN("s3", value);
					const canonical = canonicalForGraph(bucketArn);
					if (canonical) addReference(canonical, path);
				}
				return;
			}

			if (
				!value.startsWith("arn:") ||
				value.length > 512 ||
				value.includes(" ")
			) {
				return;
			}

			const arn = canonicalForGraph(value);
			if (!arn) return;

			const parsed = parseARN(arn);
			if (parsed?.service === "lambda" && parsed.resourceType === "runtime") {
				return;
			}

			if (
				options.serviceFilter &&
				parsed &&
				!options.serviceFilter.includes(parsed.service)
			) {
				return;
			}

			if (
				parsed?.service === "cloudformation" &&
				!["stack", "stackset", "changeset"].includes(parsed.resourceType)
			) {
				return;
			}

			addReference(arn, path);
			return;
		}

		if (typeof value === "object") {
			if (Array.isArray(value)) {
				value.forEach((item, i) => walk(item, [...path, String(i)]));
			} else {
				for (const [k, v] of Object.entries(value)) {
					walk(v, [...path, k]);
				}
			}
		}
	}

	walk(obj);
	const sanitizedData = sanitizeValue(obj) as Record<string, unknown>;
	return { sanitizedData, arnPaths };
}

function fnmatch(value: string, pattern: string): boolean {
	const regex = new RegExp(
		"^" +
			pattern.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*") +
			"$",
	);
	return regex.test(value);
}

export function shortARN(arn: string): string {
	const parsed = parseARN(arn);
	if (!parsed) return arn;
	return `${parsed.service}:${parsed.resourceType}/${parsed.resourceId}`;
}
