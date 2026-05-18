import { useCallback } from 'react';
import { useAppStore } from '../stores/app-store';
import { getGraph } from './api';

export function useGraphSync() {
  const setGraph = useAppStore((s: any) => s.setGraph);

  const syncGraph = useCallback(async () => {
    try {
      const data = await getGraph();
      const res = data as {
        nodes: Record<string, any>;
        edges: Array<{ id: string; source: string; target: string; relationshipType: string; label?: string }>;
      };
      if (!res || !res.nodes) return;

      const nodes = new Map<string, any>();
      for (const [arn, node] of Object.entries(res.nodes)) {
        nodes.set(arn, node);
      }

      setGraph({
        nodes,
        edges: res.edges || [],
      });
    } catch {
      // ignore sync failures
    }
  }, [setGraph]);

  return syncGraph;
}
