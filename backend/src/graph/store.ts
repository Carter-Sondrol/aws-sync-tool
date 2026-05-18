import type { Node, GraphEdge } from "@aws-sync-tool/types";

/** Derive a stable edge key from source + target ARNs. */
function edgeKey(source: string, target: string): string {
	return `${source}>>${target}`;
}

export class GraphStore {
	private nodes = new Map<string, Node>();
	private edges = new Map<string, GraphEdge>();

	addNode(node: Node): void {
		this.nodes.set(node.arn, node);
	}

	updateNode(node: Node): void {
		this.nodes.set(node.arn, node);
	}

	getNode(arn: string): Node | undefined {
		return this.nodes.get(arn);
	}

	hasNode(arn: string): boolean {
		return this.nodes.has(arn);
	}

	addEdge(edge: GraphEdge): void {
		const key = edgeKey(edge.source, edge.target);
		const existing = this.edges.get(key);

		if (existing) {
			const existingLabels = new Set(existing.labels);
			for (const label of edge.labels) {
				if (!existingLabels.has(label)) {
					existing.labels.push(label);
				}
			}
			if (edge.relationshipType !== "referenced_arn") {
				existing.relationshipType = edge.relationshipType;
			}
		} else {
			this.edges.set(key, { ...edge, id: key });
		}
	}

	getAllNodes(): Map<string, Node> {
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
