import type { CdkGenerator } from './types'

// ─── Eager imports (synchronous) ──────────────────────────────────────────────
// Import all generators at module load time so buildRegistry() stays synchronous.
// This is necessary because the CLI calls generateCdkProject synchronously.

import ApiGatewayHttpApiGen from './apigateway/http-api'
import ApiGatewayRestApiGen from './apigateway/rest-api'
import CloudFormationStackGen from './cloudformation/stack'
import CloudFrontDistributionGen from './cloudfront/distribution'
import ConnectAgentStateGen from './connect/agent-state'
import ConnectContactFlowModuleGen from './connect/contact-flow-module'
import ConnectContactFlowGen from './connect/contact-flow'
import ConnectEvaluationFormGen from './connect/evaluation-form'
import ConnectHierarchyGroupGen from './connect/hierarchy-group'
import ConnectHoursOfOperationGen from './connect/hours-of-operation'
import ConnectInstanceGen from './connect/instance'
import ConnectPhoneNumberGen from './connect/phone-number'
import ConnectPredefinedAttributeGen from './connect/predefined-attribute'
import ConnectPromptGen from './connect/prompt'
import ConnectQueueGen from './connect/queue'
import ConnectQuickConnectGen from './connect/quick-connect'
import ConnectRoutingProfileGen from './connect/routing-profile'
import ConnectRuleGen from './connect/rule'
import ConnectSecurityProfileGen from './connect/security-profile'
import ConnectTaskTemplateGen from './connect/task-template'
import ConnectUserGen from './connect/user'
import ConnectViewGen from './connect/view'
import DynamoDbTableGen from './dynamodb/table'
import EventsRuleGen from './events/rule'
import IamPolicyGen from './iam/policy'
import IamRoleGen from './iam/role'
import KinesisStreamGen from './kinesis/stream'
import KmsKeyGen from './kms/key'
import LambdaFunctionGen from './lambda/function'
import LambdaLayerGen from './lambda/layer'
import S3BucketGen from './s3/bucket'
import SecretsmanagerSecretGen from './secretsmanager/secret'
import SnsTopicGen from './sns/topic'
import SqsQueueGen from './sqs/queue'
import SsmParameterGen from './ssm/parameter'
import StatesStateMachineGen from './states/state-machine'
import WisdomMessageTemplateGen from './wisdom/message-template'
import WisdomQuickResponseGen from './wisdom/quick-response'

const ALL_GENERATORS: CdkGenerator[] = [
    ApiGatewayHttpApiGen,
    ApiGatewayRestApiGen,
    CloudFormationStackGen,
    CloudFrontDistributionGen,
    ConnectAgentStateGen,
    ConnectContactFlowModuleGen,
    ConnectContactFlowGen,
    ConnectEvaluationFormGen,
    ConnectHierarchyGroupGen,
    ConnectHoursOfOperationGen,
    ConnectInstanceGen,
    ConnectPhoneNumberGen,
    ConnectPredefinedAttributeGen,
    ConnectPromptGen,
    ConnectQueueGen,
    ConnectQuickConnectGen,
    ConnectRoutingProfileGen,
    ConnectRuleGen,
    ConnectSecurityProfileGen,
    ConnectTaskTemplateGen,
    ConnectUserGen,
    ConnectViewGen,
    DynamoDbTableGen,
    EventsRuleGen,
    IamPolicyGen,
    IamRoleGen,
    KinesisStreamGen,
    KmsKeyGen,
    LambdaFunctionGen,
    LambdaLayerGen,
    S3BucketGen,
    SecretsmanagerSecretGen,
    SnsTopicGen,
    SqsQueueGen,
    SsmParameterGen,
    StatesStateMachineGen,
    WisdomMessageTemplateGen,
    WisdomQuickResponseGen,
]

// ─── Registry ─────────────────────────────────────────────────────────────────

export class CdkGeneratorRegistry {
    private readonly map = new Map<string, CdkGenerator>()

    register(gen: CdkGenerator): void {
        this.map.set(`${gen.service}:${gen.resourceType}`, gen)
    }

    get(service: string, resourceType: string): CdkGenerator | undefined {
        return this.map.get(`${service}:${resourceType}`)
    }

    all(): CdkGenerator[] {
        return Array.from(this.map.values())
    }
}

/** Build the generator registry synchronously from eagerly-loaded modules. */
export function buildRegistry(): CdkGeneratorRegistry {
    const registry = new CdkGeneratorRegistry()
    for (const gen of ALL_GENERATORS) {
        if (gen.service && gen.resourceType) {
            registry.register(gen)
            // AWS Connect Wisdom was renamed to QConnect; ARNs from older instances still
            // use the 'wisdom:' service prefix. Alias so qconnect generators match wisdom nodes.
            if (gen.service === 'qconnect') {
                registry.register({ ...gen, service: 'wisdom' })
            }
        }
    }
    return registry
}
