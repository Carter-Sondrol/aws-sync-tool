import type { ParsedARN } from '../arn.js';
import type { NodeClassification as NodeClassificationT, DiscoveryState } from '@aws-sync-tool/types';

// Re-export the DiscoveryState type for convenience
export type { DiscoveryState } from '@aws-sync-tool/types';

/**
 * Enum-style convenience constants for NodeClassification.
 * The actual type is imported from @aws-sync-tool/types.
 */
export const NodeClassification = {
  RESOURCE: 'resource' as NodeClassificationT,
  PARAMETER: 'parameter' as NodeClassificationT,
  EXTERNAL: 'external' as NodeClassificationT,
  AWS_MANAGED: 'aws-managed' as NodeClassificationT,
  ARTIFACT: 'artifact' as NodeClassificationT,
} as const;

// Type alias so existing code using `import type { NodeClassification }` still works
export type NodeClassification = NodeClassificationT;

export interface DiscoveryNode {
  logicalId: string;
  canonicalName: string;
  service: string;
  cfnType: string | null;
  properties: Record<string, unknown>;
  primaryArn: ParsedARN;
  referencedArns: Set<string>;
  classification: NodeClassificationT;
  referenceOnly: boolean;
  metadata: Record<string, unknown>;
  discoveryState: DiscoveryState;
  discoveryError?: string;
}


