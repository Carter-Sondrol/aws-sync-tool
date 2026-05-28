import { parseARN } from '../discovery/arn'
import type { GraphNode } from '../graph-types'
import type { MappingTable } from '../graph-types'

/**
 * Context passed to syncers so they can resolve source resource IDs → target resource IDs
 * using the mapping table. This is the key mechanism for cross-instance Connect sync,
 * where contact flows, queues, routing profiles, etc. contain hardcoded internal IDs
 * that must be rewritten to match the target instance's resources.
 */
export interface RemappingContext {
    /**
     * Resolve a source resource ID (e.g., a queue UUID) to its target counterpart.
     * Searches across all mapped resources of the given service.
     * Returns undefined if no mapping exists (resource not matched yet).
     */
    resolveId(sourceResourceId: string, service: string): string | undefined

    /**
     * Resolve a source ARN to its target ARN via the mapping table.
     */
    resolveArn(sourceArn: string): string | undefined

    /**
     * Extract just the internal resource ID from an ARN (e.g., queue UUID).
     */
    extractResourceId(arn: string): string | undefined
}

/**
 * Build a remapping context from the mapping table and source graph.
 *
 * The mapping table maps logicalId → { arn } per environment. We cross-reference
 * with source nodes to build source ID → target ID lookups for each service.
 */
export function buildRemappingContext(
    mappingTable: MappingTable,
    targetEnvId: string,
    sourceNodes: ReadonlyMap<string, GraphNode>
): RemappingContext | null {
    const targetMapping = mappingTable[targetEnvId]
    if (!targetMapping) return null

    // Build logicalId → target ARN lookup from mapping table
    const logicalIdToTargetArn = new Map<string, string>()
    for (const [logicalId, mapping] of Object.entries(targetMapping)) {
        if (mapping.arn) {
            logicalIdToTargetArn.set(logicalId, mapping.arn)
        }
    }

    // Build source ARN → logicalId lookup
    const arnToLogicalId = new Map<string, string>()
    for (const [arn, node] of sourceNodes.entries()) {
        arnToLogicalId.set(arn, node.logicalId)
    }

    // Pre-compute source internal ID → target ID grouped by service
    // Maps service → (sourceResourceId → targetResourceId)
    const serviceIdMaps = new Map<string, Map<string, string>>()

    for (const [logicalId, targetArn] of logicalIdToTargetArn.entries()) {
        const targetParsed = parseARN(targetArn)
        if (!targetParsed) continue

        // Find source node with same logicalId and matching service
        let sourceNode: GraphNode | undefined
        for (const node of sourceNodes.values()) {
            if (node.logicalId === logicalId && node.arn.service === targetParsed.service) {
                sourceNode = node
                break
            }
        }
        if (!sourceNode) continue

        const sourceParsed = sourceNode.arn

        const service = targetParsed.service
        if (!serviceIdMaps.has(service)) {
            serviceIdMaps.set(service, new Map())
        }
        serviceIdMaps.get(service)!.set(sourceParsed.resourceId, targetParsed.resourceId)
    }

    return {
        resolveId: (sourceResourceId, service) => {
            const map = serviceIdMaps.get(service)
            if (!map) return undefined
            return map.get(sourceResourceId)
        },

        resolveArn: (sourceArn) => {
            const logicalId = arnToLogicalId.get(sourceArn)
            if (!logicalId) return undefined
            return logicalIdToTargetArn.get(logicalId)
        },

        extractResourceId: (arn) => {
            const parsed = parseARN(arn)
            return parsed?.resourceId
        }
    }
}

/**
 * Deep-remap all Connect resource IDs found in a JSON object (e.g., decoded contact flow content).
 * Walks the entire object tree and replaces known Connect ID fields with their target counterparts.
 */
export function remapConnectObject(obj: unknown, context: RemappingContext | null): unknown {
    if (!context) return obj
    if (obj === null || obj === undefined) return obj
    if (typeof obj !== 'object') return obj

    if (Array.isArray(obj)) {
        return obj.map((item) => remapConnectObject(item, context))
    }

    // Known field names in Connect JSON blobs that hold resource IDs
    const idFields = new Set([
        'QueueId',
        'PhoneNumberId',
        'QuickConnectId',
        'ContactFlowId',
        'HoursOfOperationId',
        'RoutingProfileId',
        'SecurityProfileId',
        'UserArn',
        'AgentStatusId',
        'ViewId',
        'PromptId',
        'TaskTemplateId',
        'EvaluationFormId'
    ])

    const result: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
        if (idFields.has(key) && typeof value === 'string') {
            const mapped = context.resolveId(value, 'connect')
            result[key] = mapped ?? value
        } else {
            result[key] = remapConnectObject(value, context)
        }
    }
    return result
}
