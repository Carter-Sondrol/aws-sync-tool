import { create } from 'zustand';

// ─── Account Configuration ────────────────────────────────────────────────────

export interface AccountConfig {
  id: string;
  label: string;
  profileName?: string;
  region: string;
}

// ─── Graph Node & Edge ────────────────────────────────────────────────────────

export interface GraphNode {
  arn: string;
  logicalId: string;
  label: string;
  service: string;
  status: 'synced' | 'referenced' | 'external' | 'ignored';
  data: Record<string, unknown>;
  [key: string]: unknown;
}

export interface GraphEdge {
  source: string;
  target: string;
  type: string;
}

// ─── Discovery Progress ───────────────────────────────────────────────────────

export interface DiscoveryProgress {
  phase: 'idle' | 'discovering' | 'complete' | 'error';
  discoveredCount: number;
  totalEstimate: number;
  currentResource?: string;
  error?: string;
}

// ─── App Store ────────────────────────────────────────────────────────────────

interface AppStore {
  // Accounts
  accounts: AccountConfig[];
  activeAccountId: string | null;
  setAccounts: (accounts: AccountConfig[]) => void;
  addAccount: (account: AccountConfig) => void;
  removeAccount: (id: string) => void;
  setActiveAccountId: (id: string | null) => void;

  // Graph state
  graph: { nodes: Map<string, GraphNode>; edges: GraphEdge[] };
  setGraph: (graph: { nodes: Map<string, GraphNode>; edges: GraphEdge[] }) => void;
  clearGraph: () => void;

  // Node selection & sync
  selectedNodeArns: string[];
  setSelectedNodeArns: (arns: string[]) => void;
  toggleNodeSelection: (arn: string) => void;
  clearSelection: () => void;

  syncedNodeArns: string[];
  toggleNodeSync: (arn: string) => void;

  // Node collapse state
  collapsedNodeArns: Set<string>;
  toggleCollapseNode: (arn: string) => void;
  isNodeCollapsed: (arn: string) => boolean;

  // Sidebar panels
  sidebarTab: 'accounts' | 'discovery' | 'resources' | 'export';
  setSidebarTab: (tab: 'accounts' | 'discovery' | 'resources' | 'export') => void;

  // Dialogs
  addResourcePanelOpen: boolean;
  setAddResourcePanelOpen: (open: boolean) => void;

  // Discovery
  seedArns: string[];
  setSeedArns: (arns: string[]) => void;
  addSeedArn: (arn: string) => void;

  progress: DiscoveryProgress;
  setProgress: (progress: DiscoveryProgress) => void;
}

export const useAppStore = create<AppStore>((set, get) => ({
  // Accounts
  accounts: [],
  activeAccountId: null,
  setAccounts: (accounts) => set({ accounts }),
  addAccount: (account) =>
    set((state) => ({ accounts: [...state.accounts, account], activeAccountId: account.id })),
  removeAccount: (id) =>
    set((state) => {
      const newAccounts = state.accounts.filter((a) => a.id !== id);
      const newActiveId = state.activeAccountId === id ? newAccounts[0]?.id || null : state.activeAccountId;
      return { accounts: newAccounts, activeAccountId: newActiveId };
    }),
  setActiveAccountId: (id) => set({ activeAccountId: id }),

  // Graph state
  graph: { nodes: new Map(), edges: [] },
  setGraph: (graph) => set({ graph }),
  clearGraph: () => set({ graph: { nodes: new Map(), edges: [] }, selectedNodeArns: [], syncedNodeArns: [] }),

  // Node selection & sync
  selectedNodeArns: [],
  setSelectedNodeArns: (arns) => set({ selectedNodeArns: arns }),
  toggleNodeSelection: (arn) =>
    set((state) => {
      const set_arns = new Set(state.selectedNodeArns);
      if (set_arns.has(arn)) {
        set_arns.delete(arn);
      } else {
        set_arns.add(arn);
      }
      return { selectedNodeArns: Array.from(set_arns) };
    }),
  clearSelection: () => set({ selectedNodeArns: [] }),

  syncedNodeArns: [],
  toggleNodeSync: (arn) =>
    set((state) => {
      const set_arns = new Set(state.syncedNodeArns);
      if (set_arns.has(arn)) {
        set_arns.delete(arn);
      } else {
        set_arns.add(arn);
      }
      return { syncedNodeArns: Array.from(set_arns) };
    }),

  // Node collapse state
  collapsedNodeArns: new Set(),
  toggleCollapseNode: (arn) =>
    set((state) => {
      const newSet = new Set(state.collapsedNodeArns);
      if (newSet.has(arn)) {
        newSet.delete(arn);
      } else {
        newSet.add(arn);
      }
      return { collapsedNodeArns: newSet };
    }),
  isNodeCollapsed: (arn) => get().collapsedNodeArns.has(arn),

  // Sidebar panels
  sidebarTab: 'accounts',
  setSidebarTab: (tab) => set({ sidebarTab: tab }),

  // Dialogs
  addResourcePanelOpen: false,
  setAddResourcePanelOpen: (open) => set({ addResourcePanelOpen: open }),

  // Discovery
  seedArns: [],
  setSeedArns: (arns) => set({ seedArns: arns }),
  addSeedArn: (arn) =>
    set((state) => ({ seedArns: [...new Set([...state.seedArns, arn])] })),

  progress: { phase: 'idle', discoveredCount: 0, totalEstimate: 0 },
  setProgress: (progress) => set({ progress }),
}));
