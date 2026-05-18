import { create } from 'zustand';
import type { DiscoveredNode as BaseDiscoveredNode, GraphEdge, DiscoveryProgress, NodeClassification, AccountProfile } from '@aws-sync-tool/types';

// Re-export for existing consumers
export type { GraphEdge, DiscoveryProgress } from '@aws-sync-tool/types';

/**
 * Frontend account config — extends AccountProfile with UI-specific fields.
 * AccountProfile is the API contract; this adds nothing extra currently
 * but provides a clear extension point for future UI state.
 */
export interface AccountConfig extends AccountProfile {
  // UI-specific fields can be added here in the future
}

/**
 * Frontend node shape — extends the API contract with UI-specific fields.
 */
export interface DiscoveredNode extends BaseDiscoveredNode {
  synced?: boolean;
}

export interface GraphData {
  nodes: Map<string, DiscoveredNode>;
  edges: GraphEdge[];
}

// Merged property result for multi-select
export interface MergedProperty {
  key: string;
  uniform: boolean;
  value: unknown;
}

const DEFAULT_COLLAPSED_TYPES = ['iam:role', 'iam:policy', 'cloudwatch:log-group'];

interface AppState {
  // Accounts
  accounts: AccountConfig[];
  activeAccountId: string | null;
  activeAccount: AccountConfig | null;
  setActiveAccountId: (id: string | null) => void;
  addAccount: (account: AccountConfig) => void;
  setAccounts: (accounts: AccountConfig[]) => void;
  removeAccount: (id: string) => void;
  updateAccount: (id: string, account: Partial<AccountConfig>) => void;

  // Discovery
  seedArns: string[];
  setSeedArns: (arns: string[]) => void;
  addSeedArn: (arn: string) => void;
  progress: DiscoveryProgress;
  setProgress: (progress: DiscoveryProgress) => void;

  // Graph
  graph: GraphData;
  setGraph: (graph: GraphData) => void;
  clearGraph: () => void;

  // Sync state
  syncedNodeArns: string[];
  toggleNodeSync: (arn: string) => void;
  toggleSyncForSelected: () => void;
  isNodeSynced: (arn: string) => boolean;
  clearSyncedNodes: () => void;

  // Selection (multi-select)
  selectedNodeArns: string[];
  setSelectedNodeArns: (arns: string[]) => void;
  toggleNodeSelection: (arn: string) => void;
  clearSelection: () => void;
  // Backward compat getter
  selectedNodeArn: string | null;

  // Collapse state
  collapsedNodeArns: string[];
  collapsedTypes: string[];
  toggleCollapseNode: (arn: string) => void;
  toggleCollapseType: (type: string) => void;
  isNodeCollapsed: (arn: string) => boolean;
  getCollapsedChildren: (arn: string) => string[];

  // Shared properties for multi-select
  getSharedProperties: () => MergedProperty[];
  updateSelectedProperty: (key: string, value: unknown) => void;

  // Floating AddResource panel
  addResourcePanelOpen: boolean;
  setAddResourcePanelOpen: (open: boolean) => void;

  // UI
  sidebarTab: 'accounts' | 'discovery' | 'resources';
  setSidebarTab: (tab: 'accounts' | 'discovery' | 'resources') => void;
}

const emptyGraph: GraphData = {
  nodes: new Map(),
  edges: [],
};

const idleProgress: DiscoveryProgress = {
  phase: 'idle',
  seedCount: 0,
  resolved: 0,
  totalFound: 0,
};

const STORAGE_KEY = 'aws-sync-accounts';

const loadFromStorage = (): { accounts: AccountConfig[], activeAccountId: string | null } => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      const accounts: AccountConfig[] = (parsed.accounts || []).map((a: Record<string, unknown>) => ({
        id: a.id as string,
        label: a.label as string,
        accountId: (a.accountId as string) || '',
        region: a.region as string,
        credentialMethod: (a.credentialMethod as AccountConfig['credentialMethod']) || 'profile',
        profileName: a.profileName as string | undefined,
        ssoStartUrl: a.ssoStartUrl as string | undefined,
      }));
      const activeAccountId = accounts.find((a: AccountConfig) => a.id === parsed.activeAccountId)
        ? parsed.activeAccountId : accounts.length > 0 ? accounts[0].id : null;
      return { accounts, activeAccountId };
    }
  } catch {
    // ignore
  }
  return { accounts: [], activeAccountId: null };
};

