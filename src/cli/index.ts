#!/usr/bin/env node
/**
 * awsync — CLI for testing core functionality independently of the GUI.
 *
 * Usage:
 *   npx ts-node src/cli/index.ts <command> [options]
 *   # or with data dir override:
 *   AWSYNC_DATA_DIR=./test-data npx ts-node src/cli/index.ts env list
 */

import { Command } from 'commander'
import { parseARN } from '../main/discovery/arn'
import type { GraphNode } from '../main/graph-types'
import { AccountService } from '../main/service/account-service'
import { DiscoveryService } from '../main/service/discovery-service'
import { ExportService } from '../main/service/export-service'
import { GraphService } from '../main/service/graph-service'
import { LinkService } from '../main/service/link-service'
import { fuzzyScore } from '../main/service/fuzzy'
import { SyncService } from '../main/service/sync-service'
import { FileDataStore } from '../main/store'
import type { EnvironmentConfig } from '../main/types'
import { readJSON, setDataStore } from '../main/utils'

// ─── Data directory ──────────────────────────────────────────────────────────

const DATA_DIR = process.env.AWSYNC_DATA_DIR || './.awsync-data'

// Initialize store before anything else
setDataStore(new FileDataStore(DATA_DIR))

// ─── CLI program ─────────────────────────────────────────────────────────────

const program = new Command()
program
    .name('awsync')
    .description('CLI hooks for awsync-tool core functionality')
    .version('1.0.0')
    .helpOption('-h, --help', 'Show help')
    .addHelpText('after', `\nData directory: ${DATA_DIR} (override with AWSYNC_DATA_DIR env var)`)

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getAccountService(): AccountService {
    return new AccountService()
}

function getGraphService(): GraphService {
    return new GraphService()
}

function loadEnvironments(): EnvironmentConfig[] {
    return readJSON<EnvironmentConfig[]>('environments.json', [])
}

function envOrThrow(id: string): EnvironmentConfig {
    const envs = loadEnvironments()
    const env = envs.find((e) => e.id === id)
    if (!env)
        throw new Error(
            `Environment "${id}" not found. Use "awsync env list" to see available environments.`
        )
    return env
}

/** Get service:resourceType from a node (handles both arn.service and top-level .service) */
function getServiceType(node: GraphNode): string {
    const n = node as any
    if (n.service && n.resourceType) return `${n.service}:${n.resourceType}`
    if (node.arn?.service && node.arn?.resourceType)
        return `${node.arn.service}:${node.arn.resourceType}`
    return 'unknown:unknown'
}

/** Get just the service name */
function getService(node: GraphNode): string {
    const n = node as any
    if (n.service) return n.service
    return node.arn?.service ?? 'unknown'
}

// ─── ENV command ─────────────────────────────────────────────────────────────

const envCmd = new Command('env')
envCmd.description('Manage AWS environments/accounts')

envCmd
    .command('list')
    .description('List configured environments')
    .action(() => {
        const envs = getAccountService().list()
        if (envs.length === 0) {
            console.log('No environments configured.')
            return
        }
        console.table(
            envs.map((e) => ({
                id: e.id,
                label: e.label,
                profile: e.profileName || '(default)',
                region: e.region,
                accountId: e.accountId || '-'
            }))
        )
    })

envCmd
    .command('add')
    .description('Add or update an environment')
    .requiredOption('--id <id>', 'Environment ID (unique identifier)')
    .requiredOption('--label <label>', 'Human-readable label')
    .requiredOption('--region <region>', 'AWS region')
    .option('--profile <profile>', 'AWS profile name (optional, uses default if omitted)')
    .option('--regions <regions>', 'Comma-separated list of regions')
    .action(async (opts) => {
        const env: EnvironmentConfig = {
            id: opts.id,
            label: opts.label,
            region: opts.region,
            profileName: opts.profile || undefined,
            regions: opts.regions?.split(',').map((r: string) => r.trim()) || undefined
        }
        getAccountService().add(env)
        console.log(`Environment "${env.id}" saved.`)
    })

envCmd
    .command('remove')
    .description('Remove an environment')
    .argument('<id>', 'Environment ID')
    .action((id) => {
        getAccountService().remove(id)
        console.log(`Environment "${id}" removed.`)
    })

envCmd
    .command('validate')
    .description('Validate AWS credentials for an environment')
    .argument('<id>', 'Environment ID')
    .action(async (id) => {
        const result = await getAccountService().validate(id)
        if (result.valid) {
            console.log('✓ Valid')
            console.log(`  Account: ${result.accountId}`)
            console.log(`  ARN:     ${result.arn}`)
            console.log(`  User:    ${result.userName}`)
        } else {
            console.error(`✗ Invalid: ${result.error}`)
            process.exit(1)
        }
    })

