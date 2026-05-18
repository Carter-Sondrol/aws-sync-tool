/**
 * DiscoveryPanel.tsx  (replacement)
 *
 * Key improvements over original:
 * - Max-depth selector (stops Connect from exploding to 500 nodes in one run)
 * - Service type filter (opt-out IAM/CloudWatch noise during initial discovery)
 * - "Preview" count before running
 * - Cleaner layout with collapsible service browser
 *
 * Place in: frontend/src/components/panels/DiscoveryPanel.tsx
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAppStore, type DiscoveryProgress } from '../../stores/app-store';
import { expandDiscovery, getGraph, getDiscoveryStatus, listServices, listResourceArns } from '../../hooks/api';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ServiceInfo {
  service: string;
  resourceTypes: string[];
}

interface ListedArns {
  resourceType: string;
  arns: string[];
  count: number;
}

// ─── Discovery scope config ───────────────────────────────────────────────────

const SERVICE_COLORS: Record<string, string> = {
  connect: '#3b82f6',
  lambda: '#f97316',
  dynamodb: '#22c55e',
  iam: '#a855f7',
  s3: '#eab308',
  apigateway: '#06b6d4',
  cloudwatch: '#78716c',
  ssm: '#64748b',
  secretsmanager: '#ec4899',
};

const DEFAULT_EXCLUDED_TYPES = new Set(['cloudwatch', 'iam']);

const MAX_DEPTH_OPTIONS = [
  { value: 1, label: '1 hop  — seed + immediate refs' },
  { value: 2, label: '2 hops — recommended for Connect' },
  { value: 3, label: '3 hops — full traversal' },
];

/**
 * Lightweight ARN parser for display purposes.
 * Returns { service, resourceId } or null for unparseable ARNs.
 */
function parseSeedArn(arn: string): { service: string; resourceId: string } | null {
  const match = arn.match(/^arn:aws:[^:]+:[^:]*:[^:]*:(?:\d{12}:)(.+)$/);
  if (!match) return null;
  const parts = match[1].split('/');
  const service = parts[0];
  const resourceId = parts.slice(1).join('/') || parts[0];
  return { service, resourceId };
}

// ─── Component ────────────────────────────────────────────────────────────────

