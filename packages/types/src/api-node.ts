import type {
	NodeClassification,
	DiscoveryState,
} from "./node-classification.js";

/**
 * The canonical node shape that crosses the backend↔frontend API boundary.
 * This is what the backend serializes to JSON and what the frontend
 * deserializes into the app store.
 *
 * The backend's internal `DiscoveryNode` is richer (has `arns: Record<string, ParsedARN>`,
 * `Set<string>` for referencedArns) and is serialized into this flatter shape.
 */
export interface DiscoveredNode {
	/** Primary ARN (canonical form) */
	arn: string;
	/** Logical identifier (e.g. function name, table name) */
	logicalId: string;
	/** AWS service (e.g. "lambda", "dynamodb", "connect") */
	service: string;
	/** CloudFormation type string or null (e.g. "AWS::Lambda::Function") */
	cfnType: string | null;
	/** Resource properties extracted from the AWS API response */
	properties: Record<string, unknown>;
	/** ARNs this node references (dependencies) */
	referencedArns: string[];
	/** Classification of the node */
	classification: NodeClassification;
	/** Whether this is a reference-only node (not a primary resource) */
	referenceOnly: boolean;
	/** Arbitrary metadata (e.g. { isPlaceholder: true }, { isGroup: true }) */
	metadata: Record<string, unknown>;
	/** Discovery lifecycle state */
	discoveryState: DiscoveryState;
	/** Error message if discovery failed */
	discoveryError?: string;
}
