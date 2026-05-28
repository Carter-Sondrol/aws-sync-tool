import { electronApp, is, optimizer } from '@electron-toolkit/utils'
import { exec } from 'child_process'
import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron'
import { mkdirSync, readFileSync, writeFileSync } from 'fs'
import { dirname, join } from 'path'
import { promisify } from 'util'
import icon from '../../resources/icon.png?asset'
import { parseARN } from './discovery/arn'
import { DiscoveryEngine } from './discovery/engine'
import { Graph } from './graph'
import { initRegistry } from './discovery/registry'
import { downloadLambdaArtifacts } from './export/artifact-downloader'
import { generateCdkProject } from './export/cdk-generator'
import type {
    DiscoveryProgress,
    GraphNode,
    MappingTable,
    ResourceMapping
} from './graph-types'
import { ElectronDataStore } from './store'
import { GraphService } from './service/graph-service'
import { getSyncer } from './sync/index'
import { buildRemappingContext } from './sync/remapping'
import { readJSON, setDataStore, writeJSON } from './utils'
import { setCacheDir } from './discovery/fetch-cache'
import '@smithy/types'
import { GetCallerIdentityCommand, STSClient } from '@aws-sdk/client-sts'
import { fromIni } from '@aws-sdk/credential-provider-ini'
import { defaultProvider } from '@aws-sdk/credential-provider-node'
import type { AwsCredentialIdentity } from '@smithy/types'

const execAsync = promisify(exec)

// ─── Types (re-exported from shared module) ─────────────────────────────────
import type { DetectedSession, EnvironmentConfig } from './types'

export type { DetectedSession, EnvironmentConfig }

import { getAllRegions } from './types'

// ─── Environment store ─────────────────────────────────────────────────────────

const loadEnvironments = (): EnvironmentConfig[] =>
    readJSON<EnvironmentConfig[]>('environments.json', [])
const saveEnvironments = (environments: EnvironmentConfig[]) =>
    writeJSON('environments.json', environments)

// ─── Graph store ───────────────────────────────────────────────────────────────

/** Raw JSON format for persistence */
interface RawGraphData {
    nodes: Record<string, GraphNode>
    edges: any[]
    meta?: {
        visitedArns?: string[]
        seedArns?: string[]
        createdAt?: string
        updatedAt?: string
    }
}

function deserializeGraph(raw: unknown): Graph {
    if (!raw || typeof raw !== 'object') return new Graph()
    const g = raw as any
    if (!g.nodes) return new Graph()

    const nodes = new Map<string, GraphNode>()
    for (const [key, node] of Object.entries(g.nodes)) {
        const n = node as any
        let migrated = n

        // Migrate legacy status field
        if ('status' in n && typeof n.status === 'string') {
            const { status, ...rest } = n
            const included = status === 'synced' || status === 'referenced'
            const hidden = status === 'ignored'
            migrated = { ...rest, included, hidden }
        } else if (!('included' in n)) {
            migrated = { ...migrated, included: true, hidden: false }
        }

        // Migrate legacy string ARN to ParsedARN
        if (typeof migrated.arn === 'string') {
            const parsed = parseARN(migrated.arn)
            if (parsed) migrated = { ...migrated, arn: parsed }
        }

        // Parse string discoveredRefs ARNs
        if (Array.isArray(migrated.discoveredRefs)) {
            migrated.discoveredRefs = migrated.discoveredRefs.map((ref: any) => {
                if (typeof ref.arn === 'string') {
                    const parsed = parseARN(ref.arn)
                    return { ...ref, arn: parsed || ref.arn }
                }
                return ref
            })
        }

        // Parse string resolvedRefs ARNs
        if (Array.isArray(migrated.resolvedRefs)) {
            migrated.resolvedRefs = migrated.resolvedRefs.map((ref: any) => {
                if (typeof ref.originalArn === 'string') {
                    const parsed = parseARN(ref.originalArn)
                    return { ...ref, originalArn: parsed || ref.originalArn }
                }
                return ref
            })
        }

        nodes.set(key, migrated as GraphNode)
    }

    const graph = new Graph()
    graph.nodes = nodes
    graph.edges = g.edges ?? []
    graph.metadata = {
        visitedARNs: new Set(g.meta?.visitedArns ?? g.metadata?.visitedARNs ?? []),
        seedArns: g.meta?.seedArns ?? g.metadata?.seedArns ?? [],
        createdAt: g.meta?.createdAt ?? g.metadata?.createdAt,
        updatedAt: g.meta?.updatedAt ?? g.metadata?.updatedAt
    }
    return graph
}