export function DiscoveryPanel() {
  const {
    activeAccount,
    seedArns,
    setSeedArns,
    addSeedArn,
    progress,
    setProgress,
    setSidebarTab,
    setGraph,
  } = useAppStore();

  const [arnInput, setArnInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Polling ref for live progress updates
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stopPolling = useCallback(() => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);
  const startPolling = useCallback(() => {
    stopPolling();
    pollTimerRef.current = setInterval(async () => {
      try {
        const data = await getDiscoveryStatus();
        const progress = data as DiscoveryProgress;
        if (progress) {
          setProgress(progress);
          if (progress.phase === 'complete' || progress.phase === 'error' || progress.phase === 'idle') {
            stopPolling();
            setLoading(false);
            if (progress.phase === 'complete') {
              try {
                const graphData = await getGraph();
                const res = graphData as { nodes: Record<string, any>; edges: any[] };
                if (res?.nodes) {
                  const nodes = new Map<string, any>();
                  for (const [arn, node] of Object.entries(res.nodes)) nodes.set(arn, node);
                  setGraph({ nodes, edges: res.edges || [] });
                }
                setSidebarTab('resources');
              } catch { /* ignore graph load error */ }
            } else if (progress.phase === 'error') {
              setError(progress.error || 'Discovery failed');
            }
          }
        }
      } catch { /* ignore polling errors */ }
    }, 500);
  }, [setProgress, setGraph, setSidebarTab, stopPolling]);

  // Scope config
  const [maxDepth, setMaxDepth] = useState(2);
  const [excludedServices, setExcludedServices] = useState<Set<string>>(new Set(DEFAULT_EXCLUDED_TYPES));
  const [scopeOpen, setScopeOpen] = useState(false);

  // Service browser
  const [services, setServices] = useState<ServiceInfo[]>([]);
  const [servicesLoading, setServicesLoading] = useState(false);
  const [expandedServices, setExpandedServices] = useState<Set<string>>(new Set());
  const [listingType, setListingType] = useState<string | null>(null);
  const [listedArns, setListedArns] = useState<ListedArns | null>(null);
  const [selectedArns, setSelectedArns] = useState<Set<string>>(new Set());
  const [browserOpen, setBrowserOpen] = useState(false);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => stopPolling();
  }, [stopPolling]);

  useEffect(() => {
    if (!activeAccount?.id || !browserOpen) return;
    setServicesLoading(true);
    listServices()
      .then((data) => {
        const filtered = (data as ServiceInfo[]).filter((s) => s.resourceTypes.length > 0);
        setServices(filtered);
      })
      .catch(() => setServices([]))
      .finally(() => setServicesLoading(false));
  }, [activeAccount?.id, browserOpen]);

  const handleAddArn = (e: React.FormEvent) => {
    e.preventDefault();
    const arns = arnInput
      .split(/[\n,]+/)
      .map((a) => a.trim())
      .filter(Boolean);
    arns.forEach((arn) => addSeedArn(arn));
    setArnInput('');
  };

  const handleDiscover = async () => {
    if (!activeAccount?.id || seedArns.length === 0) return;
    setLoading(true);
    setError('');
    stopPolling();
    try {
      // Kick off discovery (runs in background)
      await expandDiscoveryScoped(seedArns, activeAccount.id, maxDepth, excludedServices);
      // Start polling for progress
      startPolling();
    } catch (err) {
      stopPolling();
      setLoading(false);
      setError(err instanceof Error ? err.message : 'Discovery failed');
      setProgress({
        phase: 'error',
        seedCount: seedArns.length,
        resolved: 0,
        totalFound: 0,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  };

  const handleClear = () => {
    stopPolling();
    setLoading(false);
    setSeedArns([]);
    setProgress({ phase: 'idle', seedCount: 0, resolved: 0, totalFound: 0 });
    setListedArns(null);
    setSelectedArns(new Set());
  };

  const toggleExcludedService = (svc: string) => {
    setExcludedServices((prev) => {
      const next = new Set(prev);
      if (next.has(svc)) next.delete(svc);
      else next.add(svc);
      return next;
    });
  };

  const handleListResources = useCallback(async (resourceType: string) => {
    if (!activeAccount?.id) return;
    setListingType(resourceType);
    setError('');
    setSelectedArns(new Set());
    setListedArns(null);
    try {
      const data = await listResourceArns(resourceType, activeAccount.id);
      setListedArns(data as ListedArns);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to list resources');
      setListingType(null);
    }
  }, [activeAccount?.id]);

  const addSelectedArns = () => {
    selectedArns.forEach((arn) => addSeedArn(arn));
    setListingType(null);
    setListedArns(null);
    setSelectedArns(new Set());
  };

  const allServices = [...new Set([...services.map((s) => s.service), ...Object.keys(SERVICE_COLORS)])];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

      {/* ── Seed ARN input ── */}
      <Section label="Seed ARNs">
        <textarea
          value={arnInput}
          onChange={(e) => setArnInput(e.target.value)}
          placeholder={'arn:aws:connect:us-east-1:123:instance/abc\narn:aws:lambda:us-east-1:123:function:my-fn'}
          rows={3}
          style={textareaStyle}
          onKeyDown={(e) => { if (e.key === 'Enter' && e.metaKey) { e.preventDefault(); handleAddArn(e as any); } }}
        />
        <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
          <button onClick={handleAddArn} style={{ ...btnStyle, background: '#2563eb', flex: 1 }}>
            + Add ARNs
          </button>
          {seedArns.length > 0 && (
            <button onClick={handleClear} style={{ ...btnStyle, background: '#374151' }}>
              Clear all
            </button>
          )}
        </div>
      </Section>

      {/* ── Queued seeds ── */}
      {seedArns.length > 0 && (
        <div style={{ background: '#1e2030', borderRadius: 5, padding: '6px 8px' }}>
          <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 4 }}>
            {seedArns.length} seed{seedArns.length !== 1 ? 's' : ''} queued
          </div>
          <div style={{ maxHeight: 90, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
            {seedArns.map((arn, i) => {
              const parsed = parseSeedArn(arn);
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{
                    width: 6, height: 6, borderRadius: 2,
                    background: SERVICE_COLORS[parsed?.service || ''] || '#6b7280',
                    flexShrink: 0,
                  }} />
                  <span style={{ fontSize: 11, fontWeight: 500, color: '#d1d5db', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {parsed ? `${parsed.service}/${parsed.resourceId}` : arn}
                  </span>
                  <button
                    onClick={() => setSeedArns(seedArns.filter((_, j) => j !== i))}
                    style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', fontSize: 14, padding: 0, lineHeight: 1, flexShrink: 0 }}
                  >
                    ×
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Scope config ── */}
      <div style={{ border: '1px solid #2a2d37', borderRadius: 5, overflow: 'hidden' }}>
        <button
          onClick={() => setScopeOpen(!scopeOpen)}
          style={{ ...collapsibleHeader, background: scopeOpen ? '#1e2030' : 'transparent' }}
        >
          <span>Discovery scope</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 10, color: '#6b7280' }}>
              depth {maxDepth} · {excludedServices.size} excluded
            </span>
            <span style={{ color: '#6b7280', fontSize: 10 }}>{scopeOpen ? '▼' : '▶'}</span>
          </div>
        </button>
        {scopeOpen && (
          <div style={{ padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 10, borderTop: '1px solid #2a2d37' }}>
            {/* Max depth */}
            <div>
              <div style={labelStyle}>Max traversal depth</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginTop: 4 }}>
                {MAX_DEPTH_OPTIONS.map((opt) => (
                  <label key={opt.value} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', padding: '4px 6px', borderRadius: 3, background: maxDepth === opt.value ? '#1a3a5c' : 'transparent' }}>
                    <input
                      type="radio"
                      name="maxDepth"
                      checked={maxDepth === opt.value}
                      onChange={() => setMaxDepth(opt.value)}
                      style={{ accentColor: '#3b82f6' }}
                    />
                    <span style={{ fontSize: 11, color: maxDepth === opt.value ? '#93c5fd' : '#9ca3af' }}>
                      {opt.label}
                    </span>
                  </label>
                ))}
              </div>
              {maxDepth === 3 && (
                <div style={{ marginTop: 4, fontSize: 10, color: '#f59e0b', padding: '4px 6px', background: '#78350f22', borderRadius: 3 }}>
                  ⚠ Connect instances can generate 200+ nodes at depth 3
                </div>
              )}
            </div>

            {/* Service filter */}
            <div>
              <div style={labelStyle}>Exclude from traversal</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                {allServices.map((svc) => {
                  const excluded = excludedServices.has(svc);
                  const color = SERVICE_COLORS[svc] || '#6b7280';
                  return (
                    <button
                      key={svc}
                      onClick={() => toggleExcludedService(svc)}
                      style={{
                        padding: '2px 8px',
                        borderRadius: 3,
                        border: `1px solid ${excluded ? '#374151' : color + '66'}`,
                        background: excluded ? '#374151' : color + '22',
                        color: excluded ? '#6b7280' : color,
                        fontSize: 10,
                        fontFamily: 'monospace',
                        cursor: 'pointer',
                        textDecoration: excluded ? 'line-through' : 'none',
                        opacity: excluded ? 0.6 : 1,
                      }}
                    >
                      {svc}
                    </button>
                  );
                })}
              </div>
              <div style={{ fontSize: 10, color: '#6b7280', marginTop: 4 }}>
                Excluded services are added to graph but not traversed further.
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Service browser ── */}
      <div style={{ border: '1px solid #2a2d37', borderRadius: 5, overflow: 'hidden' }}>
        <button
          onClick={() => setBrowserOpen(!browserOpen)}
          style={{ ...collapsibleHeader, background: browserOpen ? '#1e2030' : 'transparent' }}
        >
          <span>Browse by service</span>
          <span style={{ color: '#6b7280', fontSize: 10 }}>{browserOpen ? '▼' : '▶'}</span>
        </button>
        {browserOpen && (
          <div style={{ borderTop: '1px solid #2a2d37' }}>
            {!activeAccount?.id ? (
              <div style={{ padding: '8px 10px', color: '#dc2626', fontSize: 12 }}>Connect an account first</div>
            ) : servicesLoading ? (
              <div style={{ padding: '8px 10px', color: '#9ca3af', fontSize: 12 }}>Loading…</div>
            ) : (
              <div style={{ maxHeight: 220, overflow: 'auto' }}>
                {services.map((svc) => {
                  const isExpanded = expandedServices.has(svc.service);
                  const color = SERVICE_COLORS[svc.service] || '#6b7280';
                  return (
                    <div key={svc.service} style={{ borderBottom: '1px solid #1e2030' }}>
                      <button
                        onClick={() => setExpandedServices((p) => {
                          const n = new Set(p);
                          if (n.has(svc.service)) n.delete(svc.service); else n.add(svc.service);
                          return n;
                        })}
                        style={{
                          width: '100%',
                          textAlign: 'left',
                          padding: '6px 10px',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          fontSize: 12,
                          color: '#e5e7eb',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                        }}
                      >
                        <span style={{ width: 8, height: 8, borderRadius: 2, background: color, flexShrink: 0 }} />
                        <span style={{ flex: 1, fontFamily: 'monospace' }}>{svc.service}</span>
                        <span style={{ fontSize: 10, color: '#6b7280' }}>{svc.resourceTypes.length} types</span>
                        <span style={{ fontSize: 9, color: '#6b7280' }}>{isExpanded ? '▼' : '▶'}</span>
                      </button>
                      {isExpanded && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, padding: '4px 10px 8px 24px' }}>
                          {svc.resourceTypes.map((rt) => (
                            <button
                              key={rt}
                              onClick={() => handleListResources(rt)}
                              style={{
                                padding: '2px 8px',
                                background: listingType === rt ? color + '33' : '#2a2d37',
                                color: listingType === rt ? color : '#9ca3af',
                                border: `1px solid ${listingType === rt ? color + '55' : 'transparent'}`,
                                borderRadius: 3,
                                fontSize: 10,
                                cursor: 'pointer',
                                fontFamily: 'monospace',
                              }}
                            >
                              {rt.split(':')[1] || rt}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Listed ARNs picker ── */}
      {listedArns && (
        <div style={{ background: '#16181f', borderRadius: 5, border: '1px solid #2a2d37', overflow: 'hidden' }}>
          <div style={{ padding: '6px 10px', borderBottom: '1px solid #2a2d37', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 11, fontWeight: 600 }}>
              {listedArns.resourceType} — {listedArns.count} found
            </span>
            <button onClick={() => { setListedArns(null); setListingType(null); }} style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', fontSize: 16 }}>×</button>
          </div>
          <div style={{ padding: '6px 8px', display: 'flex', gap: 6 }}>
            <button onClick={() => setSelectedArns(new Set(listedArns.arns))} style={{ ...btnStyle, background: '#2563eb', fontSize: 10, padding: '2px 8px' }}>All</button>
            <button onClick={() => setSelectedArns(new Set())} style={{ ...btnStyle, background: '#374151', fontSize: 10, padding: '2px 8px' }}>None</button>
            <button
              onClick={addSelectedArns}
              disabled={selectedArns.size === 0}
              style={{ ...btnStyle, background: selectedArns.size === 0 ? '#374151' : '#10b981', fontSize: 10, padding: '2px 8px', marginLeft: 'auto' }}
            >
              Add {selectedArns.size > 0 ? `(${selectedArns.size})` : ''}
            </button>
          </div>
          <div style={{ maxHeight: 140, overflow: 'auto', padding: '0 8px 8px' }}>
            {listedArns.arns.map((arn) => (
              <label key={arn} style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '2px 4px', borderRadius: 3,
                background: selectedArns.has(arn) ? '#1e3a5f' : 'transparent', cursor: 'pointer',
              }}>
                <input type="checkbox" checked={selectedArns.has(arn)} onChange={() => {
                  setSelectedArns((p) => { const n = new Set(p); if (n.has(arn)) n.delete(arn); else n.add(arn); return n; });
                }} style={{ accentColor: '#3b82f6' }} />
                <span style={{ fontSize: 10, fontFamily: 'monospace', color: '#9ca3af', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{arn}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* ── Run / clear ── */}
      <div style={{ display: 'flex', gap: 6 }}>
        <button
          onClick={handleDiscover}
          disabled={loading || !activeAccount?.id || seedArns.length === 0}
          style={{
            ...btnStyle,
            flex: 1,
            background: loading || !activeAccount?.id || seedArns.length === 0 ? '#374151' : '#2563eb',
            cursor: loading ? 'not-allowed' : 'pointer',
            position: 'relative',
          }}
        >
          {loading ? (
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <SpinnerSvg />
              Discovering…
            </span>
          ) : (
            `Run discovery${seedArns.length > 0 ? ` (${seedArns.length})` : ''}`
          )}
        </button>
        {loading && (
          <button
            onClick={handleClear}
            style={{ ...btnStyle, background: '#7f1d1d', flexShrink: 0 }}
            title="Cancel discovery"
          >
            ✕
          </button>
        )}
      </div>

      {error && (
        <div style={{ fontSize: 11, color: '#f87171', padding: '6px 8px', background: '#450a0a33', borderRadius: 4, border: '1px solid #7f1d1d' }}>
          {error}
        </div>
      )}

      {/* ── Progress ── */}
      {progress.phase !== 'idle' && (
        <ProgressCard progress={progress} />
      )}
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={labelStyle}>{label}</div>
      <div style={{ marginTop: 4 }}>{children}</div>
    </div>
  );
}

function ProgressCard({ progress }: { progress: DiscoveryProgress }) {
  const pct = progress.totalFound > 0 ? Math.round((progress.resolved / progress.totalFound) * 100) : 0;
  const isRunning = progress.phase === 'running';
  const isComplete = progress.phase === 'complete';
  const isError = progress.phase === 'error';

  return (
    <div style={{ padding: '8px 10px', background: '#1e2030', borderRadius: 5, fontSize: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <span style={{ fontWeight: 600, color: isError ? '#f87171' : isComplete ? '#4ade80' : '#e5e7eb' }}>
          {isRunning && `⏳ Resolving… ${progress.resolved} / ${progress.totalFound}`}
          {isComplete && `✓ ${progress.resolved} resources found`}
          {isError && `✕ Error: ${progress.error}`}
        </span>
        {isRunning && <span style={{ fontSize: 10, color: '#6b7280' }}>{pct}%</span>}
      </div>
      {isRunning && (
        <div style={{ height: 3, background: '#374151', borderRadius: 2, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${pct}%`, background: '#3b82f6', borderRadius: 2, transition: 'width 0.3s ease' }} />
        </div>
      )}
      {isRunning && (
        <div style={{ marginTop: 6, display: 'flex', gap: 10, fontSize: 10, color: '#6b7280' }}>
          {progress.currentDepth != null && <span>depth: {progress.currentDepth}</span>}
          {progress.seedCount != null && <span>seeds: {progress.seedCount}</span>}
        </div>
      )}
      {progress.currentArn && isRunning && (
        <div style={{ marginTop: 4, fontSize: 10, fontFamily: 'monospace', color: '#4b5563', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          → {progress.currentArn}
        </div>
      )}
      {isError && progress.error && (
        <div style={{ marginTop: 6, fontSize: 10, fontFamily: 'monospace', color: '#f87171', background: '#450a0a33', padding: '4px 6px', borderRadius: 3, border: '1px solid #7f1d1d' }}>
          {progress.error}
        </div>
      )}
    </div>
  );
}

function SpinnerSvg() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" style={{ animation: 'spin 1s linear infinite' }}>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      <circle cx="6" cy="6" r="4.5" stroke="#60a5fa" strokeWidth="1.5" fill="none" strokeDasharray="20" strokeDashoffset="5" />
    </svg>
  );
}

// ─── Scoped discovery API call ────────────────────────────────────────────────
// Passes scope params to the expand endpoint.
// The backend /api/discovery/expand needs to accept these — see notes below.

async function expandDiscoveryScoped(
  seedArns: string[],
  accountId: string,
  maxDepth: number,
  excludedServices: Set<string>,
): Promise<unknown> {
  const res = await fetch('http://localhost:8080/api/discovery/expand', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      seedArns,
      accountId,
      maxDepth,
      excludedServices: Array.from(excludedServices),
    }),
  });
  const json = await res.json();
  if (json.error) throw new Error(json.error);
  return json.data;
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const labelStyle: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 700,
  color: '#6b7280',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
};

const textareaStyle: React.CSSProperties = {
  width: '100%',
  padding: '6px 8px',
  border: '1px solid #2a2d37',
  borderRadius: 4,
  fontSize: 11,
  fontFamily: 'monospace',
  resize: 'vertical',
  boxSizing: 'border-box',
  background: '#0f1117',
  color: '#e5e7eb',
  outline: 'none',
};

const btnStyle: React.CSSProperties = {
  padding: '7px 12px',
  color: '#fff',
  border: 'none',
  borderRadius: 4,
  fontSize: 12,
  cursor: 'pointer',
  fontWeight: 500,
  transition: 'opacity 0.1s',
};

const collapsibleHeader: React.CSSProperties = {
  width: '100%',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '7px 10px',
  border: 'none',
  cursor: 'pointer',
  fontSize: 12,
  fontWeight: 600,
  color: '#e5e7eb',
  background: 'transparent',
};