envCmd
    .command('detect')
    .description('Detect AWS sessions from local profiles')
    .action(async () => {
        const sessions = await getAccountService().detectSessions()
        console.table(
            sessions.map((s) => ({
                source: s.source,
                region: s.region || '-',
                accountId: s.accountId || '-',
                user: s.userName || '-',
                error: s.error ? '✗' : '✓'
            }))
        )
    })

// ─── DISCOVER command ────────────────────────────────────────────────────────

const discoverCmd = new Command('discover')
discoverCmd.description('Run resource discovery')

discoverCmd
    .command('start')
    .description('Start BFS discovery from seed ARNs')
    .argument('<env-id>', 'Environment ID')
    .requiredOption(
        '--seeds <arns>',
        'Comma-separated seed ARNs (or shorthand like s3:bucket-name)'
    )
    .option('--max-depth <n>', 'Maximum discovery depth', '2')
    .option(
        '--exclude <types>',
        'Comma-separated resource types to exclude (e.g., "dynamodb:table,iam:role")'
    )
    .option('--concurrency <n>', 'Concurrent discovery requests', '10')
    .option('--json', 'Output progress as JSON lines')
    .option('--skip-if-exists', 'Skip discovery if graph data already exists for this env')
    .action(async (envId, opts) => {
        const envs = loadEnvironments()
        const env = envOrThrow(envId)
        const accountSvc = getAccountService()
        const graphSvc = getGraphService()

        if (opts.skipIfExists) {
            const existing = graphSvc.load(envId)
            if (existing.nodes.size > 0) {
                console.log(`✓ Graph already exists (${existing.nodes.size} nodes) — skipping discovery.`)
                return
            }
        }

        const seeds = opts.seeds.split(',').map((s: string) => s.trim())
        console.log(`Resolving seeds: ${seeds.join(', ')}`)

        const rawCreds = await accountSvc.resolveCredentials(env)
        const resolvedSeeds = new DiscoveryService().resolveSeeds(env, rawCreds, seeds)
        const resolved = await resolvedSeeds
        console.log(`Resolved ARNs: ${resolved.join(', ')}`)

        const onProgress = (progress: any) => {
            if (opts.json) {
                process.stdout.write(JSON.stringify(progress) + '\n')
            } else {
                const bar =
                    progress.total > 0
                        ? `${progress.resolved}/${progress.total}`
                        : progress.resolved.toString()
                process.stdout.write(
                    `\r  [${progress.phase}] ${bar} ${progress.currentArn ? `→ ${progress.currentArn.slice(-40)}` : ''}`
                )
            }
        }

        const discovery = new DiscoveryService()
        const result = await discovery.start(
            envs,
            (e: EnvironmentConfig) =>
                accountSvc.resolveCredentials(e).then((c) => ({
                    accessKeyId: c.accessKeyId,
                    secretAccessKey: c.secretAccessKey,
                    sessionToken: c.sessionToken
                })),
            graphSvc.load.bind(graphSvc),
            graphSvc.save.bind(graphSvc),
            {
                envId,
                seedArns: resolved,
                excludeResourceTypes: opts.exclude?.split(',').map((t: string) => t.trim()),
                maxDepth: parseInt(opts.maxDepth, 10),
                concurrency: parseInt(opts.concurrency, 10),
                onProgress
            }
        )

        if (!opts.json) console.log() // newline after progress

        if (result.ok) {
            const graph = graphSvc.load(envId)
            console.log(`✓ Discovery complete. ${graph.nodes.size} nodes.`)
        } else {
            console.error(`✗ Discovery failed: ${result.error}`)
            process.exit(1)
        }
    })

discoverCmd
    .command('resolve-seeds')
    .description('Resolve shorthand seeds to ARNs without running discovery')
    .argument('<env-id>', 'Environment ID')
    .requiredOption('--seeds <arns>', 'Comma-separated seed inputs')
    .action(async (envId, opts) => {
        const env = envOrThrow(envId)
        const accountSvc = getAccountService()
        const rawCreds = await accountSvc.resolveCredentials(env)
        const seeds = opts.seeds.split(',').map((s: string) => s.trim())

        const svc = new DiscoveryService()
        const resolved = await svc.resolveSeeds(env, rawCreds, seeds)

        console.log('Resolved ARNs:')
        for (const arn of resolved) {
            const parsed = parseARN(arn)
            console.log(`  ${arn}`)
            if (parsed) {
                console.log(
                    `    service: ${parsed.service}, region: ${parsed.region}, resource: ${parsed.resourceId}`
                )
            }
        }
    })

