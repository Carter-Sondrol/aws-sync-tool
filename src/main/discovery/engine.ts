import type { DiscoveryErrorCounts, DiscoveryProgress, DiscoveredRef, GraphNode } from '../graph-types'
import { type ParsedARN, parseARN } from './arn'
import { Graph } from '../graph'
import type { Credentials } from './CredentialsProvider'
import { getLogger } from '../logging'
import { getRegistry, initRegistry, ResolverRegistry } from './registry'
import { ACCESS_DENIED, NOT_FOUND } from './resolvers/baseResolver'

const log = getLogger('engine')

export type ProgressCallback = (progress: DiscoveryProgress) => void

export interface DiscoveryOptions {
    maxNodes?: number
    concurrency?: number
    excludeResourceTypes?: string[]
    maxDepth?: number
}

const EMPTY_ERRORS: DiscoveryErrorCounts = {
    notFound: 0,
    accessDenied: 0,
    noResolver: 0,
    invalidParameter: 0,
    other: 0
}

export class DiscoveryEngine {
    private cancelled = false
    private progress: DiscoveryProgress = { phase: 'idle', resolved: 0, total: 0 }
    private onProgress: ProgressCallback | null = null
    private errors: DiscoveryErrorCounts = { ...EMPTY_ERRORS }

    setProgressCallback(cb: ProgressCallback): void {
        this.onProgress = cb
    }

    cancel(): void {
        this.cancelled = true
    }

    getProgress(): DiscoveryProgress {
        return { ...this.progress }
    }

    async discover(
        credentials: () => Promise<Credentials>,
        seedInputs: string[],
        existingGraph?: Graph,
        options?: DiscoveryOptions,
        registry?: ResolverRegistry
    ): Promise<Graph> {
        this.cancelled = false
        this.errors = { ...EMPTY_ERRORS }

        if (!registry) {
            await initRegistry(credentials)
            registry = getRegistry()
        }

        const seedArns: ParsedARN[] = seedInputs
            .map((s) => parseARN(s))
            .filter((a): a is ParsedARN => a !== null)
        const graph = new Graph(existingGraph)

        const queuedArns = [...seedArns]
        const visitedARNs = new Set<string>()

        this.progress = {
            phase: 'running',
            resolved: 0,
            total: queuedArns.length,
            errors: { ...this.errors }
        }
        this.emit()

        // ─── Phase 1: BFS discovery ──────────────────────────────────────
        const concurrency = Math.max(1, options?.concurrency ?? 10)

        while (queuedArns.length > 0 && !this.cancelled) {
            const batch: ParsedARN[] = []
            while (batch.length < concurrency && queuedArns.length > 0) {
                const arn = queuedArns.pop()!
                if (arn && !visitedARNs.has(arn.raw)) {
                    visitedARNs.add(arn.raw)
                    batch.push(arn)
                }
            }
            if (batch.length === 0) continue

            const results = await Promise.all(batch.map((currentArn) => this.resolveOne(registry, graph, currentArn)))
            for (const refs of results) {
                for (const ref of refs) {
                    if (!visitedARNs.has(ref.arn.raw)) {
                        queuedArns.push(ref.arn)
                    }
                }
            }
            this.progress.total = visitedARNs.size + queuedArns.length
            this.emit()
        }

        log.info(`phase 1 complete: ${visitedARNs.size} resources resolved`)

        // ─── Phase 2: Deferred discovery ─────────────────────────────────
        for (let i = 0; i < 5; i++) {
            let changed = false
            for (const node of graph.nodes.values()) {
                if (this.cancelled) break
                const resolver = registry.forArn(node.arn)
                if (!resolver || resolver.completeDeferred) continue

                try {
                    const newRefs = await resolver.deferredDiscovery?.(node, registry)
                    if (newRefs?.size) {
                        changed = true
                        for (const ref of newRefs) {
                            node.discoveredRefs.push(ref)
                            if (!visitedARNs.has(ref.arn.raw)) {
                                queuedArns.push(ref.arn)
                            }
                        }
                    }
                } catch (err) {
                    console.error(`[deferred] Error for ${node.logicalId}:`, err)
                }
            }
            if (!changed) break
        }

        while (queuedArns.length > 0 && !this.cancelled) {
            const batch: ParsedARN[] = []
            while (batch.length < concurrency && queuedArns.length > 0) {
                const arn = queuedArns.pop()!
                if (arn && !visitedARNs.has(arn.raw)) {
                    visitedARNs.add(arn.raw)
                    batch.push(arn)
                }
            }
            if (batch.length === 0) continue

            const results = await Promise.all(batch.map((currentArn) => this.resolveOne(registry, graph, currentArn)))
            for (const refs of results) {
                for (const ref of refs) {
                    if (!visitedARNs.has(ref.arn.raw)) {
                        queuedArns.push(ref.arn)
                    }
                }
            }
            this.progress.total = visitedARNs.size + queuedArns.length
            this.emit()
        }

        this.progress.phase = 'complete'
        this.emit()
        return graph
    }

    /**
     * Resolve a single ARN and add it to the graph.
     * Returns the discovered refs so the caller can queue them.
     */
    private async resolveOne(
        registry: ReturnType<typeof getRegistry>,
        graph: Graph,
        currentArn: ParsedARN
    ): Promise<DiscoveredRef[]> {
        this.progress.currentArn = currentArn.raw

        let node: GraphNode | null

        const resolver = registry.forArn(currentArn)
        if (!resolver) {
            this.errors.noResolver++
            log.debug(`no resolver for ${currentArn.raw}`)
            node = this.createPlaceholder(currentArn, 'NoResolver')
        } else {
            node = await resolver.resolveResource(currentArn)
            if (!node) return []
            if (node.error) this.countError(node.error)
        }

        const { effectiveLogicalId: _effectiveLogicalId } = graph.addNode(node, currentArn.accountId) // reserved for future reference tracking
        this.progress.resolved++
        this.emit()
        return node.discoveredRefs
    }

    private createPlaceholder(arn: ParsedARN, error: string): GraphNode {
        return {
            logicalId: arn.resourceId || arn.raw.slice(-20),
            label: arn.resourceId || arn.raw.slice(-20),
            arn,
            included: false,
            hidden: false,
            discoveredRefs: [],
            error
        }
    }

    private emit(): void {
        this.onProgress?.({ ...this.progress, errors: { ...this.errors } })
    }

    /** Classify an error code into a tracked category and increment the counter. */
    private countError(code: string): void {
        if (NOT_FOUND.has(code)) {
            this.errors.notFound++
        } else if (ACCESS_DENIED.has(code)) {
            this.errors.accessDenied++
        } else if (code === 'InvalidParameterException' || code === 'ValidationError') {
            this.errors.invalidParameter++
        } else {
            this.errors.other++
        }
    }


}
