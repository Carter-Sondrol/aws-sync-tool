* App.tsx
 *
 * Force-directed graph via react-force-graph-2d (canvas-based).
 * Replaces ReactFlow + custom useForceLayout with a single
 * high-performance canvas component.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAppStore } from './stores/app-store';
import { useGraphSync } from './hooks/use-graph-sync';
import { ForceGraphComponent } from './components/graph/ForceGraphComponent';
import { AccountPanel } from './components/panels/AccountPanel';
import { DiscoveryPanel } from './components/panels/DiscoveryPanel';
import { ResourceList } from './components/panels/ResourceList';
import { DetailPanel } from './components/panels/DetailPanel';
import { AddResourcePanel } from './components/panels/AddResourcePanel';
import { ExportPanel } from './components/panels/ExportPanel';
import { clearGraph, exportGraph, importGraph, expandNode } from './hooks/api';

// ─── Tabs ─────────────────────────────────────────────────────────────────────

const tabs = [
  { key: 'accounts' as const, label: 'Accounts', icon: '◈' },
  { key: 'discovery' as const, label: 'Discover', icon: '⊕' },
  { key: 'resources' as const, label: 'Resources', icon: '◫' },
  { key: 'export' as const, label: 'Export', icon: '↗' },
] as const;

type TabKey = (typeof tabs)[number]['key'];

// ─── Search ───────────────────────────────────────────────────────────────────

function useSearch() {
  const [term, setTerm] = useState('');
  const debounceRef = useRef<number>(0);
  const [filtered, setFiltered] = useState('');

  const setSearch = useCallback((value: string) => {
    setTerm(value);
    clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => setFiltered(value), 150);
  }, []);

  useEffect(() => () => clearTimeout(debounceRef.current), []);

  return { term: filtered, setSearch };
}

// ─── App ──────────────────────────────────────────────────────────────────────

