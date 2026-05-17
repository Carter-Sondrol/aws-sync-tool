import { parseARN, canonicalForGraph } from "../arn.js";
import { getResolver } from "../resolvers/registry.js";
import { resolveResource } from "../resolvers/resolve-resource.js";
import type { ParsedARN } from "../arn.js";
import type { GraphStore } from "./store.js";
import type { AwsCredentials, DiscoveryProgress, GraphEdge } from "@aws-sync-tool/types";
import type { Credentials } from "../resolvers/resolver-types.js";
import type { DiscoveryNode } from "../discovery/discovery-node.js";
import { NodeClassification } from "../discovery/discovery-node.js";

export interface DiscoverOptions {
	/** Maximum number of nodes to resolve (default: 10000) */
	maxNodes?: number;
	/** Known S3 bucket names (helps extractARNs identify bucket references) */
	knownBuckets?: Set<string>;
	/** Max concurrent API calls per service batch (default: 5) */
	concurrencyPerService?: number;
}

/**
 * Thin BFS discovery engine with parallel resolution.
 *
 * Seeds a queue with ARNs, resolves each one through the shared pipeline,
 * enqueues any referenced ARNs, and repeats until the queue is empty,
 * cancelled, or the node limit is reached.
 *
 * Key behaviors:
 * - Creates "pending" nodes and edges immediately when references are found.
 * - Updates pending → resolved when the API call completes.
 * - Resolves ARNs in parallel batches grouped by service.
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
	 * ARNs are resolved in parallel batches grouped by service.
	 */
	async discover(
		seedArns: string[],
		credentials: () => Promise<Credentials>,
		options?: DiscoverOptions,
	): Promise<void> {
		this.cancelled = false;
		const visited = new Set<string>();
		let resolved = 0;
		const maxNodes = options?.maxNodes ?? 10000;
		const concurrency = options?.concurrencyPerService ?? 5;

		// Seed the queue with pending nodes
		const queue: string[] = [];
		for (const arn of seedArns) {
			const canonical = canonicalForGraph(arn);
			if (canonical && !visited.has(canonical)) {
				visited.add(canonical);
				const parsed = parseARN(canonical);
				if (parsed) {
					this.store.addNode(this.createPendingNode(parsed));
				}
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
			// Group this batch by service for parallel resolution
			const serviceGroups = new Map<string, string[]>();
			for (const arn of queue) {
				const parsed = parseARN(arn);
				if (parsed) {
					const key = parsed.service;
					const group = serviceGroups.get(key);
					if (!group) {
						serviceGroups.set(key, [arn]);
					} else {
						group.push(arn);
					}
				}
			}
			queue.length = 0;

			// Resolve each service group in parallel
			const results = await Promise.all(
				Array.from(serviceGroups.entries()).map(async ([, arns]) => {
					// Process in chunks of `concurrency` to avoid overwhelming rate limits
					const resolvedArns: Array<{ arn: string; node: DiscoveryNode | null }> = [];
					for (let i = 0; i < arns.length && !this.cancelled; i += concurrency) {
						const chunk = arns.slice(i, i + concurrency);
						const chunkResults = await Promise.all(
							chunk.map(async (arn) => {
								const parsed = parseARN(arn);
								if (!parsed) return { arn: arn, node: null };

								const resolver = getResolver(`${parsed.service}:${parsed.resourceType}`);
								if (!resolver) {
									// No resolver — update pending to placeholder
									this.store.updateNode(this.createPlaceholderNode(parsed));
									return { arn: arn, node: this.store.getNode(arn) ?? null };
								}

								const node = await resolveResource(resolver, parsed, credentials, {
									knownBuckets: options?.knownBuckets,
								});
								return { arn: arn, node };
							}),
						);
						resolvedArns.push(...chunkResults);
					}
					return resolvedArns;
				}),
			);

			// Flatten results and process
			for (const { arn, node } of results.flat()) {
				if (this.cancelled) break;

				if (!node) {
					// Resolution failed — leave pending node as-is (it'll show as error)
					resolved++;
					this.emitProgress(arn, resolved);
					continue;
				}

				// Update the pending node with resolved data
				this.store.updateNode(node);
				resolved++;

				// Create edges and enqueue new references
				for (const [refArn, labels] of node.referencedArnPaths) {
					const canonical = canonicalForGraph(refArn);
					if (!canonical || visited.has(canonical)) continue;

					if (resolved >= maxNodes) continue;

					visited.add(canonical);
					const refParsed = parseARN(canonical);

					// Create edge from source → target
					const edge: GraphEdge = {
						id: `${arn}>>${canonical}`,
						source: arn,
						target: canonical,
						relationshipType: "referenced_arn",
						labels: Array.from(labels),
					};
					this.store.addEdge(edge);

					// Create pending node for the target
					if (refParsed) {
						this.store.addNode(this.createPendingNode(refParsed));
						queue.push(canonical);
					}
				}

				this.emitProgress(arn, resolved);
			}

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

	private createPendingNode(parsed: ParsedARN): DiscoveryNode {
		const logicalId = parsed.resourceId;
		const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

		return {
			logicalId,
			service: parsed.service,
			cfnType: `AWS::${capitalize(parsed.service)}::${capitalize(parsed.resourceType)}`,
			properties: {},
			primaryArn: parsed,
			referencedArns: new Set<string>(),
			referencedArnPaths: new Map(),
			classification: NodeClassification.RESOURCE,
			referenceOnly: false,
			metadata: { isPending: true, createdAt: new Date().toISOString() },
			discoveryState: "resolving" as const,
		};
	}

	private createPlaceholderNode(parsed: ParsedARN): DiscoveryNode {
		const logicalId = parsed.resourceId;
		const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

		return {
			logicalId,
			service: parsed.service,
			cfnType: `AWS::${capitalize(parsed.service)}::${capitalize(parsed.resourceType)}`,
			properties: {},
			primaryArn: parsed,
			referencedArns: new Set<string>(),
			referencedArnPaths: new Map(),
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
