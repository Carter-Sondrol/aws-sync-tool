/**
 * Resolver registry for electron-vite.
 *
 * Two registration mechanisms coexist:
 *  - registerResolver(key, factory) — side-effect called by old-style object-literal resolvers
 *  - export default class — new class-based resolvers, auto-discovered via import.meta.glob
 *
 * registerResolver lives in resolver.ts (not here) to avoid a circular import:
 * this file eagerly imports all resolver files via glob, and those files call
 * registerResolver. Keeping registerResolver in resolver.ts (no deps on this
 * file) ensures it's initialized before any resolver module runs.
 */

import type { ParsedARN } from './arn'
import type { CredentialsProvider } from './CredentialsProvider'
import { _resolverFactories } from './resolver'
import type { ResourceResolver } from './resolvers/baseResolver'

// Static resolver imports — ensures all resolvers are bundled and their side-effects run.
// This replaces import.meta.glob / fs scanning which don't survive bundling.
import ApigatewayApisResolver from './resolvers/apigateway/apis'
import ApigatewayRestapisResolver from './resolvers/apigateway/restapis'
import CloudformationStackResolver from './resolvers/cloudformation/stack'
import CloudfrontDistributionResolver from './resolvers/cloudfront/distribution'
import ConnectAgentHierarchyResolver from './resolvers/connect/agent-hierarchy'
import ConnectAgentStateResolver from './resolvers/connect/agent-state'
import ConnectContactFlowModuleResolver from './resolvers/connect/contact-flow-module'
import ConnectContactFlowResolver from './resolvers/connect/contact-flow'
import ConnectEvaluationFormResolver from './resolvers/connect/evaluation-form'
import ConnectHoursOfOperationResolver from './resolvers/connect/hours-of-operation'
import ConnectInstanceResolver from './resolvers/connect/instance'
import ConnectPhoneNumberResolver from './resolvers/connect/phone-number'
import ConnectPredefinedAttributeResolver from './resolvers/connect/predefined-attribute'
import ConnectPromptResolver from './resolvers/connect/prompt'
import ConnectQueueResolver from './resolvers/connect/queue'
import ConnectQuickConnectResolver from './resolvers/connect/quick-connect'
import ConnectRoutingProfileResolver from './resolvers/connect/routing-profile'
import ConnectRuleResolver from './resolvers/connect/rule'
import ConnectSecurityProfileResolver from './resolvers/connect/security-profile'
import ConnectTaskTemplateResolver from './resolvers/connect/task-template'
import ConnectUserResolver from './resolvers/connect/user'
import ConnectViewResolver from './resolvers/connect/view'
import DynamoDbTableResolver from './resolvers/dynamodb/table'
import EventsRuleResolver from './resolvers/events/rule'
import IamPolicyResolver from './resolvers/iam/policy'
import IamRoleResolver from './resolvers/iam/role'
import KinesisStreamResolver from './resolvers/kinesis/stream'
import KmsKeyResolver from './resolvers/kms/key'
import LambdaFunctionResolver from './resolvers/lambda/function'
import QconnectKnowledgeBaseResolver from './resolvers/qconnect/knowledge-base'
import QconnectMessageTemplateResolver from './resolvers/qconnect/message-template'
import QconnectQuickResponseResolver from './resolvers/qconnect/quick-response'
import S3BucketResolver from './resolvers/s3/bucket'
import SecretsmanagerSecretResolver from './resolvers/secretsmanager/secret'
import SnsTopicResolver from './resolvers/sns/topic'
import SqsQueueResolver from './resolvers/sqs/queue'
import SsmParameterResolver from './resolvers/ssm/parameter'
import StatesStateMachineResolver from './resolvers/states/stateMachine'

