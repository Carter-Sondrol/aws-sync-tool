import * as fs from 'fs'
import * as path from 'path'
import type { ParsedARN } from './arn'
import type { CredentialsProvider } from './CredentialsProvider'
import type { DiscoveredRef } from '../graph-types'
import type { ResolveResult, ResourceResolver } from './resolver'
import { resolveResource } from './resolver'

// ─── Public types ─────────────────────────────────────────────────────────────

export interface CommandInfo {
    sdkPackage: string // e.g. '@aws-sdk/client-lambda'
    clientClass: string // e.g. 'LambdaClient'
    fetchCommand: string // e.g. 'GetFunctionCommand'
    fetchInputType: string // e.g. 'GetFunctionRequest'
    fetchOutputType: string // e.g. 'GetFunctionResponse'
    listCommand?: string
    createCommand?: string
    updateCommand?: string
    inputKey: string // e.g. 'FunctionName'
    labelPath: string | null // e.g. 'Configuration.FunctionName', or null
}

export interface StubGenerationResult {
    ok: boolean
    resolverFile?: string
    syncerFile?: string
    commandInfo?: CommandInfo
    error?: string
}

export interface ProbeResult {
    resolved: boolean
    resolveResult?: ResolveResult
    error?: string
}

// ─── SDK package name mapping ─────────────────────────────────────────────────

const SDK_OVERRIDES: Record<string, string> = {
    events: 'eventbridge',
    logs: 'cloudwatch-logs',
    stepfunctions: 'sfn',
    apigateway: 'api-gateway',
    apigatewayv2: 'apigatewayv2',
    secretsmanager: 'secrets-manager',
    kinesisfirehose: 'firehose',
    elasticloadbalancing: 'elastic-load-balancing',
    elasticloadbalancingv2: 'elastic-load-balancing-v2'
}

export function sdkPackageName(service: string): string {
    return `@aws-sdk/client-${SDK_OVERRIDES[service.toLowerCase()] ?? service.toLowerCase()}`
}

// ─── Filesystem helpers ───────────────────────────────────────────────────────

export function findNodeModules(): string | null {
    let dir = process.cwd()
    for (let i = 0; i < 8; i++) {
        const candidate = path.join(dir, 'node_modules')
        if (fs.existsSync(candidate)) return candidate
        dir = path.dirname(dir)
    }
    return null
}

export function resolversDir(): string {
    return path.resolve(process.cwd(), 'src/main/discovery/resolvers')
}

export function syncersDir(): string {
    return path.resolve(process.cwd(), 'src/main/sync/syncers')
}

// ─── Command search ───────────────────────────────────────────────────────────

type CommandBucket = 'fetch' | 'list' | 'create' | 'update'

const BUCKET_PREFIXES: Record<CommandBucket, string[]> = {
    fetch: ['Get', 'Describe'],
    list: ['List'],
    create: ['Create'],
    update: ['Update', 'Put', 'Set']
}

function scoreCommand(
    commandFileName: string,
    resourceType: string,
    bucket: CommandBucket
): number {
    // commandFileName is e.g. 'GetFunctionCommand' (no .d.ts)
    const name = commandFileName.toLowerCase().replace(/command$/, '')
    const rt = resourceType.toLowerCase()

    for (const prefix of BUCKET_PREFIXES[bucket]) {
        const p = prefix.toLowerCase()
        if (!name.startsWith(p)) continue
        const rest = name.slice(p.length)
        if (rest === rt) return 100
        if (rest === rt + 's') return 80
        if (rest.includes(rt)) return 70
    }
    return 0
}

interface BestCommands {
    fetch?: string
    list?: string
    create?: string
    update?: string
}

export function findBestCommands(commandsDir: string, resourceType: string): BestCommands {
    if (!fs.existsSync(commandsDir)) return {}

    const files = fs
        .readdirSync(commandsDir)
        .filter((f) => f.endsWith('.d.ts'))
        .map((f) => f.replace('.d.ts', ''))

    const best: BestCommands = {}
    const scores: Record<CommandBucket, number> = { fetch: 0, list: 0, create: 0, update: 0 }

    for (const name of files) {
        for (const bucket of ['fetch', 'list', 'create', 'update'] as CommandBucket[]) {
            const s = scoreCommand(name, resourceType, bucket)
            if (s > scores[bucket]) {
                scores[bucket] = s
                best[bucket] = name
            }
        }
    }

    // Require score >= 70 (command must at least contain the resource type name)
    return {
        fetch: scores.fetch >= 70 ? best.fetch : undefined,
        list: scores.list >= 70 ? best.list : undefined,
        create: scores.create >= 70 ? best.create : undefined,
        update: scores.update >= 70 ? best.update : undefined
    }
}

