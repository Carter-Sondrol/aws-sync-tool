import { downloadLambdaArtifacts } from '../export/artifact-downloader'
import { type CdkProjectOutput, type SplitMode, generateCdkProject } from '../export/cdk-generator'
import { mkdirSync, writeFileSync } from 'fs'
import { Graph } from '../graph'
import type { MappingTable } from '../graph-types'
import { dirname, join } from 'path'
import type { EnvironmentConfig } from '../types'
import { GraphService } from './graph-service'
import { getLogger } from '../logging'

const log = getLogger('export-service')

// ─── Service ──────────────────────────────────────────────────────────────────

export interface ExportConfig {
    outputDir: string
    stackName: string
    envId: string
    downloadArtifacts?: boolean
}

export class ExportService {
    constructor(
        private loadGraph: (envId: string) => Graph,
        private loadMapping: () => MappingTable,
        private resolveCredentials: (
            env: EnvironmentConfig
        ) => Promise<{ accessKeyId: string; secretAccessKey: string; sessionToken?: string }>,
        private loadEnvironments: () => EnvironmentConfig[],
        private writeFile: (absolutePath: string, content: string) => void = (path, content) =>
            writeFileSync(path, content, 'utf-8')
    ) {}

    /** Generate a CDK project from graph data */
    async exportCdk(config: ExportConfig): Promise<{
        ok: boolean
        error?: string
        artifactErrors?: Array<{ id: string; error: string }>
    }> {
        const { outputDir, stackName, envId, downloadArtifacts = true } = config

        try {
            const graphService = new GraphService()
            const { graph, targetAccountId } = ExportService.prepareGraph(envId, undefined, graphService)
            const mapping = this.loadMapping()
            const nodes = Array.from(graph.nodes.values())

            const { files, artifacts } = generateCdkProject({
                nodes,
                edges: graph.edges,
                stackName,
                mapping,
                targetAccountId,
            })

            // Write files
            for (const file of files) {
                const absPath = join(outputDir, file.path)
                mkdirSync(dirname(absPath), { recursive: true })
                this.writeFile(absPath, file.content)
            }

            let artifactErrors: Array<{ id: string; error: string }> = []
            if (downloadArtifacts && envId && artifacts.length > 0) {
                try {
                    const environments = this.loadEnvironments()
                    const environment = environments.find((e) => e.id === envId)
                    if (!environment) {
                        artifactErrors = artifacts.map((a) => ({
                            id: a.id,
                            error: 'Environment not found'
                        }))
                    } else {
                        const creds = await this.resolveCredentials(environment)
                        const result = await downloadLambdaArtifacts(artifacts, creds, outputDir)
                        artifactErrors = result.errors
                    }
                } catch (err) {
                    const msg = err instanceof Error ? err.message : String(err)
                    artifactErrors = artifacts.map((a) => ({
                        id: a.id,
                        error: `Credential error: ${msg}`
                    }))
                }
            }

            return {
                ok: true,
                artifactErrors: artifactErrors.length > 0 ? artifactErrors : undefined
            }
        } catch (err) {
            return { ok: false, error: err instanceof Error ? err.message : String(err) }
        }
    }

    /** Validate a generated CDK project by running `npm install && npx cdk synth` */
    async validateCdk(outputDir: string): Promise<{ ok: boolean; output: string }> {
        const { exec } = require('child_process')
        const { promisify } = require('util')
        const execAsync = promisify(exec)

        try {
            await execAsync('npm install', { cwd: outputDir, timeout: 120_000 })
            const { stdout, stderr } = await execAsync('npx cdk synth', {
                cwd: outputDir,
                timeout: 120_000
            })
            return { ok: true, output: (stdout + stderr).trim() }
        } catch (err: unknown) {
            const e = err as { stdout?: string; stderr?: string; message?: string }
            const combined = ((e.stdout ?? '') + (e.stderr ?? '')).trim()
            return { ok: false, output: combined || (e.message ?? 'Unknown error') }
        }
    }

    /** Generate CDK files to a temp directory and return file list without writing artifacts */
    generatePreview(
        envId: string,
        stackName: string
    ): { files: Array<{ path: string; size: number }> } {
        const graphService = new GraphService()
        const { graph, targetAccountId } = ExportService.prepareGraph(envId, undefined, graphService)
        const mapping = this.loadMapping()
        const nodes = Array.from(graph.nodes.values())

        const { files } = generateCdkProject({ nodes, edges: graph.edges, stackName, mapping, targetAccountId })
        return {
            files: files.map((f) => ({ path: f.path, size: f.content.length }))
        }
    }

    // ─── Static helpers for CLI use (no DI needed) ──────────────────────────

