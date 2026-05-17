import { parseARN, canonicalForGraph, makeCanonicalName } from "../arn.js";
import { getResolver } from "../resolvers/registry.js";
import { resolveResource } from "../resolvers/resolve-resource.js";
import type { ParsedARN } from "../arn.js";
import type { GraphStore } from "./store.js";
import type { AwsCredentials, DiscoveryProgress } from "@aws-sync-tool/types";
import type { Credentials } from "../resolvers/resolve-resource.js";
import type { DiscoveryNode } from "../discovery/discovery-node.js";
import { NodeClassification } from "../discovery/discovery-node.js";

export interface DiscoverOptions {
	/** Maximum number of nodes to resolve (default: 10000) */
	maxNodes?: number;
	/** Known S3 bucket names (helps extractARNs identify bucket references) */
	knownBuckets?: Set<string>;
}

/**
 * Thin BFS discovery engine.
 *
 * Seeds a queue with ARNs, resolves each one through the shared pipeline,
 * enqueues any referenced ARNs, and repeats until the queue is empty,
 * cancelled, or the node limit is reached.
 *
 * Progress is reported via callbacks registered with onProgress().
 */
export class DiscoveryEngine {
	private cancelled = false;
	private progressCallbacks: ((progress: DiscoveryProgress) => void)[] = [];
	private currentProgress: DiscoveryProgress = {
		phase: "idle",
		seedCount: 0,
		resolved: 0,
		totalFound: 0,
	};

	constructor(private store: GraphStore) {}

	/** Register a callback for progress updates during discovery. */
	onProgress(callback: (progress: DiscoveryProgress) => void): void {
		this.progressCallbacks.push(callback);
	}

	/** Cancel an in-progress discovery traversal. */
	cancel(): void {
		this.cancelled = true;
	}

	/** Return the most recent progress snapshot (for polling). */
	getProgress(): DiscoveryProgress {
		return { ...this.currentProgress };
	}

	// ── Public entry points ────────────────────────────────────────────

	/**
	 * Discover a graph starting from seed ARNs.
	 *
	 * BFS traversal: resolve each ARN, enqueue its references, repeat.
	 */
	async discover(
		seedArns: string[],
		credentials: () => Promise<Credentials>,
		options?: DiscoverOptions,
	): Promise<void> {
		this.cancelled = false;
		const queue: string[] = [];
		const visited = new Set<string>();
		let resolved = 0;
		const maxNodes = options?.maxNodes ?? 10000;

		// Seed the queue
		for (const arn of seedArns) {
			const canonical = canonicalForGraph(arn);
			if (canonical && !visited.has(canonical)) {
				visited.add(canonical);
				queue.push(canonical);
			}
		}

		this.currentProgress = {
			phase: "running",
			seedCount: seedArns.length,
			resolved: 0,
			totalFound: queue.length,
		};
		this.emitProgress();

		while (queue.length > 0 && !this.cancelled) {
			const arn = queue.shift()!;

			const parsed = parseARN(arn);
			if (!parsed) {
				this.emitProgress(arn);
				continue;
			}

			const resolver = getResolver(`${parsed.service}:${parsed.resourceType}`);

			if (!resolver) {
				// No resolver — add as reference-only placeholder
				this.store.addNode(this.createPlaceholderNode(parsed));
				resolved++;
				this.emitProgress(arn, resolved);
				continue;
			}

			// Resolve via shared pipeline
			const node = await resolveResource(resolver, parsed, credentials, {
				knownBuckets: options?.knownBuckets,
			});

			if (!node) {
				this.emitProgress(arn, resolved);
				continue;
			}

			this.store.addNode(node);
			resolved++;

			// Enqueue referenced ARNs
			for (const refArn of node.referencedArns) {
				const canonical = canonicalForGraph(refArn);
				if (canonical && !visited.has(canonical) && resolved < maxNodes) {
					visited.add(canonical);
					queue.push(canonical);
				}
			}

			this.emitProgress(arn, resolved);

			if (resolved >= maxNodes) break;
		}

		this.currentProgress.phase = "complete";
		this.emitProgress();
	}

	/**
	 * Resolve a single ARN to a DiscoveryNode (without BFS expansion).
	 * Used by the /resolve endpoint.
	 */
	async resolveNode(
		arn: string,
		credentials: AwsCredentials,
	): Promise<DiscoveryNode | null> {
		const canonical = canonicalForGraph(arn);
		if (!canonical) return null;

		const parsed = parseARN(canonical);
		if (!parsed) return null;

		const resolver =
			getResolver(`${parsed.service}:${parsed.resourceType}`) ||
			getResolver(parsed.service);
		if (!resolver) return null;

		const credFn = () =>
			Promise.resolve({
				accessKeyId: credentials.accessKeyId,
				secretAccessKey: credentials.secretAccessKey,
				sessionToken: credentials.sessionToken,
			});

		return resolveResource(resolver, parsed, credFn);
	}

	// ── Helpers ────────────────────────────────────────────────────────

	private createPlaceholderNode(parsed: ParsedARN): DiscoveryNode {
		const logicalId = parsed.resourceId;
		const capitalize = (s: string) =>
			s.charAt(0).toUpperCase() + s.slice(1);

		return {
			logicalId,
			canonicalName: makeCanonicalName(parsed.service, logicalId),
			service: parsed.service,
			cfnType: `AWS::${capitalize(parsed.service)}::${capitalize(parsed.resourceType)}`,
			properties: {},
			primaryArn: parsed,
			referencedArns: new Set<string>(),
			classification: NodeClassification.EXTERNAL,
			referenceOnly: true,
			metadata: { isPlaceholder: true, createdAt: new Date().toISOString() },
			discoveryState: "placeholder" as const,
		};
	}

	private emitProgress(currentArn?: string, resolvedCount?: number): void {
		if (currentArn !== undefined) {
			this.currentProgress.currentArn = currentArn;
		}
		if (resolvedCount !== undefined) {
			this.currentProgress.resolved = resolvedCount;
		}

		for (const cb of this.progressCallbacks) {
			try {
				cb({ ...this.currentProgress });
			} catch {
				/* ignore callback errors */
			}
		}
	}
}