// ─── Command file parsing ─────────────────────────────────────────────────────

interface CommandFileTypes {
    inputType: string // e.g. 'GetFunctionRequest'
    outputType: string // e.g. 'GetFunctionResponse'
}

export function parseCommandFile(
    commandsDir: string,
    commandName: string
): CommandFileTypes | null {
    const filePath = path.join(commandsDir, `${commandName}.d.ts`)
    if (!fs.existsSync(filePath)) return null
    const content = fs.readFileSync(filePath, 'utf8')

    // export interface GetFunctionCommandInput extends GetFunctionRequest {
    const inputMatch = content.match(/CommandInput extends (\w+)/)
    // export interface GetFunctionCommandOutput extends GetFunctionResponse, __MetadataBearer {
    const outputMatch = content.match(/CommandOutput extends (\w+)[,\s{]/)

    if (!inputMatch || !outputMatch) return null
    return { inputType: inputMatch[1], outputType: outputMatch[1] }
}

// ─── Client class discovery ───────────────────────────────────────────────────

export function findClientClass(pkgDir: string): string | null {
    const typesDir = path.join(pkgDir, 'dist-types')
    if (!fs.existsSync(typesDir)) return null
    const files = fs.readdirSync(typesDir)
    // e.g. 'LambdaClient.d.ts', skip 'LambdaClientResolvedConfig.d.ts'
    const clientFile = files.find(
        (f) => f.endsWith('Client.d.ts') && !f.includes('Resolved') && !f.includes('Config')
    )
    return clientFile ? clientFile.replace('.d.ts', '') : null
}

// ─── Model interface parsing ──────────────────────────────────────────────────

export function findModelFiles(pkgDir: string): string[] {
    const modelsDir = path.join(pkgDir, 'dist-types', 'models')
    if (!fs.existsSync(modelsDir)) return []
    return fs
        .readdirSync(modelsDir)
        .filter((f) => f.endsWith('.d.ts'))
        .map((f) => path.join(modelsDir, f))
}

function findInterface(modelFiles: string[], interfaceName: string): string | null {
    for (const f of modelFiles) {
        const content = fs.readFileSync(f, 'utf8')
        const marker = `export interface ${interfaceName} {`
        const idx = content.indexOf(marker)
        if (idx === -1) continue
        // Extract body by counting braces
        let depth = 0
        let start = -1
        let end = -1
        for (let i = idx; i < content.length; i++) {
            if (content[i] === '{') {
                if (depth === 0) start = i
                depth++
            } else if (content[i] === '}') {
                depth--
                if (depth === 0) {
                    end = i
                    break
                }
            }
        }
        if (start === -1 || end === -1) continue
        return content.slice(start, end + 1)
    }
    return null
}

export function extractRequiredFields(interfaceBody: string): string[] {
    // Required: `    FieldName: SomeType | undefined;` (no `?`)
    // Optional: `    FieldName?: SomeType | undefined;`
    const required: string[] = []
    for (const line of interfaceBody.split('\n')) {
        const m = line.match(/^\s{4}(\w+):\s+.+;$/)
        if (m && !line.includes('?:') && !line.includes('readonly')) {
            required.push(m[1])
        }
    }
    return required
}

export function pickBestInputKey(fields: string[], resourceType: string): string {
    const rt = resourceType.charAt(0).toUpperCase() + resourceType.slice(1)
    const priorities = [
        `${rt}Name`,
        `${rt}Id`,
        `${rt}Arn`,
        'FunctionName',
        'TableName',
        'BucketName',
        'RuleName',
        'Name',
        'Id',
        'Arn'
    ]
    for (const p of priorities) {
        if (fields.includes(p)) return p
    }
    return fields[0] ?? 'FIXME_INPUT_KEY'
}

export function inferLabelPath(
    modelFiles: string[],
    outputTypeName: string,
    resourceType: string
): string | null {
    const body = findInterface(modelFiles, outputTypeName)
    if (!body) return null

    const rt = resourceType.charAt(0).toUpperCase() + resourceType.slice(1)
    const priorities = [`${rt}Name`, 'Name', 'Title', 'DisplayName', `${rt}Id`, 'Id']

    // Check top-level fields — iterate priorities to honor ranking
    const topFields = new Set<string>()
    for (const line of body.split('\n')) {
        const m = line.match(/^\s{4}(\w+)[?:]/)
        if (m) topFields.add(m[1])
    }
    for (const p of priorities) {
        if (topFields.has(p)) return p
    }

    // Check one level deep in object-typed fields — collect all candidates first, then pick by priority
    const nestedCandidates = new Map<string, string>()
    for (const line of body.split('\n')) {
        const m = line.match(/^\s{4}(\w+)\??: (\w+) \| undefined;/)
        if (!m) continue
        const [, fieldName, typeName] = m
        if (['string', 'number', 'boolean'].includes(typeName)) continue
        const nested = findInterface(modelFiles, typeName)
        if (!nested) continue
        for (const p of priorities) {
            if (
                !nestedCandidates.has(p) &&
                (nested.includes(`    ${p}:`) || nested.includes(`    ${p}?:`))
            ) {
                nestedCandidates.set(p, `${fieldName}.${p}`)
            }
        }
    }
    for (const p of priorities) {
        const candidate = nestedCandidates.get(p)
        if (candidate) return candidate
    }

    return null
}

// ─── File generation ──────────────────────────────────────────────────────────

function toPascal(s: string): string {
    return s.charAt(0).toUpperCase() + s.slice(1)
}

function labelExpr(labelPath: string | null): string {
    if (!labelPath) return 'arn.resourceId'
    const chain = labelPath.split('.').reduce((acc, p) => `${acc}?.${p}`, 'data')
    return `(${chain} as string | undefined) ?? arn.resourceId`
}

function generateResolverContent(service: string, resourceType: string, info: CommandInfo): string {
    const className = `${toPascal(service)}${toPascal(resourceType)}Resolver`
    const listImport = info.listCommand ? `, ${info.listCommand}` : ''
    const listMethod = info.listCommand
        ? `\n  // TODO: implement list — use ${info.listCommand}\n  async list(_regions: string[], _accountId: string): Promise<Array<{ arn: string; name: string }>> {\n    return []\n  }\n`
        : ''

    return [
        `import { ${info.clientClass}, ${info.fetchCommand}${listImport} } from '${info.sdkPackage}'`,
        `import type { ${info.fetchOutputType} } from '${info.sdkPackage}'`,
        `import type { ParsedARN } from '../../arn'`,
        `import { BaseResolver } from '../../resolver'`,
        `import type { Credentials } from '../../resolver'`,
        ``,
        `export class ${className} extends BaseResolver<${info.clientClass}, ${info.fetchOutputType}> {`,
        `  readonly service = '${service}'`,
        `  readonly resourceType = '${resourceType}'`,
        `  readonly cfnType = 'AWS::${toPascal(service)}::${toPascal(resourceType)}'  // TODO: verify`,
        ``,
        `  protected createClient(region: string, creds: Credentials): ${info.clientClass} {`,
        `    return new ${info.clientClass}({ region, credentials: creds })`,
        `  }`,
        ``,
        `  protected async fetchResource(`,
        `    client: ${info.clientClass},`,
        `    arn: ParsedARN,`,
        `  ): Promise<${info.fetchOutputType} | null> {`,
        `    return client.send(new ${info.fetchCommand}({ ${info.inputKey}: arn.resourceId }))`,
        `  }`,
        ``,
        `  // TODO: review — inferred from response shape`,
        `  label(data: ${info.fetchOutputType} | undefined, arn: ParsedARN): string {`,
        `    return ${labelExpr(info.labelPath)}`,
        `  }`,
        listMethod,
        `}`,
        ``,
        `export default ${className}`,
        ``
    ].join('\n')
}

function generateSyncerContent(service: string, resourceType: string, info: CommandInfo): string {
    const varName = `${service}${toPascal(resourceType)}Syncer`
    const mutationCommands = [info.createCommand, info.updateCommand].filter(Boolean) as string[]
    const mutationImports = mutationCommands.length > 0 ? `, ${mutationCommands.join(', ')}` : ''
    const noMutation = mutationCommands.length === 0

    const mutationComment = noMutation
        ? `  // TODO: no create/update command found for ${toPascal(service)}::${toPascal(resourceType)}`
        : `  // TODO: implement push using ${mutationCommands.join(' / ')}`

    return [
        `import { ${info.clientClass}${mutationImports} } from '${info.sdkPackage}'`,
        `import { registerSyncer } from '../registry'`,
        `import type { ResourceSyncer, SyncPushResult } from '../syncer'`,
        `import type { Credentials } from '../../discovery/resolver'`,
        `import { parseARN } from '../../discovery/arn'`,
        ``,
        `const clientCache = new Map<string, ${info.clientClass}>()`,
        ``,
        `function getClient(region: string, creds: Credentials): ${info.clientClass} {`,
        `  const key = \`\${region}:\${creds.accessKeyId}\``,
        `  if (!clientCache.has(key)) clientCache.set(key, new ${info.clientClass}({ region, credentials: creds }))`,
        `  return clientCache.get(key)!`,
        `}`,
        ``,
        `const ${varName}: ResourceSyncer = {`,
        `  service: '${service}',`,
        `  resourceType: '${resourceType}',`,
        ``,
        `  async push(sourceData, sourceArn, targetArn, sourceCredentials, targetCredentials): Promise<SyncPushResult> {`,
        `    const changes: string[] = []`,
        `    const skipped: string[] = []`,
        `    const sourceRegion = parseARN(sourceArn)?.region ?? 'us-east-1'`,
        `    const targetRegion = parseARN(targetArn)?.region ?? 'us-east-1'`,
        `    const [sourceCreds, targetCreds] = await Promise.all([sourceCredentials(), targetCredentials()])`,
        `    const sourceClient = getClient(sourceRegion, sourceCreds)`,
        `    const targetClient = getClient(targetRegion, targetCreds)`,
        `    void sourceClient; void targetClient; void sourceData`,
        mutationComment,
        `    return { ok: false, changes, skipped, error: 'Not implemented' }`,
        `  },`,
        `}`,
        ``,
        `registerSyncer('${service}:${resourceType}', ${varName})`,
        ``
    ].join('\n')
}

function writeStubFiles(
    service: string,
    resourceType: string,
    info: CommandInfo
): { resolverFile: string; syncerFile: string } {
    const resolverOut = path.join(resolversDir(), service, `${resourceType}.ts`)
    const syncerOut = path.join(syncersDir(), `${service}-${resourceType}.ts`)

    fs.mkdirSync(path.dirname(resolverOut), { recursive: true })
    fs.mkdirSync(path.dirname(syncerOut), { recursive: true })

    if (!fs.existsSync(resolverOut)) {
        fs.writeFileSync(resolverOut, generateResolverContent(service, resourceType, info), 'utf8')
    }
    if (!fs.existsSync(syncerOut)) {
        fs.writeFileSync(syncerOut, generateSyncerContent(service, resourceType, info), 'utf8')
    }

    return { resolverFile: resolverOut, syncerFile: syncerOut }
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function generateStubs(service: string, resourceType: string): StubGenerationResult {
    try {
        const nodeModules = findNodeModules()
        if (!nodeModules) return { ok: false, error: 'Could not locate node_modules' }

        const pkg = sdkPackageName(service)
        const pkgDir = path.join(nodeModules, pkg)
        if (!fs.existsSync(pkgDir)) {
            return {
                ok: false,
                error: `SDK package not installed: ${pkg}. Run: npm install --save-dev ${pkg}`
            }
        }

        const commandsDir = path.join(pkgDir, 'dist-types', 'commands')
        const best = findBestCommands(commandsDir, resourceType)

        if (!best.fetch) {
            return {
                ok: false,
                error: `No Get/Describe command found for ${service}:${resourceType} in ${pkg}`
            }
        }

        const cmdTypes = parseCommandFile(commandsDir, best.fetch)
        if (!cmdTypes) {
            return { ok: false, error: `Could not parse ${best.fetch}.d.ts` }
        }

        const clientClass = findClientClass(pkgDir) ?? `${toPascal(service)}Client`
        const modelFiles = findModelFiles(pkgDir)
        const inputInterfaceBody = findInterface(modelFiles, cmdTypes.inputType)
        const requiredFields = extractRequiredFields(inputInterfaceBody ?? '')
        const inputKey = pickBestInputKey(requiredFields, resourceType)
        const labelPath = inferLabelPath(modelFiles, cmdTypes.outputType, resourceType)

        const commandInfo: CommandInfo = {
            sdkPackage: pkg,
            clientClass,
            fetchCommand: best.fetch,
            fetchInputType: cmdTypes.inputType,
            fetchOutputType: cmdTypes.outputType,
            listCommand: best.list,
            createCommand: best.create,
            updateCommand: best.update,
            inputKey,
            labelPath
        }

        const { resolverFile, syncerFile } = writeStubFiles(service, resourceType, commandInfo)

        return { ok: true, resolverFile, syncerFile, commandInfo }
    } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : String(err) }
    }
}

