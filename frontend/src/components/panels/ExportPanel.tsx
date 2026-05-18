/**
 * ExportPanel.tsx
 *
 * Sidebar panel for exporting the graph as CDK, CloudFormation, or raw JSON.
 * Integrates with the /api/export/* backend routes.
 *
 * Place in: frontend/src/components/panels/ExportPanel.tsx
 *
 * Add to App.tsx tabs:
 *   { key: 'export' as const, label: 'Export' }
 *
 * Add to panelComponents:
 *   export: <ExportPanel />
 */

import { useState } from 'react';
import { useAppStore } from '../../stores/app-store';
import { useLazyResolver } from '../../hooks/use-lazy-resolver';

type ExportFormat = 'cdk' | 'cfn' | 'raw';

const FORMAT_INFO: Record<ExportFormat, { label: string; desc: string; ext: string; icon: string }> = {
  cdk: {
    label: 'CDK (TypeScript)',
    desc: 'Full synthesizable CDK app with constructs per resource type and account mapping config.',
    ext: 'json',
    icon: '⬡',
  },
  cfn: {
    label: 'CloudFormation',
    desc: 'Single CloudFormation template JSON with all selected resources.',
    ext: 'json',
    icon: '▤',
  },
  raw: {
    label: 'Raw JSON',
    desc: 'Resource definitions from AWS APIs, ARNs remapped for target account.',
    ext: 'json',
    icon: '{ }',
  },
};

