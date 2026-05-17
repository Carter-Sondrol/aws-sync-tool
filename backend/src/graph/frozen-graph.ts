import type { DiscoveryNode } from "../discovery/discovery-node.js";
import type { GraphEdge } from "@aws-sync-tool/types";
import { parseARN, isValidARN } from "../arn.js";

/**
 * Portable graph format — account/region agnostic.
 * Nodes are keyed by logicalId. ARNs in properties are replaced with
 * __REF_{logicalId}__ markers. An arn_map is included for round-trip restore.
 */
export interface PortableGraph {
	version: number;
	exportedAt: string;
	summary: {
		nodeCount: number;
		edgeCount: number;
		services: string[];
	};
	/** Nodes keyed by logicalId (not ARN) */
	nodes: Record<string, PortableNode>;
	edges: PortableEdge[];
	/** ARN raw string → logicalId mapping for round-trip restore */
	arnMap: Record<string, string>;
	metadata: Record<string, unknown>;
}

export interface PortableNode {
	service: string;
	cfnType: string | null;
	referenceOnly: boolean;
	classification: string;
	properties: Record<string, unknown>;
	metadata: Record<string, unknown>;
	discoveryState?: string;
	discoveryError?: string;
}

export interface PortableEdge {
	from: string;
	to: string;
	relationshipType: string;
	label?: string;
}

/**
 * Freeze the live graph into portable format:
 *   - Rekey nodes by logicalId
 *   - Replace embedded ARN strings in properties with __REF_{logicalId}__ markers
 *   - Build arn_map for round-trip restore
 */
export function freezeGraph(
	nodes: Map<string, DiscoveryNode>,
	edges: GraphEdge[],
): PortableGraph {
	const arnMap: Record<string, string> = {};

	for (const [arn, node] of nodes) {
		arnMap[arn] = node.logicalId;
		arnMap[node.primaryArn.raw] = node.logicalId;
	}

	const portableNodes: Record<string, PortableNode> = {};

	for (const node of Array.from(nodes.values())) {
		portableNodes[node.logicalId] = {
			service: node.service,
			cfnType: node.cfnType,
			referenceOnly: node.referenceOnly,
			classification: node.classification,
			properties: replaceArnsInObj(node.properties, arnMap) as Record<
				string,
				unknown
			>,
			metadata: structuredClone(node.metadata),
			discoveryState: node.discoveryState,
			discoveryError: node.discoveryError,
		};
	}

	const portableEdges: PortableEdge[] = edges.map((e) => ({
		from: arnMap[e.source] ?? e.source,
		to: arnMap[e.target] ?? e.target,
		relationshipType: e.relationshipType,
		label: e.label,
	}));

	const services = Array.from(
		new Set(Array.from(nodes.values()).map((n) => n.service)),
	).sort();

	return {
		version: 1,
		exportedAt: new Date().toISOString(),
		summary: {
			nodeCount: nodes.size,
			edgeCount: edges.length,
			services,
		},
		nodes: portableNodes,
		edges: portableEdges,
		arnMap,
		metadata: { frozen: true, frozenAt: new Date().toISOString() },
	};
}

/**
 * Thaw a portable graph back into DiscoveryNode + GraphEdge arrays.
 * Restores ARNs from arnMap where possible. Returns null for nodes whose
 * ARN cannot be reconstructed.
 */
export function thawGraph(graph: PortableGraph): {
	nodes: Map<string, DiscoveryNode>;
	edges: GraphEdge[];
} {
	const reverseMap: Record<string, string> = {};
	for (const [raw, lid] of Object.entries(graph.arnMap)) {
		reverseMap[lid] = raw;
	}

	const nodes = new Map<string, DiscoveryNode>();

	for (const [lid, pn] of Object.entries(graph.nodes)) {
		const arn = reverseMap[lid];
		if (!arn) continue;

		const parsed = parseARN(arn);
		if (!parsed) continue;

		const restoredProps = restoreArnsInObj(pn.properties, graph.arnMap);

		const node: DiscoveryNode = {
			logicalId: lid,
			service: pn.service,
			cfnType: pn.cfnType,
			properties: restoredProps as Record<string, unknown>,
			primaryArn: parsed,
			referencedArns: new Set<string>(),
			classification: pn.classification as DiscoveryNode["classification"],
			referenceOnly: pn.referenceOnly,
			metadata: pn.metadata as Record<string, unknown>,
			discoveryState:
				(pn.discoveryState as DiscoveryNode["discoveryState"]) ?? "resolved",
			discoveryError: pn.discoveryError,
		};
		nodes.set(arn, node);
	}

	const lidToArn: Record<string, string> = {};
	for (const [arn, node] of nodes) {
		lidToArn[node.logicalId] = arn;
	}

	const edges: GraphEdge[] = graph.edges.map((e) => {
		const source = lidToArn[e.from] ?? e.from;
		const target = lidToArn[e.to] ?? e.to;
		const edgeId = `${source}>>${target}`;
		return {
			id: edgeId,
			source,
			target,
			relationshipType: e.relationshipType,
			label: e.label,
		};
	});

	return { nodes, edges };
}

/* ── ARN replacement helpers ─────────────────────────────────────────── */

function replaceArnsInObj(
	obj: unknown,
	arnMap: Record<string, string>,
): unknown {
	if (typeof obj === "string") {
		const stripped = obj.trim();
		if (isValidARN(stripped) && stripped in arnMap) {
			return `__REF_${arnMap[stripped]}__`;
		}
		try {
			const parsed = JSON.parse(stripped);
			return JSON.stringify(replaceArnsInObj(parsed, arnMap), null, 0);
		} catch {
			/* not json */
		}
		return obj;
	}
	if (Array.isArray(obj)) return obj.map((v) => replaceArnsInObj(v, arnMap));
	if (obj && typeof obj === "object") {
		const out: Record<string, unknown> = {};
		for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
			out[k] = replaceArnsInObj(v, arnMap);
		}
		return out;
	}
	return obj;
}

function restoreArnsInObj(
	obj: unknown,
	arnMap: Record<string, string>,
): unknown {
	const lidToArn: Record<string, string> = {};
	for (const [raw, lid] of Object.entries(arnMap)) {
		lidToArn[lid] = raw;
	}
	if (typeof obj === "string") {
		const refMatch = obj.match(/^__REF_(.+?)__$/);
		if (refMatch && refMatch[1] in lidToArn) {
			return lidToArn[refMatch[1]];
		}
		return obj;
	}
	if (Array.isArray(obj)) return obj.map((v) => restoreArnsInObj(v, arnMap));
	if (obj && typeof obj === "object") {
		const out: Record<string, unknown> = {};
		for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
			out[k] = restoreArnsInObj(v, arnMap);
		}
		return out;
	}
	return obj;
}
