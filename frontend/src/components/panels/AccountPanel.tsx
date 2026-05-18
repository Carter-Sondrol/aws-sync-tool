import { useState, useEffect } from 'react';
import { useAppStore, type AccountConfig } from '../../stores/app-store';
import { addAccount as addAccountApi, validateAccount as validateAccountApi, listAccounts, removeAccountApi, detectAllSessions } from '../../hooks/api';

export function AccountPanel() {
  const { accounts, activeAccount, setActiveAccountId, removeAccount, addAccount: addAccountStore, setAccounts: setAccountsStore } = useAppStore();
  const [label, setLabel] = useState('');
  const [region, setRegion] = useState('us-east-1');
  const [profileName, setProfileName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [valid, setValid] = useState(false);
  const [identityInfo, setIdentityInfo] = useState<{ arn?: string; userName?: string } | null>(null);
  const [formOpen, setFormOpen] = useState(!activeAccount);
  const [detecting, setDetecting] = useState(false);
  const [detectedSessions, setDetectedSessions] = useState<Array<{ source: string; accountId?: string; arn?: string; userName?: string; region?: string; error?: string }>>([]);

  // Load accounts from backend on mount (backend is source of truth)
  useEffect(() => {
    listAccounts().then((data) => {
      const accountList = (data as AccountConfig[]) || [];
      localStorage.removeItem('aws-sync-accounts');
      setAccountsStore(accountList);
    }).catch(() => {});
  }, []);

  // Populate form when switching to edit an existing account
  useEffect(() => {
    if (activeAccount) {
      setLabel(activeAccount.label);
      setRegion(activeAccount.region);
      setProfileName(activeAccount.profileName || '');
      setIdentityInfo(null);
      setValid(false);
    }
  }, [activeAccount?.id]);

  const handleValidate = async () => {
    if (!activeAccount?.id) return;
    setLoading(true);
    setError('');
    setIdentityInfo(null);
    try {
      const result = await validateAccountApi(activeAccount.id);
      const r = result as any;
      setValid(!!r?.valid);
      if (r?.valid && (r?.arn || r?.userName)) {
        setIdentityInfo({ arn: r.arn, userName: r.userName });
      }
      if (!r?.valid) {
        setError(r?.error || 'Validation failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Validation failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async (id: string) => {
    try {
      await removeAccountApi(id);
      removeAccount(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove account');
    }
  };

  const handleDetectDefault = async () => {
    setDetecting(true);
    setError('');
    setDetectedSessions([]);
    try {
      const results = await detectAllSessions();
      const sessions = (results as any[]) || [];
      setDetectedSessions(sessions);
      const valid = sessions.filter((s: any) => s.accountId && !s.error);
      if (valid.length === 0) {
        const firstErr = sessions.find((s: any) => s.error);
        setError(firstErr?.error || 'No AWS sessions detected. Configure credentials with `aws configure` or run `aws sso login`.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to detect sessions');
    } finally {
      setDetecting(false);
    }
  };

  const handleAddDetected = (session: { source: string; accountId?: string; region?: string; arn?: string; userName?: string }) => {
    const profileName = session.source.replace('profile:', '') || 'default';
    setLabel(session.accountId ? `Account ${session.accountId}` : 'Untitled');
    setRegion(session.region || 'us-east-1');
    setProfileName(profileName);
    setIdentityInfo({ arn: session.arn, userName: session.userName });
    setValid(true);
    setFormOpen(true);
    setDetectedSessions([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setValid(false);

    const config: AccountConfig = {
      id: crypto.randomUUID(),
      label: label || 'Untitled',
      accountId: '', // populated by backend on validate
      region,
      credentialMethod: profileName ? 'profile' : 'accesskey',
      profileName: profileName || undefined,
    };

    try {
      const saved = (await addAccountApi(config as unknown as Record<string, unknown>)) as AccountConfig;
      addAccountStore(saved);
      setFormOpen(false);
      setIdentityInfo(null);
      setLabel('');
      setRegion('us-east-1');
      setProfileName('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save account');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {/* Connected Accounts List */}
      {accounts.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 1 }}>
            Connected Accounts ({accounts.length})
          </div>
          {accounts.map((acc: AccountConfig) => (
            <div
              key={acc.id}
              onClick={() => setActiveAccountId(acc.id)}
              style={{
                padding: 10,
                background: acc.id === activeAccount?.id ? '#0d2818' : '#1e2030',
                borderRadius: 6,
                border: acc.id === activeAccount?.id ? '1px solid #166534' : '1px solid #374151',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: acc.id === activeAccount?.id ? '#4ade80' : '#6b7280',
                  }} />
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{acc.label}</span>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDisconnect(acc.id); }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#6b7280',
                    cursor: 'pointer',
                    fontSize: 16,
                    padding: '0 4px',
                    lineHeight: 1,
                  }}
                >
                  ×
                </button>
              </div>
              <div style={{ fontSize: 11, color: '#9ca3af', fontFamily: 'monospace', marginTop: 2 }}>
                {acc.profileName || 'default'}
              </div>
              <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>
                {acc.region}
              </div>
            </div>
          ))}
          {activeAccount && (
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={handleValidate}
                disabled={loading}
                style={{ ...btnStyle, background: '#16a34a', flex: 1 }}
              >
                {loading ? '...' : 'Validate'}
              </button>
            </div>
          )}
          {valid && identityInfo && (
              <div style={{ color: '#4ade80', fontSize: 11, fontFamily: 'monospace', wordBreak: 'break-all' }}>
                Signed in as: {identityInfo.userName || 'unknown'}<br />
                <span style={{ color: '#6b7280' }}>{identityInfo.arn}</span>
              </div>
            )}
            {valid && !identityInfo && <div style={{ color: '#4ade80', fontSize: 12 }}>Credentials valid</div>}
        </div>
      )}

      {/* Add Account Form */}
      {formOpen && (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 1 }}>
            Add Account
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600 }}>Account Label</label>
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. Prod, Dev"
              style={inputStyle}
            />
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 600 }}>AWS Profile Name</label>
            <input
              value={profileName}
              onChange={(e) => setProfileName(e.target.value)}
              placeholder="e.g. my-profile (leave empty for default)"
              style={inputStyle}
            />
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 600 }}>Region</label>
            <input
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              style={inputStyle}
            />
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button type="submit" style={{ ...btnStyle, background: '#2563eb' }}>
              Save Account
            </button>
            <button type="button" onClick={() => setFormOpen(false)} style={{ ...btnStyle, background: '#6b7280' }}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {!formOpen && (
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            onClick={handleDetectDefault}
            disabled={detecting}
            style={{ ...btnStyle, background: '#7c3aed', marginTop: 4 }}
          >
            {detecting ? 'Detecting...' : '⚡ Detect Sessions'}
          </button>
          <button
            onClick={() => setFormOpen(true)}
            style={{ ...btnStyle, background: '#374151', marginTop: 4 }}
          >
            + Add Account
          </button>
        </div>
      )}

      {/* Detected Sessions */}
      {detectedSessions.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 1 }}>
            Detected Sessions ({detectedSessions.filter((s) => s.accountId).length}/{detectedSessions.length})
          </div>
          {detectedSessions.map((session, i) => (
            <div
              key={i}
              style={{
                padding: 8,
                background: session.error ? '#1c1917' : '#1e2030',
                borderRadius: 6,
                border: session.error ? '1px solid #78350f' : '1px solid #374151',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ fontSize: 12, fontWeight: 600, color: session.error ? '#f59e0b' : '#e5e7eb' }}>
                    {session.source}
                  </span>
                  {session.userName && (
                    <span style={{ fontSize: 11, color: '#9ca3af', marginLeft: 6 }}>{session.userName}</span>
                  )}
                </div>
                {!session.error && (
                  <button
                    onClick={() => handleAddDetected(session)}
                    style={{ ...btnStyle, background: '#10b981', flex: 'none', padding: '2px 8px', fontSize: 11 }}
                  >
                    Add
                  </button>
                )}
              </div>
              {session.accountId && (
                <div style={{ fontSize: 11, color: '#6b7280', fontFamily: 'monospace', marginTop: 2 }}>
                  {session.accountId} · {session.region}
                </div>
              )}
              {session.error && (
                <div style={{ fontSize: 10, color: '#f59e0b', marginTop: 2 }}>{session.error}</div>
              )}
            </div>
          ))}
        </div>
      )}

      {error && <div style={{ color: '#dc2626', fontSize: 12 }}>{error}</div>}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '6px 8px',
  border: '1px solid #374151',
  borderRadius: 4,
  fontSize: 13,
  boxSizing: 'border-box',
  background: '#1e2030',
  color: '#e5e7eb',
};

const btnStyle: React.CSSProperties = {
  padding: '6px 12px',
  color: '#fff',
  border: 'none',
  borderRadius: 4,
  fontSize: 13,
  cursor: 'pointer',
  flex: 1,
};
