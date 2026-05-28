# awsync-tool — Project Reference

## Commands

```bash
pnpm install          # install dependencies
pnpm dev              # start Electron app in dev mode (hot reload)
pnpm typecheck        # type-check both main and renderer processes
pnpm lint             # ESLint
pnpm format           # Prettier
pnpm build            # typecheck + build (runs electron-vite build)
pnpm build:linux      # package for Linux
pnpm build:mac        # package for macOS
pnpm build:win        # package for Windows
```

No test suite. `pnpm typecheck` is the primary correctness check — run after any non-trivial change. Two TS configs: `tsconfig.node.json` (main) and `tsconfig.web.json` (renderer).

## Architecture

Electron app with three runtime contexts:

### Main process (`src/main/`)
- `index.ts` — entrypoint, window lifecycle, **all IPC handlers**, persistence (JSON files in Electron's `userData`)
- `discovery/engine.ts` — BFS discovery orchestration; concurrency, depth limits, exclusion filters, graph state
- `discovery/resolver.ts` — `resolveResource()` pipeline: calls resolver's `fetch()`, runs `extractARNs()` on result to find outbound edges, handles AWS error codes
- `discovery/registry.ts` + `discovery/resolvers/*.ts` — service resolver registration (side-effect imports)
- `discovery/arn.ts` — ARN parsing/canonicalization, `extractARNs()` (scans data recursively for ARNs), `decodeRefToken()` (decodes internal `__ARN_REF__` tokens)
- `export/cdk-generator.ts` — generates full CDK TypeScript project from in-memory graph
- `sync/` — sync engine: registry, remapping, per-service syncers
- `graph-types.ts` — canonical types shared between main and renderer via preload

### Preload (`src/preload/`)
- `index.ts` — exposes `window.api` via `contextBridge`. **Only** bridge between renderer and main. New IPC = handler in main + method here.

### Renderer (`src/renderer/src/`)
- `App.tsx` — top-level shell with tabs (Accounts, Discovery, Graph, Export)
- `stores/app-store.ts` — Zustand store; owns all UI state. Seed ARNs and UI scale persist to `localStorage`.
- `hooks/api.ts` — thin wrappers around `window.api` calls
- `hooks/use-graph-sync.ts` — handles `graph:updated` push from main
- `hooks/use-force-graph-data.ts` — transforms `GraphData` into nodes/links for force graph
- `components/ForceGraphComponent.tsx` — 2D force-directed graph (`react-force-graph-2d`)
- `components/NodeInspector.tsx` — side panel for selected node data and status controls
- `components/AccountPanel.tsx` — account CRUD and credential detection UI
- `components/SyncTable.tsx` — mapping table for per-account parameter values
- `components/EnvironmentManager.tsx` — environment management UI
- `components/MatchPanel.tsx` — resource matching UI

## IPC Channel Reference

| Channel | Direction | Purpose |
|---|---|---|
| `accounts:list/add/remove/validate/detect-sessions` | invoke | Account CRUD and STS validation |
| `graph:get/save/clear` | invoke | Graph persistence |
| `mapping:get/save` | invoke | MappingTable persistence |
| `discovery:start/cancel/progress/list-service` | invoke | Discovery control |
| `discovery:progress` | main→renderer push | Live progress updates |
| `graph:updated` | main→renderer push | Signal renderer to re-fetch after discovery |
| `export:summary/cdk` | invoke | CDK export |
| `dialog:open-folder` | invoke | Native folder picker |

## Discovery Pipeline

1. Renderer calls `discovery:start` with account ID, seed ARNs, optional exclusions, `maxDepth`
2. Main creates `DiscoveryEngine`, resolves AWS credentials, runs BFS from seeds
3. For each ARN dequeued: look up resolver by `service:resourceType`, call `resolveResource()`, add node to graph, enqueue newly discovered ARNs from `referencedArns`
4. After each node resolves, main sends `graph:updated` so renderer re-fetches live
5. Progress pushed on `discovery:progress` throughout

Resolver self-registration: importing a resolver file calls `registerResolver('service:type', resolver)`. Engine imports all resolvers at top of `engine.ts`. Adding a new service = create file in `discovery/resolvers/` + add import to `engine.ts`.

A resolver's `fetch()` can return `_childArns` key to enqueue additional ARNs (used by Connect instance resolver).

`extractARNs()` scans fetched data for ARN strings, converts them to `__ARN_REF__:base64(arn)` tokens stored in `node.data`. Decoded with `decodeRefToken()` wherever consumed (e.g., CDK generator reading Lambda env vars).

## CDK Generator

`src/main/export/cdk-generator.ts` takes `GraphNode[]` + `MappingTable` → produces `GeneratedFile[]` (full CDK TypeScript project).

- **Stack groups**: nodes bucketed by `node.stackId` → one CDK stack per bucket, default stack for unassigned
- **`GenContext`**: per-stack-group `{ nodeByArn, inScopeArns, nodeId(n) }`. Collision detection appends service-type suffix if two nodes produce same `cdkId`. Must use `nodeId()` not bare `cdkId()`.
- **Scope gating**: `arnRef()` and `lambdaFunctionRef()` check `ctx.inScopeArns` — synced nodes from other stacks emit literal ARN string (to avoid cross-stack undefined variables)
- **Topological sort**: `topoSortLambdas()` reorders synced Lambda nodes by env-var dependency graph (Kahn's algorithm)
- **`included: false`** → entries in `arns.ts` (existing resources); **`included: true`** → `new X(...)` CDK constructs; **`hidden: true`** → skipped entirely

## Key Types

All in `src/main/graph-types.ts`:

- `GraphNode` — `{ arn, logicalId, label, service, resourceType, cfnType?, included, hidden, discoveryState, classification, data, referencedArns, stackId?, paramConfig? }`
  - `included: boolean` — true → CDK construct; false → reference-only (`arns.ts`)
  - `hidden: boolean` — true → suppressed from graph view
  - `classification` — `'resource' | 'aws-managed'`
  - `paramConfig?: Record<string, ParamConfig>` — per-field resolution hints
- `ParamConfig` — `{ dynamic: boolean, edge?: string }` — `dynamic` = varies per account (goes to mapping table); `edge` = `$.LogicalId.property` cross-reference
- `GraphData` — `{ nodes: Record<string, GraphNode>, edges: GraphEdge[], meta? }`
- `MappingTable` — `Record<awsAccountId, Record<logicalId, ResourceMapping>>`

## CLI Testing (`pnpm awsync`)

Headless CLI for testing core functionality independently of the Electron GUI. Uses the **same** engine code paths (DiscoveryEngine, resolvers, syncers, CDK generator). Run with `tsx` — not `ts-node`.

```bash
pnpm awsync <command> [subcommand] [options]
# Override data directory:
AWSYNC_DATA_DIR=./my-test-data pnpm awsync env list
```

**When to use the CLI instead of the GUI:**
- Testing discovery logic with specific seed ARNs
- Validating CDK output without opening a file picker dialog
- Debugging sync push between environments (structured output)
- Automating test scenarios in agent workflows
- Inspecting graph state after discovery (`graph stats`, `graph nodes --json`)

**Command reference:**

| Command | Purpose |
|---|---|
| `env list/add/remove/validate/detect` | Environment/account management |
| `discover start <env> --seeds "arn,..." [--max-depth N] [--exclude svc:type]` | BFS discovery |
| `discover resolve-seeds <env> --seeds "s3:bucket,ddb:table"` | Resolve shorthand to ARNs without running discovery |
| `graph list/stats/nodes/set-included/set-stack/export/import/clear` | Graph inspection & manipulation |
| `mapping list/set/export` | Resource mapping table |
| `sync push <src-env> <arn> <tgt-env> <tgt-arn>` | Cross-environment sync |
| `export cdk/preview/validate` | CDK generation (preview = no disk write) |
| `list <service:type> <env>` | Browse AWS resources (registry-based list) |

**Typical debugging workflow:**
1. `pnpm awsync env add --id test --label Test --region us-west-2 --profile my-profile`
2. `pnpm awsync env validate test` → confirms credentials work
3. `pnpm awsync discover start test --seeds "arn:..." --max-depth 1`
4. `pnpm awsync graph stats test` → check node/edge counts
5. `pnpm awsync graph nodes test --json > /tmp/graph.json` → inspect structure
6. `pnpm awsync export preview test` → preview CDK output without writing

## Legacy Reference

`refrence code/srh-aws-connect/sync-tool` is the production Python ancestor. Use as authoritative reference for discovery semantics when behavior is unclear: BFS traversal rules, placeholder node creation, ARN canonicalization edge cases, Connect-scoped traversal, deployable vs reference-only distinction. Do not copy Python literally — treat it as the spec.
