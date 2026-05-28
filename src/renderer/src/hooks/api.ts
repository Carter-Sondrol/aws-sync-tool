// Discovery and graph API stubs — will be replaced with real IPC calls as those features are built.

export async function expandDiscovery(_options: {
    accountId: string
    seedArns: string[]
    maxDepth?: number
    excludeServices?: string[]
}): Promise<void> {
    await new Promise((r) => setTimeout(r, 1000))
}

export async function getGraph(): Promise<{ nodes: Record<string, unknown>; edges: unknown[] }> {
    const stored = localStorage.getItem('aws-sync-graph')
    return stored ? JSON.parse(stored) : { nodes: {}, edges: [] }
}