discoverCmd
    .command('cancel')
    .description('Cancel running discovery')
    .action(() => {
        new DiscoveryService().cancel()
        console.log('Discovery cancelled.')
    })

// ─── GRAPH command ───────────────────────────────────────────────────────────

const graphCmd = new Command('graph')
graphCmd.description('Inspect and manage resource graphs')

graphCmd
    .command('list')
    .description('List all environments with graph data')
    .action(() => {
        const graphSvc = getGraphService()
        const envs = graphSvc.listEnvironments()
        if (envs.length === 0) {
            console.log('No graphs found.')
            return
        }
        for (const info of envs) {
            console.log(`  ${info.envId}: ${info.nodeCount} nodes, ${info.edgeCount} edges`)
        }
    })

graphCmd
    .command('stats')
    .description('Show graph statistics')
    .argument('<env-id>', 'Environment ID')
    .action((envId) => {
        const graphSvc = getGraphService()
        const stats = graphSvc.stats(envId)
        console.log(`Nodes:      ${stats.nodeCount}`)
        console.log(`Edges:      ${stats.edgeCount}`)
        console.log(`Included:   ${stats.includedCount}`)
        console.log(`Hidden:     ${stats.hiddenCount}`)
        if (stats.services.length > 0) {
            console.log(`Services:   ${stats.services.join(', ')}`)
        }
    })

graphCmd
    .command('nodes')
    .description('List graph nodes')
    .argument('<env-id>', 'Environment ID')
    .option('--included', 'Show only included (synced) nodes')
    .option('--excluded', 'Show only excluded nodes')
    .option('--service <service>', 'Filter by service')
    .option('--json', 'Output as JSON')
    .action((envId, opts) => {
        const graphSvc = getGraphService()
        let nodes: GraphNode[]

        if (opts.included) {
            nodes = graphSvc.listNodes(envId, { included: true })
        } else if (opts.excluded) {
            nodes = graphSvc.listNodes(envId, { included: false })
        } else {
            nodes = graphSvc.listNodes(envId)
        }

        if (opts.service) {
            nodes = nodes.filter((n) => getService(n) === opts.service)
        }

        if (opts.json) {
            console.log(
                JSON.stringify(
                    nodes.map((n) => ({
                        arn: (n.arn as any)?.raw ?? n.arn,
                        logicalId: n.logicalId,
                        label: n.label,
                        service: getService(n),
                        resourceType: (n as any).resourceType ?? n.arn?.resourceType,
                        included: n.included,
                        hidden: n.hidden
                    })),
                    null,
                    2
                )
            )
        } else {
            if (nodes.length === 0) {
                console.log('No nodes found.')
                return
            }
            console.table(
                nodes.map((n) => ({
                    logicalId: n.logicalId,
                    label: n.label,
                    service: getServiceType(n),
                    included: n.included ? '✓' : ' ',
                    hidden: n.hidden ? '✓' : ' '
                }))
            )
        }
    })

graphCmd
    .command('set-included')
    .description('Toggle whether a node is included in CDK export')
    .argument('<env-id>', 'Environment ID')
    .argument('<arn>', 'ARN of the node')
    .requiredOption('--on|--off', 'Set included status')
    .action((envId, arn, opts) => {
        const graphSvc = getGraphService()
        graphSvc.setIncluded(envId, arn, opts.on)
        console.log(`Node ${arn}: included=${opts.on}`)
    })

graphCmd
    .command('set-stack')
    .description('Assign a node to a stack group')
    .argument('<env-id>', 'Environment ID')
    .argument('<arn>', 'ARN of the node')
    .requiredOption('--stack <id>', 'Stack ID')
    .action((envId, arn, opts) => {
        const graphSvc = getGraphService()
        graphSvc.setStack(envId, arn, opts.stack)
        console.log(`Node ${arn} → stack "${opts.stack}"`)
    })

graphCmd
    .command('export')
    .description('Export graph data to a JSON file')
    .option('--env-id <id>', 'Environment ID (omit for all)')
    .requiredOption('--output <path>', 'Output file path')
    .action((opts) => {
        const graphSvc = getGraphService()
        graphSvc.export(opts.output, opts.envId)
        console.log(`Exported to ${opts.output}`)
    })

graphCmd
    .command('import')
    .description('Import graph data from a JSON file')
    .requiredOption('--env-id <id>', 'Target environment ID')
    .requiredOption('--input <path>', 'Input file path')
    .action((opts) => {
        const graphSvc = getGraphService()
        const result = graphSvc.import(opts.envId, opts.input)
        if (result.ok) {
            console.log(`Imported: ${result.nodeCount} nodes, ${result.edgeCount} edges`)
        } else {
            console.error(`Import failed: ${result.error}`)
            process.exit(1)
        }
    })