export async function probeResource(
    commandInfo: CommandInfo,
    arn: ParsedARN,
    credentials: CredentialsProvider
): Promise<ProbeResult> {
    try {
        const pkg = (await import(commandInfo.sdkPackage)) as Record<string, unknown>

        const ClientCtor = pkg[commandInfo.clientClass] as (new (cfg: object) => object) | undefined
        const CommandCtor = pkg[commandInfo.fetchCommand] as
            | (new (
                  input: object
              ) => object)
            | undefined

        if (!ClientCtor || !CommandCtor) {
            return {
                resolved: false,
                error: `Could not find ${commandInfo.clientClass} or ${commandInfo.fetchCommand} in ${commandInfo.sdkPackage}`
            }
        }

        const tempResolver: ResourceResolver = {
            service: arn.service,
            resourceType: arn.resourceType,
            cfnType: `AWS::${toPascal(arn.service)}::${toPascal(arn.resourceType)}`,
            completeDeferred: true,

            async fetch(parsedArn: ParsedARN): Promise<Record<string, unknown> | null> {
                const creds = await credentials()
                const client = new ClientCtor({
                    region: parsedArn.region || 'us-east-1',
                    credentials: creds
                })
                try {
                    return await (client as any).send(
                        new CommandCtor({ [commandInfo.inputKey]: parsedArn.resourceId })
                    )
                } catch (e: any) {
                    if (
                        e?.name === 'ValidationException' ||
                        e?.name === 'InvalidParameterException'
                    ) {
                        return await (client as any).send(
                            new CommandCtor({ [commandInfo.inputKey]: parsedArn.raw })
                        )
                    }
                    throw e
                }
            },

            logicalId(_data: Record<string, unknown> | undefined, parsedArn: ParsedARN): string {
                return parsedArn.resourceId
            },

            label(data: Record<string, unknown> | undefined, parsedArn: ParsedARN): string {
                if (!commandInfo.labelPath || !data) return parsedArn.resourceId
                const val = commandInfo.labelPath
                    .split('.')
                    .reduce<unknown>((acc, p) => (acc as any)?.[p], data)
                return typeof val === 'string' ? val : parsedArn.resourceId
            },

            async extractReferences(_d: Record<string, unknown>): Promise<Set<DiscoveredRef>> {
                return new Set()
            },

            async resolveResource(resolvedArn: ParsedARN) {
                const data = await this.fetch(resolvedArn)
                if (!data) return null
                const refs = await this.extractReferences(data)
                return {
                    logicalId: this.logicalId(data, resolvedArn),
                    label: this.label?.(data, resolvedArn) ?? resolvedArn.resourceId,
                    cfnType: this.cfnType,
                    arn: resolvedArn,
                    included: true,
                    hidden: false,
                    discoveredRefs: Array.from(refs),
                    data
                }
            }
        }

        const resolveResult = await resolveResource(tempResolver, arn)
        return { resolved: resolveResult !== null, resolveResult: resolveResult ?? undefined }
    } catch (err) {
        return { resolved: false, error: err instanceof Error ? err.message : String(err) }
    }
}
