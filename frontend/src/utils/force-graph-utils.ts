/**
 * force-graph-utils.ts
 *
 * Pure functions for graph data transformation — no React dependencies.
 * Extracted from use-force-graph-data.ts for testability and clarity.
 */

import type { DiscoveredNode, GraphEdge } from "../stores/app-store";

// ─── ARN parsing ──────────────────────────────────────────────────────────────

export function parseArn(
	arn: string,
): { service: string; resourceType: string; resourceId: string } | null {
	const parts = arn.split(":");
	if (parts.length < 6 || parts[0] !== "arn") return null;
	const resource = parts[5];
	const resourceParts = resource.split("/");
	const resourceType = resourceParts[0] || "";
	const resourceId = resourceParts[resourceParts.length - 1] || resource;
	return { service: parts[1], resourceType, resourceId };
}

// ─── Placeholder node creation ────────────────────────────────────────────────

// Services that have backend resolvers — their placeholders are real resources waiting to resolve
export const RESOLVABLE_SERVICES = new Set([
	"lambda",
	"dynamodb",
	"connect",
	"iam",
	"s3",
	"apigateway",
	"cloudwatch",
	"ssm",
	"secretsmanager",
]);

export function createPlaceholderNode(arn: string): DiscoveredNode {
	const parsed = parseArn(arn);
	if (!parsed) {
		return {
			arn,
			logicalId: arn.slice(0, 30) + "...",
			service: "unknown",
			cfnType: null,
			classification: "external",
			properties: {},
			referencedArns: [],
			referenceOnly: true,
			metadata: { isPlaceholder: true },
			discoveryState: "placeholder",
		};
	}
	const isResolvable = RESOLVABLE_SERVICES.has(parsed.service);
	return {
		arn,
		logicalId: parsed.resourceId,
		service: parsed.service,
		cfnType: parsed.resourceType,
		classification: isResolvable ? "resource" : "external",
		properties: {},
		referencedArns: [],
		referenceOnly: !isResolvable,
		metadata: { isPlaceholder: true },
		discoveryState: "placeholder",
	};
}

// ─── Connect subresource grouping ────────────────────────────────────────────

export const GROUP_PREFIX = "__group__";

export function isConnectSubresource(node: DiscoveredNode): boolean {
	if (node.service !== "connect") return false;
	const resource = node.arn.split(":")[5];
	if (!resource) return false;
	return resource.split("/").length >= 4;
}

export function extractConnectResourceId(
	arn: string,
): { instanceId: string; resourceType: string } | null {
	const resource = arn.split(":")[5];
	if (!resource) return null;
	const parts = resource.split("/");
	if (parts.length < 4) return null;
	return { instanceId: parts[1], resourceType: parts[2] };
}

export function buildGroupArn(
	instanceId: string,
	resourceType: string,
): string {
	return `${GROUP_PREFIX}connect:instance/${instanceId}/${resourceType}`;
}

export function buildGroupNodeKey(arn: string): string | null {
	const info = extractConnectResourceId(arn);
	if (!info) return null;
	return buildGroupArn(info.instanceId, info.resourceType);
}

export interface ConnectGroups {
	groupNodes: Map<string, DiscoveredNode>;
	groupedChildArns: Map<string, Set<string>>;
	collapsedGroups: Set<string>;
}