graphCmd
    .command('clear')
    .description('Clear graph data')
    .option('--env-id <id>', 'Environment ID (omit for all)')
    .action((opts) => {
        const graphSvc = getGraphService()
        graphSvc.clear(opts.envId)
        console.log(opts.envId ? `Cleared graph for "${opts.envId}"` : 'Cleared all graphs.')
    })

graphCmd
    .command('exclude-type')
    .description('Exclude all nodes of a given service:resourceType from CDK export')
    .argument('<env-id>', 'Environment ID')
    .argument('<type>', 'Resource type as service:resourceType (e.g. connect:queue)')
    .action((envId, type) => {
        const [service, resourceType] = type.split(':')
        const graphSvc = getGraphService()
        const count = graphSvc.setBulkIncluded(envId, { service, resourceType }, false)
        console.log(`Excluded ${count} node(s) of type "${type}"`)
    })

graphCmd
    .command('type-summary')
    .description('Show inclusion summary grouped by resource type')
    .argument('<env-id>', 'Environment ID')
    .action((envId) => {
        const graphSvc = getGraphService()
        const summary = graphSvc.inclusionSummary(envId)
        if (summary.length === 0) {
            console.log('No nodes found.')
            return
        }
        console.table(
            summary.map(({ type, total, included }) => ({
                type,
                included,
                excluded: total - included,
                total
            }))
        )
    })

// ─── MAPPING command ─────────────────────────────────────────────────────────

const mappingCmd = new Command('mapping')
mappingCmd.description('Manage resource mapping table')

mappingCmd
    .command('list')
    .description('List mapping entries')
    .option('--env-id <id>', 'Filter by environment')
    .action((opts) => {
        const graphSvc = getGraphService()
        const mappings = graphSvc.listMappings(opts.envId)
        if (mappings.length === 0) {
            console.log('No mappings found.')
            return
        }
        console.table(
            mappings.map((m) => ({
                envId: m.envId,
                logicalId: m.logicalId,
                arn: m.arn || '-'
            }))
        )
    })

mappingCmd
    .command('set')
    .description('Set a mapping entry')
    .requiredOption('--env-id <id>', 'Environment ID')
    .requiredOption('--logical-id <id>', 'Logical ID')
    .requiredOption('--arn <arn>', 'ARN value')
    .action((opts) => {
        const graphSvc = getGraphService()
        graphSvc.setMapping(opts.envId, opts.logicalId, { arn: opts.arn })
        console.log(`Set mapping: ${opts.envId} / ${opts.logicalId} → ${opts.arn}`)
    })

mappingCmd
    .command('export')
    .description('Export mapping table to JSON file')
    .requiredOption('--output <path>', 'Output file path')
    .action((opts) => {
        const graphSvc = getGraphService()
        graphSvc.exportMapping(opts.output)
        console.log(`Mapping exported to ${opts.output}`)
    })

mappingCmd
    .command('populate-referenced')
    .description('Pre-populate mapping for excluded nodes by replacing source instance ID with target instance ID in ARNs')
    .requiredOption('--env-id <id>', 'Environment ID')
    .requiredOption('--source-instance <uuid>', 'Source Connect instance UUID')
    .requiredOption('--target-instance <uuid>', 'Target Connect instance UUID')
    .action((opts) => {
        const graphSvc = getGraphService()
        const graph = graphSvc.load(opts.envId)
        const accountId = graphSvc.getAccountId(opts.envId) ?? ''

        let count = 0
        for (const node of graph.nodes.values()) {
            if (node.included) continue
            const rawArn = node.arn?.raw
            if (!rawArn) continue
            const targetArn = rawArn.includes(opts.sourceInstance)
                ? rawArn.replace(opts.sourceInstance, opts.targetInstance)
                : rawArn
            graphSvc.setMapping(opts.envId, node.logicalId, { arn: targetArn })
            count++
        }
        console.log(`Populated mapping for ${count} excluded node(s)`)
    })

// ─── SYNC command ────────────────────────────────────────────────────────────

const syncCmd = new Command('sync')
syncCmd.description('Synchronize resources between environments')

