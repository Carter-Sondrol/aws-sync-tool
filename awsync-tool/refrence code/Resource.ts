import { useEffect, useState } from 'react';
import { useAppStore } from '../../stores/app-store';
import { createGraphNode, describeResource, getGraph, listResourceArns, listServices } from '../../hooks/api';

type PanelMode = 'arn' | 'browse' | 'empty';

export function AddResourcePanel() {
  const { addResourcePanelOpen, setAddResourcePanelOpen, activeAccountId, setGraph, graph } = useAppStore();
  const [mode, setMode] = useState<PanelMode>('arn');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!addResourcePanelOpen) return null;

  return (
    <div
      style={{
        position: 'absolute',
        top: 60,
        left: '50%',
        transform: 'translateX(-50%)',
        width: 420,
        background: '#16181f',
        border: '1px solid #2a2d37',
        borderRadius: 8,
        boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', borderBottom: '1px solid #2a2d37' }}>
        <span style={{ fontSize: 13, fontWeight: 600 }}>Add Resource</span>
        <button
          onClick={() => { setAddResourcePanelOpen(false); setError(null); }}
          style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', fontSize: 18, lineHeight: 1 }}
        >
          ×
        </button>
      </div>

      <div style={{ display: 'flex', borderBottom: '1px solid #2a2d37' }}>
        {([
          { key: 'arn' as const, label: 'By ARN' },
          { key: 'browse' as const, label: 'Browse' },
          { key: 'empty' as const, label: 'Empty' },
        ]).map((tab) => (
          <button
            key={tab.key}
            onClick={() => { setMode(tab.key); setError(null); }}
            style={{
              flex: 1,
              padding: '8px',
              border: 'none',
              borderBottom: mode === tab.key ? '2px solid #60a5fa' : '2px solid transparent',
              background: mode === tab.key ? '#1e2030' : 'transparent',
              cursor: 'pointer',
              fontSize: 11,
              fontWeight: mode === tab.key ? 600 : 400,
              color: mode === tab.key ? '#60a5fa' : '#6b7280',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div style={{ padding: 12, maxHeight: 400, overflow: 'auto' }}>
        {error && (
          <div style={{ padding: '6px 8px', background: '#ef444422', border: '1px solid #ef444466', borderRadius: 4, fontSize: 11, color: '#f87171', marginBottom: 8 }}>
            {error}
          </div>
        )}
        {mode === 'arn' && <ArnMode />}
        {mode === 'browse' && <BrowseMode />}
        {mode === 'empty' && <EmptyMode />}
      </div>
    </div>
  );
}

function ArnMode() {
  const { activeAccountId, setGraph, setAddResourcePanelOpen } = useAppStore();
  const [arn, setArn] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAdd = async () => {
    if (!arn.trim() || !activeAccountId) {
      setError('Enter an ARN and select an active account.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await describeResource(arn.trim(), activeAccountId);
      const data = await getGraph();
      if (data && typeof data === 'object') {
        const d = data as { nodes?: Record<string, unknown>; edges?: unknown[] };
        const nodes = new Map<string, any>();
        if (d.nodes) {
          for (const [k, v] of Object.entries(d.nodes)) {
            nodes.set(k, v);
          }
        }
        setGraph({ nodes, edges: (d.edges || []) as any[] });
        setAddResourcePanelOpen(false);
      }
    } catch (e: any) {
      setError(e.message || 'Failed to describe resource');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {!activeAccountId && (
        <div style={{ fontSize: 11, color: '#fbbf24' }}>No active account selected. Configure an account first.</div>
      )}
      <input
        type="text"
        value={arn}
        onChange={(e) => setArn(e.target.value)}
        placeholder="arn:aws:lambda:us-east-1:123456789:function:my-func"
        onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
        style={{
          padding: '6px 8px',
          background: '#1e2030',
          border: '1px solid #2a2d37',
          borderRadius: 4,
          color: '#e5e7eb',
          fontSize: 12,
          fontFamily: 'monospace',
          outline: 'none',
        }}
      />
      <button
        onClick={handleAdd}
        disabled={loading || !arn.trim() || !activeAccountId}
        style={{
          padding: '6px 12px',
          background: loading || !arn.trim() || !activeAccountId ? '#374151' : '#2563eb',
          color: '#fff',
          border: 'none',
          borderRadius: 4,
          fontSize: 12,
          cursor: loading || !arn.trim() || !activeAccountId ? 'not-allowed' : 'pointer',
        }}
      >
        {loading ? 'Describing...' : 'Add Resource'}
      </button>
    </div>
  );
}

function BrowseMode() {
  const { activeAccountId, setGraph, setAddResourcePanelOpen } = useAppStore();
  const [services, setServices] = useState<string[]>([]);
  const [selectedService, setSelectedService] = useState('');
  const [resources, setResources] = useState<{ arn: string; name: string }[]>([]);
  const [selectedArn, setSelectedArn] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<0 | 1 | 2>(0);

  useEffect(() => {
    if (!activeAccountId || step !== 0) return;
    (async () => {
      try {
        const data = await listServices();
        if (Array.isArray(data)) {
          setServices(data as string[]);
        }
      } catch {
        // ignore
      }
    })();
  }, [activeAccountId, step]);

  const handleServiceSelect = async (service: string) => {
    if (!activeAccountId) return;
    setSelectedService(service);
    setLoading(true);
    setStep(1);
    try {
      const data = await listResourceArns(service, activeAccountId);
      if (Array.isArray(data)) {
        setResources(data as { arn: string; name: string }[]);
      } else {
        setResources([]);
      }
    } catch {
      setResources([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!selectedArn || !activeAccountId) return;
    setLoading(true);
    try {
      await describeResource(selectedArn, activeAccountId);
      const data = await getGraph();
      if (data && typeof data === 'object') {
        const d = data as { nodes?: Record<string, unknown>; edges?: unknown[] };
        const nodes = new Map<string, any>();
        if (d.nodes) {
          for (const [k, v] of Object.entries(d.nodes)) {
            nodes.set(k, v);
          }
        }
        setGraph({ nodes, edges: (d.edges || []) as any[] });
        setAddResourcePanelOpen(false);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {!activeAccountId && (
        <div style={{ fontSize: 11, color: '#fbbf24' }}>No active account selected.</div>
      )}

      {step === 0 && (
        <>
          <div style={{ fontSize: 11, color: '#9ca3af' }}>Select a service to browse:</div>
          <select
            onChange={(e) => handleServiceSelect(e.target.value)}
            style={{
              padding: '6px 8px',
              background: '#1e2030',
              border: '1px solid #2a2d37',
              borderRadius: 4,
              color: '#e5e7eb',
              fontSize: 12,
              outline: 'none',
            }}
          >
            <option value="">-- Choose service --</option>
            {services.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </>
      )}

      {step === 1 && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button
              onClick={() => { setStep(0); setSelectedService(''); setResources([]); }}
              style={{ background: 'none', border: 'none', color: '#60a5fa', cursor: 'pointer', fontSize: 11 }}
            >
              ← Back
            </button>
            <span style={{ fontSize: 11, color: '#9ca3af' }}>{selectedService}</span>
          </div>
          {loading ? (
            <div style={{ fontSize: 11, color: '#6b7280', textAlign: 'center', padding: 12 }}>Loading resources...</div>
          ) : resources.length === 0 ? (
            <div style={{ fontSize: 11, color: '#6b7280', textAlign: 'center', padding: 12 }}>No resources found.</div>
          ) : (
            <div style={{ maxHeight: 250, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
              {resources.map((r) => (
                <button
                  key={r.arn}
                  onClick={() => setSelectedArn(r.arn)}
                  style={{
                    padding: '4px 8px',
                    background: selectedArn === r.arn ? '#1e3a5f' : '#1e2030',
                    border: selectedArn === r.arn ? '1px solid #3b82f6' : '1px solid transparent',
                    borderRadius: 3,
                    color: '#e5e7eb',
                    cursor: 'pointer',
                    fontSize: 11,
                    textAlign: 'left',
                  }}
                >
                  <div style={{ fontWeight: 500 }}>{r.name || r.arn}</div>
                  <div style={{ fontSize: 10, color: '#6b7280', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {r.arn}
                  </div>
                </button>
              ))}
            </div>
          )}
          {selectedArn && (
            <button
              onClick={handleAdd}
              disabled={loading}
              style={{
                padding: '6px 12px',
                background: loading ? '#374151' : '#2563eb',
                color: '#fff',
                border: 'none',
                borderRadius: 4,
                fontSize: 12,
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
            >
              {loading ? 'Adding...' : 'Add to Graph'}
            </button>
          )}
        </>
      )}
    </div>
  );
}

function EmptyMode() {
  const { setGraph, setAddResourcePanelOpen } = useAppStore();
  const [logicalId, setLogicalId] = useState('');
  const [service, setService] = useState('lambda');
  const [cfnType, setCfnType] = useState('');
  const [classification, setClassification] = useState('resource');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAdd = async () => {
    if (!logicalId.trim()) return;
    setLoading(true);
    setError(null);
    try {
      await createGraphNode({
        logicalId: logicalId.trim(),
        service,
        cfnType: cfnType || undefined,
        classification,
      });
      const data = await getGraph();
      if (data && typeof data === 'object') {
        const d = data as { nodes?: Record<string, unknown>; edges?: unknown[] };
        const nodes = new Map<string, any>();
        if (d.nodes) {
          for (const [k, v] of Object.entries(d.nodes)) {
            nodes.set(k, v);
          }
        }
        setGraph({ nodes, edges: (d.edges || []) as any[] });
        setAddResourcePanelOpen(false);
      }
    } catch (e: any) {
      setError(e.message || 'Failed to create resource');
    } finally {
      setLoading(false);
    }
  };

  const serviceOptions = ['lambda', 'dynamodb', 'connect', 'iam', 's3', 'apigateway', 'cloudwatch', 'ssm', 'secretsmanager'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ fontSize: 11, color: '#6b7280' }}>
        Create a placeholder resource to fill in later.
      </div>
      <label style={{ fontSize: 11, color: '#9ca3af' }}>
        Logical ID
        <input
          type="text"
          value={logicalId}
          onChange={(e) => setLogicalId(e.target.value)}
          placeholder="MyResource"
          style={{
            width: '100%',
            marginTop: 4,
            padding: '6px 8px',
            background: '#1e2030',
            border: '1px solid #2a2d37',
            borderRadius: 4,
            color: '#e5e7eb',
            fontSize: 12,
            fontFamily: 'monospace',
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />
      </label>
      <label style={{ fontSize: 11, color: '#9ca3af' }}>
        Service
        <select
          value={service}
          onChange={(e) => setService(e.target.value)}
          style={{
            width: '100%',
            marginTop: 4,
            padding: '6px 8px',
            background: '#1e2030',
            border: '1px solid #2a2d37',
            borderRadius: 4,
            color: '#e5e7eb',
            fontSize: 12,
            outline: 'none',
            boxSizing: 'border-box',
          }}
        >
          {serviceOptions.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </label>
      <label style={{ fontSize: 11, color: '#9ca3af' }}>
        CFN Type (optional)
        <input
          type="text"
          value={cfnType}
          onChange={(e) => setCfnType(e.target.value)}
          placeholder="AWS::Lambda::Function"
          style={{
            width: '100%',
            marginTop: 4,
            padding: '6px 8px',
            background: '#1e2030',
            border: '1px solid #2a2d37',
            borderRadius: 4,
            color: '#e5e7eb',
            fontSize: 12,
            fontFamily: 'monospace',
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />
      </label>
      <label style={{ fontSize: 11, color: '#9ca3af' }}>
        Classification
        <select
          value={classification}
          onChange={(e) => setClassification(e.target.value)}
          style={{
            width: '100%',
            marginTop: 4,
            padding: '6px 8px',
            background: '#1e2030',
            border: '1px solid #2a2d37',
            borderRadius: 4,
            color: '#e5e7eb',
            fontSize: 12,
            outline: 'none',
            boxSizing: 'border-box',
          }}
        >
          <option value="resource">Resource</option>
          <option value="aws-managed">AWS-Managed</option>
          <option value="parameter">Parameter</option>
          <option value="external">External</option>
          <option value="artifact">Artifact</option>
        </select>
      </label>
      <button
        onClick={handleAdd}
        disabled={loading || !logicalId.trim()}
        style={{
          padding: '6px 12px',
          background: loading || !logicalId.trim() ? '#374151' : '#2563eb',
          color: '#fff',
          border: 'none',
          borderRadius: 4,
          fontSize: 12,
          cursor: loading || !logicalId.trim() ? 'not-allowed' : 'pointer',
          marginTop: 4,
        }}
      >
        {loading ? 'Creating...' : 'Create Empty Resource'}
      </button>
    </div>
  );
}