function graphToRaw(graph: Graph): RawGraphData {
    const nodes: Record<string, GraphNode> = {}
    for (const [key, node] of graph.nodes) {
        nodes[key] = node
    }
    return {
        nodes,
        edges: graph.edges,
        meta: {
            visitedArns: Array.from(graph.metadata.visitedARNs),
            seedArns: graph.metadata.seedArns,
            createdAt: graph.metadata.createdAt,
            updatedAt: graph.metadata.updatedAt
        }
    }
}

type AllRawGraphs = Record<string, RawGraphData>

function migrateRawGraphs(raw: unknown): AllRawGraphs {
    if (!raw || typeof raw !== 'object') return {}
    if ('nodes' in (raw as object)) {
        const envs = loadEnvironments()
        const primaryId = envs[0]?.id
        if (!primaryId) {
            console.warn('[graphs] legacy graph.json found but no environments exist — dropping')
            return {}
        }
        return { [primaryId]: deserializeGraph(raw) as any }
    }
    return raw as AllRawGraphs
}

function loadGraphs(): Record<string, Graph> {
    const raw = readJSON<unknown>('graphs.json', null)
    const migratedRaw = raw ? migrateRawGraphs(raw) : {}
    const legacy = readJSON<unknown>('graph.json', null)
    if (legacy) Object.assign(migratedRaw, migrateRawGraphs(legacy))

    const result: Record<string, Graph> = {}
    for (const [envId, rawG] of Object.entries(migratedRaw)) {
        result[envId] = deserializeGraph(rawG)
    }
    return result
}

function saveGraphs(graphs: Record<string, Graph>): void {
    const serialized: Record<string, any> = {}
    for (const [envId, graph] of Object.entries(graphs)) {
        serialized[envId] = graphToRaw(graph)
    }
    writeJSON('graphs.json', serialized)
}

function loadGraph(envId: string): Graph {
    return loadGraphs()[envId] ?? new Graph()
}

function saveGraph(envId: string, graph: Graph): void {
    const all = loadGraphs()
    all[envId] = graph
    saveGraphs(all)
}

// ─── Mapping store ─────────────────────────────────────────────────────────────

function migrateMapping(raw: unknown): MappingTable {
    if (!raw || typeof raw !== 'object') return {}
    const obj = raw as Record<string, unknown>
    const keys = Object.keys(obj)
    if (keys.length === 0) return {}

    // Old format: outer keys are 12-digit AWS account IDs
    const looksLikeOldFormat = keys.some((k) => /^\d{12}$/.test(k))
    if (looksLikeOldFormat) {
        const environments = loadEnvironments()
        const migrated: MappingTable = {}
        for (const [awsAccountId, entries] of Object.entries(obj)) {
            const env = environments.find((e) => e.accountId === awsAccountId)
            if (env) {
                migrated[env.id] = entries as Record<string, ResourceMapping>
            } else {
                console.warn(`[mapping] no environment for accountId ${awsAccountId} — dropping`)
            }
        }
        return migrated
    }
    return obj as MappingTable
}

const loadMapping = (): MappingTable => migrateMapping(readJSON<unknown>('mapping.json', {}))
const saveMapping = (mapping: MappingTable) => writeJSON('mapping.json', mapping)

// ─── AWS Credential Helpers ────────────────────────────────────────────────────

async function validateWithSTS(
    profileName: string | undefined,
    region: string
): Promise<{
    valid: boolean
    accountId?: string
    arn?: string
    userName?: string
    error?: string
}> {
    try {
        const provider = profileName ? fromIni({ profile: profileName }) : defaultProvider()
        const creds = await provider()

        const client = new STSClient({
            region,
            credentials: {
                accessKeyId: creds.accessKeyId,
                secretAccessKey: creds.secretAccessKey,
                sessionToken: creds.sessionToken
            }
        })

        const response = await client.send(new GetCallerIdentityCommand({}))
        const arn = response.Arn || ''
        const userNameMatch = arn.match(/user\/([^/]+)/)
        const roleMatch = arn.match(/assumed-role\/([^/]+)/)

        return {
            valid: true,
            accountId: response.Account,
            arn,
            userName: userNameMatch?.[1] ?? roleMatch?.[1]
        }
    } catch (err) {
        return { valid: false, error: err instanceof Error ? err.message : String(err) }
    }
}

