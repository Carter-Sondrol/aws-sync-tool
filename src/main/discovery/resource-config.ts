/**
 * Maps "service:resourceType" to the primary identifier field path used by the resource.
 * Graph.resolveTargetPath() uses this to find the field that identifies a target resource.
 */
export const RESOURCE_ID_PATHS: Record<string, string[]> = {
    // DynamoDB
    'dynamodb:table': ['TableName'],
    // SQS
    'sqs:queue': ['QueueName'],
    // SNS
    'sns:topic': ['TopicName'],
    // S3
    's3:bucket': ['BucketName'],
    // Lambda
    'lambda:function': ['FunctionName'],
    'lambda:layerversion': ['LayerName'],
    // IAM
    'iam:role': ['RoleName'],
    'iam:policy': ['PolicyName'],
    'iam:user': ['UserName'],
    'iam:group': ['GroupName'],
    // SSM
    'ssm:parameter': ['Name'],
    // EventBridge
    'events:rule': ['Name'],
    // KMS
    'kms:key': ['KeyId'],
    // Secrets Manager
    'secretsmanager:secret': ['Name'],
    // Connect
    'connect:contact-flow': ['FlowId'],
    'connect:contact-flow-module': ['FlowModuleId'],
    'connect:queue': ['QueueId'],
    'connect:routing-profile': ['RoutingProfileId'],
    'connect:security-profile': ['SecurityProfileId'],
    'connect:hours-of-operation': ['HoursOfOperationId'],
    'connect:user': ['UserId'],
    'connect:quick-connect': ['QuickConnectConfigId'],
    'connect:phone-number': ['PhoneNumberId'],
    'connect:instance': ['InstanceId'],
    'connect:view': ['ViewId'],
    'connect:prompt': ['PromptId'],
    'connect:agent-hierarchy': ['UserHierarchyGroupId'],
    'connect:agent-state': ['AgentStatusId'],
    'connect:evaluation-form': ['EvaluationFormId'],
    'connect:predefined-attribute': ['PredefinedAttributeId'],
    'connect:rule': ['RuleId'],
    'connect:task-template': ['TaskTemplateId'],
    // CloudFormation
    'cloudformation:stack': ['StackName'],
}
