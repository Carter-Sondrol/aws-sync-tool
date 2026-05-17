/**
 * use-force-graph-data.ts
 *
 * Maps the app store's graph data into the format expected by react-force-graph-2d.
 * Handles Connect subresource grouping, placeholder nodes, collapse state,
 * and all the color/shape/edge styling logic.
 *
 * Pure transformation functions are in ../utils/force-graph-utils.ts
 */

import { useMemo } from "react";
import {
	useAppStore,
	type DiscoveredNode,
	type GraphEdge,
} from "../stores/app-store";
import {
	createPlaceholderNode,
	buildConnectGroups,
	computeRadialPositions,
	isConnectSubresource,
} from "../utils/force-graph-utils";

// ─── Colors & shapes ──────────────────────────────────────────────────────────

const serviceColors: Record<string, string> = {
	lambda: "#ff9800",
	dynamodb: "#4caf50",
	connect: "#2196f3",
	iam: "#9c27b0",
	s3: "#f57c00",
	apigateway: "#00bcd4",
	cloudwatch: "#795548",
	ssm: "#607d8b",
	secretsmanager: "#e91e63",
	unknown: "#757575",
};

const serviceShapes: Record<string, string> = {
	lambda: "circle",
	dynamodb: "rect",
	connect: "hexagon",
	iam: "diamond",
	s3: "cylinder",
	apigateway: "rounded",
	cloudwatch: "circle",
	ssm: "rect",
	secretsmanager: "circle",
};

// ─── Edge styles ──────────────────────────────────────────────────────────────

const edgeStyles: Record<string, { dashArray: string; color: string }> = {
	invokes: { dashArray: "0", color: "#ff9800" },
	"iam-role": { dashArray: "5,5", color: "#9c27b0" },
	"iam-permission": { dashArray: "5,5", color: "#9c27b0" },
	storage: { dashArray: "2,4", color: "#f57c00" },
	"log-group": { dashArray: "2,4", color: "#795548" },
	"connect-ref": { dashArray: "2,4", color: "#2196f3" },
	"env-var-ref": { dashArray: "2,4", color: "#607d8b" },
	"event-source": { dashArray: "0", color: "#4caf50" },
	referenced_arn: { dashArray: "0", color: "#666" },
	binding: { dashArray: "5,5", color: "#888" },
	inferred: { dashArray: "2,4", color: "#555" },
};

// ─── Force-graph node/edge types ──────────────────────────────────────────────

export interface FGNode {
	id: string;
	arn: string;
	label: string;
	sublabel: string;
	color: string;
	shape: string;
	classification: string;
	synced: boolean;
	collapsed: boolean;
	childCount: number;
	isPlaceholder: boolean;
	isGroup: boolean;
	groupChildArns?: string[];
	discoveryState?: string;
	// Initial positions for layout seeding
	x?: number;
	y?: number;
}

