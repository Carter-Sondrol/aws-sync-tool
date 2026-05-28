
import { DiscoveryEngine } from '../discovery/engine'
import type { DiscoveryProgress } from '../graph-types'
import { Graph } from '../graph'
import type { EnvironmentConfig } from '../types'
import { getAllRegions } from '../types'
import { ResolverRegistry } from '../discovery/registry'

// ─── Seed resolution ───────────────────────────────────────────────────────

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

// ─── Service ──────────────────────────────────────────────────────────────────

export interface DiscoveryConfig {
    envId: string
    seedArns: string[]
    excludeResourceTypes?: string[]
    maxDepth?: number
    maxNodes?: number
    concurrency?: number
    onProgress?: (progress: DiscoveryProgress) => void
}

export class DiscoveryService {
    private activeEngine: DiscoveryEngine | null = null

    /** Start a discovery run. Resolves seeds, runs BFS, saves graph. */
    async start(
        environments: EnvironmentConfig[],
        resolveCredentials: (
            env: EnvironmentConfig
        ) => Promise<{ accessKeyId: string; secretAccessKey: string; sessionToken?: string }>,
        loadGraph: (envId: string) => Graph,
        saveGraph: (envId: string, graph: Graph) => void,
        config: DiscoveryConfig
    ): Promise<{ ok: boolean; error?: string }> {
        const {
            envId,
            seedArns,
            excludeResourceTypes = [],
            maxDepth = 2,
            maxNodes,
            concurrency
        } = config

        const environment = environments.find((e) => e.id === envId)
        if (!environment) return { ok: false, error: 'Environment not found' }

        // Cancel any running discovery
        this.activeEngine?.cancel()
        this.activeEngine = new DiscoveryEngine()
        if (config.onProgress) {
            this.activeEngine.setProgressCallback(config.onProgress)
        }

        const existingGraph = loadGraph(envId)

        try {
            const rawCreds = await resolveCredentials(environment)
            const credsFn = () =>
                Promise.resolve({
                    accessKeyId: rawCreds.accessKeyId,
                    secretAccessKey: rawCreds.secretAccessKey,
                    sessionToken: rawCreds.sessionToken
                })

            const resolvedSeeds = await resolveDiscoverySeeds(seedArns, environment, rawCreds)

            const registry = await ResolverRegistry.create(credsFn)

            const graph = await this.activeEngine.discover(
                credsFn,
                resolvedSeeds,
                existingGraph,
                {
                    excludeResourceTypes: excludeResourceTypes.map((v) => v.trim().toLowerCase()),
                    maxDepth,
                    maxNodes,
                    concurrency
                },
                registry
            )

            // Resolve references, build edges, and infer parameters.
            // The graph owns this logic — it maps discoveredRefs to known nodes,
            // builds the edge list, and marks which fields should become CDK params.
            const accountId = environment.accountId || (await getCallerAccountId(rawCreds, getAllRegions(environment)[0] || 'us-west-2'))
            if (accountId) {
                graph.resolveReferences(accountId)
            }
            graph.buildEdges()
            graph.inferParameters()

            if (!this.activeEngine.getProgress().phase.includes('idle')) {
                saveGraph(envId, graph)
            }

            return { ok: true }
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err)
            return { ok: false, error: msg }
        } finally {
            this.activeEngine = null
        }
    }

    /** Cancel the currently running discovery */
    cancel(): void {
        this.activeEngine?.cancel()
        this.activeEngine = null
    }

    /** Resolve seed ARN strings (handles shorthand like "s3:bucket", "ddb:table") */
    async resolveSeeds(
        environment: EnvironmentConfig,
        creds: { accessKeyId: string; secretAccessKey: string; sessionToken?: string },
        seeds: string[]
    ): Promise<string[]> {
        return resolveDiscoverySeeds(seeds, environment, creds)
    }
}