async function resolveCredentials(environment: EnvironmentConfig): Promise<AwsCredentialIdentity> {
    const { fromIni } = await import('@aws-sdk/credential-provider-ini')
    const { defaultProvider } = await import('@aws-sdk/credential-provider-node')
    const provider = environment.profileName
        ? fromIni({ profile: environment.profileName })
        : defaultProvider()
    return provider()
}

function parseProfileNames(): string[] {
    const profiles: string[] = []
    const home = process.env.HOME || process.env.USERPROFILE || ''
    const files = [join(home, '.aws', 'config'), join(home, '.aws', 'credentials')]
    for (const file of files) {
        try {
            const content = readFileSync(file, 'utf-8')
            const regex = /^\[(?:profile\s+)?([^\]]+)\]/gm
            let match: RegExpExecArray | null
            while ((match = regex.exec(content)) !== null) {
                const name = match[1].trim()
                if (name && name !== 'default' && !profiles.includes(name)) profiles.push(name)
            }
        } catch {
            // file not present
        }
    }
    return profiles
}

function getProfileRegion(profileName: string): string {
    const home = process.env.HOME || process.env.USERPROFILE || ''
    try {
        const content = readFileSync(join(home, '.aws', 'config'), 'utf-8')
        const sectionRe = new RegExp(
            `^\\[(?:profile\\s+)?${profileName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\]([\\s\\S]*?)(?=^\\[|$)`,
            'gm'
        )
        const section = sectionRe.exec(content)
        if (section) {
            const regionMatch = /region\s*=\s*(.+)/.exec(section[1])
            if (regionMatch) return regionMatch[1].trim()
        }
    } catch {
        // ignore
    }
    return process.env.AWS_DEFAULT_REGION || process.env.AWS_REGION || 'us-east-1'
}

// ─── Discovery state ───────────────────────────────────────────────────────────

const activeEngines: Map<string, DiscoveryEngine> = new Map()
let mainWindow: BrowserWindow | null = null

function pushProgress(envId: string, progress: DiscoveryProgress): void {
    mainWindow?.webContents.send('discovery:progress', { ...progress, envId })
}

// ─── IPC: Accounts ────────────────────────────────────────────────────────────

ipcMain.handle('accounts:list', (): EnvironmentConfig[] => loadEnvironments())

ipcMain.handle('accounts:add', (_e, account: EnvironmentConfig): EnvironmentConfig => {
    const accounts = loadEnvironments()
    const idx = accounts.findIndex((a) => a.id === account.id)
    if (idx >= 0) accounts[idx] = account
    else accounts.push(account)
    saveEnvironments(accounts)
    return account
})

ipcMain.handle('accounts:remove', (_e, id: string): void => {
    saveEnvironments(loadEnvironments().filter((a) => a.id !== id))
})

ipcMain.handle('accounts:validate', async (_e, id: string) => {
    const accounts = loadEnvironments()
    const account = accounts.find((a) => a.id === id)
    if (!account) return { valid: false, error: 'Account not found' }

    const result = await validateWithSTS(account.profileName, account.region)

    if (result.valid && result.accountId && !account.accountId) {
        account.accountId = result.accountId
        saveEnvironments(accounts.map((a) => (a.id === id ? account : a)))
    }
    return result
})

ipcMain.handle('accounts:detect-sessions', async (): Promise<DetectedSession[]> => {
    const results: DetectedSession[] = []
    const defaultRegion = process.env.AWS_DEFAULT_REGION || process.env.AWS_REGION || 'us-east-1'
    results.push({ source: 'default', ...(await validateWithSTS(undefined, defaultRegion)) })

    for (const profileName of parseProfileNames().slice(0, 20)) {
        const region = getProfileRegion(profileName)
        results.push({
            source: `profile:${profileName}`,
            region,
            ...(await validateWithSTS(profileName, region))
        })
    }
    return results
})

// ─── IPC: Graphs ──────────────────────────────────────────────────────────────

