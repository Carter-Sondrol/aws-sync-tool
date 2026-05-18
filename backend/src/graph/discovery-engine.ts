import type {
	AwsCredentials,
	DiscoveryProgress,
	GraphEdge,
	Node,
} from "@aws-sync-tool/types";
import type { ParsedARN } from "../../../packages/types/src/arn.js";
import type { Credentials } from "../resolvers/resolver-types.js";
import type { ResolveResult } from "../resolvers/resolve-resource.js";
import { canonicalForGraph, parseARN } from "../../../packages/types/src/arn.js";
import { clearClientCache } from "../resolvers/client-cache.js";
import { getResolver } from "../resolvers/registry.js";
import { resolveResource } from "../resolvers/resolve-resource.js";
import type { GraphStore } from "./store.js";

export interface DiscoverOptions {
	maxNodes?: number;
	knownBuckets?: Set<string>;
	concurrencyPerService?: number;
}

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

	onProgress(callback: (progress: DiscoveryProgress) => void): void {
		this.progressCallbacks.push(callback);
	}

	cancel(): void {
		this.cancelled = true;
	}

	getProgress(): DiscoveryProgress {
		return { ...this.currentProgress };
	}

	async discover(
		seedArns: string[],
		credentials: () => Promise<Credentials>,
		options?: DiscoverOptions,
	): Promise<void> {
		this.cancelled = false;
		clearClientCache();

		const visited = new Set<string>();
		let resolved = 0;
		const maxNodes = options?.maxNodes ?? 10000;
		const concurrency = options?.concurrencyPerService ?? 5;

		const queue: string[] = [];
		for (const arn of seedArns) {
			const canonical = canonicalForGraph(arn);
			if (canonical && !visited.has(canonical)) {
				visited.add(canonical);
				const parsed = parseARN(canonical);
				if (parsed) {
					this.store.addNode(createPendingNode(parsed));
					queue.push(canonical);
				}
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
			const serviceGroups = new Map<string, string[]>();
			for (const arn of queue) {
				const parsed = parseARN(arn);
				if (parsed) {
					const group = serviceGroups.get(parsed.service);
					if (!group) {
						serviceGroups.set(parsed.service, [arn]);
					} else {
						group.push(arn);
					}
				}
			}
			queue.length = 0;

			const results = await Promise.all(
				Array.from(serviceGroups.entries()).map(async ([, arns]) => {
					const batch: Array<{
						arn: string;
						result: ResolveResult | null;
					}> = [];
					for (
						let i = 0;
						i < arns.length && !this.cancelled;
						i += concurrency
					) {
						const chunk = arns.slice(i, i + concurrency);
						const chunkResults = await Promise.all(
							chunk.map(async (arn) => {
								const parsed = parseARN(arn);
								if (!parsed) return { arn, result: null };

								const resolver = getResolver(
									`${parsed.service}:${parsed.resourceType}`,
								);
								if (!resolver) {
									this.store.updateNode(createPlaceholderNode(parsed));
									return { arn, result: null };
								}

								const result = await resolveResource(
									resolver,
									parsed,
									credentials,
									{ knownBuckets: options?.knownBuckets },
								);
								return { arn, result };
							}),
						);
						batch.push(...chunkResults);
					}
					return batch;
				}),
			);

			for (const { arn, result } of results.flat()) {
				if (this.cancelled) break;

				if (!result) {
					resolved++;
					this.emitProgress(arn, resolved);
					continue;
				}

				this.store.updateNode(result.node);
				resolved++;

				for (const [refArn, labels] of result.arnPaths) {
					const canonical = canonicalForGraph(refArn);
					if (!canonical || visited.has(canonical)) continue;
					if (resolved >= maxNodes) continue;

					visited.add(canonical);

					const edge: GraphEdge = {
						id: `${arn}>>${canonical}`,
						source: arn,
						target: canonical,
						relationshipType: "referenced_arn",
						labels: Array.from(labels),
					};
					this.store.addEdge(edge);

					const refParsed = parseARN(canonical);
					if (refParsed) {
						this.store.addNode(createPendingNode(refParsed));
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

	async resolveNode(
		arn: string,
		credentials: AwsCredentials,
	): Promise<Node | null> {
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

		const result = await resolveResource(resolver, parsed, credFn);
		return result?.node ?? null;
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

function createPendingNode(parsed: ParsedARN): Node {
	const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
	return {
		logicalId: parsed.resourceId,
		arn: parsed.raw,
		service: parsed.service,
		cfnType: `AWS::${capitalize(parsed.service)}::${capitalize(parsed.resourceType)}`,
		data: {},
		referencedArns: [],
		classification: "resource",
		referenceOnly: false,
		metadata: { isPending: true, createdAt: new Date().toISOString() },
		discoveryState: "resolving",
	};
}

function createPlaceholderNode(parsed: ParsedARN): Node {
	const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
	return {
		logicalId: parsed.resourceId,
		arn: parsed.raw,
		service: parsed.service,
		cfnType: `AWS::${capitalize(parsed.service)}::${capitalize(parsed.resourceType)}`,
		data: {},
		referencedArns: [],
		classification: "external",
		referenceOnly: true,
		metadata: { isPlaceholder: true, createdAt: new Date().toISOString() },
		discoveryState: "placeholder",
	};
}
