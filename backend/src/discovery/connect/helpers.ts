import type { ParsedARN } from "../../../../packages/types/src/arn.js";

/**
 * Extract the Connect instance ID from a parsed ARN.
 * Connect ARN shape: instance/<instanceId>/resourceType/resourceId
 */
export function extractConnectInstanceId(arn: ParsedARN): string | undefined {
	const parts = arn.resourceParts;
	for (let i = 0; i < parts.length; i++) {
		if (parts[i] === "instance" && i + 1 < parts.length) {
			return parts[i + 1];
		}
	}
	return undefined;
}