ipcMain.handle('graphs:get-all', () => {
    const graphs = loadGraphs()
    const result: Record<string, any> = {}
    for (const [envId, graph] of Object.entries(graphs)) {
        const nodes: Record<string, any> = {}
        const logicalIdToArn = new Map<string, string>()
        for (const [logicalId, node] of graph.nodes) {
            const arnStr = typeof node.arn === 'string' ? node.arn : node.arn.raw
            logicalIdToArn.set(logicalId, arnStr)
            nodes[arnStr] = {
                logicalId: node.logicalId,
                label: node.label,
                arn: arnStr,
                service: typeof node.arn === 'string' ? '' : node.arn.service,
                resourceType: typeof node.arn === 'string' ? '' : node.arn.resourceType,
                cfnType: node.cfnType,
                included: node.included,
                hidden: node.hidden,
                discoveryState: 'resolved',
                classification: node.classification ?? 'resource',
                data: node.data,
                referencedArns: (node.discoveredRefs ?? []).map((r: any) =>
                    typeof r.arn === 'string' ? r.arn : r.arn.raw
                ),
                paramConfig: node.paramConfig,
                stackId: node.stackId,
                error: node.error
            }
        }
        result[envId] = {
            nodes,
            edges: graph.edges.map((e) => ({
                id: e.id,
                source: logicalIdToArn.get(e.sourceLogicalId) ?? e.sourceLogicalId,
                target: logicalIdToArn.get(e.targetLogicalId) ?? e.targetLogicalId,
                type: e.type,
                labels: [],
                sourceParam: e.sourcePath?.join('.')
            })),
            metadata: {
                visitedARNs: Array.from(graph.metadata.visitedARNs),
                seedArns: graph.metadata.seedArns,
                createdAt: graph.metadata.createdAt,
                updatedAt: graph.metadata.updatedAt
            }
        }
    }
    return result
})

ipcMain.handle('graphs:save', (_e, envId: string, graph: Graph): void => {
    saveGraph(envId, graph)
})

ipcMain.handle('graphs:clear', (_e, envId?: string): void => {
    if (envId) {
        saveGraph(envId, new Graph())
    } else {
        saveGraphs({})
        saveMapping({})
    }
})

// ─── IPC: Mapping ─────────────────────────────────────────────────────────────

ipcMain.handle('mapping:get', (): MappingTable => loadMapping())

ipcMain.handle('mapping:save', (_e, mapping: MappingTable): void => saveMapping(mapping))

// ─── IPC: Discovery ───────────────────────────────────────────────────────────

ipcMain.handle(
    'discovery:start',
    async (
        _e,
        envId: string,
        seedArns: string[],
        excludeResourceTypes: string[] = [],
        maxDepth: number = 2
    ): Promise<{ ok: boolean; error?: string }> => {
        const environments = loadEnvironments()
        const environment = environments.find((e) => e.id === envId)
        if (!environment) return { ok: false, error: 'Environment not found' }

        activeEngines.get(envId)?.cancel()
        activeEngines.delete(envId)

        const engine = new DiscoveryEngine()
        activeEngines.set(envId, engine)
        engine.setProgressCallback((p) => pushProgress(envId, p))

        const existingGraph = loadGraph(envId)

        resolveCredentials(environment)
            .then((rawCreds) => {
                const credsFn = () =>
                    Promise.resolve({
                        accessKeyId: rawCreds.accessKeyId,
                        secretAccessKey: rawCreds.secretAccessKey,
                        sessionToken: rawCreds.sessionToken
                    })

                return resolveDiscoverySeeds(seedArns, environment, {
                    accessKeyId: rawCreds.accessKeyId,
                    secretAccessKey: rawCreds.secretAccessKey,
                    sessionToken: rawCreds.sessionToken
                }).then((resolvedSeeds) =>
                    engine.discover(credsFn, resolvedSeeds, existingGraph, {
                        excludeResourceTypes: excludeResourceTypes.map((v) =>
                            v.trim().toLowerCase()
                        ),
                        maxDepth
                    })
                )
            })
            .then((graph) => {
                if (!engine.getProgress().phase.includes('idle')) {
                    saveGraph(envId, graph)
                    pushProgress(envId, {
                        phase: 'complete',
                        resolved: engine.getProgress().resolved,
                        total: engine.getProgress().total
                    })
                    mainWindow?.webContents.send('graph:updated', { envId })
                }
                if (activeEngines.get(envId) === engine) activeEngines.delete(envId)
            })
            .catch((err) => {
                console.error('[discovery] error:', err)
                pushProgress(envId, { phase: 'error', resolved: 0, total: 0, error: String(err) })
                if (activeEngines.get(envId) === engine) activeEngines.delete(envId)
            })

        return { ok: true }
    }
)

ipcMain.handle('discovery:cancel', (_e, envId?: string): void => {
    if (envId) {
        activeEngines.get(envId)?.cancel()
        activeEngines.delete(envId)
        pushProgress(envId, { phase: 'idle', resolved: 0, total: 0 })
    } else {
        for (const [id, engine] of activeEngines.entries()) {
            engine.cancel()
            pushProgress(id, { phase: 'idle', resolved: 0, total: 0 })
        }
        activeEngines.clear()
    }
})

