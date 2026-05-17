import { z } from "zod";

export const PortableEdgeSchema = z.object({
	from: z.string(),
	to: z.string(),
	relationshipType: z.string(),
	label: z.string().optional(),
});

export const PortableNodeSchema = z.object({
	service: z.string(),
	cfnType: z.string().nullable(),
	referenceOnly: z.boolean(),
	classification: z.string(),
	properties: z.record(z.string(), z.unknown()),
	metadata: z.record(z.string(), z.unknown()),
	discoveryState: z.string().optional(),
	discoveryError: z.string().optional(),
});

export const PortableGraphSchema = z.object({
	version: z.number(),
	exportedAt: z.string(),
	summary: z.object({
		nodeCount: z.number(),
		edgeCount: z.number(),
		services: z.array(z.string()),
	}),
	nodes: z.record(z.string(), PortableNodeSchema),
	edges: z.array(PortableEdgeSchema),
	arnMap: z.record(z.string(), z.string()),
	metadata: z.record(z.string(), z.unknown()),
});

/**
 * Legacy graph format (keyed by ARN, no arnMap).
 * Kept for backwards compatibility with v1 raw exports.
 */
export const LegacyGraphSchema = z.object({
	version: z.number().optional(),
	exportedAt: z.string().optional(),
	nodes: z.record(
		z.string(),
		z.object({
			arn: z.string().nullable().optional(),
			logicalId: z.string(),
			service: z.string(),
			cfnType: z.string().nullable().optional(),
			classification: z.string().optional(),
			properties: z.record(z.string(), z.unknown()).optional(),
			referencedArns: z.array(z.string()).optional(),
			referenceOnly: z.boolean().optional(),
			metadata: z.record(z.string(), z.unknown()).optional(),
			discoveryState: z.string().optional(),
			discoveryError: z.string().optional(),
		}),
	),
	edges: z
		.array(
			z.object({
				id: z.string(),
				source: z.string(),
				target: z.string(),
				relationshipType: z.string(),
				label: z.string().optional(),
			}),
		)
		.optional(),
});

/**
 * Validate and parse imported graph data.
 * Returns { type: 'portable', data } or { type: 'legacy', data }.
 */
export function validateImportGraph(
	raw: unknown,
):
	| { type: "portable"; data: z.infer<typeof PortableGraphSchema> }
	| { type: "legacy"; data: z.infer<typeof LegacyGraphSchema> }
	| { error: string } {
	if (typeof raw !== "object" || raw === null) {
		return { error: "Import data must be a JSON object" };
	}

	// Try portable format first (has arnMap)
	const portableResult = PortableGraphSchema.safeParse(raw);
	if (portableResult.success) {
		return { type: "portable", data: portableResult.data };
	}

	// Fall back to legacy format
	const legacyResult = LegacyGraphSchema.safeParse(raw);
	if (legacyResult.success) {
		return { type: "legacy", data: legacyResult.data };
	}

	const issues = legacyResult.error.issues.map(
		(i: { path?: unknown[]; message?: string }) =>
			`${i.path?.join(".") ?? "root"}: ${i.message}`,
	);
	return { error: `Invalid graph format: ${issues.join("; ")}` };
}
