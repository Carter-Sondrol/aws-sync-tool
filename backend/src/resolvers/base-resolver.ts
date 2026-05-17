import type { ParsedARN } from '../arn.js';
import type { DiscoveryNode } from '../discovery/discovery-node.js';
import { NodeClassification } from '../discovery/discovery-node.js';
import { extractARNs, makeCanonicalName } from '../arn.js';

const ACCESS_DENIED_CODES = new Set([
  'AccessDenied',
  'AccessDeniedException',
  'AuthorizationError',
  'UnauthorizedOperation',
]);

const NOT_FOUND_CODES = new Set([
  'NoSuchEntity',
  'ResourceNotFoundException',
  'NotFoundException',
  'NoSuchBucket',
  'NoSuchKey',
]);

const THROTTLE_CODES = new Set([
  'TooManyRequestsException',
  'ThrottlingException',
  'RequestLimitExceeded',
  'ServiceUnavailable',
]);

/** Configuration for a resolver — passed to the parent constructor. */
export interface ResolverConfig {
  service: string;
  resourceType?: string;
  cfnType?: string | null;
  enableDeepScan?: boolean;
}

export abstract class BaseResolver {
  protected _clients: Map<string, unknown> = new Map();
  protected log: { warning: (...args: unknown[]) => void; error: (...args: unknown[]) => void };

  constructor(
    protected config: ResolverConfig,
    protected region: string,
    protected credentials: () => Promise<{ accessKeyId: string; secretAccessKey: string; sessionToken?: string }>,
  ) {
    this.log = {
      warning: console.warn,
      error: console.error,
    };
  }

  // ── Region-aware client acquisition ──────────────────────────────────

  /** Subclasses must implement to return the appropriate AWS SDK client. */
  protected abstract getClientForRegion(service: string, region: string): unknown;

  /**
   * Get or create a cached client for the ARN's region.
   * Falls back to `this.region` or `us-east-1` if ARN has no region.
   */
  protected getClient(arn: ParsedARN): unknown {
    const region = arn.region || this.region || 'us-east-1';
    const key = `${arn.service}:${region}`;
    if (!this._clients.has(key)) {
      this._clients.set(key, this.getClientForRegion(arn.service, region));
    }
    return this._clients.get(key)!;
  }

  // ── Core operations (must override) ──────────────────────────────────

  /**
   * Fetch raw resource data from AWS SDK.
   * @param arn Parsed ARN of the resource to fetch
   * @returns Raw property map (will be passed to toNode)
   */
  abstract fetchResource(arn: ParsedARN): Promise<Record<string, unknown>>;

  /**
   * Convert raw data + ARN into a DiscoveryNode.
   * Use `this.makeNode(arn, opts)` for standard node construction.
   * @param arn Parsed ARN of the resource
   * @param data Raw data returned by fetchResource
   * @returns DiscoveryNode with properties, references, and classification
   */
  abstract toNode(arn: ParsedARN, data: Record<string, unknown>): Promise<DiscoveryNode>;

  /**
   * Resolve a single ARN to a DiscoveryNode.
   * Handles rate limiting, throttle retry with exponential backoff,
   * and error classification (access denied, not found, unexpected).
   * @returns DiscoveryNode on success, null on unrecoverable error
   */
  async resolve(arn: ParsedARN): Promise<DiscoveryNode | null> {
    const service = this.config.service;
    const maxRetries = 3;
    const t0 = Date.now();

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const fetchStart = Date.now();
        console.log(`[Resolver:${service}] fetchResource → ${arn.raw}`);
        const raw = await this.fetchResource(arn);
        const fetchMs = Date.now() - fetchStart;
        console.log(`[Resolver:${service}] fetchResource ← done in ${fetchMs}ms`);
        if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
          throw new TypeError(`fetchResource returned ${typeof raw}, expected object`);
        }

        const nodeStart = Date.now();
        const node = await this.toNode(arn, raw);
        const nodeMs = Date.now() - nodeStart;
        if (typeof node !== 'object' || node === null) {
          throw new TypeError(`toNode returned ${typeof node}, expected DiscoveryNode`);
        }

