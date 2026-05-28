#!/usr/bin/env node
/**
 * generate-resolver.ts
 *
 * Scaffolds a typed resolver file by introspecting the installed AWS SDK package's
 * dist-types — no network calls, no config, no extra dependencies.
 *
 * Usage (add to package.json scripts):
 *   "generate-resolver": "ts-node --esm scripts/generate-resolver.ts"
 *
 *   npm run generate-resolver AWS::Lambda::Function
 *   npm run generate-resolver AWS::IAM::Role
 *   npm run generate-resolver AWS::Events::Rule
 *
 * The target @aws-sdk/client-* package must already be installed.
 * If not: npm install --save-dev @aws-sdk/client-{service}
 *
 * What gets inferred from the d.ts automatically:
 *   - Correct command (Get > Describe, exact > plural)
 *   - Required input key (from JSDoc "// required" annotations)
 *   - Output type name
 *   - Best label field (prefers *Name > Name > *Id in response shape)
 *
 * After generation, review the label() method — the rest is correct.
 */

import * as fs from 'fs'
import * as path from 'path'

// ─── CFN service name → SDK package name (edge cases only) ────────────────────
const SDK_PACKAGE_OVERRIDES: Record<string, string> = {
  events: 'eventbridge',
  logs: 'cloudwatch-logs',
  stepfunctions: 'sfn',
  apigateway: 'api-gateway',
  apigatewayv2: 'apigatewayv2',
  elasticloadbalancing: 'elastic-load-balancing',
  elasticloadbalancingv2: 'elastic-load-balancing-v2',
  secretsmanager: 'secrets-manager',
  kinesisfirehose: 'firehose',
  wafv2: 'wafv2',
  msk: 'kafka',
  elasticsearch: 'elasticsearch-service',
  opensearch: 'opensearch',
  codebuild: 'codebuild',
  codecommit: 'codecommit',
  codepipeline: 'codepipeline',
}

// ─── Output root ──────────────────────────────────────────────────────────────
const RESOLVERS_DIR = path.resolve(__dirname, '../src/main/discovery/resolvers')

// ─── Helpers ──────────────────────────────────────────────────────────────────

function cfnToSdkPackage(cfnService: string): string {
  const lower = cfnService.toLowerCase()
  return SDK_PACKAGE_OVERRIDES[lower] ?? lower
}

function findNodeModules(): string {
  let dir = __dirname
  for (let i = 0; i < 8; i++) {
    const candidate = path.join(dir, 'node_modules')
    if (fs.existsSync(candidate)) return candidate
    dir = path.dirname(dir)
  }
  throw new Error('Could not locate node_modules')
}

function findCommandFile(
  commandsDir: string,
  resourceType: string,
): { commandName: string; filePath: string } | null {
  const candidates = ['Get', 'Describe'].flatMap((p) => [
    `${p}${resourceType}Command`,
    `${p}${resourceType}sCommand`,
  ])
  for (const commandName of candidates) {
    const filePath = path.join(commandsDir, `${commandName}.d.ts`)
    if (fs.existsSync(filePath)) return { commandName, filePath }
  }
  return null
}

interface CommandInfo {
  commandName: string
  inputType: string
  outputType: string
  inputKey: string
  labelPath: string | null
}

function parseCommandFile(filePath: string, resourceType: string): CommandInfo {
  const content = fs.readFileSync(filePath, 'utf8')

  const commandName = content.match(/export declare class (\w+Command)/)?.[1]
  const inputType = content.match(/export interface (\w+CommandInput)/)?.[1]
  const outputType = content.match(/export interface (\w+CommandOutput)/)?.[1]

  if (!commandName || !inputType || !outputType) {
    throw new Error(`Could not parse command types from ${filePath}`)
  }

  // Required fields are annotated with "// required" in the JSDoc example block
  const requiredFields: string[] = []
  const exampleInputBlock = content.match(/const input = \{[^}]+\}/s)
  if (exampleInputBlock) {
    for (const line of exampleInputBlock[0].split('\n')) {
      const m = line.match(/\*\s+(\w+):\s+.+\/\/\s*required/)
      if (m) requiredFields.push(m[1])
    }
  }

  const inputKey =
    requiredFields[0] ??
    [`${resourceType}Name`, `${resourceType}Id`, `${resourceType}Arn`, 'Name', 'Id', 'Arn']
      .find((f) => content.includes(f)) ??
    'FIXME_INPUT_KEY'

  const labelPath = inferLabelPath(content, resourceType)
  return { commandName, inputType, outputType, inputKey, labelPath }
}

function inferLabelPath(content: string, resourceType: string): string | null {
  const block = content.match(/\/\/ \{ \/\/ \w+Response([\s\S]+?)\/\/ \}/)
  if (!block) return null

  const lines = block[1].split('\n')
  const topLevel: string[] = []
  const nested: string[] = []
  let currentTop: string | null = null

  for (const line of lines) {
    const clean = line.replace(/^\s*\*?\s*\/\/\s*/, '')
    const topField = clean.match(/^(\w+):/)
    const nestedField = clean.match(/^\s{2,6}(\w+):/)
    if (topField) {
      currentTop = topField[1]
      topLevel.push(topField[1])
    } else if (nestedField && currentTop) {
      nested.push(`${currentTop}.${nestedField[1]}`)
    }
  }

  const priorities = [`${resourceType}Name`, 'Name', `${resourceType}Id`, 'FunctionName', 'Title']
  for (const p of priorities) {
    if (topLevel.includes(p)) return p
    const n = nested.find((np) => np.endsWith(`.${p}`))
    if (n) return n
  }

  return topLevel[0] ?? null
}

