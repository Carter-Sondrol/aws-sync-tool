/** Classification of a discovered resource node. */
export type NodeClassification =
  | 'resource'       // A concrete AWS resource (Lambda function, DynamoDB table, etc.)
  | 'parameter'      // A configuration parameter or environment variable reference
  | 'external'       // A resource outside the current sync scope / not yet resolved
  | 'aws-managed'    // An AWS-managed resource (service-linked role, AWS-managed policy)
  | 'artifact';      // A build artifact (Lambda layer, deployment package)

/** Discovery lifecycle state of a node. */
export type DiscoveryState =
  | 'placeholder'    // Node exists in graph but has not been resolved via API
  | 'resolving'      // Currently being resolved (in-flight API call)
  | 'resolved'       // Successfully resolved with full properties
  | 'failed';        // Resolution attempt failed