    /**
     * Load or merge graphs for export, apply standard CDK node filters, and
     * resolve the target account ID. Single source of truth used by both the
     * CLI action and the instance exportCdk/generatePreview methods.
     *
     * Filtering rules applied (in order):
     *   1. AWS-managed (accountId='aws') and IAM service-linked roles → not included.
     *   2. Cross-account: target-account-canonical nodes → not included
     *      (they exist in the target already; CDK doesn't create them).
     *   3. Cross-account: source-account nodes that already have a target-env
     *      envData entry → not included (link/merge already paired them).
     *   4. If a (service:resourceType:label) match exists in the target env's
     *      raw graph, the source node → not included. This is the
     *      "graph already has this resource for that instance" rule and
     *      catches partial-deploy survivors that aren't yet linked.
     */
    static prepareGraph(
        sourceEnvId: string,
        targetEnvId: string | undefined,
        graphSvc: GraphService
    ): { graph: Graph; targetAccountId: string; sourceAccountId: string } {
        const sourceAccountId = graphSvc.getAccountId(sourceEnvId) ?? ''
        const targetAccountId = targetEnvId
            ? (graphSvc.getAccountId(targetEnvId) ?? '')
            : sourceAccountId

        log.info(
            `prepareGraph: sourceEnv=${sourceEnvId} (acct=${sourceAccountId || '?'}) ` +
            `targetEnv=${targetEnvId ?? '(none)'} (acct=${targetAccountId || '?'})`
        )

        const graph = targetEnvId
            ? graphSvc.merge([sourceEnvId, targetEnvId])
            : graphSvc.load(sourceEnvId)
        log.info(`prepareGraph: loaded graph with ${graph.nodes.size} node(s) before filtering`)

        let awsManaged = 0
        let crossAccountTargetOnly = 0
        let crossAccountLinkedSource = 0
        let alreadyInTarget = 0

        // (1) AWS-managed + service-linked roles
        for (const node of graph.nodes.values()) {
            if (node.arn?.accountId === 'aws' || node.arn?.raw.includes('/aws-service-role/')) {
                if (node.included) awsManaged++
                node.included = false
            }
        }

        // (2)+(3) Cross-account exclusions
        if (targetEnvId && sourceAccountId && targetAccountId && sourceAccountId !== targetAccountId) {
            for (const node of graph.nodes.values()) {
                if (node.arn?.accountId === targetAccountId) {
                    if (node.included) crossAccountTargetOnly++
                    node.included = false
                }
                if (node.envData?.has(targetAccountId) && node.arn?.accountId === sourceAccountId) {
                    if (node.included) crossAccountLinkedSource++
                    node.included = false
                }
            }
        }

        // (4) Target-env graph identity check ("already in target instance")
        if (targetEnvId) {
            const targetEnvGraph = graphSvc.load(targetEnvId)
            const targetIdentities = new Set<string>()
            for (const tn of targetEnvGraph.nodes.values()) {
                const svc = tn.arn?.service
                const rt = tn.arn?.resourceType
                const name = tn.label
                if (!svc || !rt || !name) continue
                targetIdentities.add(`${svc}:${rt}:${name}`)
            }
            for (const node of graph.nodes.values()) {
                if (!node.included) continue
                const svc = node.arn?.service
                const rt = node.arn?.resourceType
                const name = node.label
                if (!svc || !rt || !name) continue
                if (targetIdentities.has(`${svc}:${rt}:${name}`)) {
                    node.included = false
                    alreadyInTarget++
                }
            }
        }

        const includedCount = Array.from(graph.nodes.values()).filter((n) => n.included).length
        log.info(
            `prepareGraph: excluded awsManaged=${awsManaged} ` +
            `crossAcctTargetOnly=${crossAccountTargetOnly} ` +
            `crossAcctLinked=${crossAccountLinkedSource} ` +
            `alreadyInTarget=${alreadyInTarget} → ${includedCount} of ${graph.nodes.size} included`
        )

        return { graph, targetAccountId, sourceAccountId }
    }

    /** Generate CDK project from a Graph instance */
    static generate(
        graph: Graph,
        stackName: string,
        mapping: Record<string, Record<string, unknown>>,
        targetAccountId?: string,
        splitMode?: SplitMode,
        flowsPerStack?: number
    ): CdkProjectOutput {
        const nodes = Array.from(graph.nodes.values())
        return generateCdkProject({ nodes, edges: graph.edges, stackName, mapping, targetAccountId: targetAccountId ?? '', splitMode, flowsPerStack })
    }

    /** Write generated files to disk */
    static writeFiles(files: Array<{ path: string; content: string }>, outputDir: string): void {
        const { join, dirname } = require('path')
        const { mkdirSync, writeFileSync } = require('fs')
        for (const file of files) {
            const filePath = join(outputDir, file.path)
            mkdirSync(dirname(filePath), { recursive: true })
            writeFileSync(filePath, file.content, 'utf-8')
        }
    }

    /** Download Lambda artifacts */
    static async downloadArtifacts(
        artifacts: Array<{
            arn: string
            id: string
            type: string
            region: string
            functionName?: string
            layerName?: string
            layerVersion?: number
        }>,
        creds: { accessKeyId: string; secretAccessKey: string; sessionToken?: string },
        outputDir: string
    ): Promise<{ errors: Array<{ id: string; error: string }> }> {
        return downloadLambdaArtifacts(artifacts as any, creds, outputDir)
    }

    /** Validate a CDK project */
    static async validate(outputDir: string): Promise<{ ok: boolean; output: string }> {
        const { exec } = require('child_process')
        const { promisify } = require('util')
        const execAsync = promisify(exec)

        try {
            await execAsync('npm install', { cwd: outputDir, timeout: 120_000 })
            const { stdout, stderr } = await execAsync('npx cdk synth', {
                cwd: outputDir,
                timeout: 120_000
            })
            return { ok: true, output: (stdout + stderr).trim() }
        } catch (err: unknown) {
            const e = err as { stdout?: string; stderr?: string; message?: string }
            const combined = ((e.stdout ?? '') + (e.stderr ?? '')).trim()
            return { ok: false, output: combined || (e.message ?? 'Unknown error') }
        }
    }
}
