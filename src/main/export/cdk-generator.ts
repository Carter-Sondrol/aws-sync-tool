import type { GraphNode, MappingTable } from '../graph-types'
import { DEPLOY_ORDER } from './generators/ordering'
import { buildRegistry } from './generators/registry'
import { cdkId, SERVICE_ID_SUFFIX, toPascalCase } from './generators/shared'
import { clusterStacks } from './generators/clustering'
import { getLogger } from '../logging'

const log = getLogger('cdk-generator')
import type {
    CdkGeneratorInput,
    CdkProjectOutput,
    GenContext,
    GeneratedFile,
    LambdaArtifact
} from './generators/types'

// Re-export shared types so existing callers continue to work.
export type { CdkGeneratorInput, CdkProjectOutput, GeneratedFile, LambdaArtifact }

export type SplitMode =
    | 'none' // all nodes in one stack
    | 'type' // TODO: split by resource type (not yet implemented, falls back to 'none')
    | 'prefix' // TODO: split by name prefix (not yet implemented, falls back to 'none')
    | 'flows' // split contact flows into separate stacks of flowsPerStack each
    | 'clusters' // connected-component clustering; auto-enables when main stack would exceed CFN limit

// ─── GenContext ───────────────────────────────────────────────────────────────

export function buildGenContext(
    group: { synced: GraphNode[]; referenced: GraphNode[] },
    nodeByArn: Map<string, GraphNode>,
    logicalIdToNode: Map<string, GraphNode>,
    targetAccountId: string,
    mapping: MappingTable
): GenContext {
    const all = [...group.synced, ...group.referenced]

    // Pass 1: count base id collisions (keyed by logicalId — the stable graph identity)
    const idCount = new Map<string, number>()
    for (const n of all) {
        const base = cdkId(n.logicalId)
        idCount.set(base, (idCount.get(base) ?? 0) + 1)
    }

    // Pass 2: when base id collides, append a service-type suffix
    const overrides = new Map<string, string>() // logicalId → override CDK id
    for (const n of all) {
        const base = cdkId(n.logicalId)
        if ((idCount.get(base) ?? 0) > 1) {
            const key = `${n.arn.service}:${n.arn.resourceType}`
            const suffix =
                SERVICE_ID_SUFFIX[key] ?? toPascalCase(n.arn.resourceType ?? n.arn.service)
            overrides.set(n.logicalId, base + suffix)
        }
    }

    // Pass 3: if suffixed ids still collide, append a counter (2, 3, ...)
    const overrideCounts = new Map<string, number>()
    for (const id of overrides.values()) {
        overrideCounts.set(id, (overrideCounts.get(id) ?? 0) + 1)
    }
    const overrideSeq = new Map<string, number>()
    for (const [logicalId, id] of overrides) {
        if ((overrideCounts.get(id) ?? 0) > 1) {
            const seq = (overrideSeq.get(id) ?? 0) + 1
            overrideSeq.set(id, seq)
            if (seq > 1) overrides.set(logicalId, id + String(seq))
        }
    }

    // Exclude nodes with no data (e.g. NoResolver placeholders) from scope so generators
    // that reference them fall back to literal ARNs rather than CDK attribute expressions.
    const inScopeSynced = group.synced.filter((n) => n.data != null)
    const inScopeIds = new Set(inScopeSynced.map((n) => n.logicalId))
    const inScopeArns = new Set(inScopeSynced.map((n) => n.arn.raw))
    const nodeId = (n: GraphNode): string => overrides.get(n.logicalId) ?? cdkId(n.logicalId)

    // ── Connect instance ARN reference strategy ───────────────────────────────
    const connectInstanceNode = all.find(
        (n) => n.arn.service === 'connect' && n.arn.resourceType === 'instance'
    )
    const hasSyncedConnectChildren = group.synced.some(
        (n) => n.arn.service === 'connect' && n.arn.resourceType !== 'instance'
    )

    let connectInstArnExpr: string
    let connectParamDecl: string | null = null

    const connectInstanceIsSynced =
        connectInstanceNode != null && group.synced.includes(connectInstanceNode)
    if (connectInstanceNode && !connectInstanceIsSynced && hasSyncedConnectChildren) {
        const id = nodeId(connectInstanceNode)
        const paramVar = `${id}ArnParam`
        const paramName = `${id}Arn`
        // Prefer the target-env ARN as the parameter default so cross-account
        // deploys land in the right instance even if no --parameters override is passed.
        const defaultArn =
            connectInstanceNode.envData?.get(targetAccountId)?.arn.raw ?? connectInstanceNode.arn.raw
        connectParamDecl = `    const ${paramVar} = new cdk.CfnParameter(this, ${JSON.stringify(paramName)}, {
      type: 'String',
      description: 'ARN of the Amazon Connect instance to deploy resources into',
      default: ${JSON.stringify(defaultArn)},
    });`
        connectInstArnExpr = `${paramVar}.valueAsString`
    } else if (connectInstanceIsSynced && inScopeIds.has(connectInstanceNode.logicalId)) {
        connectInstArnExpr = `${nodeId(connectInstanceNode)}Arn`
    } else if (connectInstanceIsSynced) {
        connectInstArnExpr = JSON.stringify(connectInstanceNode.arn.raw)
    } else if (connectInstanceNode) {
        connectInstArnExpr = `arns.${nodeId(connectInstanceNode)}`
    } else {
        connectInstArnExpr = `arns.ConnectInstance /* TODO: set Connect instance ARN */`
    }

    return {
        nodeByArn,
        inScopeIds,
        inScopeArns,
        nodeId,
        connectInstArnExpr,
        connectParamDecl,
        connectInstanceNode,
        logicalIdToNode,
        targetAccountId,
        mapping,
        arnsUsed: new Set<string>()
    }
}

