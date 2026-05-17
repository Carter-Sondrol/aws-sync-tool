import type { RelationshipType } from "./relationship-type.js";

/**
 * Edge between two nodes in the resource graph.
 * Crosses the backend↔frontend API boundary.
 */
export interface GraphEdge {
	/** Unique edge identifier (e.g. "arn1>>arn2") */
	id: string;
	/** Source node ARN */
	source: string;
	/** Target node ARN */
	target: string;
	/** Type of relationship (typed union for known types, string for custom) */
	relationshipType: RelationshipType | string;
	/** Path keys from the source data that reference this target (e.g. ["Role"], ["S3_BUCKET"]) */
	labels: string[];
}