ipcMain.handle(
    'discovery:start-all',
    async (
        _e,
        envIds: string[],
        seedArns: string[],
        excludeResourceTypes: string[] = [],
        maxDepth: number = 2
    ): Promise<{ ok: boolean; error?: string }> => {
        const environments = loadEnvironments()
        if (envIds.length === 0) return { ok: false, error: 'No environments selected' }

        for (const envId of envIds) {
            const environment = environments.find((e) => e.id === envId)
            if (!environment) continue

            activeEngines.get(envId)?.cancel()
            activeEngines.delete(envId)

            const engine = new DiscoveryEngine()
            activeEngines.set(envId, engine)
            engine.setProgressCallback((p) => pushProgress(envId, p))

            const existingGraph = loadGraph(envId)

            try {
                const rawCreds = await resolveCredentials(environment)
                const credsFn = () =>
                    Promise.resolve({
                        accessKeyId: rawCreds.accessKeyId,
                        secretAccessKey: rawCreds.secretAccessKey,
                        sessionToken: rawCreds.sessionToken
                    })

                const resolvedSeeds = await resolveDiscoverySeeds(seedArns, environment, {
                    accessKeyId: rawCreds.accessKeyId,
                    secretAccessKey: rawCreds.secretAccessKey,
                    sessionToken: rawCreds.sessionToken
                })

                const graph = await engine.discover(credsFn, resolvedSeeds, existingGraph, {
                    excludeResourceTypes: excludeResourceTypes.map((v) => v.trim().toLowerCase()),
                    maxDepth
                })

                if (!engine.getProgress().phase.includes('idle')) {
                    saveGraph(envId, graph)
                    pushProgress(envId, {
                        phase: 'complete',
                        resolved: engine.getProgress().resolved,
                        total: engine.getProgress().total
                    })
                    mainWindow?.webContents.send('graph:updated', { envId })
                }
                if (activeEngines.get(envId) === engine) activeEngines.delete(envId)
            } catch (err) {
                console.error(`[discovery:${envId}] error:`, err)
                pushProgress(envId, { phase: 'error', resolved: 0, total: 0, error: String(err) })
                if (activeEngines.get(envId) === engine) activeEngines.delete(envId)
            }
        }

        return { ok: true }
    }
)

interface ListedResource {
    arn: string
    name: string
    type?: string
}

async function getCallerAccountId(
    creds: { accessKeyId: string; secretAccessKey: string; sessionToken?: string },
    region: string
): Promise<string> {
    try {
        const { STSClient, GetCallerIdentityCommand } = await import('@aws-sdk/client-sts')
        const client = new STSClient({ region, credentials: creds })
        const res = await client.send(new GetCallerIdentityCommand({}))
        return res.Account ?? ''
    } catch {
        return ''
    }
}

async function resolveDiscoverySeeds(
    seedInputs: string[],
    environment: EnvironmentConfig,
    creds: { accessKeyId: string; secretAccessKey: string; sessionToken?: string }
): Promise<string[]> {
    const region = getAllRegions(environment)[0] || 'us-west-2'
    const accountId = environment.accountId || (await getCallerAccountId(creds, region))
    const resolvedSeeds = new Set<string>()

    async function dynamoTableExists(tableName: string): Promise<boolean> {
        try {
            const { DynamoDBClient, DescribeTableCommand } = await import(
                '@aws-sdk/client-dynamodb'
            )
            const client = new DynamoDBClient({ region, credentials: creds })
            await client.send(new DescribeTableCommand({ TableName: tableName }))
            return true
        } catch {
            return false
        }
    }

    async function s3BucketExists(bucketName: string): Promise<boolean> {
        try {
            const { S3Client, HeadBucketCommand } = await import('@aws-sdk/client-s3')
            const client = new S3Client({ region: 'us-east-1', credentials: creds })
            await client.send(new HeadBucketCommand({ Bucket: bucketName }))
            return true
        } catch {
            return false
        }
    }

    for (const rawSeed of seedInputs) {
        const seed = rawSeed.trim()
        if (!seed) continue
        if (seed.startsWith('arn:')) {
            resolvedSeeds.add(seed)
            continue
        }

        const s3Name = seed.match(/^(?:s3:\/\/|s3:|bucket:)([^/:\s]+)$/)?.[1]
        if (s3Name) {
            resolvedSeeds.add(`arn:aws:s3:::${s3Name}`)
            continue
        }

        const tableName = seed.match(/^(?:dynamodb:|ddb:|table:)(?:table\/)?([^/:\s]+)$/)?.[1]
        if (tableName) {
            resolvedSeeds.add(`arn:aws:dynamodb:${region}:${accountId}:table/${tableName}`)
            continue
        }

        const [looksLikeDynamoTable, looksLikeS3Bucket] = await Promise.all([
            dynamoTableExists(seed),
            s3BucketExists(seed)
        ])

        if (looksLikeDynamoTable) {
            resolvedSeeds.add(`arn:aws:dynamodb:${region}:${accountId}:table/${seed}`)
        }
        if (looksLikeS3Bucket) {
            resolvedSeeds.add(`arn:aws:s3:::${seed}`)
        }
    }

    return Array.from(resolvedSeeds)
}

