import type { DiscoveryNode } from "../discovery/discovery-node.js";
import type { GraphEdge } from "@aws-sync-tool/types";

/** Derive a stable edge key from source + target ARNs. */
function edgeKey(source: string, target: string): string {
	return `${source}>>${target}`;
}

export class GraphStore {
	private nodes = new Map<string, DiscoveryNode>();
	private edges = new Map<string, GraphEdge>();

	addNode(node: DiscoveryNode): void {
		const primaryArn = node.primaryArn.raw;
		if (primaryArn) {
			this.nodes.set(primaryArn, node);
		}
	}

	updateNode(node: DiscoveryNode): void {
		const primaryArn = node.primaryArn.raw;
		if (primaryArn) {
			this.nodes.set(primaryArn, node);
		}
	}

	getNode(arn: string): DiscoveryNode | undefined {
		return this.nodes.get(arn);
	}

	hasNode(arn: string): boolean {
		return this.nodes.has(arn);
	}

	addEdge(edge: GraphEdge): void {
		const key = edgeKey(edge.source, edge.target);
		const existing = this.edges.get(key);

		if (existing) {
			// Merge: keep the most specific relationshipType, combine labels
			const existingTypes = new Set(existing.labels);
			for (const label of edge.labels) {
				if (!existingTypes.has(label)) {
					existing.labels.push(label);
				}
			}
			// If the new edge has a typed relationship, prefer it
			if (edge.relationshipType !== "referenced_arn") {
				existing.relationshipType = edge.relationshipType;
			}
		} else {
			this.edges.set(key, { ...edge, id: key });
		}
	}

	getAllNodes(): Map<string, DiscoveryNode> {
		return new Map(this.nodes);
	}

	getAllEdges(): GraphEdge[] {
		return Array.from(this.edges.values());
	}

	getAllNodeArns(): string[] {
		return Array.from(this.nodes.keys());
	}

	clear(): void {
		this.nodes.clear();
		this.edges.clear();
	}

	get nodeCount(): number {
		return this.nodes.size;
	}

	get edgeCount(): number {
		return this.edges.size;
	}
}

// No singleton — instantiate in index.ts and inject into routes
