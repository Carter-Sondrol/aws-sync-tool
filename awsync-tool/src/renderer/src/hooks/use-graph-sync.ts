/**
 * use-graph-sync.ts
 *
 * Hook for syncing graph operations with backend/state.
 */

import { useCallback } from 'react';
import { useAppStore } from '../stores/app-store';
import { getGraph } from './api';

export function useGraphSync() {
  const { setGraph } = useAppStore();

  const syncGraph = useCallback(async () => {
    try {
      const data = await getGraph();
      const graphData = data as { nodes?: Record<string, unknown>; edges?: unknown[] };

      const nodes = new Map<string, any>();
      if (graphData.nodes) {
        for (const [k, v] of Object.entries(graphData.nodes)) {
          nodes.set(k, v);
        }
      }

      setGraph({
        nodes,
        edges: (graphData.edges || []) as any[],
      });
    } catch (err) {
      console.error('Failed to sync graph:', err);
    }
  }, [setGraph]);

  return syncGraph;
}