const CLASS_BASED_RESOLVERS = [
    ApigatewayApisResolver,
    ApigatewayRestapisResolver,
    CloudformationStackResolver,
    CloudfrontDistributionResolver,
    ConnectAgentHierarchyResolver,
    ConnectAgentStateResolver,
    ConnectContactFlowModuleResolver,
    ConnectContactFlowResolver,
    ConnectEvaluationFormResolver,
    ConnectHoursOfOperationResolver,
    ConnectInstanceResolver,
    ConnectPhoneNumberResolver,
    ConnectPredefinedAttributeResolver,
    ConnectPromptResolver,
    ConnectQueueResolver,
    ConnectQuickConnectResolver,
    ConnectRoutingProfileResolver,
    ConnectRuleResolver,
    ConnectSecurityProfileResolver,
    ConnectTaskTemplateResolver,
    ConnectUserResolver,
    ConnectViewResolver,
    DynamoDbTableResolver,
    EventsRuleResolver,
    IamPolicyResolver,
    IamRoleResolver,
    KinesisStreamResolver,
    KmsKeyResolver,
    LambdaFunctionResolver,
    QconnectKnowledgeBaseResolver,
    QconnectMessageTemplateResolver,
    QconnectQuickResponseResolver,
    S3BucketResolver,
    SecretsmanagerSecretResolver,
    SnsTopicResolver,
    SqsQueueResolver,
    SsmParameterResolver,
    StatesStateMachineResolver,
] as const

// ─── ResolverRegistry ─────────────────────────────────────────────────────────

export class ResolverRegistry {
    private readonly byCfnType = new Map<string, ResourceResolver>()
    private readonly byServiceType = new Map<string, ResourceResolver>()

    private constructor() {}

    static async create(getCredentials: CredentialsProvider): Promise<ResolverRegistry> {
        const registry = new ResolverRegistry()

        // Instantiate class-based resolvers from the static import list
        for (const Ctor of CLASS_BASED_RESOLVERS) {
            if (!Ctor || typeof Ctor !== 'function') continue
            try {
                const instance = new Ctor(getCredentials)
                if (!instance.service || !instance.resourceType || !instance.cfnType) continue
                registry.byCfnType.set(instance.cfnType.toLowerCase(), instance)
                registry.byServiceType.set(`${instance.service}:${instance.resourceType}`, instance)
                // AWS Connect Wisdom was renamed to QConnect; ARNs from older instances still
                // use the 'wisdom' service prefix. Alias so qconnect resolvers handle them.
                if (instance.service === 'qconnect') {
                    registry.byServiceType.set(`wisdom:${instance.resourceType}`, instance)
                }
            } catch (err) {
                console.error('[registry] Failed to instantiate class-based resolver:', err)
            }
        }

        // Instantiate factory-registered resolvers (side effects run during the glob import above)
        for (const [key, factory] of _resolverFactories) {
            try {
                const instance = factory(getCredentials)
                registry.byCfnType.set(instance.cfnType.toLowerCase(), instance)
                registry.byServiceType.set(key, instance)
            } catch (err) {
                console.error(`[registry] Failed to instantiate factory resolver for ${key}:`, err)
            }
        }

        return registry
    }

    byCfn(cfnType: string): ResourceResolver | undefined {
        return this.byCfnType.get(cfnType.toLowerCase())
    }

    byService(service: string, resourceType: string): ResourceResolver | undefined {
        return this.byServiceType.get(`${service}:${resourceType}`)
    }

    forArn(arn: { service: string; resourceType: string }): ResourceResolver | undefined {
        return this.byService(arn.service, arn.resourceType)
    }

    /** Resolve a resource by its plain name (e.g., table name, bucket name). */
    async resolveByName(
        service: string,
        resourceType: string,
        name: string
    ): Promise<ParsedARN | null> {
        const resolver = this.byService(service, resourceType)
        if (!resolver?.resolveByName) return null
        return resolver.resolveByName(name)
    }

    all(): ResourceResolver[] {
        return Array.from(this.byCfnType.values())
    }

    get size(): number {
        return this.byCfnType.size
    }
}

// ─── Singleton ────────────────────────────────────────────────────────────────

let _registry: ResolverRegistry | null = null

export async function initRegistry(getCredentials: CredentialsProvider): Promise<ResolverRegistry> {
    _registry = await ResolverRegistry.create(getCredentials)
    return _registry
}

export function getRegistry(): ResolverRegistry {
    if (!_registry) throw new Error('Registry not initialised — call initRegistry() first')
    return _registry
}
