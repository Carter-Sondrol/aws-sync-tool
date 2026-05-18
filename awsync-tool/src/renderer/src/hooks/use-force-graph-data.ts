import { useMemo } from 'react';
import { useAppStore, type GraphNode, type GraphEdge } from '../stores/app-store';

export interface FGNode {
  id: string;
  label: string;
  sublabel: string;
  color: string;
  shape: 'circle' | 'diamond' | 'hexagon' | 'cylinder' | 'group' | 'rect';
  synced: boolean;
  isPlaceholder: boolean;
  classification: 'aws-managed' | 'user-managed' | 'unknown';
  isGroup: boolean;
  childCount: number;
}

export interface FGEdge {
  source: string;
  target: string;
  label?: string;
  relationshipType: string;
  dashArray?: string;
  color: string;
  animated: boolean;
}

function nodeToFGNode(node: GraphNode): FGNode {
  const serviceColorMap: Record<string, string> = {
    lambda: '#f97316',
    dynamodb: '#22c55e',
    connect: '#3b82f6',
    iam: '#a855f7',
    s3: '#eab308',
    apigateway: '#06b6d4',
    cloudwatch: '#78716c',
    ssm: '#64748b',
    secretsmanager: '#ec4899',
  };

  const color = serviceColorMap[node.service] || '#60a5fa';
  const shape: FGNode['shape'] = node.service === 'lambda' ? 'circle' : 'rect';

  return {
    id: node.arn,
    label: node.label,
    sublabel: node.logicalId,
    color,
    shape,
    synced: node.status === 'synced',
    isPlaceholder: !node.data || Object.keys(node.data).length === 0,
    classification: node.classification === 'aws-managed' ? 'aws-managed' : 'user-managed',
    isGroup: false,
    childCount: 0,
  };
}

function edgeToFGEdge(edge: GraphEdge): FGEdge {
  return {
    source: edge.source,
    target: edge.target,
    label: edge.type,
    relationshipType: edge.type,
    color: '#94a3b8',
    animated: false,
    dashArray: '0',
  };
}

export function useForceGraphData() {
  const { graph } = useAppStore();

  const nodes = useMemo<FGNode[]>(() => {
    return Array.from(graph.nodes.values()).map(nodeToFGNode);
  }, [graph.nodes]);

  const edges = useMemo<FGEdge[]>(() => {
    return graph.edges.map(edgeToFGEdge);
  }, [graph.edges]);

  return { nodes, edges };
}