function labelExpr(labelPath: string | null): string {
  if (!labelPath) return 'arn.resourceId'
  const chain = labelPath.split('.').reduce((acc, part) => `${acc}?.${part}`, 'data')
  return `${chain} ?? arn.resourceId`
}

function generateFile(
  cfnService: string,
  cfnResource: string,
  sdkPackage: string,
  info: CommandInfo,
): string {
  const clientClass = `${cfnService}Client`
  const serviceKey = cfnService.toLowerCase()
  const resourceKey = cfnResource.toLowerCase()

  return [
    `import { ${clientClass}, ${info.commandName} } from '${sdkPackage}'`,
    `import type { ${info.outputType} } from '${sdkPackage}'`,
    `import type { ParsedARN } from '../../arn'`,
    `import { BaseResolver } from '../../resolver'`,
    `import type { Credentials } from '../../resolver'`,
    ``,
    `export class ${cfnService}${cfnResource}Resolver extends BaseResolver<${clientClass}, ${info.outputType}> {`,
    `  readonly service = '${serviceKey}'`,
    `  readonly resourceType = '${resourceKey}'`,
    `  readonly cfnType = 'AWS::${cfnService}::${cfnResource}'`,
    ``,
    `  protected createClient(region: string, creds: Credentials): ${clientClass} {`,
    `    return new ${clientClass}({ region, credentials: creds })`,
    `  }`,
    ``,
    `  protected async fetchResource(`,
    `    client: ${clientClass},`,
    `    arn: ParsedARN,`,
    `  ): Promise<${info.outputType} | null> {`,
    `    return client.send(new ${info.commandName}({ ${info.inputKey}: arn.resourceId }))`,
    `  }`,
    ``,
    `  // Review this — inferred from the response shape. Adjust the path if needed.`,
    `  label(data: ${info.outputType} | undefined, arn: ParsedARN): string {`,
    `    return ${labelExpr(info.labelPath)}`,
    `  }`,
    `}`,
    ``,
    `export default ${cfnService}${cfnResource}Resolver`,
    ``,
  ].join('\n')
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const cfnType = process.argv[2]
  if (!cfnType) {
    console.error('Usage: generate-resolver <CFN type>\nExample: generate-resolver AWS::Lambda::Function')
    process.exit(1)
  }

  const parts = cfnType.split('::')
  if (parts.length !== 3 || parts[0] !== 'AWS') {
    console.error(`Invalid CFN type: "${cfnType}". Expected format: AWS::Service::Resource`)
    process.exit(1)
  }

  const [, cfnService, cfnResource] = parts
  const sdkPackage = `@aws-sdk/client-${cfnToSdkPackage(cfnService)}`

  console.log(`\nResolving: ${cfnType}`)
  console.log(`Package:   ${sdkPackage}`)

  const nodeModules = findNodeModules()
  const pkgDir = path.join(nodeModules, sdkPackage)
  if (!fs.existsSync(pkgDir)) {
    console.error(`\nPackage not installed: ${sdkPackage}`)
    console.error(`Run: npm install --save-dev ${sdkPackage}`)
    process.exit(1)
  }

  const commandsDir = path.join(pkgDir, 'dist-types', 'commands')
  const commandFile = findCommandFile(commandsDir, cfnResource)

  if (!commandFile) {
    const available = fs.readdirSync(commandsDir)
      .filter((f) => f.endsWith('.d.ts'))
      .map((f) => f.replace('.d.ts', ''))
    console.error(`\nCould not find Get${cfnResource}Command or Describe${cfnResource}Command in ${sdkPackage}`)
    console.error(`\nAvailable commands:\n${available.map((c) => `  - ${c}`).join('\n')}`)
    process.exit(1)
  }

  console.log(`Command:   ${commandFile.commandName}`)

  const info = parseCommandFile(commandFile.filePath, cfnResource)
  console.log(`Input key: ${info.inputKey}`)
  console.log(`Output:    ${info.outputType}`)
  console.log(`Label:     ${info.labelPath ?? '(not inferred — will use arn.resourceId)'}`)

  const outDir = path.join(RESOLVERS_DIR, cfnService.toLowerCase())
  const outFile = path.join(outDir, `${cfnResource.toLowerCase()}.ts`)

  if (fs.existsSync(outFile)) {
    console.error(`\nFile already exists: ${outFile}\nDelete it first if you want to regenerate.`)
    process.exit(1)
  }

  fs.mkdirSync(outDir, { recursive: true })
  fs.writeFileSync(outFile, generateFile(cfnService, cfnResource, sdkPackage, info), 'utf8')

  console.log(`\nGenerated: ${path.relative(process.cwd(), outFile)}`)
  console.log('Next: review the label() method and adjust the field path if needed.\n')
}

main().catch((err: Error) => {
  console.error('\nGenerator failed:', err.message)
  process.exit(1)
})