syncCmd
    .command('push')
    .description('Push a resource from source to target environment')
    .argument('<source-env>', 'Source environment ID')
    .argument('<node-arn>', 'ARN of the node to sync')
    .argument('<target-env>', 'Target environment ID')
    .argument('<target-arn>', 'Target ARN')
    .action(async (sourceEnv, nodeArn, targetEnv, targetArn) => {
        const accountSvc = getAccountService()
        const graphSvc = getGraphService()

        const sourceEnvironment = envOrThrow(sourceEnv)
        const targetEnvironment = envOrThrow(targetEnv)

        const graph = graphSvc.load(sourceEnv)
        // graph.nodes is a Map keyed by logicalId. Look up by ARN via getNodeByArn(),
        // falling back to logicalId match for users who pass a logicalId instead.
        const node = graph.getNodeByArn(nodeArn)
            ?? Array.from(graph.nodes.values()).find((n) => n.logicalId === nodeArn)
        if (!node) throw new Error(`Node ${nodeArn} not found in graph for ${sourceEnv}`)

        console.log(`Syncer: ${getServiceType(node)}`)

        const syncSvc = new SyncService()
        const result = await syncSvc.push(
            node,
            nodeArn,
            targetArn,
            () =>
                accountSvc.resolveCredentials(sourceEnvironment).then((c) => ({
                    accessKeyId: c.accessKeyId,
                    secretAccessKey: c.secretAccessKey,
                    sessionToken: c.sessionToken
                })),
            () =>
                accountSvc.resolveCredentials(targetEnvironment).then((c) => ({
                    accessKeyId: c.accessKeyId,
                    secretAccessKey: c.secretAccessKey,
                    sessionToken: c.sessionToken
                })),
            {
                remapping: graphSvc.buildRemapping(sourceEnv, targetEnv)
            }
        )

        if (result.ok) {
            console.log('✓ Sync successful')
            if (result.changes.length) {
                console.log('Changes:')
                for (const c of result.changes) console.log(`  + ${c}`)
            }
            if (result.skipped.length) {
                console.log('Skipped:')
                for (const s of result.skipped) console.log(`  - ${s}`)
            }
        } else {
            console.error(`✗ Sync failed: ${result.error}`)
            process.exit(1)
        }
    })

syncCmd
    .command('list-syncers')
    .description('List available syncers')
    .action(() => {
        const syncSvc = new SyncService()
        const keys = syncSvc.listSyncers()
        if (keys.length === 0) {
            console.log('No syncers registered.')
            return
        }
        console.table(keys.map((k) => ({ key: k })))
    })

// ─── EXPORT command ──────────────────────────────────────────────────────────

const exportCmd = new Command('export')
exportCmd.description('Export CDK projects')

exportCmd
    .command('cdk')
    .description('Generate a CDK TypeScript project from graph data')
    .argument('<env-id>', 'Environment ID')
    .argument('<output-dir>', 'Output directory')
    .option('--stack-name <name>', 'CDK stack name', 'AwsyncStack')
    .option('--no-artifacts', 'Skip Lambda artifact download')
    .option('--use-env <env-id>', 'Target environment ID — merges graphs and uses its account ID for CDK')
    .option('--split-by <mode>', 'Stack split mode: none|flows|clusters (default: none)')
    .action(async (envId, outputDir, opts) => {
        const accountSvc = getAccountService()
        const graphSvc = getGraphService()

        const env = envOrThrow(envId)

        // Single source of truth for graph prep: load/merge + filter + accountId.
        const { graph, targetAccountId } = ExportService.prepareGraph(envId, opts.useEnv, graphSvc)

        const mapping = graphSvc.loadMapping()

        const result = ExportService.generate(graph, opts.stackName, mapping, targetAccountId, opts.splitBy as any)

        console.log(`Generated ${result.files.length} files`)
        for (const f of result.files) {
            console.log(`  ${f.path}`)
        }

        // Write files
        ExportService.writeFiles(result.files, outputDir)
        console.log(`\nProject written to: ${outputDir}`)

        // Download artifacts if requested
        if (opts.artifacts && result.artifacts?.length) {
            console.log(`\nDownloading ${result.artifacts.length} Lambda artifact(s)...`)
            const rawCreds = await accountSvc.resolveCredentials(env)
            const dlResult = await ExportService.downloadArtifacts(
                result.artifacts,
                rawCreds,
                outputDir
            )
            if (dlResult.errors.length) {
                console.log('Artifact errors:')
                for (const e of dlResult.errors) console.log(`  ✗ ${e.id}: ${e.error}`)
            } else {
                console.log('✓ All artifacts downloaded.')
            }
        }

        return result
    })

exportCmd
    .command('validate')
    .description('Validate a generated CDK project (npm install + cdk synth)')
    .argument('<dir>', 'CDK project directory')
    .action(async (dir) => {
        console.log('Installing dependencies...')
        const result = await ExportService.validate(dir)

        if (result.ok) {
            console.log('✓ CDK synth succeeded')
            if (result.output) {
                console.log(result.output.slice(0, 500))
            }
        } else {
            console.error('✗ CDK synth failed:')
            console.error(result.output)
            process.exit(1)
        }
    })