export function ExportPanel() {
  const { graph, syncedNodeArns, activeAccount } = useAppStore();
  const lazyResolver = useLazyResolver();
  const [format, setFormat] = useState<ExportFormat>('cdk');
  const [targetAccountId, setTargetAccountId] = useState('');
  const [targetRegion, setTargetRegion] = useState('');
  const [stackName, setStackName] = useState('SyncedStack');
  const [includeAll, setIncludeAll] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<{ format: ExportFormat; nodeCount: number; timestamp: string } | null>(null);

  const syncedCount = syncedNodeArns.length;
  const totalNodes = graph.nodes.size;
  const exportCount = includeAll ? totalNodes : syncedCount;
  const canExport = exportCount > 0 && !!activeAccount;

  // Count placeholder nodes
  const placeholderCount = Array.from(graph.nodes.values()).filter(
    (n) => (n.metadata as Record<string, unknown>)?.isPlaceholder === true
  ).length;
  const resolvedCount = totalNodes - placeholderCount;

  const handleExport = async () => {
    if (!canExport) return;
    setLoading(true);
    setError(null);

    try {
      const body = {
        includeArns: includeAll ? [] : syncedNodeArns,
        sourceAccountId: activeAccount?.id,
        sourceRegion: activeAccount?.region,
        targetAccountId: targetAccountId || undefined,
        targetRegion: targetRegion || activeAccount?.region,
        stackName,
      };

      const res = await fetch(`http://localhost:8080/api/export/${format}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (format === 'cfn') {
        // CloudFormation returns a file download directly
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || 'Export failed');
        }
        const blob = await res.blob();
        downloadBlob(blob, `${stackName}-template.json`);
        setLastResult({ format, nodeCount: exportCount, timestamp: new Date().toLocaleTimeString() });
        return;
      }

      const json = await res.json();
      if (json.error) throw new Error(json.error);
      const data = json.data;

      if (format === 'cdk') {
        // CDK: download all files as a single JSON manifest, user can reconstruct
        // In a real implementation you'd zip this on the backend
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        downloadBlob(blob, `${stackName}-cdk-files.json`);
        setLastResult({ format, nodeCount: data.nodeCount, timestamp: new Date().toLocaleTimeString() });
      } else {
        // Raw JSON
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        downloadBlob(blob, `${stackName}-raw-export.json`);
        setLastResult({ format, nodeCount: data.nodeCount, timestamp: new Date().toLocaleTimeString() });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

      {/* ── Summary ── */}
      <div style={{ display: 'flex', gap: 8 }}>
        <StatChip label="Total nodes" value={totalNodes} color="#6b7280" />
        <StatChip label="In sync set" value={syncedCount} color="#3b82f6" />
      </div>

      {/* ── Lazy Resolver ── */}
      {placeholderCount > 0 && (
        <div style={{
          padding: '8px 10px',
          background: lazyResolver.state.active ? '#1e3a5f22' : '#1e2030',
          borderRadius: 5,
          border: `1px solid ${lazyResolver.state.active ? '#3b82f644' : '#2a2d37'}`,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#e5e7eb' }}>
                Placeholder Resolution
              </div>
              <div style={{ fontSize: 10, color: '#6b7280', marginTop: 2 }}>
                {placeholderCount} placeholders · {resolvedCount} resolved
                {lazyResolver.state.active && lazyResolver.state.resolving
                  ? ` · Resolving…`
                  : ''}
              </div>
            </div>
            <button
              onClick={lazyResolver.state.active ? lazyResolver.stop : lazyResolver.start}
              style={{
                padding: '4px 10px',
                background: lazyResolver.state.active ? '#dc2626' : '#2563eb',
                color: '#fff',
                border: 'none',
                borderRadius: 4,
                fontSize: 11,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {lazyResolver.state.active ? 'Stop' : 'Resolve All'}
            </button>
          </div>
          {lazyResolver.state.active && (
            <div style={{
              marginTop: 6,
              height: 3,
              background: '#2a2d37',
              borderRadius: 2,
              overflow: 'hidden',
            }}>
              <div style={{
                height: '100%',
                width: totalNodes > 0
                  ? `${(resolvedCount / totalNodes) * 100}%`
                  : '0%',
                background: '#3b82f6',
                borderRadius: 2,
                transition: 'width 0.3s ease',
              }} />
            </div>
          )}
        </div>
      )}

      {syncedCount === 0 && (
        <div style={{ fontSize: 11, color: '#fbbf24', padding: '6px 8px', background: '#78350f22', borderRadius: 4, border: '1px solid #78350f55' }}>
          No nodes marked for sync. Use the checkbox in the Detail panel, or right-click nodes to include them.
        </div>
      )}

      {/* ── Format selector ── */}
      <div>
        <div style={labelStyle}>Export format</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 6 }}>
          {(Object.entries(FORMAT_INFO) as [ExportFormat, typeof FORMAT_INFO[ExportFormat]][]).map(([key, info]) => (
            <button
              key={key}
              onClick={() => setFormat(key)}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 10,
                padding: '8px 10px',
                background: format === key ? '#1a2d4a' : '#1e2030',
                border: `1px solid ${format === key ? '#3b82f6' : '#2a2d37'}`,
                borderRadius: 5,
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <span style={{ fontSize: 16, color: format === key ? '#60a5fa' : '#6b7280', flexShrink: 0, marginTop: 1 }}>
                {info.icon}
              </span>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: format === key ? '#e5e7eb' : '#9ca3af' }}>
                  {info.label}
                </div>
                <div style={{ fontSize: 10, color: '#6b7280', marginTop: 2 }}>
                  {info.desc}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ── Account mapping ── */}
      <div>
        <div style={labelStyle}>Account mapping</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 6 }}>
          <div>
            <div style={{ fontSize: 10, color: '#6b7280', marginBottom: 2 }}>Source (current account)</div>
            <div style={{ ...inputStyle, color: '#6b7280', cursor: 'default' }}>
              {activeAccount?.id ? `${activeAccount.label} · ${activeAccount.region}` : 'No account connected'}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 10, color: '#6b7280', marginBottom: 2 }}>Target account ID</div>
            <input
              value={targetAccountId}
              onChange={(e) => setTargetAccountId(e.target.value)}
              placeholder="123456789012"
              style={inputStyle}
            />
          </div>
          <div>
            <div style={{ fontSize: 10, color: '#6b7280', marginBottom: 2 }}>Target region</div>
            <input
              value={targetRegion}
              onChange={(e) => setTargetRegion(e.target.value)}
              placeholder={activeAccount?.region || 'us-east-1'}
              style={inputStyle}
            />
          </div>
          {format === 'cdk' && (
            <div>
              <div style={{ fontSize: 10, color: '#6b7280', marginBottom: 2 }}>Stack name</div>
              <input
                value={stackName}
                onChange={(e) => setStackName(e.target.value)}
                placeholder="SyncedStack"
                style={inputStyle}
              />
            </div>
          )}
        </div>
      </div>

      {/* ── Scope ── */}
      <div>
        <div style={labelStyle}>Scope</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 6 }}>
          <ScopeOption
            selected={!includeAll}
            onClick={() => setIncludeAll(false)}
            label={`Sync set only (${syncedCount} nodes)`}
            desc="Only nodes you've explicitly marked for sync"
          />
          <ScopeOption
            selected={includeAll}
            onClick={() => setIncludeAll(true)}
            label={`All discovered (${totalNodes} nodes)`}
            desc="Everything in the graph except AWS-managed resources"
          />
        </div>
      </div>

      {/* ── Export button ── */}
      <button
        onClick={handleExport}
        disabled={!canExport || loading}
        style={{
          padding: '9px 14px',
          background: !canExport || loading ? '#374151' : '#2563eb',
          color: '#fff',
          border: 'none',
          borderRadius: 5,
          fontSize: 13,
          fontWeight: 600,
          cursor: !canExport || loading ? 'not-allowed' : 'pointer',
          transition: 'background 0.15s',
        }}
      >
        {loading ? 'Generating…' : `Download ${FORMAT_INFO[format].label}`}
      </button>

      {error && (
        <div style={{ fontSize: 11, color: '#f87171', padding: '6px 8px', background: '#450a0a33', borderRadius: 4, border: '1px solid #7f1d1d' }}>
          {error}
        </div>
      )}

      {lastResult && (
        <div style={{ fontSize: 11, color: '#4ade80', padding: '6px 8px', background: '#052e1633', borderRadius: 4, border: '1px solid #14532d55' }}>
          ✓ {FORMAT_INFO[lastResult.format].label} downloaded · {lastResult.nodeCount} nodes · {lastResult.timestamp}
        </div>
      )}

      {/* ── Notes ── */}
      <div style={{ fontSize: 10, color: '#4b5563', borderTop: '1px solid #2a2d37', paddingTop: 10, lineHeight: 1.6 }}>
        <strong style={{ color: '#6b7280' }}>Notes</strong><br />
        • Lambda exports use inline code placeholders — replace with your deployment package.<br />
        • Connect resources use L1 CFN constructs; review \`instanceArn\` references carefully.<br />
        • S3/DynamoDB use RETAIN removal policy.<br />
        • AWS-managed resources are always excluded.
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatChip({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ flex: 1, padding: '6px 8px', background: '#1e2030', borderRadius: 4, border: `1px solid ${color}33` }}>
      <div style={{ fontSize: 18, fontWeight: 700, color, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
      <div style={{ fontSize: 10, color: '#6b7280' }}>{label}</div>
    </div>
  );
}

function ScopeOption({ selected, onClick, label, desc }: {
  selected: boolean; onClick: () => void; label: string; desc: string;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '6px 8px',
        background: selected ? '#1a2d4a' : '#1e2030',
        border: `1px solid ${selected ? '#3b82f6' : '#2a2d37'}`,
        borderRadius: 4,
        cursor: 'pointer',
        textAlign: 'left',
      }}
    >
      <div style={{
        width: 14, height: 14, borderRadius: '50%',
        border: `2px solid ${selected ? '#3b82f6' : '#4b5563'}`,
        background: selected ? '#3b82f6' : 'transparent',
        flexShrink: 0,
      }} />
      <div>
        <div style={{ fontSize: 11, fontWeight: 600, color: selected ? '#e5e7eb' : '#9ca3af' }}>{label}</div>
        <div style={{ fontSize: 10, color: '#6b7280' }}>{desc}</div>
      </div>
    </button>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const labelStyle: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 700,
  color: '#6b7280',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '5px 8px',
  border: '1px solid #2a2d37',
  borderRadius: 4,
  fontSize: 12,
  fontFamily: 'monospace',
  background: '#0f1117',
  color: '#e5e7eb',
  outline: 'none',
  boxSizing: 'border-box',
};