export function App() {
  const {
    graph,
    selectedNodeArns,
    setSelectedNodeArns,
    toggleNodeSelection,
    clearSelection,
    sidebarTab,
    setSidebarTab,
    clearGraph: clearStoreGraph,
    syncedNodeArns,
    toggleNodeSync,
    activeAccountId,
    isNodeCollapsed,
    setAddResourcePanelOpen,
    toggleCollapseNode,
  } = useAppStore();

  const syncGraph = useGraphSync();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; arn: string } | null>(null);
  const { term: searchTerm, setSearch } = useSearch();

  // ── Event handlers ────────────────────────────────────────────────────────

  const onNodeClick = useCallback(
    (arn: string) => {
      if (selectedNodeArns.includes(arn)) {
        // Deselect if already selected (single-click behavior)
        setSelectedNodeArns(selectedNodeArns.filter((a) => a !== arn));
      } else {
        setSelectedNodeArns([arn]);
      }
      setContextMenu(null);
    },
    [selectedNodeArns, setSelectedNodeArns],
  );

  const onNodeDoubleClick = useCallback(
    (arn: string) => {
      const isGroup = arn.startsWith('__group__');
      if (isGroup) {
        const expandedKey = arn + ':expanded';
        const s = useAppStore.getState();
        const isExpanded = s.collapsedNodeArns.includes(expandedKey);
        if (isExpanded) {
          useAppStore.setState({
            collapsedNodeArns: s.collapsedNodeArns.filter((a) => a !== expandedKey),
          });
        } else {
          useAppStore.setState({
            collapsedNodeArns: [...s.collapsedNodeArns, expandedKey],
          });
        }
      } else {
        toggleCollapseNode(arn);
      }
    },
    [toggleCollapseNode],
  );

  const onNodeRightClick = useCallback(
    (arn: string, event: MouseEvent) => {
      setContextMenu({ x: event.clientX, y: event.clientY, arn });
      setSelectedNodeArns([arn]);
    },
    [setSelectedNodeArns],
  );

  const onPaneClick = useCallback(() => {
    clearSelection();
    setContextMenu(null);
  }, [clearSelection]);

  // Close context menu on outside click
  useEffect(() => {
    if (!contextMenu) return;
    const handler = () => setContextMenu(null);
    const timer = setTimeout(() => {
      document.addEventListener('click', handler, { once: true });
    }, 0);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('click', handler);
    };
  }, [contextMenu]);

  // ── Context menu actions ──────────────────────────────────────────────────

  const handleToggleCollapse = useCallback((arn: string) => {
    toggleCollapseNode(arn);
    setContextMenu(null);
  }, [toggleCollapseNode]);

  const handleToggleSync = useCallback((arn: string) => {
    toggleNodeSync(arn);
    setContextMenu(null);
  }, [toggleNodeSync]);

  const handleExpandNode = useCallback(async (arn: string) => {
    setContextMenu(null);
    if (!activeAccountId) return;
    try {
      await expandNode(arn, activeAccountId);
      await syncGraph();
    } catch { /* ignore */ }
  }, [syncGraph, activeAccountId]);

  // ── Graph toolbar actions ─────────────────────────────────────────────────

  const handleClearGraph = useCallback(async () => {
    await clearGraph();
    clearStoreGraph();
  }, [clearStoreGraph]);

  const handleExportGraph = useCallback(async () => {
    try { await exportGraph(); } catch { /* ignore */ }
  }, []);

  const handleLoadClick = useCallback(() => fileInputRef.current?.click(), []);

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      await importGraph(data);
      await syncGraph();
    } catch { /* ignore */ }
    finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }, [syncGraph]);

  // ─── Render ───────────────────────────────────────────────────────────────

  const hasGraph = graph.nodes.size > 0;

  return (
    <div style={{ display: 'flex', width: '100vw', height: '100vh', background: '#0a0c12', color: '#e5e7eb', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>

      {/* ── Sidebar ─────────────────────────────────────────────────────────── */}
      <div style={{ width: 300, minWidth: 300, borderRight: '1px solid #1a1d26', display: 'flex', flexDirection: 'column', background: '#0f1117' }}>

        {/* Logo / header */}
        <div style={{ padding: '14px 14px 10px', borderBottom: '1px solid #1a1d26', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 28, height: 28, borderRadius: 6, background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>
            ⬡
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: '-0.01em' }}>AWS Sync</div>
            <div style={{ fontSize: 10, color: '#4b5563' }}>
              {hasGraph ? `${graph.nodes.size} nodes · ${graph.edges.length} edges` : 'No graph loaded'}
            </div>
          </div>
        </div>

        {/* Tab bar */}
        <div style={{ display: 'flex', padding: '6px 6px 0', gap: 2, borderBottom: '1px solid #1a1d26' }}>
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setSidebarTab(tab.key as any)}
              style={{
                flex: 1,
                padding: '6px 4px',
                border: 'none',
                borderRadius: '4px 4px 0 0',
                borderBottom: sidebarTab === tab.key ? '2px solid #3b82f6' : '2px solid transparent',
                background: sidebarTab === tab.key ? '#1e2030' : 'transparent',
                cursor: 'pointer',
                fontSize: 10,
                fontWeight: sidebarTab === tab.key ? 700 : 400,
                color: sidebarTab === tab.key ? '#93c5fd' : '#6b7280',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 3,
              }}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Panel content */}
        <div style={{ flex: 1, overflow: 'auto', padding: 12 }}>
          {sidebarTab === 'accounts' && <AccountPanel />}
          {sidebarTab === 'discovery' && <DiscoveryPanel />}
          {sidebarTab === 'resources' && <ResourceList />}
          {(sidebarTab as string) === 'export' && <ExportPanel />}
        </div>
      </div>

      {/* ── Main canvas ──────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, position: 'relative', display: 'flex' }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <ForceGraphComponent
            onNodeClick={onNodeClick}
            onNodeDoubleClick={onNodeDoubleClick}
            onNodeRightClick={onNodeRightClick}
            onPaneClick={onPaneClick}
            searchTerm={searchTerm}
          />

          {/* Graph toolbar */}
          {hasGraph && (
            <div
              style={{
                position: 'absolute',
                top: 12,
                left: '50%',
                transform: 'translateX(-50%)',
                display: 'flex',
                gap: 4,
                background: '#0f1117',
                border: '1px solid #1a1d26',
                borderRadius: 8,
                padding: '4px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
                zIndex: 5,
              }}
            >
              <ToolbarBtn label="+ Add" color="#10b981" onClick={() => setAddResourcePanelOpen(true)} />
              <ToolbarBtn label="Sync" color="#2563eb" onClick={syncGraph} />
              <div style={{ width: 1, background: '#2a2d37', margin: '2px 2px' }} />
              <ToolbarBtn label="Save" color="#374151" onClick={handleExportGraph} />
              <ToolbarBtn label={importing ? '…' : 'Load'} color="#374151" onClick={handleLoadClick} disabled={importing} />
              <ToolbarBtn label="Clear" color="#7f1d1d" onClick={handleClearGraph} />
            </div>
          )}

          {/* Search bar */}
          {hasGraph && (
            <div
              style={{
                position: 'absolute',
                top: 12,
                right: 12,
                zIndex: 5,
              }}
            >
              <input
                type="text"
                placeholder="Search nodes…"
                value={searchTerm}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  padding: '5px 10px',
                  background: '#0f1117',
                  border: '1px solid #1a1d26',
                  borderRadius: 6,
                  color: '#e5e7eb',
                  fontSize: 12,
                  width: 200,
                  outline: 'none',
                }}
              />
            </div>
          )}

          {/* Empty state */}
          {!hasGraph && (
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              textAlign: 'center',
              pointerEvents: 'none',
            }}>
              <div style={{ fontSize: 48, marginBottom: 12, opacity: 0.15 }}>⬡</div>
              <div style={{ fontSize: 14, color: '#4b5563', fontWeight: 500 }}>No resources discovered yet</div>
              <div style={{ fontSize: 12, color: '#374151', marginTop: 4 }}>
                Add seed ARNs in the Discovery tab to get started
              </div>
            </div>
          )}

          {/* Hint bar */}
          {hasGraph && (
            <div style={{
              position: 'absolute',
              bottom: 12,
              left: '50%',
              transform: 'translateX(-50%)',
              padding: '4px 12px',
              background: 'rgba(15,17,23,0.8)',
              borderRadius: 20,
              fontSize: 10,
              color: '#4b5563',
              backdropFilter: 'blur(4px)',
              border: '1px solid #1a1d26',
              zIndex: 5,
            }}>
              Click select · Double-click collapse · Right-click menu · Scroll zoom · Drag to pan
            </div>
          )}

          <input ref={fileInputRef} type="file" accept=".json" onChange={handleFileChange} style={{ display: 'none' }} />

          {/* Context menu */}
          {contextMenu && (
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                position: 'fixed',
                left: contextMenu.x,
                top: contextMenu.y,
                background: '#0f1117',
                border: '1px solid #1a1d26',
                borderRadius: 7,
                padding: '4px',
                zIndex: 1000,
                minWidth: 190,
                boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
              }}
            >
              <ContextItem
                color={syncedNodeArns.includes(contextMenu.arn) ? '#f87171' : '#34d399'}
                label={syncedNodeArns.includes(contextMenu.arn) ? '● Remove from sync' : '○ Add to sync'}
                onClick={() => handleToggleSync(contextMenu.arn)}
              />
              <ContextItem
                color="#60a5fa"
                label="↻ Expand discovery"
                onClick={() => handleExpandNode(contextMenu.arn)}
              />
              <ContextItem
                color="#fbbf24"
                label={contextMenu.arn.startsWith('__group__')
                  ? (useAppStore.getState().collapsedNodeArns.includes(contextMenu.arn + ':expanded') ? '⊞ Collapse group' : '⊟ Expand group')
                  : (isNodeCollapsed(contextMenu.arn) ? '⊞ Expand node' : '⊟ Collapse node')}
                onClick={() => {
                  if (contextMenu.arn.startsWith('__group__')) {
                    onNodeDoubleClick(contextMenu.arn);
                  } else {
                    handleToggleCollapse(contextMenu.arn);
                  }
                }}
              />
              <div style={{ height: 1, background: '#1a1d26', margin: '3px 0' }} />
              <ContextItem color="#6b7280" label="Dismiss" onClick={() => setContextMenu(null)} />
            </div>
          )}

          <AddResourcePanel />
        </div>

        {selectedNodeArns.length > 0 && <DetailPanel />}
      </div>
    </div>
  );
}

// ─── Micro-components ─────────────────────────────────────────────────────────

function ToolbarBtn({
  label, color, onClick, disabled,
}: {
  label: string; color: string; onClick: () => void; disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: '4px 10px',
        background: disabled ? '#374151' : color + '22',
        color: disabled ? '#6b7280' : color,
        border: `1px solid ${disabled ? 'transparent' : color + '44'}`,
        borderRadius: 5,
        fontSize: 11,
        fontWeight: 600,
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'all 0.1s',
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </button>
  );
}

function ContextItem({ color, label, onClick }: { color: string; label: string; onClick: () => void }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'block',
        width: '100%',
        padding: '6px 10px',
        border: 'none',
        borderRadius: 4,
        background: hovered ? color + '15' : 'none',
        color,
        cursor: 'pointer',
        fontSize: 12,
        textAlign: 'left',
        transition: 'background 0.1s',
      }}
    >
      {label}
    </button>
  );
}