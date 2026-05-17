import type { DiscoveryNode } from '../discovery/discovery-node.js';
import type { GraphEdge } from '@aws-sync-tool/types';

export class GraphStore {
  private nodes = new Map<string, DiscoveryNode>();
  private edges = new Map<string, GraphEdge>();

  addNode(node: DiscoveryNode): void {
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
    this.edges.set(edge.id, edge);
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
