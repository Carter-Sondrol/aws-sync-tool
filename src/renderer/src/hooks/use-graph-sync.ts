import { useCallback } from 'react'
import { type GraphEdge, type GraphNode, useAppStore } from '../stores/app-store'

export function useGraphSync() {
    const { setGraph, setMapping } = useAppStore()

    return useCallback(
        async (updatedEnvId?: string) => {
            try {
                const [allGraphs, mapping] = await Promise.all([
                    window.api.graphs.getAll(),
                    window.api.mapping.get()
                ])
                for (const [envId, data] of Object.entries(allGraphs)) {
                    if (updatedEnvId && envId !== updatedEnvId) continue
                    const nodes = new Map<string, GraphNode>()
                    for (const [arn, node] of Object.entries(data.nodes ?? {})) {
                        const n = node as any
                        nodes.set(arn, {
                            ...n,
                            discoveryState: n.discoveryState ?? 'resolved',
                            classification: n.classification ?? 'resource',
                            referencedArns: n.referencedArns ?? []
                        } as GraphNode)
                    }
                    setGraph(envId, { nodes, edges: (data.edges ?? []) as GraphEdge[] })
                }
                setMapping(mapping)
            } catch (err) {
                console.error('Failed to load graphs:', err)
            }
        },
        [setGraph, setMapping]
    )
}
