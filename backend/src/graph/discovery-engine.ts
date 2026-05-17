import { parseARN, canonicalForGraph, makeCanonicalName } from '../arn.js';

import type { GraphEdge, AwsCredentials, DiscoveryProgress } from '@aws-sync-tool/types';
import type { BaseResolver } from '../resolvers/base-resolver.js';
import { getResolver, type ResolverConstructor } from '../resolvers/registry.js';
import type { DiscoveryNode } from '../discovery/discovery-node.js';
import { NodeClassification } from '../discovery/discovery-node.js';
import type { ParsedARN } from '../arn.js';
import type { GraphStore } from './store.js';

const RESOLVE_TIMEOUT_MS = 30_000;
const MAX_NODES = 500;

function withTimeout<T>(ms: number, promise: Promise<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms);
    promise.then(
      (v) => { clearTimeout(timer); resolve(v); },
      (e) => { clearTimeout(timer); reject(e); },
    );
  });
}

type ProgressCallback = (progress: DiscoveryProgress) => void;

interface ResolveResult {
  node: DiscoveryNode;
  newRefs: string[];
}

interface BfsState {
  currentLayer: string[];
  nextLayer: string[];
  seen: Set<string>;
}

export interface DiscoveryOptions {
  /** Maximum traversal depth (default: 2) */
  maxDepth?: number;
  /** Services to exclude from traversal (nodes added but not expanded) */
  excludedServices?: string[];
}

export class DiscoveryEngine {
  private readonly store: GraphStore;
  private progress: DiscoveryProgress = {
    phase: 'idle',
    seedCount: 0,
    resolved: 0,
    totalFound: 0,
  };

  constructor(store: GraphStore) {
    this.store = store;
  }

  getProgress(): DiscoveryProgress {
    return { ...this.progress };
  }

  // ── Public entry points ────────────────────────────────────────────

  async resolveNode(
    arn: string,
    credentials: AwsCredentials,
  ): Promise<DiscoveryNode | null> {
    const canonical = canonicalForGraph(arn);
    if (!canonical) return null;

    const parsed = parseARN(canonical);
    if (!parsed) return null;

    const credFn = () => ({
      accessKeyId: credentials.accessKeyId,
      secretAccessKey: credentials.secretAccessKey,
      sessionToken: credentials.sessionToken,
    });

    const result = await this.resolveAndAdd(parsed, () => Promise.resolve(credFn()));
    return result?.node ?? null;
  }

  async discover(
    seedArns: string[],
    credentials: AwsCredentials,
    options?: DiscoveryOptions,
    onProgress?: ProgressCallback,
  ): Promise<DiscoveryProgress> {
    const maxDepth = options?.maxDepth ?? 2;
    const excludedServices = new Set(options?.excludedServices ?? []);

    this.store.clear();
    this.progress = {
      phase: 'running',
      seedCount: seedArns.length,
      resolved: 0,
      totalFound: 0,
      currentDepth: 0,
    };

    const state: BfsState = { currentLayer: [], nextLayer: [], seen: new Set<string>() };

    for (const arn of seedArns) {
      const canonical = canonicalForGraph(arn);
      if (canonical) {
        state.currentLayer.push(canonical);
        state.seen.add(canonical);
      } else {
        console.log(`[Discovery] Failed to canonicalize seed ARN: ${arn}`);
      }
    }

    this.progress.totalFound = state.currentLayer.length;
    this.notify(onProgress);

    return this.traverse(state, maxDepth, MAX_NODES, excludedServices, credentials, onProgress, (parsed, credFn) => this.resolveAndAdd(parsed, credFn));
  }

  async expandFromNode(
    arn: string,
    credentials: AwsCredentials,
    options?: DiscoveryOptions,
    onProgress?: ProgressCallback,
  ): Promise<DiscoveryProgress> {
    const maxDepth = options?.maxDepth ?? 2;
    const excludedServices = new Set(options?.excludedServices ?? []);

    const canonical = canonicalForGraph(arn);
    if (!canonical) {
      this.progress = { phase: 'error', seedCount: 0, resolved: 0, totalFound: 0, error: 'Invalid ARN' };
      return this.progress;
    }

    this.progress = {
      phase: 'running',
      seedCount: 1,
      resolved: 0,
      totalFound: 1,
      currentArn: canonical,
      currentDepth: 0,
    };
    this.notify(onProgress);

    // If node already exists, reuse its references without re-resolving
    const existing = this.store.getNode(canonical);
    if (existing) {
      const existingArns = new Set(this.store.getAllNodeArns());
      const state: BfsState = { currentLayer: [], nextLayer: [], seen: existingArns };

      for (const refArn of existing.referencedArns) {
        const c = canonicalForGraph(refArn);
        if (c && !existingArns.has(c)) {
          state.currentLayer.push(c);
          existingArns.add(c);
        }
      }

      return this.traverse(state, maxDepth, Infinity, excludedServices, credentials, onProgress, (parsed, credFn) => this.resolveAndAdd(parsed, credFn));
    }

    // Node doesn't exist — resolve it normally
    const state: BfsState = { currentLayer: [canonical], nextLayer: [], seen: new Set([canonical]) };

    return this.traverse(state, maxDepth, Infinity, excludedServices, credentials, onProgress, (parsed, credFn) => this.resolveAndAdd(parsed, credFn));
  }

  // ── Shared BFS traversal ───────────────────────────────────────────

