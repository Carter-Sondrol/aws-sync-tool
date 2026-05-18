/** Known relationship types between resource nodes. */
export type RelationshipType =
  | 'invokes'          // Lambda invokes another Lambda
  | 'iam-role'         // Resource assumes an IAM role
  | 'iam-permission'   // Resource uses an IAM policy
  | 'storage'          // Resource reads/writes to S3 or DynamoDB
  | 'log-group'        // Resource writes to a CloudWatch log group
  | 'connect-ref'      // AWS Connect internal reference
  | 'env-var-ref'      // Environment variable reference
  | 'event-source'     // Event source mapping
  | 'referenced_arn'   // Generic ARN reference
  | 'binding'          // API Gateway or other binding
  | 'inferred';        // Inferred relationship (not explicit in config)
