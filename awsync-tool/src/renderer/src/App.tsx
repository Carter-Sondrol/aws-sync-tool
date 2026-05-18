import { useCallback, useEffect, useRef, useState } from 'react';
import { useAppStore } from './stores/app-store';
import { useGraphSync } from './hooks/use-graph-sync';
import { ForceGraphComponent } from './components/ForceGraphComponent';
import { AccountPanel } from './components/AccountPanel';
import { expandDiscovery } from './hooks/api';

// ─── Tabs ──────────────────────────────────────────────────────────────────────

const tabs = [
  { key: 'accounts' as const, label: 'Accounts', icon: '◈' },
  { key: 'discovery' as const, label: 'Discover', icon: '⊕' },
  { key: 'resources' as const, label: 'Resources', icon: '◫' },
] as const;

// ─── Search ───────────────────────────────────────────────────────────────────

function useSearch() {
  const debounceRef = useRef<number>(0);

  const setSearch = useCallback((_value: string) => {
    clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      // Search value would be applied to graph filtering here
    }, 150);
  }, []);

  useEffect(() => () => clearTimeout(debounceRef.current), []);

  return { setSearch };
}

// ─── App ───────────────────────────────────────────────────────────────────────

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
    activeAccountId,
  } = useAppStore();

  const syncGraph = useGraphSync();
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; arn: string } | null>(null);
  const { setSearch } = useSearch();
  const [discoveryLoading, setDiscoveryLoading] = useState(false);
  const [discoveryError, setDiscoveryError] = useState('');
  const [seedArn, setSeedArn] = useState('');

  // Load graph on mount
  useEffect(() => {
    syncGraph();
  }, [syncGraph]);

  // ── Event handlers ────────────────────────────────────────────────────────

  const onNodeClick = useCallback(
    (arn: string) => {
      if (selectedNodeArns.includes(arn)) {
        toggleNodeSelection(arn);
      } else {
        setSelectedNodeArns([arn]);
      }
    },
    [selectedNodeArns, setSelectedNodeArns, toggleNodeSelection],
  );

  const onNodeRightClick = useCallback(
    (arn: string, event: MouseEvent) => {
      event.preventDefault();
      setContextMenu({ x: event.clientX, y: event.clientY, arn });
    },
    [],
  );

  const onPaneClick = useCallback(() => {
    setContextMenu(null);
    clearSelection();
  }, [clearSelection]);

  const handleDiscovery = async () => {
    if (!seedArn.trim() || !activeAccountId) {
      setDiscoveryError('Enter an ARN and select an active account');
      return;
    }
    setDiscoveryLoading(true);
    setDiscoveryError('');
    try {
      await expandDiscovery({ accountId: activeAccountId, seedArns: [seedArn] });
      await new Promise((r) => setTimeout(r, 1500));
      await syncGraph();
      setSeedArn('');
    } catch (err) {
      setDiscoveryError(err instanceof Error ? err.message : 'Discovery failed');
    } finally {
      setDiscoveryLoading(false);
    }
  };

  const nodesArray = Array.from(graph.nodes.values());

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#0a0c12', color: '#e5e7eb' }}>
      {/* ── Sidebar ────────────────────────────────────────────────────────── */}
      <div
        style={{
          width: 320,
          background: '#16181f',
          borderRight: '1px solid #2a2d37',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid #2a2d37' }}>
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setSidebarTab(tab.key)}
              style={{
                flex: 1,
                padding: '10px 8px',
                border: 'none',
                borderBottom: sidebarTab === tab.key ? '2px solid #60a5fa' : '2px solid transparent',
                background: sidebarTab === tab.key ? '#1e2030' : 'transparent',
                cursor: 'pointer',
                fontSize: 11,
                fontWeight: sidebarTab === tab.key ? 600 : 400,
                color: sidebarTab === tab.key ? '#60a5fa' : '#6b7280',
              }}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflow: 'auto' }}>
          {sidebarTab === 'accounts' && <AccountPanel />}
          {sidebarTab === 'discovery' && (
            <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 8 }}>Discovery</div>
                {discoveryError && (
                  <div style={{ padding: 6, background: '#7f1d1d', border: '1px solid #ef4444', borderRadius: 4, fontSize: 10, color: '#fecaca', marginBottom: 8 }}>
                    {discoveryError}
                  </div>
                )}
                <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
                  <input
                    type="text"
                    value={seedArn}
                    onChange={(e) => setSeedArn(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleDiscovery()}
                    placeholder="Enter AWS ARN..."
                    style={{
                      flex: 1,
                      padding: '6px 8px',
                      background: '#1e2030',
                      border: '1px solid #2a2d37',
                      borderRadius: 4,
                      color: '#e5e7eb',
                      fontSize: 11,
                      outline: 'none',
                    }}
                  />
                  <button
                    onClick={handleDiscovery}
                    disabled={discoveryLoading || !seedArn.trim() || !activeAccountId}
                    style={{
                      padding: '6px 12px',
                      background: discoveryLoading || !seedArn.trim() || !activeAccountId ? '#374151' : '#2563eb',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 4,
                      fontSize: 11,
                      cursor: discoveryLoading || !seedArn.trim() || !activeAccountId ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {discoveryLoading ? '...' : 'Go'}
                  </button>
                </div>
                {!activeAccountId && (
                  <div style={{ fontSize: 10, color: '#fbbf24' }}>Select an account first in the Accounts tab.</div>
                )}
              </div>
            </div>
          )}
          {sidebarTab === 'resources' && (
            <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 600 }}>Resources ({nodesArray.length})</div>
              {nodesArray.map((node) => (
                <div
                  key={node.arn}
                  onClick={() => onNodeClick(node.arn)}
                  style={{
                    padding: '6px 8px',
                    background: selectedNodeArns.includes(node.arn) ? '#1e3a5f' : '#1e2030',
                    border: selectedNodeArns.includes(node.arn) ? '1px solid #3b82f6' : '1px solid #2a2d37',
                    borderRadius: 3,
                    cursor: 'pointer',
                    fontSize: 10,
                  }}
                >
                  <div style={{ fontWeight: 500 }}>{node.label || 'Untitled'}</div>
                  <div style={{ fontSize: 9, color: '#6b7280', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {node.arn}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Main Graph Area ────────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative' }}>
        {/* Toolbar */}
        <div
          style={{
            height: 44,
            background: '#16181f',
            borderBottom: '1px solid #2a2d37',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            paddingLeft: 12,
            paddingRight: 12,
          }}
        >
          <input
            type="text"
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search resources..."
            style={{
              padding: '6px 8px',
              background: '#1e2030',
              border: '1px solid #2a2d37',
              borderRadius: 4,
              color: '#e5e7eb',
              fontSize: 11,
              outline: 'none',
              minWidth: 200,
            }}
          />
          <div style={{ flex: 1 }} />
          <button
            onClick={clearStoreGraph}
            style={{
              padding: '6px 12px',
              background: '#7f1d1d',
              color: '#fca5a5',
              border: 'none',
              borderRadius: 4,
              fontSize: 11,
              cursor: 'pointer',
            }}
          >
            Clear Graph
          </button>
          {selectedNodeArns.length > 0 && (
            <div style={{ fontSize: 11, color: '#60a5fa' }}>
              {selectedNodeArns.length} selected
            </div>
          )}
        </div>

        {/* Graph */}
        <ForceGraphComponent
          onNodeClick={onNodeClick}
          onNodeRightClick={onNodeRightClick}
          onPaneClick={onPaneClick}
          searchTerm=""
        />

        {/* Context Menu */}
        {contextMenu && (
          <div
            style={{
              position: 'absolute',
              left: contextMenu.x,
              top: contextMenu.y,
              background: '#1e2030',
              border: '1px solid #2a2d37',
              borderRadius: 4,
              overflow: 'hidden',
              zIndex: 1000,
            }}
          >
            {[
              { label: 'Select', action: () => onNodeClick(contextMenu.arn) },
              { label: 'Copy ARN', action: () => navigator.clipboard.writeText(contextMenu.arn) },
              { label: 'View Details', action: () => console.log(graph.nodes.get(contextMenu.arn)) },
            ].map((item, i) => (
              <button
                key={i}
                onClick={() => {
                  item.action();
                  setContextMenu(null);
                }}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  background: 'transparent',
                  border: 'none',
                  color: '#e5e7eb',
                  fontSize: 11,
                  textAlign: 'left',
                  cursor: 'pointer',
                  borderBottom: i < 2 ? '1px solid #2a2d37' : 'none',
                }}
              >
                {item.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