exportCmd
    .command('fix-flows')
    .description('Patch contact flow ARN references in target Connect instance after same-account copy')
    .requiredOption('--source-instance-id <uuid>', 'Source Connect instance UUID')
    .requiredOption('--target-instance-id <uuid>', 'Target Connect instance UUID')
    .requiredOption('--region <region>', 'AWS region')
    .requiredOption('--profile <profile>', 'AWS profile name')
    .action(async (opts) => {
        const {
            ConnectClient,
            ListContactFlowsCommand,
            DescribeContactFlowCommand,
            UpdateContactFlowContentCommand,
            ContactFlowType
        } = await import('@aws-sdk/client-connect')
        const { fromIni } = await import('@aws-sdk/credential-provider-ini')

        const credentials = fromIni({ profile: opts.profile })
        const client = new ConnectClient({ region: opts.region, credentials })

        let nextToken: string | undefined
        let patched = 0
        let skipped = 0
        let errors = 0

        console.log(`Scanning contact flows in ${opts.targetInstanceId}...`)
        do {
            const listResult = await client.send(
                new ListContactFlowsCommand({
                    InstanceId: opts.targetInstanceId,
                    NextToken: nextToken,
                    MaxResults: 60
                })
            )
            for (const flow of listResult.ContactFlowSummaryList ?? []) {
                try {
                    const describe = await client.send(
                        new DescribeContactFlowCommand({
                            InstanceId: opts.targetInstanceId,
                            ContactFlowId: flow.Id!
                        })
                    )
                    const content = describe.ContactFlow?.Content
                    if (!content || !content.includes(opts.sourceInstanceId)) {
                        skipped++
                        continue
                    }
                    const newContent = content.split(opts.sourceInstanceId).join(opts.targetInstanceId)
                    await client.send(
                        new UpdateContactFlowContentCommand({
                            InstanceId: opts.targetInstanceId,
                            ContactFlowId: flow.Id!,
                            Content: newContent
                        })
                    )
                    patched++
                    console.log(`  ✓ Patched: ${flow.Name}`)
                } catch (err) {
                    errors++
                    console.error(`  ✗ Error patching ${flow.Name}: ${err instanceof Error ? err.message : String(err)}`)
                }
            }
            nextToken = listResult.NextToken
        } while (nextToken)

        console.log(`\nDone: ${patched} patched, ${skipped} skipped, ${errors} errors`)
        if (errors > 0) process.exit(1)
    })

exportCmd
    .command('preview')
    .description('Preview generated files without writing to disk')
    .argument('<env-id>', 'Environment ID')
    .option('--stack-name <name>', 'CDK stack name', 'AwsyncStack')
    .option('--file <path>', 'Show only a specific file')
    .action((envId, opts) => {
        const graphSvc = getGraphService()
        const graph = graphSvc.load(envId)
        const mapping = graphSvc.loadMapping()

        const result = ExportService.generate(graph, opts.stackName, mapping)

        if (opts.file) {
            const file = result.files.find((f) => f.path === opts.file)
            if (!file) {
                console.error(`File "${opts.file}" not found in generated project.`)
                console.log('Available files:')
                for (const f of result.files) console.log(`  ${f.path}`)
                process.exit(1)
            }
            console.log(`--- ${file.path} ---`)
            console.log(file.content)
        } else {
            console.log(`Project: ${opts.stackName} (${result.files.length} files)\n`)
            for (const file of result.files) {
                console.log(`=== ${file.path} (${file.content.length} chars) ===`)
                console.log(file.content.slice(0, 800))
                if (file.content.length > 800) {
                    console.log(`... (${file.content.length - 800} more chars)`)
                }
                console.log()
            }
        }
    })

// ─── LIST command ────────────────────────────────────────────────────────────

const listCmd = new Command('list')
listCmd.description('List AWS resources for an environment (like GUI browse)')
listCmd
    .argument('<service>', 'Service type (e.g. connect, lambda, dynamodb)')
    .argument('<env-id>', 'Environment ID')
    .option('--region <region>', 'Override region')
    .action(async (service, envId, opts) => {
        const env = envOrThrow(envId)

        // Use the registry-based list from discovery resolvers
        const { initRegistry } = await import('../main/discovery/registry')
        const accountSvc = getAccountService()
        const rawCreds = await accountSvc.resolveCredentials(env)
        const credsFn = () =>
            Promise.resolve({
                accessKeyId: rawCreds.accessKeyId,
                secretAccessKey: rawCreds.secretAccessKey,
                sessionToken: rawCreds.sessionToken
            })

        const registry = await initRegistry(credsFn)
        const [svc, resourceType] = service.split(':')
        let resolver = registry.byService(svc, resourceType || '')

        // If no exact match and no resourceType specified, try finding by service prefix
        if (!resolver && !resourceType) {
            for (const r of registry.all()) {
                if (r.service === svc && r.list) {
                    resolver = r
                    break
                }
            }
        }

        if (!resolver?.list) {
            console.error(`No list capability for "${service}".`)
            process.exit(1)
        }

        const regions = opts.region ? [opts.region] : env.regions || [env.region]
        const accountId = env.accountId || ''

        try {
            const resources = await resolver.list(regions, accountId)
            if (!resources?.length) {
                console.log('No resources found.')
                return
            }
            console.table(
                resources.map((r: any) => ({
                    arn: r.arn,
                    name: r.name,
                    type: r.type || '-'
                }))
            )
        } catch (err) {
            console.error(`List failed: ${err instanceof Error ? err.message : String(err)}`)
            process.exit(1)
        }
    })