// Maps IPC service keys to their registry resolver keys for list() dispatch
const LIST_RESOLVER_MAP: Record<string, string> = {
    lambda: 'lambda:function',
    dynamodb: 'dynamodb:table',
    s3: 's3:bucket',
    'iam:role': 'iam:role',
    'iam:policy': 'iam:policy',
    connect: 'connect:instance',
    cloudformation: 'cloudformation:stack',
    'apigateway:restapis': 'apigateway:restapis',
    'apigateway:apis': 'apigateway:apis',
    sqs: 'sqs:queue',
    sns: 'sns:topic',
    secretsmanager: 'secretsmanager:secret',
    ssm: 'ssm:parameter',
    eventbridge: 'events:rule',
    stepfunctions: 'states:stateMachine',
    kms: 'kms:key',
    kinesis: 'kinesis:stream',
    cloudfront: 'cloudfront:distribution'
}

ipcMain.handle(
    'discovery:list-service',
    async (
        _e,
        envId: string,
        service: string,
        browseRegion?: string
    ): Promise<ListedResource[]> => {
        const environments = loadEnvironments()
        const environment = environments.find((e) => e.id === envId)
        if (!environment) return []

        const rawCreds = await resolveCredentials(environment)
        const creds = {
            accessKeyId: rawCreds.accessKeyId,
            secretAccessKey: rawCreds.secretAccessKey,
            sessionToken: rawCreds.sessionToken
        }
        const allRegions = getAllRegions(environment)
        const region = browseRegion || allRegions[0] || 'us-west-2'
        const regions = browseRegion ? [browseRegion] : allRegions

        // Dispatch through registry for primary service types
        const resolverKey = LIST_RESOLVER_MAP[service]
        if (resolverKey) {
            const registry = await initRegistry(() => Promise.resolve(creds))
            const [svc, resourceType] = resolverKey.split(':')
            const resolver = registry.byService(svc, resourceType)
            if (!resolver?.list) return []
            const acctId = environment.accountId || (await getCallerAccountId(creds, region))
            return resolver.list(regions, acctId)
        }

        // Connect sub-resources require cross-cutting enumeration (instance → children).
        // Each entry describes how to list a sub-resource type under all Connect instances.
        type ConnectSubresourceConfig = {
            commandName: string // named export from @aws-sdk/client-connect to construct
            listKey: string // property on the response containing the result array
            arnKey: string // property on each item for the ARN ('Arn' or 'RuleArn')
            nameKey: string // primary display-name field
            idKey: string // fallback id field when nameKey is undefined
        }
        const CONNECT_SUBRESOURCE_CONFIGS: Record<string, ConnectSubresourceConfig> = {
            'connect:queues': {
                commandName: 'ListQueuesCommand',
                listKey: 'QueueSummaryList',
                arnKey: 'Arn',
                nameKey: 'Name',
                idKey: 'Id'
            },
            'connect:contact-flows': {
                commandName: 'ListContactFlowsCommand',
                listKey: 'ContactFlowSummaryList',
                arnKey: 'Arn',
                nameKey: 'Name',
                idKey: 'Id'
            },
            'connect:routing-profiles': {
                commandName: 'ListRoutingProfilesCommand',
                listKey: 'RoutingProfileSummaryList',
                arnKey: 'Arn',
                nameKey: 'Name',
                idKey: 'Id'
            },
            'connect:agent-statuses': {
                commandName: 'ListAgentStatusesCommand',
                listKey: 'AgentStatusSummaryList',
                arnKey: 'Arn',
                nameKey: 'Name',
                idKey: 'Id'
            },
            'connect:security-profiles': {
                commandName: 'ListSecurityProfilesCommand',
                listKey: 'SecurityProfileSummaryList',
                arnKey: 'Arn',
                nameKey: 'Name',
                idKey: 'Id'
            },
            'connect:hierarchy-groups': {
                commandName: 'ListUserHierarchyGroupsCommand',
                listKey: 'UserHierarchyGroupSummaryList',
                arnKey: 'Arn',
                nameKey: 'Name',
                idKey: 'Id'
            },
            'connect:rules': {
                commandName: 'ListRulesCommand',
                listKey: 'RuleSummaryList',
                arnKey: 'RuleArn',
                nameKey: 'Name',
                idKey: 'RuleId'
            },
            'connect:task-templates': {
                commandName: 'ListTaskTemplatesCommand',
                listKey: 'TaskTemplates',
                arnKey: 'Arn',
                nameKey: 'Name',
                idKey: 'Id'
            }
        }

        const config = CONNECT_SUBRESOURCE_CONFIGS[service]
        if (!config) return []

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const connectModule = await import('@aws-sdk/client-connect') as any
        const { ConnectClient, ListInstancesCommand } = connectModule
        const ListCmd = connectModule[config.commandName]
        if (!ListCmd) throw new Error(`[connect] unknown SDK command: ${config.commandName}`)

        const results: ListedResource[] = []
        await Promise.allSettled(
            regions.map(async (r) => {
                const client = new ConnectClient({ region: r, credentials: creds })
                const instancesRes = await client.send(
                    new ListInstancesCommand({ MaxResults: 100 })
                )
                await Promise.allSettled(
                    (instancesRes.InstanceSummaryList ?? []).map(async (inst: any) => {
                        if (!inst.Id) return
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        const res = await client.send(new ListCmd({ InstanceId: inst.Id }) as any)
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        ;(res[config.listKey] ?? []).forEach((item: any) => {
                            const arn = item[config.arnKey]
                            if (arn)
                                results.push({
                                    arn,
                                    name: item[config.nameKey] ?? item[config.idKey] ?? arn,
                                    type: inst.InstanceAlias ?? inst.Id ?? 'instance'
                                })
                        })
                    })
                )
            })
        )
        return results
    }
)

