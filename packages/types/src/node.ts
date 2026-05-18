import type {
	NodeClassification,
	DiscoveryState,
} from "./node-classification.js";

/**
 * The single node type used across backend, API boundary, and frontend.
 *
 * `data` holds the raw resource data from AWS API responses.
 * ARNs embedded in `data` are replaced with `__REF_{logicalId}__` placeholders
 * during discovery, making the graph inherently portable across accounts.
 */
export interface Node {
	/** Logical identifier (e.g. function name, table name) */
	logicalId: string;
	/** Primary ARN (canonical form) */
	arn: string;
	/** AWS service (e.g. "lambda", "dynamodb", "connect") */
	service: string;
	/** CloudFormation type string or null (e.g. "AWS::Lambda::Function") */
	cfnType: string | null;
	/** Raw resource data. ARNs replaced with `__REF_{logicalId}__` placeholders. */
	data: Record<string, unknown>;
	/** ARNs this node references (for frontend collapse/child logic). */
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
