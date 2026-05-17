/**
 * use-lazy-resolver.ts
 *
 * Lazily resolves placeholder nodes in the background.
 * Prioritizes synced nodes, then discovered nodes, then all visible nodes.
 * Interruptible — stops when a new discovery run starts or the graph is cleared.
 */

import { useCallback, useEffect, useRef } from 'react';
import { useAppStore } from '../stores/app-store';
import { resolvePlaceholder, getGraph } from './api';

const RESOLVE_DELAY_MS = 800; // delay between resolution requests

export interface LazyResolverState {
  active: boolean;
  resolving: string | null; // currently resolving ARN
  resolved: number;         // total resolved this session
  failed: number;           // total failed this session
  queueLength: number;      // pending in queue
}

export function useLazyResolver() {
  const {
    graph,
    syncedNodeArns,
    activeAccount,
    progress,
    setGraph,
  } = useAppStore();

  const stateRef = useRef<LazyResolverState>({
    active: false,
    resolving: null,
    resolved: 0,
    failed: 0,
    queueLength: 0,
  });

  const stopRef = useRef<(() => void) | null>(null);

  const getState = useCallback(() => stateRef.current, []);

  /**
   * Sync graph from backend after a resolution.
   */
  const syncGraph = useCallback(async () => {
    try {
      const data = await getGraph();
      const res = data as {
        nodes: Record<string, any>;
        edges: Array<{ id: string; source: string; target: string; relationshipType: string; labels?: string[] }>;
      };
      if (!res || !res.nodes) return;

      const nodes = new Map<string, any>();
      for (const [arn, node] of Object.entries(res.nodes)) {
        nodes.set(arn, node);
      }

      setGraph({
        nodes,
        edges: (res.edges || []).map((e) => ({ ...e, labels: e.labels ?? [] })),
      });
    } catch {
      // ignore sync failures
    }
  }, [setGraph]);

  /**
   * Start lazy resolution of placeholder nodes.
   * Call this when the graph loads or changes.
   * Previous resolver is automatically stopped.
   */
  const start = useCallback(() => {
    // Stop any existing resolver
    stopRef.current?.();

    if (!activeAccount?.id) return;
    if (graph.nodes.size === 0) return;

    const accountId = activeAccount.id;
    const abortController = new AbortController();
    const signal = abortController.signal;
    stopRef.current = () => abortController.abort();

    const state = { ...stateRef.current };
    state.active = true;
    state.resolved = 0;
    state.failed = 0;
    state.resolving = null;
    stateRef.current = state;

    // Collect placeholder ARNs, prioritizing synced nodes
    const placeholderArns: string[] = [];
    const syncedPlaceholders: string[] = [];

    for (const [arn, node] of graph.nodes) {
      const isPlaceholder = (node.metadata as Record<string, unknown>)?.isPlaceholder === true;
      if (isPlaceholder && node.discoveryState === 'placeholder') {
        if (syncedNodeArns.includes(arn)) {
          syncedPlaceholders.push(arn);
        } else {
          placeholderArns.push(arn);
        }
      }
    }

    // Synced nodes first, then rest
    const queue = [...syncedPlaceholders, ...placeholderArns];
    state.queueLength = queue.length;
    stateRef.current = state;

    if (queue.length === 0) {
      state.active = false;
      stateRef.current = state;
      return;
    }

    let index = 0;

    async function processNext() {
      if (signal.aborted || index >= queue.length) {
        state.active = false;
        state.resolving = null;
        state.queueLength = 0;
        stateRef.current = state;
        return;
      }

      const arn = queue[index];
      state.resolving = arn;
      state.queueLength = queue.length - index - 1;
      stateRef.current = state;

      try {
        await resolvePlaceholder(arn, accountId);
        state.resolved = state.resolved + 1;
        await syncGraph();
      } catch {
        state.failed = state.failed + 1;
      }

      index++;
      stateRef.current = state;

      if (!signal.aborted && index < queue.length) {
        setTimeout(processNext, RESOLVE_DELAY_MS);
      } else {
        state.active = false;
        state.resolving = null;
        state.queueLength = 0;
        stateRef.current = state;
      }
    }

    // Start processing
    setTimeout(processNext, 500); // small initial delay
  }, [activeAccount, graph.nodes, syncedNodeArns, syncGraph]);

  /**
   * Stop the lazy resolver.
   */
  const stop = useCallback(() => {
    stopRef.current?.();
    stateRef.current = {
      active: false,
      resolving: null,
      resolved: 0,
      failed: 0,
      queueLength: 0,
    };
  }, []);

  // Auto-stop when discovery phase changes (new discovery or idle)
  useEffect(() => {
    if (progress.phase === 'running') {
      stop();
    }
  }, [progress.phase, stop]);

  return {
    state: stateRef.current,
    start,
    stop,
    getState,
  };
}
