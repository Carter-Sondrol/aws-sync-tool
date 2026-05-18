import type { Credentials } from "./resolver-types.js";

/**
 * Cache of AWS SDK clients keyed by `service:region`.
 *
 * SDK clients are expensive to create (TLS handshake, config loading)
 * but safe to reuse across calls. Credentials are assumed stable for
 * the duration of a discovery run.
 *
 * Usage:
 *   const client = getCachedClient(LambdaClient, "us-east-1", creds);
 *   await client.send(new GetFunctionCommand({ ... }));
 */

// Constructor type covering all AWS SDK v3 clients
type ClientConstructor = new (config: {
	region?: string;
	credentials: Credentials;
}) => unknown;

const cache = new Map<string, unknown>();

/**
 * Get or create a cached SDK client for the given service and region.
 */
export function getCachedClient(
	ClientCtor: ClientConstructor,
	region: string,
	credentials: Credentials,
): unknown {
	const key = `${ClientCtor.name}:${region}`;
	const cached = cache.get(key);
	if (cached) return cached;

	const client = new ClientCtor({ region, credentials });
	cache.set(key, client);
	return client;
}

/**
 * Clear all cached clients. Call between discovery runs or when
 * credentials change.
 */
export function clearClientCache(): void {
	cache.clear();
}
