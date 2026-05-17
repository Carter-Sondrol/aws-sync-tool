import type { ParsedARN } from '../arn.js';
import type { NodeClassification } from '../discovery/discovery-node.js';

/**
 * Output from a resolver's fetch() method.
 * The engine uses this to construct the DiscoveryNode.
 */
export interface ResolverOutput {
  data: Record<string, unknown>;
  logicalId: string;
  classification: NodeClassification;
  referenceOnly?: boolean;
  metadata?: Record<string, unknown>;
}

/**
 * Minimal resolver contract.
 * - fetch(): call the AWS API, return structured data
 *   Any referenced ARNs (dependencies, child resources, related resources)
 *   are included in the returned data — the engine extracts them automatically.
 */
export interface ResourceResolver {
  service: string;
  resourceType: string;
  cfnType: string;

  /**
   * Fetch resource data from AWS.
   * Include any referenced ARNs in the returned data (env vars, config, child resources).
   * The engine scans the output for ARNs and enqueues them — no special wiring needed.
   * E.g. Connect instance resolver lists its queues/flows and includes their ARNs in data.
   */
  fetch(arn: ParsedARN): Promise<ResolverOutput>;
}