ipcMain.handle(
    'discovery:progress',
    (_e, envId?: string): DiscoveryProgress | Record<string, DiscoveryProgress> => {
        if (envId) {
            return (
                activeEngines.get(envId)?.getProgress() ?? { phase: 'idle', resolved: 0, total: 0 }
            )
        }
        const all = {}
        for (const [id, engine] of activeEngines.entries()) {
            all[id] = engine.getProgress()
        }
        return all
    }
)

// ─── IPC: Export ──────────────────────────────────────────────────────────────

ipcMain.handle(
    'export:cdk',
    async (
        _e,
        outputDir: string,
        stackName: string,
        envId: string
    ): Promise<{
        ok: boolean
        error?: string
        artifactErrors?: Array<{ id: string; error: string }>
    }> => {
        try {
            const graphService = new GraphService()
            const allEnvIds = loadEnvironments()
                .map((e) => e.id)
                .filter((id) => graphService.load(id).nodes.size > 0)

            const graph = allEnvIds.length > 0
                ? graphService.merge(allEnvIds)
                : loadGraph(envId)

            const targetAccountId = graphService.getAccountId(envId) ?? ''
            const mapping = loadMapping()
            const nodes = Array.from(graph.nodes.values())
            const { files, artifacts } = generateCdkProject({
                nodes,
                edges: graph.edges,
                stackName,
                mapping,
                targetAccountId,
            })

            for (const file of files) {
                const filePath = join(outputDir, file.path)
                mkdirSync(dirname(filePath), { recursive: true })
                writeFileSync(filePath, file.content, 'utf-8')
            }

            let artifactErrors: Array<{ id: string; error: string }> = []
            if (envId && artifacts.length > 0) {
                try {
                    const environments = loadEnvironments()
                    const environment = environments.find((e) => e.id === envId)
                    if (!environment) {
                        artifactErrors = artifacts.map((a) => ({
                            id: a.id,
                            error: 'Environment not found'
                        }))
                    } else {
                        const creds = await resolveCredentials(environment)
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
)

ipcMain.handle(
    'export:validate',
    async (_e, outputDir: string): Promise<{ ok: boolean; output: string }> => {
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
)

// ─── IPC: Sync ────────────────────────────────────────────────────────────────

ipcMain.handle(
    'sync:push',
    async (_e, sourceEnvId: string, nodeArn: string, targetEnvId: string, targetArn: string) => {
        const environments = loadEnvironments()
        const sourceEnvironment = environments.find((e) => e.id === sourceEnvId)
        const targetEnvironment = environments.find((e) => e.id === targetEnvId)
        if (!sourceEnvironment)
            return { ok: false, changes: [], skipped: [], error: 'Source environment not found' }
        if (!targetEnvironment)
            return { ok: false, changes: [], skipped: [], error: 'Target environment not found' }

        const graph = loadGraph(sourceEnvId)
        const node = graph.getNodeByArn(nodeArn)
        if (!node) return { ok: false, changes: [], skipped: [], error: 'Node not found in graph' }

        const syncerKey = `${node.service}:${node.resourceType}`
        const syncer = getSyncer(syncerKey)
        if (!syncer)
            return {
                ok: false,
                changes: [],
                skipped: [],
                error: `No syncer registered for ${syncerKey}`
            }

        const sourceCreds = () =>
            resolveCredentials(sourceEnvironment).then((c) => ({
                accessKeyId: c.accessKeyId,
                secretAccessKey: c.secretAccessKey,
                sessionToken: c.sessionToken
            }))
        const targetCreds = () =>
            resolveCredentials(targetEnvironment).then((c) => ({
                accessKeyId: c.accessKeyId,
                secretAccessKey: c.secretAccessKey,
                sessionToken: c.sessionToken
            }))

        // Build remapping context from mapping table for cross-instance ID resolution
        const mappingTable = readJSON<Record<string, Record<string, { arn?: string }>>>(
            'mapping.json',
            {}
        )
        const sourceGraphNodes = new Map<string, GraphNode>(graph.nodes)
        const remapping = buildRemappingContext(mappingTable, targetEnvId, sourceGraphNodes)

        try {
            return await syncer.push(node.data, nodeArn, targetArn, sourceCreds, targetCreds, {
                remapping
            })
        } catch (err) {
            return {
                ok: false,
                changes: [],
                skipped: [],
                error: err instanceof Error ? err.message : String(err)
            }
        }
    }
)

// ─── IPC: Dialog ───────────────────────────────────────────────────────────────

ipcMain.handle('dialog:open-folder', async (): Promise<string | null> => {
    const result = await dialog.showOpenDialog({
        properties: ['openDirectory', 'createDirectory'],
        title: 'Select output folder for CDK project'
    })
    return result.canceled ? null : (result.filePaths[0] ?? null)
})

ipcMain.handle(
    'dialog:save-file',
    async (_e, options: { defaultPath: string }): Promise<string | null> => {
        const result = await dialog.showSaveDialog({
            defaultPath: options.defaultPath,
            filters: [{ name: 'JSON', extensions: ['json'] }]
        })
        return result.canceled ? null : (result.filePath ?? null)
    }
)

// ─── IPC: Export Graph JSON ──────────────────────────────────────────────────

ipcMain.handle(
    'export:graph-json',
    async (_e, outputPath: string): Promise<{ ok: boolean; error?: string }> => {
        try {
            const graphs = loadGraphs()
            writeFileSync(outputPath, JSON.stringify(graphs, null, 2), 'utf-8')
            return { ok: true }
        } catch (err) {
            return { ok: false, error: err instanceof Error ? err.message : String(err) }
        }
    }
)

// ─── Window ────────────────────────────────────────────────────────────────────

function createWindow(): void {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        show: false,
        autoHideMenuBar: true,
        ...(process.platform === 'linux' ? { icon } : {}),
        webPreferences: {
            preload: join(__dirname, '../preload/index.js'),
            sandbox: false
        }
    })

    mainWindow.on('ready-to-show', () => mainWindow!.show())

    mainWindow.webContents.setWindowOpenHandler((details) => {
        shell.openExternal(details.url)
        return { action: 'deny' }
    })

    mainWindow.on('closed', () => {
        mainWindow = null
    })

    if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
        mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
    } else {
        mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
    }
}

app.whenReady().then(() => {
    // Initialize data store before any IPC handlers fire
    const electronStore = new ElectronDataStore()
    electronStore.init()
    setDataStore(electronStore)
    setCacheDir(join(electronStore.baseDir, 'cache'))

    electronApp.setAppUserModelId('com.electron')
    app.on('browser-window-created', (_, window) => optimizer.watchWindowShortcuts(window))
    ipcMain.on('ping', () => console.log('pong'))
    createWindow()
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
})

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
})