// ─── generateCdkProject ───────────────────────────────────────────────────────

export function generateCdkProject(
    input: CdkGeneratorInput & { splitMode?: SplitMode; flowsPerStack?: number }
): CdkProjectOutput {
    const {
        nodes,
        edges,
        stackName,
        mapping = {},
        splitMode = 'none',
        flowsPerStack = 50,
        targetAccountId: inputTargetAccountId,
    } = input

    log.info(`generating CDK project: stackName="${stackName}", ${nodes.length} nodes, ${edges.length} edges, splitMode=${splitMode}`)

    const registry = buildRegistry()

    // Build ARN → node map (later entries overwrite earlier ones for same ARN)
    const nodeByArn = new Map<string, GraphNode>()
    // Build logicalId → node map with canonical resolution for duplicates
    const arnToCanonicalLogicalId = new Map<string, string>()
    const logicalIdToNode = new Map<string, GraphNode>()
    // Use targetAccountId as the arns.ts key when explicitly provided; this ensures
    // arns.ts is keyed by the real account and uses envData for the right env's ARNs.
    // When an explicit targetAccountId is given, ignore stale keys in `mapping` from
    // prior workflows (e.g. same-account env IDs) — they would shadow the real account.
    const targetAccountId = inputTargetAccountId || Object.keys(mapping)[0] || 'default'
    const accountIds = inputTargetAccountId
        ? [targetAccountId]
        : Object.keys(mapping).length > 0
            ? Object.keys(mapping)
            : [targetAccountId]

    let synced = nodes.filter((n) => n.included)
    let referenced = nodes.filter((n) => !n.included && !n.hidden)

    log.info(`node split: ${synced.length} synced, ${referenced.length} referenced, ${nodes.length} total`)
    // Log excluded Connect resources that are referenced by included Connect resources
    const refConnectTypes = new Map<string, number>()
    for (const n of referenced) {
        if (n.arn.service === 'connect') {
            const key = `${n.arn.service}:${n.arn.resourceType}`
            refConnectTypes.set(key, (refConnectTypes.get(key) ?? 0) + 1)
        }
    }
    for (const [type, count] of refConnectTypes) {
        log.debug(`referenced (not created): ${count} ${type}`)
    }

    // Deduplicate nodes that share the same ARN (can happen from repeated discovery).
    // Keep the first occurrence; track duplicates locally — do NOT mutate caller-owned nodes.
    const seenArn = new Set<string>()
    const localHiddenArns = new Set<string>()
    const dedupSynced: GraphNode[] = []
    for (const n of synced) {
        if (seenArn.has(n.arn.raw)) {
            localHiddenArns.add(n.arn.raw) // track locally instead of mutating n.hidden
            continue
        }
        seenArn.add(n.arn.raw)
        dedupSynced.push(n)
    }
    synced = dedupSynced

    // Record canonical logicalId per ARN (first non-hidden occurrence wins)
    for (const n of nodes) {
        if (
            !n.hidden &&
            !localHiddenArns.has(n.arn.raw) &&
            !arnToCanonicalLogicalId.has(n.arn.raw)
        ) {
            arnToCanonicalLogicalId.set(n.arn.raw, n.logicalId)
        }
    }

    // Connect instances cannot be created via CDK — they must exist beforehand.
    // Move any instance nodes from synced to referenced so their ARNs end up in ARN_MAP,
    // and other resources (TaskTemplate, HoursOfOperation, etc.) can reference them.
    // Track moved ARNs locally — do NOT mutate caller-owned n.included.
    const localReferencedArns = new Set<string>()
    const instanceNodes = synced.filter(
        (n) => n.arn.service === 'connect' && n.arn.resourceType === 'instance'
    )
    if (instanceNodes.length > 0) {
        for (const n of instanceNodes) {
            localReferencedArns.add(n.arn.raw)
        }
        synced = synced.filter(
            (n) => !(n.arn.service === 'connect' && n.arn.resourceType === 'instance')
        )
        referenced.push(...instanceNodes)
    }

    // Build lookup maps — index ALL env ARNs so lookups work regardless of which env's ARN appears in refs
    for (const n of [...synced, ...referenced]) {
        nodeByArn.set(n.arn.raw, n)
        if (n.envData) {
            for (const snapshot of n.envData.values()) {
                nodeByArn.set(snapshot.arn.raw, n)
            }
        }
        logicalIdToNode.set(n.logicalId, n)
    }
    // Also map duplicate logicalIds to their canonical node so resolveRef works
    for (const dup of nodes) {
        if (
            (dup.hidden || localHiddenArns.has(dup.arn.raw)) &&
            arnToCanonicalLogicalId.has(dup.arn.raw)
        ) {
            const canonId = arnToCanonicalLogicalId.get(dup.arn.raw)!
            const canonNode = logicalIdToNode.get(canonId)
            if (canonNode) {
                logicalIdToNode.set(dup.logicalId, canonNode)
            }
        }
    }

    // ── Group by stackId, defaulting to stackName ─────────────────────────────
    const stackGroups = new Map<string, { synced: GraphNode[]; referenced: GraphNode[] }>()
    const defaultKey = stackName
    for (const n of [...synced, ...referenced]) {
        const key = n.stackId?.trim() || defaultKey
        if (!stackGroups.has(key)) stackGroups.set(key, { synced: [], referenced: [] })
        const g = stackGroups.get(key)!
        if (n.included && !localReferencedArns.has(n.arn.raw)) g.synced.push(n)
        else g.referenced.push(n)
    }
    if (!stackGroups.has(defaultKey)) stackGroups.set(defaultKey, { synced: [], referenced: [] })

    // ── Auto-cluster or explicit cluster split when main stack exceeds CFN limit ─
    const CFN_SOFT_LIMIT = 480 // leave buffer for CDK::Metadata + overhead
    if (
        splitMode === 'clusters' ||
        (splitMode === 'none' && stackGroups.get(defaultKey)!.synced.length > CFN_SOFT_LIMIT)
    ) {
        const effectiveMode = splitMode === 'clusters' ? 'clusters' : 'auto-clusters'
        log.info(`cluster mode: main stack has ${stackGroups.get(defaultKey)!.synced.length} resources (exceeds ${CFN_SOFT_LIMIT}), switching to ${effectiveMode}`)

        const mainGroup = stackGroups.get(defaultKey)!
        const { groups: clusterGroups, info } = clusterStacks(mainGroup.synced, edges, {
            softLimit: CFN_SOFT_LIMIT,
            minClusterSize: 40,
            defaultKey: stackName
        })

        // Replace the old stack groups with clustered results
        // Preserve referenced nodes in the main/default stack
        for (const [key, clusterNodes] of clusterGroups) {
            if (key === defaultKey) {
                mainGroup.synced = clusterNodes
            } else {
                stackGroups.set(key, { synced: clusterNodes, referenced: [] })
            }
        }

        for (const item of info) {
            log.debug(`cluster: ${item.stack}: ${item.count} resources`)
        }
    }

    // ── Auto-split flows when main stack still has too many after clustering ─
    // Each contact flow embeds ~15-30KB of JSON in the CFN template.
    // If the main stack would exceed ~1MB, split flows into separate stacks.
    let effectiveSplitMode = splitMode
    const FLOW_SIZE_ESTIMATE_KB = 20
    const CFN_TEMPLATE_LIMIT_FLOWS = Math.floor(1000 / FLOW_SIZE_ESTIMATE_KB) // ~50 flows
    const mainGroupAfterCluster = stackGroups.get(defaultKey)
    if (mainGroupAfterCluster && effectiveSplitMode !== 'flows') {
        const flowCount = mainGroupAfterCluster.synced.filter(
            (n) =>
                n.arn.service === 'connect' &&
                (n.arn.resourceType === 'contact-flow' ||
                    n.arn.resourceType === 'contact-flow-module')
        ).length
        if (flowCount > CFN_TEMPLATE_LIMIT_FLOWS) {
            log.info(`auto flow split: ${flowCount} contact flows (~${flowCount * FLOW_SIZE_ESTIMATE_KB}KB estimated), enabling split mode`)
            effectiveSplitMode = 'flows'
        }
    }

    // ── splitMode === 'flows' — extract contact flows into chunked sub-stacks ─
    if (effectiveSplitMode === 'flows' && flowsPerStack > 0) {
        const mainGroup = stackGroups.get(defaultKey)
        if (mainGroup) {
            const isFlow = (n: GraphNode): boolean =>
                n.arn.service === 'connect' &&
                (n.arn.resourceType === 'contact-flow' ||
                    n.arn.resourceType === 'contact-flow-module')
            const flowNodes = mainGroup.synced.filter(isFlow)
            if (flowNodes.length > 0) {
                mainGroup.synced = mainGroup.synced.filter((n) => !isFlow(n))
                const referencedConnectInstance = mainGroup.referenced.find(
                    (n) => n.arn.service === 'connect' && n.arn.resourceType === 'instance'
                )
                for (let i = 0; i < flowNodes.length; i += flowsPerStack) {
                    const chunkIndex = Math.floor(i / flowsPerStack) + 1
                    const key = `${stackName}ContactFlows${chunkIndex}`
                    const chunk = flowNodes.slice(i, i + flowsPerStack)
                    const subGroup: { synced: GraphNode[]; referenced: GraphNode[] } = {
                        synced: chunk,
                        referenced: []
                    }
                    if (referencedConnectInstance) {
                        subGroup.referenced.push(referencedConnectInstance)
                    }
                    stackGroups.set(key, subGroup)
                }
            }
        }
    }

    // ── Per-stack file generation ─────────────────────────────────────────────
    const stackFiles: GeneratedFile[] = []
    const allFlowFiles: GeneratedFile[] = []
    const stackClassNames: string[] = []
    const stackFileBaseNames: string[] = []

    // Global maps so arns.ts/overrides.ts use the same collision-aware ids as the stack
    const globalRefNodeId = new Map<string, string>()
    const globalSyncedNodeId = new Map<string, string>()

    // Make sure the default stack is emitted first so bin/app.ts uses 'stack' for its file path
    const orderedStackEntries: Array<[string, { synced: GraphNode[]; referenced: GraphNode[] }]> =
        []
    if (stackGroups.has(defaultKey)) {
        orderedStackEntries.push([defaultKey, stackGroups.get(defaultKey)!])
    }
    for (const [key, group] of stackGroups) {
        if (key !== defaultKey) orderedStackEntries.push([key, group])
    }

    for (const [groupKey, group] of orderedStackEntries) {
        // Ensure each stack with Connect children has the instance node in referenced.
        // buildGenContext needs it to create the CfnParameter declaration.
        const hasConnectChildren = group.synced.some(
            (n) => n.arn.service === 'connect' && n.arn.resourceType !== 'instance'
        )
        if (hasConnectChildren) {
            const existingInstance = group.referenced.find(
                (n) => n.arn.service === 'connect' && n.arn.resourceType === 'instance'
            )
            if (!existingInstance) {
                // Find the first Connect instance from all nodes
                const instNode = referenced.find(
                    (n) => n.arn.service === 'connect' && n.arn.resourceType === 'instance'
                )
                if (instNode) {
                    group.referenced.push(instNode)
                }
            }
        }

        const className = toPascalCase(groupKey) + 'Stack'
        const isDefault = groupKey === stackName
        const fileBaseName = isDefault
            ? 'stack'
            : `${groupKey.toLowerCase().replace(/[^a-z0-9-]/g, '-')}-stack`
        const filePath = `lib/${fileBaseName}.ts`
        stackClassNames.push(className)
        stackFileBaseNames.push(fileBaseName)

        const ctx = buildGenContext(group, nodeByArn, logicalIdToNode, targetAccountId, mapping)
        for (const n of group.referenced) globalRefNodeId.set(n.logicalId, ctx.nodeId(n))
        for (const n of group.synced) globalSyncedNodeId.set(n.logicalId, ctx.nodeId(n))

        const refLines: string[] = []
        const syncLines: string[] = []
        const flowFiles: GeneratedFile[] = []
        const usedServices = new Set<string>()

        // ── Referenced nodes ──────────────────────────────────────────────────
        for (const node of group.referenced) {
            // Connect instance is handled by CfnParameter declaration — skip the
            // arns.ts-backed reference line emitted by the instance generator.
            if (
                node.arn.service === 'connect' &&
                node.arn.resourceType === 'instance' &&
                ctx.connectParamDecl
            ) {
                continue
            }
            const gen = registry.get(node.arn.service, node.arn.resourceType)
            if (gen?.genReferenced) {
                const line = gen.genReferenced(node, ctx)
                if (line) {
                    refLines.push(line)
                    usedServices.add(node.arn.service)
                } else {
                    // fallback: emit an ARN constant so the variable is accessible
                    refLines.push(
                        `    const ${ctx.nodeId(node)}Arn = arns.${ctx.nodeId(node)}; // ${node.arn.service}/${node.arn.resourceType}`
                    )
                    usedServices.add(node.arn.service)
                }
            } else {
                // no generator for this resource type — emit a fallback ARN constant
                refLines.push(
                    `    const ${ctx.nodeId(node)}Arn = arns.${ctx.nodeId(node)}; // ${node.arn.service}/${node.arn.resourceType}`
                )
            }
        }

        // ── Synced nodes — ordered by topological sort of graph edges ─
        // Build dependency subgraph from edges (source depends on target → emit target first)
        const syncedIds = new Set(group.synced.map((n) => n.logicalId))
        const depOf = new Map<string, Set<string>>() // logicalId → set of logicalIds it depends on
        for (const n of group.synced) {
            depOf.set(n.logicalId, new Set())
        }
        for (const edge of edges) {
            if (
                syncedIds.has(edge.sourceLogicalId) &&
                syncedIds.has(edge.targetLogicalId) &&
                edge.sourceLogicalId !== edge.targetLogicalId && // skip self-loops
                (edge.type === 'reference' || edge.type === 'dependency')
            ) {
                depOf.get(edge.sourceLogicalId)!.add(edge.targetLogicalId)
            }
        }

        // Kahn's algorithm — topological sort with DEPLOY_ORDER as tie-breaker
        const inDegree = new Map<string, number>()
        const dependents = new Map<string, Set<string>>() // target logicalId → sources that depend on it
        for (const n of group.synced) {
            inDegree.set(n.logicalId, (depOf.get(n.logicalId) ?? new Set()).size)
            for (const dep of depOf.get(n.logicalId) ?? []) {
                if (!dependents.has(dep)) dependents.set(dep, new Set())
                dependents.get(dep)!.add(n.logicalId)
            }
        }

        // Build DEPLOY_ORDER priority map for tie-breaking
        const deployPriority = new Map<string, number>()
        DEPLOY_ORDER.forEach((k, i) => deployPriority.set(k, i))
        const nodePriority = (n: GraphNode): number =>
            deployPriority.get(`${n.arn.service}:${n.arn.resourceType}`) ?? 999

        // Sort comparator: same-type nodes stay together, ordered by DEPLOY_ORDER
        const sortSameLevel = (nodes: typeof group.synced) =>
            [...nodes].sort((a, b) => nodePriority(a) - nodePriority(b))

        let queue = sortSameLevel(group.synced.filter((n) => inDegree.get(n.logicalId) === 0))
        const topoOrder: typeof group.synced = []

        while (queue.length > 0) {
            const node = queue.shift()!
            topoOrder.push(node)
            for (const depId of dependents.get(node.logicalId) ?? []) {
                const newDeg = (inDegree.get(depId) ?? 1) - 1
                inDegree.set(depId, newDeg)
                if (newDeg === 0) queue.push(logicalIdToNode.get(depId)!)
            }
            // Re-sort queue to keep same-type nodes grouped
            queue.sort((a, b) => nodePriority(a) - nodePriority(b))
        }

        // Handle cycles: any remaining nodes with inDegree > 0
        if (topoOrder.length < group.synced.length) {
            for (const n of group.synced) {
                if (!topoOrder.includes(n)) topoOrder.push(n)
            }
        }

        // Collect nodes by type in topological order for genPreamble and genSynced
        const nodesByType = new Map<string, GraphNode[]>()

        for (const node of topoOrder) {
            const typeKey = `${node.arn.service}:${node.arn.resourceType}`
            const gen = registry.get(node.arn.service, node.arn.resourceType)
            if (!gen?.genSynced) continue

            if (!nodesByType.has(typeKey)) nodesByType.set(typeKey, [])
            nodesByType.get(typeKey)!.push(node)
        }

        // Emit preamble (if any) then genSynced for each type ordered by DEPLOY_ORDER.
        // This ensures that types with dependencies (e.g. routing-profile → queue)
        // are emitted only after their dependency types have been declared.
        const emittedArns = new Set<string>()
        const sortedTypes = [...nodesByType.entries()].sort(
            ([a], [b]) => (deployPriority.get(a) ?? 999) - (deployPriority.get(b) ?? 999)
        )
        for (const [typeKey, typeNodes] of sortedTypes) {
            const [service, resourceType] = typeKey.split(':')
            const gen = registry.get(service, resourceType)
            if (!gen?.genSynced) continue

            log.info(`generating ${typeKey}: ${typeNodes.length} nodes (stack=${groupKey})`)

            if (gen.genPreamble) {
                const preamble = gen.genPreamble(typeNodes, ctx)
                if (preamble) {
                    syncLines.push(preamble)
                    usedServices.add(service)
                }
            }

            // Nodes are already in topological order from the global sort.
            // Dependencies (from resolvedRefs → edges) are declared before dependents.
            for (const node of typeNodes) {
                if (emittedArns.has(node.arn.raw)) continue
                emittedArns.add(node.arn.raw)
                const result = gen.genSynced(node, ctx)
                let hasCode = false
                if (typeof result === 'string') {
                    if (result) {
                        syncLines.push(result)
                        hasCode = true
                    }
                } else {
                    if (result.code) {
                        syncLines.push(result.code)
                        hasCode = true
                    }
                    if (result.files) flowFiles.push(...result.files)
                }
                if (hasCode) usedServices.add(service)
            }
        }

        // Catch any synced node whose type wasn't emitted above
        for (const node of group.synced) {
            if (emittedArns.has(node.arn.raw)) continue
            const gen = registry.get(node.arn.service, node.arn.resourceType)
            if (gen?.genSynced) {
                const result = gen.genSynced(node, ctx)
                let hasCode = false
                if (typeof result === 'string') {
                    if (result) {
                        syncLines.push(result)
                        hasCode = true
                    }
                } else {
                    if (result.code) {
                        syncLines.push(result.code)
                        hasCode = true
                    }
                    if (result.files) flowFiles.push(...result.files)
                }
                if (hasCode) usedServices.add(node.arn.service)
            } else {
                log.debug(`no generator for ${node.arn.service}:${node.arn.resourceType} node "${node.logicalId}" — emitting TODO comment`)
                syncLines.push(
                    `    // TODO: ${node.arn.service}/${node.arn.resourceType} — ${node.logicalId}\n    // cfnType: ${node.cfnType ?? 'unknown'}`
                )
            }
        }

        // ── Imports — detect implicit IAM usage by scanning generated code ────
        const generatedCode = [...refLines, ...syncLines].join('\n')
        if (generatedCode.includes('iam.')) usedServices.add('iam')

        const imports: string[] = [`import * as cdk from 'aws-cdk-lib';`]
        if (usedServices.has('lambda'))
            imports.push(`import * as lambda from 'aws-cdk-lib/aws-lambda';`)
        if (usedServices.has('dynamodb'))
            imports.push(`import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';`)
        if (usedServices.has('iam')) imports.push(`import * as iam from 'aws-cdk-lib/aws-iam';`)
        if (usedServices.has('s3')) imports.push(`import * as s3 from 'aws-cdk-lib/aws-s3';`)
        if (usedServices.has('apigateway')) {
            imports.push(`import * as apigateway from 'aws-cdk-lib/aws-apigateway';`)
            imports.push(`import * as apigatewayv2 from 'aws-cdk-lib/aws-apigatewayv2';`)
            imports.push(
                `import * as apigatewayv2integrations from 'aws-cdk-lib/aws-apigatewayv2-integrations';`
            )
        }
        if (usedServices.has('connect'))
            imports.push(`import * as connect from 'aws-cdk-lib/aws-connect';`)
        if (usedServices.has('qconnect') || usedServices.has('wisdom'))
            imports.push(`import * as wisdom from 'aws-cdk-lib/aws-wisdom';`)
        if (usedServices.has('sqs')) imports.push(`import * as sqs from 'aws-cdk-lib/aws-sqs';`)
        if (usedServices.has('sns')) imports.push(`import * as sns from 'aws-cdk-lib/aws-sns';`)
        if (usedServices.has('secretsmanager'))
            imports.push(`import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';`)
        if (usedServices.has('ssm')) imports.push(`import * as ssm from 'aws-cdk-lib/aws-ssm';`)
        if (usedServices.has('events'))
            imports.push(`import * as events from 'aws-cdk-lib/aws-events';`)
        if (usedServices.has('states'))
            imports.push(`import * as stepfunctions from 'aws-cdk-lib/aws-stepfunctions';`)
        if (usedServices.has('kms')) imports.push(`import * as kms from 'aws-cdk-lib/aws-kms';`)
        if (usedServices.has('kinesis'))
            imports.push(`import * as kinesis from 'aws-cdk-lib/aws-kinesis';`)
        if (usedServices.has('cloudfront')) {
            imports.push(`import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';`)
            imports.push(`import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';`)
        }
        if (flowFiles.length > 0) imports.push(`import * as fs from 'fs';`)
        imports.push(`import * as path from 'path';`)
        imports.push(`import { Construct } from 'constructs';`)
        imports.push(`import { ARN_MAP } from './arns';`)
        imports.push(`import { ENV_OVERRIDES } from './overrides';`)

        const stackTs = `${imports.join('\n')}

export class ${className} extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
${ctx.connectParamDecl ? `${ctx.connectParamDecl}\n` : ''}    const account = this.node.tryGetContext('account') as string ?? Object.keys(ARN_MAP)[0] ?? 'default';
    const arns = ARN_MAP[account] ?? {};
    const envOverrides = ENV_OVERRIDES[account] ?? {};

${refLines.length ? `    // ── Referenced resources (already exist in target account) ──────────────\n${refLines.join('\n\n')}\n` : ''}
${syncLines.length ? `    // ── Synced resources (to be created/updated) ────────────────────────────\n${syncLines.join('\n\n')}` : '    // No synced resources — mark nodes as "Synced" in the graph inspector'}
  }
}
`
        stackFiles.push({ path: filePath, content: stackTs })
        log.debug(`generated stack file: ${filePath} (${stackTs.length} bytes)`)
        allFlowFiles.push(...flowFiles)
    }

    // ─── lib/arns.ts ──────────────────────────────────────────────────────────

    const allReferenced = referenced // already deduped and includes moved connect instances

    const arnMapEntries = accountIds.map((awsAccountId) => {
        const acctMapping = mapping[awsAccountId] ?? {}
        const entries = allReferenced.map((n) => {
            // Prefer per-account ARN from envData; fall back to canonical ARN
            const envArn = n.envData?.get(awsAccountId)?.arn.raw ?? n.arn.raw
            const val = acctMapping[n.logicalId]?.arn ?? envArn
            const id = globalRefNodeId.get(n.logicalId) ?? cdkId(n.logicalId)
            return `    ${id}: ${JSON.stringify(val)}, // ${n.arn.service}/${n.arn.resourceType}`
        })
        return `  ${JSON.stringify(awsAccountId)}: {\n${entries.join('\n')}\n  }`
    })

    const arnsTs = `/**
 * Per-account ARN mapping for referenced resources.
 * Deploy with: cdk deploy --context account=YOUR_AWS_ACCOUNT_ID
 * Generated by aws-sync-tool — ${new Date().toISOString().slice(0, 10)}
 */
export const ARN_MAP: Record<string, Record<string, string>> = {
${arnMapEntries.join(',\n')}
};
`

    // ─── lib/overrides.ts ─────────────────────────────────────────────────────

    const lambdaSynced = synced.filter((n) => n.arn.service === 'lambda')

    const overrideEntries = accountIds.map((awsAccountId) => {
        const acctMapping = mapping[awsAccountId] ?? {}
        const lambdaEntries = lambdaSynced
            .map((n) => {
                const nodeMapping = acctMapping[n.logicalId] ?? {}
                const envVarKeys = Object.keys(
                    ((n.data?.Environment as Record<string, unknown>)?.Variables ?? {}) as Record<
                        string,
                        unknown
                    >
                )
                const overrides: Record<string, string> = {}
                for (const key of envVarKeys) {
                    if (key in nodeMapping && typeof nodeMapping[key] === 'string') {
                        overrides[key] = String(nodeMapping[key])
                    }
                }
                if (Object.keys(overrides).length === 0) return null
                const id = globalSyncedNodeId.get(n.logicalId) ?? cdkId(n.logicalId)
                return `    ${id}: ${JSON.stringify(overrides)},`
            })
            .filter((x): x is string => x !== null)
        return `  ${JSON.stringify(awsAccountId)}: {\n${lambdaEntries.join('\n')}\n  }`
    })

    const overridesTs = `/**
 * Per-account Lambda environment variable overrides.
 * Values here override the base env vars at deploy time.
 * Generated by aws-sync-tool — ${new Date().toISOString().slice(0, 10)}
 */
export const ENV_OVERRIDES: Record<string, Record<string, Record<string, string>>> = {
${overrideEntries.join(',\n')}
};
`

    // ─── bin/app.ts ───────────────────────────────────────────────────────────

    const stackImports = stackClassNames
        .map((cn, i) => {
            const fp = stackFileBaseNames[i]
            return `import { ${cn} } from '../lib/${fp}';`
        })
        .join('\n')

    const stackInstances = stackClassNames
        .map((cn, i) => {
            const id = i === 0 ? stackName : cn.replace(/Stack$/, '')
            return `new ${cn}(app, '${id}', { env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION } });`
        })
        .join('\n')

    const binApp = `#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
${stackImports}

const app = new cdk.App();
${stackInstances}
`

    // ─── Infrastructure files ─────────────────────────────────────────────────

    const packageJson = JSON.stringify(
        {
            name: stackName.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
            version: '0.1.0',
            private: true,
            scripts: {
                build: 'tsc',
                watch: 'tsc -w',
                cdk: 'cdk',
                deploy: 'cdk deploy',
                synth: 'cdk synth',
                diff: 'cdk diff'
            },
            devDependencies: {
                '@types/node': '22.x',
                typescript: '~5.7.0',
                'ts-node': '10.x',
                'aws-cdk': '2.x',
                'source-map-support': '^0.5.21',
                '@types/source-map-support': '^0.5.6'
            },
            dependencies: {
                'aws-cdk-lib': '2.x',
                constructs: '^10.0.0'
            }
        },
        null,
        2
    )

    const tsconfigJson = JSON.stringify(
        {
            compilerOptions: {
                target: 'ES2020',
                lib: ['es2020'],
                module: 'commonjs',
                strict: true,
                esModuleInterop: true,
                skipLibCheck: true,
                forceConsistentCasingInFileNames: true,
                outDir: 'dist',
                rootDir: '.',
                declaration: true
            },
            exclude: ['node_modules', 'cdk.out', 'dist']
        },
        null,
        2
    )

    const cdkJson = JSON.stringify(
        {
            app: 'npx ts-node --prefer-ts-exts bin/app.ts',
            watch: {
                include: ['**'],
                exclude: [
                    'README.md',
                    'cdk*.json',
                    '**/*.d.ts',
                    '**/*.js',
                    'tsconfig.json',
                    'package*.json',
                    'node_modules',
                    'cdk.out'
                ]
            },
            context: {
                '@aws-cdk/aws-lambda:recognizeLayerVersion': true,
                '@aws-cdk/core:checkSecretUsage': true,
                '@aws-cdk/aws-iam:minimizePolicies': true
            }
        },
        null,
        2
    )

    const gitignore = `node_modules/
dist/
cdk.out/
`

    const readme = `# ${stackName}

Generated by aws-sync-tool on ${new Date().toISOString().slice(0, 10)}.

## Setup

\`\`\`bash
npm install
\`\`\`

## Configuration

Edit \`lib/arns.ts\` to set the ARNs of resources that already exist in the target account.

## Deploy

\`\`\`bash
# First time
npx cdk bootstrap

# Deploy
npx cdk deploy

# Preview changes
npx cdk diff
\`\`\`

## Resources

${synced.length} resources will be **created**: ${synced.map((n) => n.logicalId).join(', ')}

${referenced.length} resources are **referenced** (must exist in target account): ${referenced.map((n) => n.logicalId).join(', ')}

## Deploy with environment

\`\`\`bash
cdk deploy --context account=YOUR_AWS_ACCOUNT_ID
\`\`\`
`

    // Placeholder Lambda function source for fromAsset paths
    const lambdaAssets: GeneratedFile[] = synced
        .filter((n) => n.arn.service === 'lambda' && n.arn.resourceType === 'function')
        .map((n) => {
            const id = globalSyncedNodeId.get(n.logicalId) ?? cdkId(n.logicalId)
            return {
                path: `src/${id}/index.js`,
                content: `// TODO: replace with your actual Lambda function code\nexports.handler = async (event) => {\n  console.log('Event:', JSON.stringify(event, null, 2));\n  return { statusCode: 200, body: 'OK' };\n};\n`
            }
        })

    // Placeholder Lambda layer scaffolding
    const layerAssets: GeneratedFile[] = synced
        .filter((n) => n.arn.service === 'lambda' && n.arn.resourceType === 'layerversion')
        .map((n) => {
            const id = globalSyncedNodeId.get(n.logicalId) ?? cdkId(n.logicalId)
            return {
                path: `layers/${id}/nodejs/package.json`,
                content: `{ "name": "${id.toLowerCase()}", "version": "1.0.0" }\n`
            }
        })

    const files: GeneratedFile[] = [
        { path: 'package.json', content: packageJson },
        { path: 'tsconfig.json', content: tsconfigJson },
        { path: 'cdk.json', content: cdkJson },
        { path: '.gitignore', content: gitignore },
        { path: 'README.md', content: readme },
        { path: 'bin/app.ts', content: binApp },
        { path: 'lib/arns.ts', content: arnsTs },
        { path: 'lib/overrides.ts', content: overridesTs },
        ...stackFiles,
        ...allFlowFiles,
        ...lambdaAssets,
        ...layerAssets
    ]

    // ─── Lambda artifacts (for downloader) ────────────────────────────────────

    const artifacts: LambdaArtifact[] = []
    for (const n of synced) {
        const id = globalSyncedNodeId.get(n.logicalId) ?? cdkId(n.logicalId)
        const region = n.arn.region || 'us-east-1'
        if (n.arn.service === 'lambda' && n.arn.resourceType === 'function') {
            artifacts.push({
                arn: n.arn.raw,
                id,
                type: 'function',
                region,
                functionName: n.data?.FunctionName ? String(n.data.FunctionName) : undefined
            })
        } else if (n.arn.service === 'lambda' && n.arn.resourceType === 'layerversion') {
            // Layer ARN format: arn:...:layer:<name>:<version> — use parsed resourceId (version)
            // and infer name from data or the ARN resource path
            const layerVersion = Number(n.arn.resourceId) || undefined
            const resourceParts = n.arn.resource.split(/[:/]/)
            const layerName =
                resourceParts[resourceParts.length - 2] ?? String(n.data?.LayerName ?? '')
            artifacts.push({ arn: n.arn.raw, id, type: 'layer', region, layerName, layerVersion })
        }
    }

    const totalBytes = files.reduce((sum, f) => sum + f.content.length, 0)
    log.info(`generation complete: ${files.length} files, ~${Math.round(totalBytes / 1024)}KB total`)
    if (artifacts.length > 0) log.info(`lambda artifacts queued: ${artifacts.length}`)

    return { files, artifacts }
}