// ─── LINK command ────────────────────────────────────────────────────────────

const linkCmd = new Command('link')
linkCmd.description('Manage resource links between environments')

linkCmd
    .command('add')
    .description('Create or update a link merging two ARNs under a unified logicalId')
    .requiredOption('--source-arn <arn>', 'Source resource ARN')
    .requiredOption('--target-arn <arn>', 'Target resource ARN')
    .requiredOption('--unified-id <id>', 'Unified logical ID for the merged node')
    .option('--source-env <id>', 'Source environment ID')
    .option('--target-env <id>', 'Target environment ID')
    .option('--label <label>', 'Human-readable label for the link')
    .action((opts) => {
        const linkSvc = new LinkService()
        const r = linkSvc.addSources(opts.unifiedId, opts.label, [
            { arn: opts.sourceArn, envId: opts.sourceEnv ?? '', included: true },
            { arn: opts.targetArn, envId: opts.targetEnv ?? '', included: false },
        ])
        const total = linkSvc.list().length
        console.log(
            `Link "${opts.unifiedId}" ${r.created ? 'created' : 'updated'} ` +
            `(+${r.added} source(s), ${r.deduped} deduped, ${total} total link(s))`
        )
    })

linkCmd
    .command('auto-link')
    .description('Auto-link matching resources between two environments by name and type')
    .argument('<source-env>', 'Source environment ID')
    .argument('<target-env>', 'Target environment ID')
    .action((sourceEnv, targetEnv) => {
        const graphSvc = getGraphService()
        const linkSvc = new LinkService()

        const sourceGraph = graphSvc.load(sourceEnv)
        const targetGraph = graphSvc.load(targetEnv)

        // Build index of target nodes by (service:resourceType, label)
        const targetIndex = new Map<string, typeof Array.prototype[0]>()
        for (const node of targetGraph.nodes.values()) {
            const svcType = getServiceType(node)
            const key = `${svcType}::${node.label}`
            if (targetIndex.has(key)) {
                // Mark ambiguous — multiple targets with same key
                targetIndex.set(key, null)
            } else {
                targetIndex.set(key, node)
            }
        }

        const existingSourceArns = new Set(
            linkSvc.list().flatMap((l) => l.sources.map((s) => s.arn))
        )

        let added = 0
        let skipped = 0

        for (const sourceNode of sourceGraph.nodes.values()) {
            const sourceArn = sourceNode.arn?.raw
            if (!sourceArn || existingSourceArns.has(sourceArn)) continue

            const svcType = getServiceType(sourceNode)
            const key = `${svcType}::${sourceNode.label}`
            const targetNode = targetIndex.get(key)

            if (!targetNode) {
                if (targetIndex.has(key) && targetIndex.get(key) === null) {
                    console.warn(`  Skipped (ambiguous): ${sourceNode.label} (${svcType})`)
                }
                skipped++
                continue
            }

            const targetArn = (targetNode as any).arn?.raw
            if (!targetArn) { skipped++; continue }

            linkSvc.addSources(sourceNode.logicalId, sourceNode.label, [
                { arn: sourceArn, envId: sourceEnv, included: true },
                { arn: targetArn, envId: targetEnv, included: false },
            ])
            added++
        }

        console.log(`Auto-link complete: ${added} link(s) added, ${skipped} node(s) skipped`)
    })

