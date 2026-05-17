import type { ParsedARN } from '../../arn.js';
import { buildARN } from '../../arn.js';

/**
 * Extract the Connect instance ID from a parsed ARN.
 * Connect ARN shape: instance/<instanceId>/resourceType/resourceId
 */
export function extractConnectInstanceId(arn: ParsedARN): string | undefined {
  const parts = arn.resourceParts;
  for (let i = 0; i < parts.length; i++) {
    if (parts[i] === 'instance' && i + 1 < parts.length) {
      return parts[i + 1];
    }
  }
  return undefined;
}

/**
 * Extract the resource ID from a Connect ARN.
 * For standard resources (queue, user, etc): instance/<id>/type/<resourceId>
 * Returns the last segment of the resource path.
 */
export function extractConnectResourceId(arn: ParsedARN): string | undefined {
  const parts = arn.resourceParts;
  for (let i = 0; i < parts.length; i++) {
    if (parts[i] === 'instance' && i + 3 < parts.length) {
      return parts[i + 3];
    }
  }
  return arn.resourceId;
}

/**
 * Build the Connect instance ARN for a given instance ID.
 * Adds it to the reference set so the graph shows the parent-child link.
 */
export function addConnectInstanceRef(arn: ParsedARN, refs: Set<string>): void {
  const instanceId = extractConnectInstanceId(arn);
  if (instanceId) {
    const instanceArn = buildARN('connect', `instance/${instanceId}`, arn.region, arn.accountId, arn.partition);
    refs.add(instanceArn);
  }
}