const persist = (accounts: AccountConfig[], activeAccountId: string | null) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ accounts, activeAccountId }));
  } catch {
    // ignore
  }
};

const initial = loadFromStorage();

// Helper: get resource type string from node
const getResourceType = (node: DiscoveredNode): string => `${node.service}:${node.cfnType ? node.cfnType.split(':').pop() : node.service}`;

export const useAppStore = create<AppState>((set, get) => ({
  accounts: initial.accounts,
  activeAccountId: initial.activeAccountId,
  activeAccount: initial.accounts.find((a) => a.id === initial.activeAccountId) || null,
  setActiveAccountId: (id) => set((s) => {
    const newState = { activeAccountId: id, activeAccount: s.accounts.find((a) => a.id === id) || null };
    persist(s.accounts, id);
    return newState;
  }),
  addAccount: (account) => set((s) => {
    const newAccounts = [...s.accounts, account];
    persist(newAccounts, account.id);
    return {
      accounts: newAccounts,
      activeAccountId: account.id,
      activeAccount: account,
    };
  }),
  setAccounts: (accounts) => set((s) => {
    const newActive = accounts.find((a) => a.id === s.activeAccountId)
      ? s.activeAccountId
      : accounts.length > 0 ? accounts[0].id : null;
    persist(accounts, newActive);
    return {
      accounts,
      activeAccountId: newActive,
      activeAccount: accounts.find((a) => a.id === newActive) || null,
    };
  }),
  removeAccount: (id) => set((s) => {
    const newAccounts = s.accounts.filter((a) => a.id !== id);
    let newActive = s.activeAccountId;
    if (s.activeAccountId === id) {
      newActive = newAccounts.length > 0 ? newAccounts[0].id : null;
    }
    persist(newAccounts, newActive);
    return {
      accounts: newAccounts,
      activeAccountId: newActive,
      activeAccount: newAccounts.find((a) => a.id === newActive) || null,
    };
  }),
  updateAccount: (id, updates) => set((s) => {
    const newAccounts = s.accounts.map((a) => a.id === id ? { ...a, ...updates } : a);
    persist(newAccounts, s.activeAccountId);
    return {
      accounts: newAccounts,
      activeAccount: newAccounts.find((a) => a.id === s.activeAccountId) || null,
    };
  }),

  seedArns: [],
  setSeedArns: (arns) => set({ seedArns: arns }),
  addSeedArn: (arn) => set((s) => ({ seedArns: [...s.seedArns, arn] })),
  progress: idleProgress,
  setProgress: (progress) => set({ progress }),

  graph: emptyGraph,
  setGraph: (graph) => set({ graph }),
  clearGraph: () => set({ graph: emptyGraph, selectedNodeArns: [], syncedNodeArns: [], collapsedNodeArns: [] }),

  syncedNodeArns: [],
  toggleNodeSync: (arn: string) => set((s) => ({
    syncedNodeArns: s.syncedNodeArns.includes(arn)
      ? s.syncedNodeArns.filter((a) => a !== arn)
      : [...s.syncedNodeArns, arn],
  })),
  toggleSyncForSelected: () => {
    const { selectedNodeArns, toggleNodeSync } = get();
    selectedNodeArns.forEach((arn) => toggleNodeSync(arn));
  },
  isNodeSynced: (arn: string): boolean => get().syncedNodeArns.includes(arn),
  clearSyncedNodes: () => set({ syncedNodeArns: [] }),

  // Selection
  selectedNodeArns: [],
  setSelectedNodeArns: (arns) => set({ selectedNodeArns: arns }),
  toggleNodeSelection: (arn: string) => set((s) => ({
    selectedNodeArns: s.selectedNodeArns.includes(arn)
      ? s.selectedNodeArns.filter((a) => a !== arn)
      : [...s.selectedNodeArns, arn],
  })),
  clearSelection: () => set({ selectedNodeArns: [] }),
  get selectedNodeArn(): string | null {
    return get().selectedNodeArns[0] || null;
  },

  // Collapse
  collapsedNodeArns: [],
  collapsedTypes: [...DEFAULT_COLLAPSED_TYPES],
  toggleCollapseNode: (arn: string) => set((s) => ({
    collapsedNodeArns: s.collapsedNodeArns.includes(arn)
      ? s.collapsedNodeArns.filter((a) => a !== arn)
      : [...s.collapsedNodeArns, arn],
  })),
  toggleCollapseType: (type: string) => set((s) => ({
    collapsedTypes: s.collapsedTypes.includes(type)
      ? s.collapsedTypes.filter((t) => t !== type)
      : [...s.collapsedTypes, type],
  })),
  isNodeCollapsed: (arn: string): boolean => {
    const s = get();
    if (s.collapsedNodeArns.includes(arn)) return true;
    const node = s.graph.nodes.get(arn);
    if (node && s.collapsedTypes.includes(getResourceType(node))) return true;
    return false;
  },
  getCollapsedChildren: (arn: string): string[] => {
    const s = get();
    const node = s.graph.nodes.get(arn);
    if (!node) return [];
    const children = node.referencedArns.filter((refArn) => s.graph.nodes.has(refArn));
    return children;
  },
  getSharedProperties: (): MergedProperty[] => {
    const s = get();
    if (s.selectedNodeArns.length === 0) return [];
    const nodes = s.selectedNodeArns
      .map((arn) => s.graph.nodes.get(arn))
      .filter((n): n is DiscoveredNode => n != null);
    if (nodes.length === 0) return [];

    // Collect all property keys
    const allKeys = new Set<string>();
    nodes.forEach((n) => {
      allKeys.add('logicalId');
      allKeys.add('classification');
      allKeys.add('referenceOnly');
      allKeys.add('synced');
      Object.keys(n.properties).forEach((k) => allKeys.add(`properties.${k}`));
    });

    const result: MergedProperty[] = [];
    for (const key of allKeys) {
      const values = nodes.map((n) => {
        if (key === 'logicalId') return n.logicalId;
        if (key === 'classification') return n.classification;
        if (key === 'referenceOnly') return n.referenceOnly;
        if (key === 'synced') return s.syncedNodeArns.includes(n.arn);
        if (key.startsWith('properties.')) {
          const propKey = key.slice('properties.'.length);
          return n.properties[propKey];
        }
        return undefined;
      });
      const uniform = values.every((v) => v === values[0]);
      result.push({ key, uniform, value: uniform ? values[0] : undefined });
    }
    return result;
  },
  updateSelectedProperty: (key: string, value: unknown) => {
    const s = get();
    const arnsToUpdate = s.selectedNodeArns.filter((arn) => s.graph.nodes.has(arn));
    if (arnsToUpdate.length === 0) return;

    // Build new node map with updated properties
    const newNodes = new Map(s.graph.nodes);
    for (const arn of arnsToUpdate) {
      const node = newNodes.get(arn);
      if (!node) continue;
      const updated = { ...node };
      if (key === 'logicalId') updated.logicalId = value as string;
      else if (key === 'classification') updated.classification = value as NodeClassification;
      else if (key === 'referenceOnly') updated.referenceOnly = value as boolean;
      else if (key.startsWith('properties.')) {
        const propKey = key.slice('properties.'.length);
        updated.properties = { ...node.properties, [propKey]: value };
      }
      newNodes.set(arn, updated);
    }
    set({ graph: { ...s.graph, nodes: newNodes } });

    // Persist to backend
    for (const arn of arnsToUpdate) {
      const node = newNodes.get(arn);
      if (!node) continue;
      fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8080'}/api/graph/node/${encodeURIComponent(arn)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          logicalId: node.logicalId,
          classification: node.classification,
          referenceOnly: node.referenceOnly,
          properties: node.properties,
        }),
      }).catch(() => {});
    }
  },

  addResourcePanelOpen: false,
  setAddResourcePanelOpen: (open) => set({ addResourcePanelOpen: open }),

  sidebarTab: 'accounts',
  setSidebarTab: (tab) => set({ sidebarTab: tab }),
}));