linkCmd
    .command('fuzzy-link')
    .description('Auto-link resources between envs using fuzzy (normalized) name matching')
    .argument('<source-env>', 'Source environment ID')
    .argument('<target-env>', 'Target environment ID')
    .option('--cutoff <n>', 'Minimum similarity score 0-100 (default: 60)', '60')
    .option('--service <svc>', 'Limit to a specific service (e.g. connect)')
    .option('--resource-type <type>', 'Limit to a specific resource type (e.g. contact-flow)')
    .action((sourceEnv, targetEnv, opts) => {
        const graphSvc = getGraphService()
        const linkSvc = new LinkService()
        const cutoff = parseInt(opts.cutoff, 10) / 100

        const sourceGraph = graphSvc.load(sourceEnv)
        const targetGraph = graphSvc.load(targetEnv)

        // Normalize label for fuzzy comparison: lowercase, remove separators and prefixes
        const normalize = (s: string): string =>
            s.toLowerCase()
                .replace(/^cdtfa[-_]?/i, '')
                .replace(/[-_]/g, ' ')
                .replace(/\s+/g, ' ')
                .trim()

        // Build target index: normalized label → node (per resource type)
        const targetIndex = new Map<string, any>()
        for (const node of targetGraph.nodes.values()) {
            if (opts.service && node.arn?.service !== opts.service) continue
            if (opts.resourceType && node.arn?.resourceType !== opts.resourceType) continue
            const key = `${node.arn?.service}:${node.arn?.resourceType}::${normalize(node.label)}`
            if (targetIndex.has(key)) targetIndex.set(key, null)
            else targetIndex.set(key, node)
        }

        const existingSourceArns = new Set(linkSvc.list().flatMap((l) => l.sources.map((s) => s.arn)))
        let added = 0, skipped = 0

        for (const sourceNode of sourceGraph.nodes.values()) {
            const sourceArn = sourceNode.arn?.raw
            if (!sourceArn || existingSourceArns.has(sourceArn)) { skipped++; continue }
            if (opts.service && sourceNode.arn?.service !== opts.service) { skipped++; continue }
            if (opts.resourceType && sourceNode.arn?.resourceType !== opts.resourceType) { skipped++; continue }

            const normSrc = normalize(sourceNode.label)
            const svcType = `${sourceNode.arn?.service}:${sourceNode.arn?.resourceType}`

            // Try exact normalized match first
            const exactKey = `${svcType}::${normSrc}`
            let targetNode = targetIndex.get(exactKey) ?? null

            // If no exact match, find best fuzzy match among same-service:type nodes.
            // Scoring: max(Levenshtein ratio, Sørensen-Dice on whitespace tokens) —
            // handles typos AND word reordering / mid-string insertions.
            if (!targetNode) {
                let bestScore = cutoff
                for (const [key, node] of targetIndex) {
                    if (!key.startsWith(svcType + '::') || !node) continue
                    const normTgt = key.slice(svcType.length + 2)
                    const score = fuzzyScore(normSrc, normTgt)
                    if (score > bestScore) {
                        bestScore = score
                        targetNode = node
                    }
                }
            }

            if (!targetNode) { skipped++; continue }

            const targetArn = (targetNode as any).arn?.raw
            if (!targetArn) { skipped++; continue }

            const existing = linkSvc.list().find((l) => l.unifiedId === sourceNode.logicalId)
            const existingArns = new Set(existing?.sources.map((s: any) => s.arn) ?? [])
            const sources = [...(existing?.sources ?? [])]
            if (!existingArns.has(sourceArn)) sources.push({ arn: sourceArn, envId: sourceEnv, included: true })
            if (!existingArns.has(targetArn)) sources.push({ arn: targetArn, envId: targetEnv, included: false })

            linkSvc.upsert({ unifiedId: sourceNode.logicalId, label: sourceNode.label, sources })
            added++
        }

        console.log(`Fuzzy-link complete: ${added} link(s) added, ${skipped} node(s) skipped`)
    })

linkCmd
    .command('list')
    .description('List all resource links')
    .action(() => {
        const linkSvc = new LinkService()
        const links = linkSvc.list()
        if (links.length === 0) {
            console.log('No links configured.')
            return
        }
        console.table(
            links.map((l) => ({
                unifiedId: l.unifiedId,
                label: l.label || '-',
                sources: l.sources.length
            }))
        )
    })

linkCmd
    .command('stats')
    .description('Show link statistics')
    .option('--env <id>', 'Filter links that reference an environment\'s ARNs')
    .action((opts) => {
        const linkSvc = new LinkService()
        const { total, withEnv } = linkSvc.stats(opts.env)
        console.log(`Total links:    ${total}`)
        if (opts.env) {
            console.log(`With env "${opts.env}": ${withEnv}`)
        }
        const links = linkSvc.list()
        const crossEnv = links.filter((l) => l.sources.length >= 2).length
        console.log(`Cross-env:      ${crossEnv}`)
        console.log(`Single-source:  ${total - crossEnv}`)
    })

// ─── Register commands ──────────────────────────────────────────────────────

program.addCommand(envCmd)
program.addCommand(discoverCmd)
program.addCommand(graphCmd)
program.addCommand(mappingCmd)
program.addCommand(syncCmd)
program.addCommand(exportCmd)
program.addCommand(listCmd)
program.addCommand(linkCmd)

program.parse()
