import { decodeRefToken, parseARN } from '../../discovery/arn'
import type { GraphNode } from '../../graph-types'
import type { GenContext } from './types'
import { getLogger } from '../../logging'

const log = getLogger('export/shared')

// AWS Connect APIs return ARNs with plural path segments (e.g. "contact-flows/")
// but CloudFormation schemas expect singular (e.g. "contact-flow/").
// Normalize raw ARNs so they pass CFN validation.
const CONNECT_ARN_PATH_CORRECTIONS: [RegExp, string][] = [
    [/\/contact-flows\//, '/contact-flow/'],
    [/\/hours-of-operation\//, '/operating-hours/'] // API uses "hours-of-operation", CFN uses "operating-hours"
]

export function normalizeConnectArn(arn: string): string {
    if (!arn.includes(':connect:')) return arn
    let result = arn
    for (const [pattern, replacement] of CONNECT_ARN_PATH_CORRECTIONS) {
        result = result.replace(pattern, replacement)
    }
    return result
}

/**
 * Map a Connect resource type (as returned by parseARN or raw API path segment)
 * to the CFN ARN path segment used in Fn::Join expressions.
 * Handles both already-parsed types (e.g. 'contact-flow') and raw API segments (e.g. 'contact-flows').
 */
export function connectArnCfnPath(resourceType: string): string {
    const map: Record<string, string> = {
        // Normalized types from parseARN
        'contact-flow': 'contact-flow',
        'contact-flow-module': 'flow-module',
        'quick-connect': 'transfer-destination',
        'agent-hierarchy': 'agent-group',
        user: 'agent',
        queue: 'queue',
        'operating-hours': 'operating-hours',
        'routing-profile': 'routing-profile',
        'security-profile': 'security-profile',
        'agent-state': 'agent-status',
        'evaluation-form': 'evaluation-form',
        rule: 'rule',
        'task-template': 'task-template',
        prompt: 'prompt',
        view: 'view',
        // Raw API path segments (plural/variant forms)
        'contact-flows': 'contact-flow',
        'hours-of-operation': 'operating-hours',
        'transfer-destinations': 'transfer-destination',
        'agent-groups': 'agent-group',
        'flow-modules': 'flow-module'
    }
    return map[resourceType] ?? resourceType
}

// ─── Runtime mapping ──────────────────────────────────────────────────────────

export const RUNTIME_MAP: Record<string, string> = {
    'nodejs22.x': 'lambda.Runtime.NODEJS_22_X',
    'nodejs20.x': 'lambda.Runtime.NODEJS_20_X',
    'nodejs18.x': 'lambda.Runtime.NODEJS_18_X',
    'nodejs16.x': 'lambda.Runtime.NODEJS_16_X',
    'python3.13': 'lambda.Runtime.PYTHON_3_13',
    'python3.12': 'lambda.Runtime.PYTHON_3_12',
    'python3.11': 'lambda.Runtime.PYTHON_3_11',
    'python3.10': 'lambda.Runtime.PYTHON_3_10',
    'python3.9': 'lambda.Runtime.PYTHON_3_9',
    java21: 'lambda.Runtime.JAVA_21',
    java17: 'lambda.Runtime.JAVA_17',
    java11: 'lambda.Runtime.JAVA_11',
    dotnet8: 'lambda.Runtime.DOTNET_8',
    'go1.x': 'lambda.Runtime.GO_1_X'
}

// ─── DynamoDB attribute type mapping ──────────────────────────────────────────

export const DYNAMO_ATTR_TYPE: Record<string, string> = {
    S: 'dynamodb.AttributeType.STRING',
    N: 'dynamodb.AttributeType.NUMBER',
    B: 'dynamodb.AttributeType.BINARY'
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function toPascalCase(name: string): string {
    return name
        .replace(/[^a-zA-Z0-9 _-]/g, '')
        .split(/[\s_-]+/)
        .filter(Boolean)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join('')
}

// Sanitize a logicalId for use as a JS/TS identifier in generated CDK code.
export const cdkId = (s: string): string => {
    const p = toPascalCase(s)
    return /^[^a-zA-Z]/.test(p) ? `R${p}` : p || 'Resource'
}

export const SERVICE_ID_SUFFIX: Record<string, string> = {
    'lambda:function': 'Fn',
    'lambda:layerversion': 'Layer',
    'dynamodb:table': 'Table',
    's3:bucket': 'Bucket',
    'iam:role': 'Role',
    'iam:policy': 'Policy',
    'sqs:queue': 'Queue',
    'sns:topic': 'Topic',
    'secretsmanager:secret': 'Secret',
    'ssm:parameter': 'Param',
    'events:rule': 'Rule',
    'states:stateMachine': 'StateMachine',
    'kms:key': 'Key',
    'kinesis:stream': 'Stream',
    'cloudfront:distribution': 'Distribution'
}

// Maps service → CDK ARN property for simple cases
const ARN_PROP_BY_SERVICE: Record<string, string> = {
    lambda: 'functionArn',
    dynamodb: 'tableArn',
    s3: 'bucketArn',
    sqs: 'queueArn',
    sns: 'topicArn',
    secretsmanager: 'secretArn',
    ssm: 'parameterArn',
    states: 'stateMachineArn',
    kms: 'keyArn',
    kinesis: 'streamArn',
    wisdom: 'attrKnowledgeBaseArn',
    qconnect: 'attrKnowledgeBaseArn'
}

// Maps "service:resourceType" → CDK property for cases needing sub-type discrimination
const ARN_PROP_BY_SERVICE_TYPE: Record<string, string> = {
    'iam:policy': 'managedPolicyArn',
    'iam:role': 'roleArn',
    'apigateway:restapis': 'restApiId',
    'apigateway:apis': 'httpApiId'
}

export function arnRef(arn: string, ctx: GenContext): string {
    const n = ctx.nodeByArn.get(arn)
    if (!n?.included) return JSON.stringify(arn)
    const id = ctx.nodeId(n)
    if (!ctx.inScopeIds.has(n.logicalId)) return JSON.stringify(n.arn.raw)
    // More-specific service:resourceType key wins over service-only key
    const svcTypeKey = `${n.arn.service}:${n.arn.resourceType}`
    const prop = ARN_PROP_BY_SERVICE_TYPE[svcTypeKey] ?? ARN_PROP_BY_SERVICE[n.arn.service]
    if (prop) return `${id}.${prop}`
    // cloudfront has no clean L2 ARN property; fall back to raw ARN string
    if (n.arn.service === 'cloudfront') return JSON.stringify(n.arn.raw)
    // apigateway fallback for unrecognized sub-types
    if (n.arn.service === 'apigateway') return JSON.stringify(n.arn.raw)
    return `${id}.ref`
}

// Maps service:resourceType + property name → CDK construct attribute
export const CDK_PROP_MAP: Record<string, Record<string, string>> = {
    'dynamodb:table': {
        tableName: 'tableName',
        arn: 'tableArn',
        tableArn: 'tableArn',
        name: 'tableName'
    },
    'lambda:function': {
        functionName: 'functionName',
        arn: 'functionArn',
        functionArn: 'functionArn',
        name: 'functionName'
    },
    'lambda:layerversion': { arn: 'layerVersionArn', layerVersionArn: 'layerVersionArn' },
    's3:bucket': {
        bucketName: 'bucketName',
        arn: 'bucketArn',
        bucketArn: 'bucketArn',
        name: 'bucketName'
    },
    'iam:role': { roleName: 'roleName', arn: 'roleArn', roleArn: 'roleArn', name: 'roleName' },
    'iam:policy': { arn: 'managedPolicyArn', managedPolicyArn: 'managedPolicyArn' },
    'apigateway:restapis': { arn: 'restApiId', restApiId: 'restApiId' },
    'apigateway:apis': { arn: 'httpApiId', httpApiId: 'httpApiId' },
    'sqs:queue': {
        arn: 'queueArn',
        queueArn: 'queueArn',
        name: 'queueName',
        queueName: 'queueName'
    },
    'sns:topic': {
        arn: 'topicArn',
        topicArn: 'topicArn',
        name: 'topicName',
        topicName: 'topicName'
    },
    'secretsmanager:secret': {
        arn: 'secretArn',
        secretArn: 'secretArn',
        name: 'secretName',
        secretName: 'secretName'
    },
    'ssm:parameter': {
        arn: 'parameterArn',
        parameterArn: 'parameterArn',
        name: 'parameterName',
        parameterName: 'parameterName'
    },
    'states:stateMachine': {
        arn: 'stateMachineArn',
        stateMachineArn: 'stateMachineArn',
        name: 'stateMachineName',
        stateMachineName: 'stateMachineName'
    },
    'kms:key': { arn: 'keyArn', keyArn: 'keyArn' },
    'kinesis:stream': {
        arn: 'streamArn',
        streamArn: 'streamArn',
        name: 'streamName',
        streamName: 'streamName'
    },
    'connect:operating-hours': { arn: 'attrHoursOfOperationArn' },
    'connect:queue': { arn: 'attrQueueArn', queueArn: 'attrQueueArn' },
    'connect:routing-profile': { arn: 'attrRoutingProfileArn' },
    'connect:contact-flow': { arn: 'attrContactFlowArn' },
    'connect:user': { arn: 'attrUserArn' },
    'connect:security-profile': { arn: 'attrSecurityProfileArn' },
    'connect:hierarchy-group': { arn: 'attrHierarchyGroupArn' },
    'connect:quick-connect': { arn: 'attrQuickConnectArn' },
    'connect:rule': { arn: 'attrRuleArn' }
}

export function resolveParamRef(rawArn: string, ctx: GenContext): string | null {
    if (!rawArn.startsWith('$.')) return null
    const parts = rawArn.slice(2).split('.')
    if (parts.length < 2) return null
    const [logicalId, ...propParts] = parts
    const prop = propParts.join('.')

    const node = ctx.logicalIdToNode.get(logicalId)
    if (!node) return JSON.stringify(`UNRESOLVED:${rawArn}`)

    const nodeId = ctx.nodeId(node)
    const serviceKey = `${node.arn.service}:${node.arn.resourceType}`
    const cdkProp = CDK_PROP_MAP[serviceKey]?.[prop]

    if (!node.included) {
        const val = ctx.mapping[ctx.targetAccountId]?.[logicalId]?.[prop]
        return val !== undefined ? JSON.stringify(String(val)) : JSON.stringify(`REPLACE:${rawArn}`)
    }

    if (cdkProp) return `${nodeId}.${cdkProp}`

    const val = ctx.mapping[ctx.targetAccountId]?.[logicalId]?.[prop]
    return val !== undefined ? JSON.stringify(String(val)) : JSON.stringify(`REPLACE:${rawArn}`)
}

// ─── L2 construct reference helpers ──────────────────────────────────────
// These resolve an ARN to the correct CDK L2 import expression based on scope.
// Use these instead of duplicating nodeByArn → inScopeIds → code logic in generators.

export function lambdaFunctionRef(lambdaArn: string, ctx: GenContext, scopeId: string): string {
    const decoded = decodeRefToken(lambdaArn) ?? lambdaArn
    const n = ctx.nodeByArn.get(decoded)
    if (!n || n.hidden) {
        return `lambda.Function.fromFunctionArn(this, '${scopeId}Fn', ${JSON.stringify(decoded)})`
    }
    if (n.included && ctx.inScopeIds.has(n.logicalId)) return ctx.nodeId(n)
    if (n.included)
        return `lambda.Function.fromFunctionArn(this, '${scopeId}Fn', ${JSON.stringify(n.arn.raw)})`
    return `lambda.Function.fromFunctionArn(this, '${scopeId}Fn', arns.${ctx.nodeId(n)})`
}

/**
 * Resolve an IAM role ARN to the correct CDK expression.
 * - In-scope: direct construct reference (e.g., `MyRole`)
 * - Cross-stack included: `iam.Role.fromRoleArn(this, 'Scope', "arn:...")`
 * - Excluded/referenced: `iam.Role.fromRoleArn(this, 'Scope', arns.MyRole)`
 */
export function iamRoleRef(roleArn: string, ctx: GenContext, scopeId: string): string {
    const decoded = decodeRefToken(roleArn) ?? roleArn
    const n = ctx.nodeByArn.get(decoded)
    if (!n || n.hidden) {
        return `iam.Role.fromRoleArn(this, '${scopeId}Role', ${JSON.stringify(decoded)})`
    }
    if (n.included && ctx.inScopeIds.has(n.logicalId)) return ctx.nodeId(n)
    if (n.included)
        return `iam.Role.fromRoleArn(this, '${scopeId}Role', ${JSON.stringify(n.arn.raw)})`
    return `iam.Role.fromRoleArn(this, '${scopeId}Role', arns.${ctx.nodeId(n)})`
}

/**
 * Resolve a Lambda layer ARN to the correct CDK expression.
 */
export function lambdaLayerRef(layerArn: string, ctx: GenContext, scopeId: string): string {
    const decoded = decodeRefToken(layerArn) ?? layerArn
    const n = ctx.nodeByArn.get(decoded)
    if (!n || n.hidden) {
        return `lambda.LayerVersion.fromLayerVersionArn(this, '${scopeId}Layer', ${JSON.stringify(decoded)})`
    }
    if (n.included && ctx.inScopeIds.has(n.logicalId)) return ctx.nodeId(n)
    if (n.included)
        return `lambda.LayerVersion.fromLayerVersionArn(this, '${scopeId}Layer', ${JSON.stringify(n.arn.raw)})`
    return `lambda.LayerVersion.fromLayerVersionArn(this, '${scopeId}Layer', arns.${ctx.nodeId(n)})`
}

/**
 * Resolve an IAM managed policy ARN to the correct CDK expression.
 */
export function iamPolicyRef(policyArn: string, ctx: GenContext, scopeId: string): string {
    const decoded = decodeRefToken(policyArn) ?? policyArn
    const n = ctx.nodeByArn.get(decoded)
    if (!n || n.hidden) {
        return `iam.ManagedPolicy.fromManagedPolicyArn(this, '${scopeId}Policy', ${JSON.stringify(decoded)})`
    }
    if (n.included && ctx.inScopeIds.has(n.logicalId)) return ctx.nodeId(n)
    if (n.included)
        return `iam.ManagedPolicy.fromManagedPolicyArn(this, '${scopeId}Policy', ${JSON.stringify(n.arn.raw)})`
    return `iam.ManagedPolicy.fromManagedPolicyArn(this, '${scopeId}Policy', arns.${ctx.nodeId(n)})`
}

// ─── Raw ARN extraction for unresolved references ────────────────────────────
/**
 * Extract a raw ARN string from an unresolved reference or source node data.
 * Used as a fallback when the target node is not in the graph (e.g. deleted resources,
 * resources beyond discovery depth).
 */
function getRawArnFromRef(
    sourceNode: GraphNode,
    sourcePath: string[],
    ctx: GenContext
): string | null {
    // Check unresolved ref's originalArn first
    const ref = sourceNode.resolvedRefs?.find(
        (r) => r.sourcePath.join('.') === sourcePath.join('.')
    )
    if (
        ref?.originalArn &&
        typeof ref.originalArn === 'string' &&
        ref.originalArn.startsWith('arn:')
    ) {
        return ref.originalArn
    }
    if (ref?.originalArn && typeof ref.originalArn === 'object' && 'raw' in ref.originalArn) {
        return (ref.originalArn as any).raw
    }

    // Fall back to reading directly from source node's data
    const data = sourceNode.data
    if (!data) return null
    const field = sourcePath[sourcePath.length - 1]
    const val = data[field]
    if (typeof val === 'string' && val.startsWith('arn:')) return val
    return null
}

/**
 * Construct a CloudFormation Fn::Join expression for a Connect ARN so the instance
 * ARN is resolved from the CfnParameter at deploy time rather than being baked in.
 * Accepts a raw ARN string; uses ParsedARN to avoid splitting the string manually.
 */
function resolveConnectArnAtDeployTime(arn: string, ctx: GenContext): string | null {
    if (!arn.includes(':connect:') || !ctx.connectInstArnExpr) return null
    const parsed = parseARN(arn)
    if (!parsed || !parsed.resourceId) return null
    const typePath = connectArnCfnPath(parsed.resourceType)
    if (!typePath) return null
    return `cdk.Fn.join('/', [${ctx.connectInstArnExpr}, '${typePath}', ${JSON.stringify(parsed.resourceId)}])`
}

/**
 * Look up a node by AWS resource ID (not ARN) and resolve it to CDK code.
 * Use instead of constructing a synthetic ARN string for graph lookups.
 */
export function resolveByResourceId(
    service: string,
    resourceType: string,
    resourceId: string,
    ctx: GenContext,
    fallback?: string
): string {
    for (const [, n] of ctx.logicalIdToNode) {
        if (
            n.arn.service === service &&
            n.arn.resourceType === resourceType &&
            n.arn.resourceId === resourceId
        ) {
            return resolveTarget(n, 'arn', ctx)
        }
    }
    return fallback ?? JSON.stringify('UNRESOLVED')
}

// ─── Unified reference resolution ─────────────────────────────────────────────
// Maps a matchedParameter (e.g. 'arn', 'resourceId', 'Name') to the CDK construct
// attribute name for a given target node. Falls back to CDK_PROP_MAP then defaults.
function resolveAttr(target: GraphNode, matchedParameter: string): string {
    const serviceKey = `${target.arn.service}:${target.arn.resourceType}`
    // Check explicit map first
    const mapped = CDK_PROP_MAP[serviceKey]?.[matchedParameter]
    if (mapped) return mapped

    // Defaults by parameter type
    switch (matchedParameter) {
        case 'arn':
        case 'arn.raw':
            // Service-specific ARN attributes
            switch (target.arn.service) {
                case 'lambda':
                    return 'functionArn'
                case 'dynamodb':
                    return 'tableArn'
                case 'iam':
                    return target.arn.resourceType === 'policy' ? 'managedPolicyArn' : 'roleArn'
                case 's3':
                    return 'bucketArn'
                case 'sqs':
                    return 'queueArn'
                case 'sns':
                    return 'topicArn'
                case 'secretsmanager':
                    return 'secretArn'
                case 'ssm':
                    return 'parameterArn'
                case 'states':
                    return 'stateMachineArn'
                case 'kms':
                    return 'keyArn'
                case 'kinesis':
                    return 'streamArn'
                case 'wisdom':
                case 'qconnect':
                    return 'attrKnowledgeBaseArn'
                case 'apigateway':
                    if (target.arn.resourceType === 'restapis') return 'restApiId'
                    if (target.arn.resourceType === 'apis') return 'httpApiId'
                    return 'ref'
                default:
                    return 'ref'
            }
        case 'resourceId':
            return 'ref'
        case 'Name':
        case 'name':
            return 'attrName'
        default:
            return matchedParameter
    }
}

// Resolve a cross-stack reference when target is included but not in current stack.
// For Connect resources, constructs ARN via Fn::Join so instance param is resolved at deploy time.
function resolveCrossStack(target: GraphNode, _attr: string, ctx: GenContext): string {
    const envArn = target.envData?.get(ctx.targetAccountId)?.arn.raw ?? target.arn.raw
    if (target.arn.service === 'connect') {
        const parsed = parseARN(envArn)
        const resourceId = parsed?.resourceId ?? target.arn.resourceId
        const typePath = connectArnCfnPath(target.arn.resourceType)
        return `cdk.Fn.join('/', [${ctx.connectInstArnExpr}, '${typePath}', ${JSON.stringify(resourceId)}])`
    }
    return JSON.stringify(normalizeConnectArn(envArn))
}

/**
 * Unified reference resolver.
 * Looks up the resolved ref for a given source path on a node, then emits the
 * correct CDK code based on scope (in-stack → construct attr, cross-stack → literal/Fn::Join,
 * excluded → arns.ts reference).
 *
 * Fallback chain:
 * 1. resolvedRefs (discovery found ARN string)
 * 2. paramConfig edge (older graph data)
 * 3. ID-based lookup (AWS API returned only an ID, not an ARN)
 */
export function resolveRef(
    sourceNode: GraphNode,
    sourcePath: string[],
    ctx: GenContext,
    fallback?: string
): string {
    const pathKey = sourcePath.join('.')

    // Try 1: resolvedRefs (discovery found ARN string)
    const ref = sourceNode.resolvedRefs?.find((r) => r.sourcePath.join('.') === pathKey)
    if (ref?.targetLogicalId) {
        const target = ctx.logicalIdToNode.get(ref.targetLogicalId)
        if (target) return resolveTarget(target, ref.matchedParameter ?? 'arn', ctx)
    }

    // Try 2: paramConfig edge (older graph data without resolvedRefs)
    const pcEdge = sourceNode.paramConfig?.[pathKey]?.edge
    if (pcEdge) {
        const match = pcEdge.match(/^\$\.([^\.]+)\.(.*)$/)
        if (match) {
            const [, logicalId, prop] = match
            const target = ctx.logicalIdToNode.get(logicalId)
            if (target) return resolveTarget(target, prop, ctx)
        }
    }

    // Try 3: ID-based lookup — AWS APIs often return IDs not ARNs.
    const idResult = tryResolveById(sourceNode, sourcePath, ctx)
    if (idResult) return idResult

    // Try 4: Raw ARN from unresolved ref or source data — construct Fn::Join for Connect resources
    // so the instance ARN is resolved at deploy time rather than baking in the source instance ID.
    const rawArn = getRawArnFromRef(sourceNode, sourcePath, ctx)
    if (rawArn) {
        const arnCode = resolveConnectArnAtDeployTime(rawArn, ctx)
        if (arnCode) return arnCode
    }

    console.log(
        `resolveRef: ${sourceNode.logicalId}[${pathKey}] unresolved → ${fallback ?? "JSON.stringify('UNRESOLVED')"}`
    )
    return fallback ?? JSON.stringify('UNRESOLVED')
}

/**
 * Resolve a reference by looking up an ID field and matching it to a node's resource ID.
 */
function tryResolveById(
    sourceNode: GraphNode,
    sourcePath: string[],
    ctx: GenContext
): string | null {
    const data = sourceNode.data
    if (!data) return null

    // Derive ID field name from ARN field name
    // e.g. 'HoursOfOperationArn' → 'HoursOfOperationId'
    const arnField = sourcePath[sourcePath.length - 1]
    const idField = arnField.replace(/Arn$/, 'Id')
    if (idField === arnField) return null // no Arn suffix to replace

    const idValue = data[idField] as string | undefined
    if (!idValue) return null

    // Infer resource type from the ARN field name
    let resourceType: string | null = null
    if (arnField.includes('HoursOfOperation')) resourceType = 'operating-hours'
    else if (arnField.includes('RoutingProfile')) resourceType = 'routing-profile'
    else if (arnField.includes('ContactFlow')) resourceType = 'contact-flow'
    else if (arnField.includes('Queue') && sourceNode.arn.service === 'connect')
        resourceType = 'queue'
    else if (arnField.includes('SecurityProfile')) resourceType = 'security-profile'
    else if (arnField.includes('HierarchyGroup')) resourceType = 'hierarchy-group'
    else if (arnField.includes('UserArn')) resourceType = 'user'
    else return null

    // Scan nodes for matching service + type + ID
    for (const [, n] of ctx.nodeByArn) {
        if (
            n.arn.service === sourceNode.arn.service &&
            n.arn.resourceType === resourceType &&
            n.arn.resourceId === idValue
        ) {
            return resolveTarget(n, 'arn', ctx)
        }
    }
    return null
}

/**
 * Resolve a specific target node + parameter to CDK code.
 */
function resolveTarget(target: GraphNode, matchedParameter: string, ctx: GenContext): string {
    const attr = resolveAttr(target, matchedParameter)

    if (!target.included) {
        const envArn = target.envData?.get(ctx.targetAccountId)?.arn.raw
        if (!envArn) {
            return JSON.stringify(`REPLACE:${target.logicalId}`)
        }
        ctx.arnsUsed.add(envArn)
        return `arns.${ctx.nodeId(target)}`
    }

    if (ctx.inScopeIds.has(target.logicalId)) {
        // Same stack — direct construct reference
        return `${ctx.nodeId(target)}.${attr}`
    }

    // Cross-stack
    return resolveCrossStack(target, attr, ctx)
}

/**
 * Resolve a raw ARN string to CDK code. Legacy path for generators that still
 * pass ARNs directly rather than source paths.
 */
export function resolveArnRef(arn: string, ctx: GenContext, fallback?: string): string {
    const decoded = decodeRefToken(arn) ?? arn
    if (!decoded.startsWith('arn:')) return fallback ?? JSON.stringify(decoded)
    const n = ctx.nodeByArn.get(decoded)
    if (n) return resolveTarget(n, 'arn', ctx)

    // Node not in graph — for Connect resources, use ParsedARN to construct Fn::Join
    // so the instance param is resolved at deploy time rather than using source ARN.
    if (decoded.includes(':connect:') && ctx.connectInstArnExpr) {
        const parsed = parseARN(decoded)
        if (parsed?.resourceId) {
            const typePath = connectArnCfnPath(parsed.resourceType)
            return `cdk.Fn.join('/', [${ctx.connectInstArnExpr}, '${typePath}', ${JSON.stringify(parsed.resourceId)}])`
        }
    }

    return fallback ?? JSON.stringify(normalizeConnectArn(decoded))
}

// ─── Graph-driven reference resolution ──────────────────────────────────────

/**
 * Convert a source path segment to a camelCase CDK prop name.
 * e.g. 'HoursOfOperationArn' → 'hoursOfOperationArn'
 */
function pathToPropName(segment: string): string {
    return segment.charAt(0).toLowerCase() + segment.slice(1)
}

/** Check if a ref is a self-reference (points to the same node) */
function isSelfRef(ref: import('../../graph-types').ResolvedRef, node: GraphNode): boolean {
    return ref.targetLogicalId === node.logicalId
}

/** Check if a ref points to the Connect instance (handled by connectInstanceRef) */
function isInstanceRef(ref: import('../../graph-types').ResolvedRef): boolean {
    return ref.originalArn.resourceType === 'instance'
}

export interface NodeRefResult {
    /** camelCase CDK prop name derived from source path */
    prop: string
    /** Resolved CDK expression (construct ref, arns.X, Fn::Join, or placeholder) */
    code: string
    /** Whether the target node was found in the graph */
    resolved: boolean
    /** Full source path from the resolved ref */
    sourcePath: string[]
}

/**
 * Options for resolveNodeRefs.
 */
export interface ResolveNodeRefsOptions {
    /** Paths to skip (e.g., ['InstanceArn']). Checked against sourcePath.join('.'). */
    skipPaths?: Set<string>
    /** Placeholder to use when a ref can't be resolved. Default: 'UNRESOLVED' */
    fallbackPlaceholder?: string
}

/**
 * Iterate over a node's resolvedRefs and produce CDK prop expressions.
 *
 * This is the primary way generators should resolve references — driven by graph data
 * rather than hardcoded paths. The generator specifies what to skip (e.g., InstanceArn)
 * and gets back a map of prop names → resolved expressions for everything else.
 *
 * Auto-skips:
 * - Self-references (targetLogicalId === node.logicalId)
 * - Instance ARNs (handled by connectInstanceRef)
 *
 * For array refs like ['SecurityProfileArns', '0'], the prop key is
 * 'securityProfileArns.0'. Use groupArrayRefs() to collect into arrays.
 */
export function resolveNodeRefs(
    node: GraphNode,
    ctx: GenContext,
    options: ResolveNodeRefsOptions = {}
): Map<string, NodeRefResult> {
    const { skipPaths = new Set(), fallbackPlaceholder = 'UNRESOLVED' } = options
    const results = new Map<string, NodeRefResult>()

    for (const ref of node.resolvedRefs ?? []) {
        // Auto-skips
        if (isSelfRef(ref, node)) continue
        if (isInstanceRef(ref)) continue

        // Explicit skips
        const pathKey = ref.sourcePath.join('.')
        if (skipPaths.has(pathKey)) continue

        // Resolve using the existing chain
        const code = resolveRef(node, ref.sourcePath, ctx, `'${fallbackPlaceholder}'`)

        // Derive prop name from last segment of source path
        const lastSegment = ref.sourcePath[ref.sourcePath.length - 1]
        const prop = pathToPropName(lastSegment)

        results.set(prop, {
            prop,
            code,
            resolved: !!ref.targetLogicalId,
            sourcePath: ref.sourcePath
        })
    }

    return results
}

/**
 * Group array refs (e.g., 'securityProfileArns.0', 'securityProfileArns.1')
 * into a single sorted array. Returns a new Map with grouped entries.
 */
export function groupArrayRefs(refs: Map<string, NodeRefResult>): Map<string, NodeRefResult> {
    const grouped = new Map<string, NodeRefResult>()
    const arrayEntries = new Map<string, NodeRefResult[]>()

    for (const [prop, result] of refs) {
        const dotIdx = prop.indexOf('.')
        if (dotIdx > 0 && /^[a-z]+\.\d+$/.test(prop)) {
            // This is an array entry like 'securityProfileArns.0'
            const baseName = prop.slice(0, dotIdx)
            if (!arrayEntries.has(baseName)) arrayEntries.set(baseName, [])
            arrayEntries.get(baseName)!.push(result)
        } else {
            grouped.set(prop, result)
        }
    }

    // Sort each array by index and combine into a single entry
    for (const [baseName, entries] of arrayEntries) {
        entries.sort((a, b) => {
            const aIdx = parseInt(a.prop.split('.')[1], 10)
            const bIdx = parseInt(b.prop.split('.')[1], 10)
            return aIdx - bIdx
        })
        const codes = entries.map((e) => e.code).join(', ')
        grouped.set(baseName, {
            prop: baseName,
            code: codes,
            resolved: entries.every((e) => e.resolved),
            sourcePath: entries[0].sourcePath.slice(0, -1) // Remove index segment
        })
    }

    return grouped
}