        const totalMs = Date.now() - t0;
        console.log(`[Resolver:${service}] ✓ ${arn.raw} → ${node.logicalId} (fetch=${fetchMs}ms, toNode=${nodeMs}ms, total=${totalMs}ms)`);
        return node;
      } catch (err: unknown) {
        const error = err as { code?: string; name?: string; message?: string; $metadata?: { retryAfterSeconds?: number } };
        const code = error.code ?? error.name ?? '';

        // Throttle error — wait for retryAfterSeconds (or fallback) and retry
        if (THROTTLE_CODES.has(code) && attempt < maxRetries) {
          const retryAfter = (error.$metadata?.retryAfterSeconds ?? 1) * 1000;
          this.log.warning(
            `[${service}] Throttle detected (${code}), retrying ${attempt + 1}/${maxRetries} after ~${retryAfter}ms`,
          );
          await new Promise((r) => setTimeout(r, retryAfter));
          continue;
        }

        if (ACCESS_DENIED_CODES.has(code)) {
          this.log.warning(`[${service}] Access denied fetching ${arn.raw} (${code})`);
          return null;
        } else if (NOT_FOUND_CODES.has(code)) {
          this.log.warning(`[${service}] Resource not found: ${arn.raw} (${code})`);
          return null;
        } else {
          this.log.error(
            `[${service}] Unexpected error resolving ${arn.raw}:`,
            error,
          );
          return null;
        }
      }
    }

    // Exhausted all retries
    return null;
  }

  // ── Helpers ──────────────────────────────────────────────────────────

  /**
   * Build a DiscoveryNode from ARN + options.
   * Auto-generates canonicalName, extracts ARN references from properties,
   * and sets discoveryState to 'resolved'.
   */
  protected makeNode(
    arn: ParsedARN,
    opts: {
      logicalId?: string;
      properties?: Record<string, unknown>;
      metadata?: Record<string, unknown>;
      referenceOnly?: boolean;
      classification?: NodeClassification;
    } = {},
  ): DiscoveryNode {
    const props = opts.properties ?? {};
    const referenced = extractARNs(props);

    const logicalId = opts.logicalId ?? arn.resourceId;
    return {
      logicalId,
      canonicalName: makeCanonicalName(this.config.service, logicalId),
      service: this.config.service,
      cfnType:
        this.config.cfnType ??
        `AWS::${capitalize(this.config.service)}::${capitalize(this.config.resourceType ?? 'Resource')}`,
      properties: props,
      primaryArn: arn,
      referencedArns: referenced,
      classification: opts.classification ?? NodeClassification.RESOURCE,
      referenceOnly: opts.referenceOnly ?? false,
      metadata: opts.metadata ?? {},
      discoveryState: 'resolved' as const,
    };
  }

  /**
   * Extract all ARN references from raw resource data.
   * Scans properties recursively. If enableDeepScan is true, also calls deepChildrenAsync.
   */
  protected async extractReferences(
    arn: ParsedARN,
    raw: Record<string, unknown>,
    knownBuckets?: Set<string>,
  ): Promise<Set<string>> {
    try {
      const refs = extractARNs(raw, { knownBuckets });
      if (this.config.enableDeepScan) {
        try {
          const deep = await this.deepChildrenAsync(arn, raw);
          for (const d of deep) refs.add(d);
        } catch (e) {
          this.log.warning(`[${this.config.service}] deep children failed for ${arn.raw}:`, e);
        }
      }
      return refs;
    } catch (e) {
      this.log.warning(`[${this.config.service}] extractReferences failed for ${arn.raw}:`, e);
      return new Set<string>();
    }
  }

  /**
   * Override to discover child resource ARNs from raw data.
   * Called when enableDeepScan is true.
   */
  protected async deepChildrenAsync(_arn: ParsedARN, _raw: Record<string, unknown>): Promise<string[]> {
    return [];
  }

  // ── Service-wide listing ───────────────────────────────────────────

  /**
   * List all ARNs for this resource type in the account.
   * Override for bespoke listing logic. Used by "Discover All" to seed the BFS.
   * Default returns empty array (must override for listing support).
   */
  async listAllResources(_region?: string): Promise<string[]> {
    return [];
  }
}

function capitalize(str: string): string {
  return str.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/\b\w/g, (c) => c.toUpperCase());
}