  private async traverse(
    state: BfsState,
    maxDepth: number,
    maxNodes: number,
    excludedServices: Set<string>,
    credentials: AwsCredentials,
    onProgress?: ProgressCallback,
    resolveFn?: (parsed: ParsedARN, credFn: () => Promise<Creds>) => Promise<ResolveResult | null>,
  ): Promise<DiscoveryProgress> {
    const credFn = () => ({
      accessKeyId: credentials.accessKeyId,
      secretAccessKey: credentials.secretAccessKey,
      sessionToken: credentials.sessionToken,
    });

    try {
      for (let depth = 0; state.currentLayer.length > 0 && depth < maxDepth && (maxNodes === Infinity || state.seen.size < maxNodes); depth++) {
        this.progress.currentDepth = depth;

        const layer = state.currentLayer;
        state.currentLayer = [];

        for (const arn of layer) {
          this.progress.currentArn = arn;
          this.notify(onProgress);

          const parsed = parseARN(arn);
          if (!parsed) continue;

          if (excludedServices.has(parsed.service)) {
            this.store.addNode(this.createPlaceholderNode(arn));
            this.progress.resolved++;
            this.notify(onProgress);
            continue;
          }

          if (resolveFn) {
            const result = await resolveFn(parsed, () => Promise.resolve(credFn()));
            if (result) {
              this.addEdgeForNode(arn, result.node);
              for (const refArn of result.newRefs) {
                const c = canonicalForGraph(refArn);
                if (c && !state.seen.has(c)) {
                  state.seen.add(c);
                  state.nextLayer.push(c);
                }
              }
            }
          }
        }

        // Swap layers: next becomes current, prepare fresh next layer
        state.currentLayer = state.nextLayer;
        state.nextLayer = [];
      }

      this.progress.phase = 'complete';
    } catch (err) {
      this.progress.phase = 'error';
      this.progress.error = err instanceof Error ? err.message : String(err);
      console.error(`[Discovery] ✗ Error:`, err);
    }

    this.notify(onProgress);
    return this.progress;
  }

  // ── Resolution helpers ─────────────────────────────────────────────

  private async resolveAndAdd(
    parsed: ParsedARN,
    credFn: () => Promise<Creds>,
  ): Promise<ResolveResult | null> {
    const resolver = this.findResolver(parsed);
    if (!resolver) return null;

    const instance = new resolver(
      parsed.region || 'us-east-1',
      () => Promise.resolve(credFn()),
    );

    try {
      const node = await withTimeout<DiscoveryNode | null>(RESOLVE_TIMEOUT_MS, instance.resolve(parsed));
      if (!node) {
        this.progress.resolved++;
        this.notify(undefined);
        return null;
      }

      this.store.addNode(node);
      this.progress.resolved++;
      this.notify(undefined);

      return {
        node,
        newRefs: Array.from(node.referencedArns),
      };
    } catch {
      return null;
    }
  }

  // ── Node/edge construction ─────────────────────────────────────────

  createPlaceholderNode(arn: string): DiscoveryNode {
    const parsed = parseARN(arn);
    if (!parsed) throw new Error(`Invalid ARN: ${arn}`);

    const logicalId = parsed.resourceId;
    const hasResolver = this.findResolver(parsed) !== null;
    const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

    return {
      logicalId,
      canonicalName: makeCanonicalName(parsed.service, logicalId),
      service: parsed.service,
      cfnType: `AWS::${capitalize(parsed.service)}::${capitalize(parsed.resourceType)}`,
      properties: {},
      primaryArn: parsed,
      referencedArns: new Set(),
      classification: hasResolver ? NodeClassification.RESOURCE : NodeClassification.EXTERNAL,
      referenceOnly: !hasResolver,
      metadata: { isPlaceholder: true, createdAt: new Date().toISOString() },
      discoveryState: 'placeholder' as const,
    };
  }

  private addEdgeForNode(sourceArn: string, node: DiscoveryNode): void {
    for (const targetArn of node.referencedArns) {
      const canonical = canonicalForGraph(targetArn);
      if (!canonical || canonical === sourceArn) continue;

      this.store.addEdge({
        id: `${sourceArn}>>${canonical}`,
        source: sourceArn,
        target: canonical,
        relationshipType: this.classifyEdge(targetArn),
      });
    }
  }

  private classifyEdge(arn: string): string {
    const parsed = parseARN(arn);
    if (!parsed) return 'connect-ref';

    if (parsed.service === 'iam') {
      if (parsed.resourceType === 'role') return 'iam-role';
      if (parsed.resourceType === 'policy') return 'iam-permission';
    }
    if (parsed.service === 'lambda') return 'invokes';
    if (parsed.service === 'dynamodb') return 'storage';
    if (parsed.service === 's3') return 'storage';
    if (parsed.service === 'cloudwatch') return 'log-group';
    return 'connect-ref';
  }

  private findResolver(parsed: ParsedARN): ResolverConstructor | null {
    return getResolver(`${parsed.service}:${parsed.resourceType}`) || getResolver(parsed.service) || null;
  }

  private notify(onProgress?: ProgressCallback): void {
    if (onProgress) {
      try { onProgress(this.getProgress()); } catch { /* ignore */ }
    }
  }
}

type Creds = { accessKeyId: string; secretAccessKey: string; sessionToken?: string };

// No singleton — instantiate in index.ts and inject into routes