export function buildConnectGroups(
	nodes: Map<string, DiscoveredNode>,
	collapsedNodeArns: Set<string>,
): ConnectGroups {
	const groups = new Map<string, string[]>();
	for (const [arn, node] of nodes) {
		if (!isConnectSubresource(node)) continue;
		const groupArn = buildGroupNodeKey(arn);
		if (!groupArn) continue;
		if (!groups.has(groupArn)) groups.set(groupArn, []);
		groups.get(groupArn)!.push(arn);
	}

	const groupNodes = new Map<string, DiscoveredNode>();
	const groupedChildArns = new Map<string, Set<string>>();
	const collapsedGroups = new Set<string>();

	for (const [groupArn, childArns] of groups) {
		const firstChild = nodes.get(childArns[0]);
		if (!firstChild) continue;

		const info = extractConnectResourceId(childArns[0]);
		const resourceTypeLabel = info?.resourceType || "resource";
		const isExpanded = collapsedNodeArns.has(groupArn + ":expanded");

		if (!isExpanded) {
			collapsedGroups.add(groupArn);
		}

		groupedChildArns.set(groupArn, new Set(childArns));

		groupNodes.set(groupArn, {
			arn: groupArn,
			logicalId: `${firstChild.logicalId} · ${resourceTypeLabel}s`,
			service: "connect",
			cfnType: resourceTypeLabel,
			classification: "resource",
			properties: {},
			referencedArns: childArns,
			referenceOnly: false,
			metadata: { isGroup: true, groupArn, childCount: childArns.length },
			discoveryState: "resolved",
		} as DiscoveredNode);
	}

	return { groupNodes, groupedChildArns, collapsedGroups };
}

// ─── Radial position computation (initial seed positions) ─────────────────────

const RING_RADIUS = 220;

export function computeRadialPositions(
	nodes: Map<string, DiscoveredNode>,
	edges: GraphEdge[],
	syncedArns: string[],
): Map<string, { x: number; y: number }> {
	const positions = new Map<string, { x: number; y: number }>();
	const nodeArns = Array.from(nodes.keys());
	if (nodeArns.length === 0) return positions;

	const adjacency = new Map<string, Set<string>>();
	for (const arn of nodeArns) adjacency.set(arn, new Set());
	for (const edge of edges) {
		if (adjacency.has(edge.source) && adjacency.has(edge.target)) {
			adjacency.get(edge.source)?.add(edge.target);
			adjacency.get(edge.target)?.add(edge.source);
		}
	}

	const rings = new Map<string, number>();
	const visited = new Set<string>();
	const queue: Array<{ arn: string; depth: number }> = [];

	const seeds = nodeArns.filter((a) => syncedArns.includes(a));
	const startNodes = seeds.length > 0 ? seeds : [nodeArns[0]];

	for (const seed of startNodes) {
		queue.push({ arn: seed, depth: 0 });
		rings.set(seed, 0);
		visited.add(seed);
	}

	let head = 0;
	while (head < queue.length) {
		const { arn, depth } = queue[head++];
		for (const neighbor of adjacency.get(arn) || []) {
			if (!visited.has(neighbor)) {
				visited.add(neighbor);
				rings.set(neighbor, depth + 1);
				queue.push({ arn: neighbor, depth: depth + 1 });
			}
		}
	}

	for (const arn of nodeArns) {
		if (!rings.has(arn)) rings.set(arn, 1);
	}

	const ringGroups = new Map<number, string[]>();
	for (const [arn, depth] of rings) {
		if (!ringGroups.has(depth)) ringGroups.set(depth, []);
		ringGroups.get(depth)!.push(arn);
	}

	const ring0 = ringGroups.get(0) || [];
	if (ring0.length === 1) {
		positions.set(ring0[0], { x: 0, y: 0 });
	} else {
		const angleStep = (2 * Math.PI) / ring0.length;
		ring0.forEach((arn, i) => {
			const angle = angleStep * i - Math.PI / 2;
			positions.set(arn, { x: Math.cos(angle) * 60, y: Math.sin(angle) * 60 });
		});
	}

	for (let depth = 1; depth <= 10; depth++) {
		const group = ringGroups.get(depth);
		if (!group) continue;
		const radius = RING_RADIUS * Math.sqrt(depth);
		const angleStep = (2 * Math.PI) / group.length;
		const offset = depth % 2 === 0 ? 0 : angleStep / 2;
		group.forEach((arn, i) => {
			const angle = angleStep * i + offset - Math.PI / 2;
			positions.set(arn, {
				x: Math.cos(angle) * radius,
				y: Math.sin(angle) * radius,
			});
		});
	}

	return positions;
}
