# AWS Dependency Graph & Sync Tool

Seed-based AWS discovery that builds a **portable dependency graph** and turns it into deployable CloudFormation/CDK plus imperative updates for non-CFN resources. The tool follows only the ARNs you provide and the ARNs those resources reference—no account-wide scans.

---

## What You Get

- Seed-driven discovery (`--arn`, CSV, or DynamoDB) that walks real dependencies
- A normalized `DependencyGraph` of `ResourceNode` objects with edges + metadata
- Portable graph JSON (`freeze`) that strips region/account and can be re-linked
- Visualization (`display --visual`) with an interactive force graph
- Deployment planning that splits CFN-deployable vs imperative operations
- CDK generation from a graph (honors an optional plan) ready for `cdk deploy`

The goal: manage **logical bundles of infrastructure** that can be moved between accounts/regions without crawling everything.

---

## Quickstart

1) Install (Python 3.10+):
```
pip install -r requirements.txt
```

2) Build a graph from seeds:
```
aws-graph build \
  --arn arn:aws:lambda:us-west-2:123:function:MyFn \
  --output graph.json
```
Seeds can also come from `--arn-file`, `--seed-csv`, or a DynamoDB seed table.

3) Inspect or visualize:
```
aws-graph display --file graph.json --tree
aws-graph display --file graph.json --visual --out graph.html
```

4) Create a deploy plan:
```
aws-graph plan --graph graph.json --output plan.json --target-account 999999999999
```

5) Generate CDK (CFN-eligible resources) and deploy:
```
aws-graph generate --graph graph.json --plan plan.json --output cdk-out --stack-name GraphStack
cd cdk-out && pip install -r requirements.txt && cdk synth && cdk deploy
```

6) Apply imperative (boto3) updates for non-CFN resources (e.g., Connect, Lex authoring):
```
aws-graph apply-imperative --graph graph.json --plan plan.json --dry-run
```

---

## CLI Commands (thin wrappers)

- `build`: Discover from seeds, traverse resolvers, produce raw or frozen graph JSON. Supports deep discovery (`--deep`) for services that can enumerate children (e.g., Connect).
- `display`: Print nodes, a dependency tree, or render HTML visualization.
- `plan`: Split a portable graph into CloudFormation stacks, parameters (for reference-only/external nodes), and imperative operations.
- `generate`: Turn a graph into a Python CDK app (includes a custom resource handler for bespoke updates). Honors a plan to skip non-CFN resources.
- `apply-imperative`: Execute or dry-run imperative updates for plan entries that cannot be represented in CFN (Connect contact flows, Lex authoring stubs, etc.).

Global flags: `--profile`, `--region`, `--account`, `-v/--verbose`.

---

## How Discovery Works

- **Resolvers** (under `resolvers/` for the metadata-driven set) fetch and normalize a single ARN, returning a `ResourceNode` plus the ARNs it references.
- **BaseResolver** handles the common boilerplate (ID resolution, describe call, reference extraction). Per-service classes supply metadata (`service`, `resource_type`, `describe_operation`, `id_fields`, etc.).
- Seeds can be **reference-only**; these become `PARAMETER` nodes that inform planning.
- The **ResourceGraphBuilder**:
  - walks seeds breadth-first;
  - handles wildcard/pattern ARNs;
  - defers edges until targets appear, then resolves orphans using normalized ARN matching;
  - optionally infers orphans for resolvable services and captures wildcard references;
  - freezes to portable form (logical IDs stable across accounts) and records metadata.

---

## Graph Model

- `ResourceNode`: logical_id, service, `cfn_type`, properties, arns, `referenced_arns`, classification (`RESOURCE`, `PARAMETER`, `EXTERNAL`, `AWS_MANAGED`, `ARTIFACT`), metadata.
- `DependencyGraph`: directed edges mean **parent depends on child**. Tracks ARN→logical ID mapping, normalized cross-account lookups, deferred edges, inferred edges, and metadata such as `CloudFormationStacks` and `InferredEdges`.
- Freeze modes:
  - **portable** (default): removes account/region specificity and keeps logical IDs consistent for diff/regen.
  - **finalized**: keeps ARNs untouched (useful for debugging).
- Visualization: `graph/visualizer.py` produces `graph.html` with service-aware coloring and seed/error markers.

---

## Planning & Deployment

- Planner groups CFN-deployable logical IDs into stacks using `CloudFormationStacks` metadata when present, otherwise a single `GraphStack`.
- Non-CFN or authoring-only types (e.g., Lex BotLocale, Connect flows) become `imperative_ops` entries with reasons.
- Reference-only/external/AWS-managed nodes become `parameters` with descriptions and defaults pulled from metadata or ARNs.
- The generated plan JSON feeds both CDK generation (to skip non-CFN nodes) and the imperative applier.
- Imperative applier currently supports Connect contact flow content updates and stubs for Lex authoring; extend `deploy/imperative_apply.py` for more services.

---

## Resolver Tooling

- `tools/service_introspector.py`: offline botocore introspection that produces per-service schema JSON (operations, shapes, ARN fields).
- `tools/generate_resolvers.py`: turns those schemas into `resolvers/*_resolvers.py` using the metadata-driven `BaseResolver`. Supports directory input to bulk-generate.
- Manual/handwritten resolvers can still live under `resolvers/` and be registered alongside generated ones.

---

## Repository Map (actual)

- `cli/`: `aws-graph` entrypoint and commands (`build`, `display`, `plan`, `generate`, `apply-imperative`).
- `graph/`: core data structures (`DependencyGraph`, `ResourceNode`), link resolution, visualizer, registry.
- `resolvers/`: metadata-driven resolvers produced by introspection/generation tools.
- `resolvers/`: base + generic resolver helpers and legacy/custom resolvers.
- `builder/cdk/`: CDK code generator and custom resource handler scaffolding.
- `planner/`: deployment plan splitter.
- `deploy/`: imperative applier for non-CFN resources.
- `utils/`: ARN parsing, environment context, seed loading, JSON encoding, mapping store.
- `tools/`: resolver introspector/generator and overrides.

---

## Development Notes

- Python 3.10+, dependencies in `requirements.txt`; optional dev tools in `requirements-dev.txt`.
- Resolvers should stay **stateless** and only return normalized nodes plus references—no graph mutations.
- The builder is seed-only by design; avoid list/scan calls that enumerate entire accounts.
- When adding a new service:
  1. Run the introspector to generate a schema.
  2. Generate resolvers with `tools/generate_resolvers.py --schema <schema.json> --out resolvers`.
  3. Add any deep-discovery or special-case logic as overrides.

---

## License

MIT (see `pyproject.toml` metadata for package info).
