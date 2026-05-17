import type { DiscoveryNode } from './discovery-node.js';
import type { DiscoveredNode } from '@aws-sync-tool/types';

export function toDiscoveredNode(arn: string, node: DiscoveryNode): DiscoveredNode {
  return {
    arn,
    logicalId: node.logicalId,
    canonicalName: node.canonicalName,
    service: node.service,
    cfnType: node.cfnType,
    classification: node.classification,
    properties: node.properties,
    referencedArns: Array.from(node.referencedArns),
    referenceOnly: node.referenceOnly,
    metadata: node.metadata,
    discoveryState: node.discoveryState,
    discoveryError: node.discoveryError,
  };
}
