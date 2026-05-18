/**
 * AccountPanel.tsx
 *
 * Manage AWS accounts, credentials, and validation.
 */

import { useState, useEffect } from 'react';
import { useAppStore, type AccountConfig } from '../stores/app-store';
import { addAccount as addAccountApi, validateAccount as validateAccountApi, listAccounts, removeAccountApi, detectAllSessions } from '../hooks/api';

export function AccountPanel() {
  const { accounts, activeAccountId, setActiveAccountId, removeAccount, addAccount: addAccountStore, setAccounts: setAccountsStore } = useAppStore();
  const [label, setLabel] = useState('');
  const [region, setRegion] = useState('us-east-1');
  const [profileName, setProfileName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [valid, setValid] = useState(false);
  const [identityInfo, setIdentityInfo] = useState<{ arn?: string; userName?: string } | null>(null);
  const [formOpen, setFormOpen] = useState(!activeAccountId);
  const [detecting, setDetecting] = useState(false);
  const [detectedSessions, setDetectedSessions] = useState<Array<{ source: string; accountId?: string; arn?: string; userName?: string; region?: string; error?: string }>>([]);

  // Load accounts from backend on mount
  useEffect(() => {
    listAccounts()
      .then((data) => {
        const accountList = (data as AccountConfig[]) || [];
        setAccountsStore(accountList);
      })
      .catch(() => {});
  }, [setAccountsStore]);

  // Populate form when switching to edit an existing account
  useEffect(() => {
    const activeAccount = accounts.find((a) => a.id === activeAccountId);
    if (activeAccount) {
      setLabel(activeAccount.label);
      setRegion(activeAccount.region);
      setProfileName(activeAccount.profileName || '');
      setIdentityInfo(null);
      setValid(false);
    }
  }, [activeAccountId, accounts]);

  const handleValidate = async () => {
    if (!activeAccountId) return;
    setLoading(true);
    setError('');
    setIdentityInfo(null);
    try {
      const result = await validateAccountApi(activeAccountId);
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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to detect sessions');
    } finally {
      setDetecting(false);
    }
  };

  const handleAddFromDetected = async (session: any) => {
    if (!session.profileName) return;
    const id = `account-${session.profileName}-${Date.now()}`;
    const account: AccountConfig = {
      id,
      label: session.profileName || `Account ${session.profileName}`,
      region: session.region || 'us-east-1',
      profileName: session.profileName,
    };
    try {
      await addAccountApi(account);
      addAccountStore(account);
      setDetectedSessions([]);
      setFormOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add account');
    }
  };

  const handleAddManual = async () => {
    if (!label.trim()) {
      setError('Enter an account label');
      return;
    }
    const id = `account-${label}-${Date.now()}`;
    const account: AccountConfig = {
      id,
      label,
      region,
      profileName: profileName || undefined,
    };
    try {
      await addAccountApi(account);
      addAccountStore(account);
      setLabel('');
      setProfileName('');
      setRegion('us-east-1');
      setFormOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add account');
    }
  };

  const activeAccount = accounts.find((a) => a.id === activeAccountId);

  return (
    <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: '#e5e7eb' }}>AWS Accounts</span>
        <button
          onClick={() => setFormOpen(!formOpen)}
          style={{
            padding: '4px 8px',
            background: '#2563eb',
            color: '#fff',
            border: 'none',
            borderRadius: 4,
            fontSize: 11,
            cursor: 'pointer',
          }}
        >
          {formOpen ? '✕ Close' : '+ Add'}
        </button>
      </div>

      {error && (
        <div style={{ padding: 8, background: '#7f1d1d', border: '1px solid #ef4444', borderRadius: 4, fontSize: 11, color: '#fecaca' }}>
          {error}
        </div>
      )}

      {formOpen && (
        <div style={{ padding: 8, background: '#1e2030', border: '1px solid #2a2d37', borderRadius: 4, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div>
            <div style={{ fontSize: 10, color: '#9ca3af', marginBottom: 4 }}>Auto-detect AWS sessions</div>
            <button
              onClick={handleDetectDefault}
              disabled={detecting}
              style={{
                width: '100%',
                padding: '6px 8px',
                background: detecting ? '#374151' : '#16a34a',
                color: '#fff',
                border: 'none',
                borderRadius: 3,
                fontSize: 11,
                cursor: detecting ? 'not-allowed' : 'pointer',
              }}
            >
              {detecting ? 'Detecting...' : 'Detect Sessions'}
            </button>
          </div>

          {detectedSessions.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {detectedSessions.map((s, i) => (
                <div key={i} style={{ padding: 6, background: '#16181f', border: '1px solid #2a2d37', borderRadius: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 500, color: '#e5e7eb' }}>{s.profileName}</div>
                    <div style={{ fontSize: 10, color: '#6b7280' }}>{s.region}</div>
                  </div>
                  <button
                    onClick={() => handleAddFromDetected(s)}
                    style={{
                      padding: '2px 6px',
                      background: '#2563eb',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 2,
                      fontSize: 10,
                      cursor: 'pointer',
                    }}
                  >
                    Add
                  </button>
                </div>
              ))}
            </div>
          )}

          <div style={{ borderTop: '1px solid #2a2d37', paddingTop: 8 }}>
            <div style={{ fontSize: 10, color: '#9ca3af', marginBottom: 4 }}>Or add manually</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <input
                type="text"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="Account label"
                style={{
                  padding: '4px 6px',
                  background: '#16181f',
                  border: '1px solid #2a2d37',
                  borderRadius: 3,
                  color: '#e5e7eb',
                  fontSize: 11,
                  outline: 'none',
                }}
              />
              <input
                type="text"
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                placeholder="AWS profile name (optional)"
                style={{
                  padding: '4px 6px',
                  background: '#16181f',
                  border: '1px solid #2a2d37',
                  borderRadius: 3,
                  color: '#e5e7eb',
                  fontSize: 11,
                  outline: 'none',
                }}
              />
              <select
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                style={{
                  padding: '4px 6px',
                  background: '#16181f',
                  border: '1px solid #2a2d37',
                  borderRadius: 3,
                  color: '#e5e7eb',
                  fontSize: 11,
                  outline: 'none',
                }}
              >
                {['us-east-1', 'us-west-2', 'eu-west-1', 'ap-southeast-1'].map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
              <button
                onClick={handleAddManual}
                style={{
                  padding: '4px 8px',
                  background: '#2563eb',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 3,
                  fontSize: 11,
                  cursor: 'pointer',
                }}
              >
                Add Account
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {accounts.map((account) => (
          <div
            key={account.id}
            style={{
              padding: 8,
              background: activeAccountId === account.id ? '#1e3a5f' : '#16181f',
              border: activeAccountId === account.id ? '1px solid #3b82f6' : '1px solid #2a2d37',
              borderRadius: 4,
              cursor: 'pointer',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
            onClick={() => setActiveAccountId(account.id)}
          >
            <div>
              <div style={{ fontSize: 11, fontWeight: 500, color: '#e5e7eb' }}>{account.label}</div>
              <div style={{ fontSize: 10, color: '#6b7280' }}>
                {account.profileName} • {account.region}
              </div>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDisconnect(account.id);
              }}
              style={{
                padding: '2px 6px',
                background: '#7f1d1d',
                color: '#fca5a5',
                border: 'none',
                borderRadius: 2,
                fontSize: 10,
                cursor: 'pointer',
              }}
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      {activeAccount && (
        <button
          onClick={handleValidate}
          disabled={loading}
          style={{
            padding: '6px 8px',
            background: loading ? '#374151' : '#16a34a',
            color: '#fff',
            border: 'none',
            borderRadius: 4,
            fontSize: 11,
            cursor: loading ? 'not-allowed' : 'pointer',
          }}
        >
          {loading ? 'Validating...' : 'Validate Account'}
        </button>
      )}

      {valid && identityInfo && (
        <div style={{ padding: 8, background: '#064e3b', border: '1px solid #10b981', borderRadius: 4, fontSize: 10, color: '#d1fae5' }}>
          <div>✓ Valid</div>
          {identityInfo.userName && <div>{identityInfo.userName}</div>}
          {identityInfo.arn && <div style={{ fontFamily: 'monospace', fontSize: 9, overflow: 'hidden', textOverflow: 'ellipsis' }}>{identityInfo.arn}</div>}
        </div>
      )}
    </div>
  );
}