export interface FGEdge {
	id: string;
	source: string;
	target: string;
	relationshipType: string;
	label?: string;
	dashArray: string;
	color: string;
	animated: boolean;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useForceGraphData(): { nodes: FGNode[]; edges: FGEdge[] } {
	const { graph, syncedNodeArns, collapsedNodeArns } = useAppStore();

	return useMemo(() => {
		if (graph.nodes.size === 0) return { nodes: [], edges: [] };

		// Start with visible nodes
		const visibleNodes = new Map<string, DiscoveredNode>();
		for (const [arn, node] of graph.nodes) {
			visibleNodes.set(arn, node);
		}

		// Build Connect groups
		const collapsedSet = new Set(collapsedNodeArns);
		const { groupNodes, groupedChildArns, collapsedGroups } =
			buildConnectGroups(visibleNodes, collapsedSet);

		// Build a flat set of all grouped child ARNs (for quick lookup)
		const allGroupedChildren = new Set<string>();
		for (const children of groupedChildArns.values()) {
			for (const childArn of children) allGroupedChildren.add(childArn);
		}

		// Collect all hidden ARNs:
		// 1. Children of collapsed groups
		// 2. Children of collapsed regular nodes (via referencedArns)
		const hiddenArns = new Set<string>();

		// Hidden by collapsed Connect groups
		for (const [groupArn, children] of groupedChildArns) {
			if (collapsedGroups.has(groupArn)) {
				for (const childArn of children) hiddenArns.add(childArn);
			}
		}

		// Hidden by collapsed regular nodes
		for (const [arn, node] of visibleNodes) {
			if (collapsedSet.has(arn)) {
				for (const refArn of node.referencedArns) {
					if (visibleNodes.has(refArn) || allGroupedChildren.has(refArn)) {
						hiddenArns.add(refArn);
					}
				}
			}
		}

		// Filter: remove hidden nodes, add group nodes
		const finalNodes = new Map<string, DiscoveredNode>();

		for (const [arn, node] of visibleNodes) {
			if (!hiddenArns.has(arn)) {
				finalNodes.set(arn, node);
			}
		}

		for (const [groupArn, groupNode] of groupNodes) {
			if (collapsedGroups.has(groupArn) && !hiddenArns.has(groupArn)) {
				finalNodes.set(groupArn, groupNode);
			}
		}

		// Add placeholder nodes for referenced ARNs
		for (const [, node] of finalNodes) {
			for (const refArn of node.referencedArns) {
				if (!finalNodes.has(refArn) && !hiddenArns.has(refArn)) {
					finalNodes.set(refArn, createPlaceholderNode(refArn));
				}
			}
		}

		// Edge remapping for collapsed groups + collapsed regular nodes
		const childToGroupArn = new Map<string, string>();
		for (const [groupArn, children] of groupedChildArns) {
			if (collapsedGroups.has(groupArn)) {
				for (const childArn of children) {
					childToGroupArn.set(childArn, groupArn);
				}
			}
		}
		// Map hidden children → their collapsed parent
		for (const [arn, node] of visibleNodes) {
			if (collapsedSet.has(arn)) {
				for (const refArn of node.referencedArns) {
					if (hiddenArns.has(refArn)) {
						childToGroupArn.set(refArn, arn);
					}
				}
			}
		}

		// Compute initial positions
		const positions = computeRadialPositions(
			finalNodes,
			graph.edges,
			syncedNodeArns,
		);

		// Build FG nodes
		const resultNodes: FGNode[] = [];
		for (const [arn, node] of finalNodes) {
			const pos = positions.get(arn) || { x: 0, y: 0 };
			const isGroup =
				(node.metadata as Record<string, unknown>)?.isGroup === true;
			const isPlaceholder =
				(node.metadata as Record<string, unknown>)?.isPlaceholder === true;
			const isResolving = node.discoveryState === "resolving";
			const isFailed = node.discoveryState === "failed";

			const color = isFailed
				? "#ef4444"
				: isResolving
					? "#f59e0b"
					: isPlaceholder
						? "#6b7280"
						: serviceColors[node.service] || "#9e9e9e";

			const isSynced = node.synced !== false && syncedNodeArns.includes(arn);
			const childCount = isGroup
				? (((node.metadata as Record<string, unknown>)?.childCount as number) ??
					0)
				: collapsedSet.has(arn)
					? node.referencedArns.filter(
							(r) => visibleNodes.has(r) || hiddenArns.has(r),
						).length
					: node.referencedArns.filter((r) => finalNodes.has(r)).length;

			const labelPrefix = isPlaceholder
				? isFailed
					? "× "
					: isResolving
						? "⟳ "
						: "? "
				: "";

			resultNodes.push({
				id: arn,
				arn,
				label: labelPrefix + node.logicalId,
				sublabel:
					`${node.service}${node.cfnType ? " " + node.cfnType : ""}`.trim(),
				color,
				shape: isGroup ? "group" : serviceShapes[node.service] || "rect",
				classification: node.classification,
				synced: isSynced,
				collapsed: collapsedSet.has(arn),
				childCount,
				isPlaceholder,
				isGroup,
				groupChildArns: isGroup
					? Array.from(groupedChildArns.get(arn) || [])
					: undefined,
				discoveryState: node.discoveryState,
				x: pos.x,
				y: pos.y,
			});
		}

		// Build FG edges
		const resultEdges: FGEdge[] = graph.edges
			.filter((e) => {
				const src = childToGroupArn.get(e.source) || e.source;
				const tgt = childToGroupArn.get(e.target) || e.target;
				return finalNodes.has(src) && finalNodes.has(tgt);
			})
			.map((edge) => {
				const src = childToGroupArn.get(edge.source) || edge.source;
				const tgt = childToGroupArn.get(edge.target) || edge.target;
				const style = edgeStyles[edge.relationshipType] || {
					dashArray: "0",
					color: "#9e9e9e",
				};
				return {
					id: edge.id,
					source: src,
					target: tgt,
					relationshipType: edge.relationshipType,
					label: edge.labels?.[0] ?? edge.relationshipType,
					dashArray: style.dashArray,
					color: style.color,
					animated: edge.relationshipType === "invokes",
				};
			});

		return { nodes: resultNodes, edges: resultEdges };
	}, [graph.nodes, graph.edges, syncedNodeArns, collapsedNodeArns]);
}
