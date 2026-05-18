import type { ParsedARN } from "../../../packages/types/src/arn.js";
import type { NodeClassification } from "@aws-sync-tool/types";

/** AWS SDK credentials shape. */
export interface Credentials {
	accessKeyId: string;
	secretAccessKey: string;
	sessionToken?: string;
}

/**
 * Minimal resolver contract.
 * - fetch(): call the AWS API, return raw resource data as a plain object.
 *   Include any referenced ARNs in the returned data (env vars, config, child resources).
 *   The engine scans the output for ARNs, replaces them with placeholders, and enqueues them.
 */
export interface ResourceResolver {
	service: string;
	resourceType: string;
	cfnType: string | null;

	/**
	 * Fetch resource data from AWS.
	 * Return the raw API response as a plain object.
	 * Any referenced ARNs in the data are extracted and replaced with `__REF_` placeholders.
	 *
	 * @returns raw resource data, or null if the resource is not found.
	 */
	fetch(
		arn: ParsedARN,
		credentials: () => Promise<Credentials>,
	): Promise<Record<string, unknown> | null>;

	/**
	 * Optional classifier. Called with the fetched data to determine
	 * the node's classification. Defaults to "resource" if not provided.
	 */
	classify?(data: Record<string, unknown>, arn: ParsedARN): NodeClassification;
}
