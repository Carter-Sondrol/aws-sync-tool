import { useEffect, useState } from 'react'
import { type EnvironmentConfig, useAppStore } from '../../stores/app-store'

const COMMON_REGIONS = [
    'us-east-1',
    'us-east-2',
    'us-west-1',
    'us-west-2',
    'eu-west-1',
    'eu-west-2',
    'eu-central-1',
    'ap-southeast-1',
    'ap-southeast-2',
    'ap-northeast-1',
    'ca-central-1',
    'sa-east-1'
]

// ─── Inline add form ──────────────────────────────────────────────────────

function AddEnvironmentForm({ onClose }: { onClose: () => void }) {
    const { addEnvironment } = useAppStore()
    const [label, setLabel] = useState('')
    const [profileName, setProfileName] = useState('')
    const [region, setRegion] = useState('us-west-2')
    const [error, setError] = useState('')

    const handleSave = async () => {
        if (!label.trim()) {
            setError('Enter an environment name')
            return
        }
        try {
            const env: EnvironmentConfig = {
                id: crypto.randomUUID(),
                label: label.trim(),
                profileName: profileName.trim() || undefined,
                region
            }
            const saved = await window.api.environments.add(env)
            addEnvironment(saved)
            onClose()
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to add environment')
        }
    }

    return (
        <div style={{ padding: '6px 8px', display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div
                style={{
                    fontSize: 9,
                    fontWeight: 600,
                    color: '#6b7280',
                    textTransform: 'uppercase',
                    letterSpacing: 0.5
                }}
            >
                New Environment
            </div>
            {error && <div style={{ fontSize: 9, color: '#fca5a5' }}>{error}</div>}
            <input
                autoFocus
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="Name (e.g. DEV)"
                onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                style={inputStyle}
            />
            <input
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                placeholder="Profile (optional)"
                onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                style={inputStyle}
            />
            <select value={region} onChange={(e) => setRegion(e.target.value)} style={inputStyle}>
                {COMMON_REGIONS.map((r) => (
                    <option key={r} value={r}>
                        {r}
                    </option>
                ))}
            </select>
            <div style={{ display: 'flex', gap: 4 }}>
                <button onClick={handleSave} style={{ ...btnStyle('#2563eb'), flex: 1 }}>
                    Save
                </button>
                <button onClick={onClose} style={{ ...btnStyle('#374151'), flex: 1 }}>
                    Cancel
                </button>
            </div>
        </div>
    )
}

// ─── Duplicate form ───────────────────────────────────────────────────────

function DuplicateEnvironmentForm({
    source,
    onClose
}: {
    source: EnvironmentConfig
    onClose: () => void
}) {
    const { addEnvironment } = useAppStore()
    const [label, setLabel] = useState('')
    const [error, setError] = useState('')

    const handleSave = async () => {
        if (!label.trim()) {
            setError('Enter a name for the new environment')
            return
        }
        try {
            const env: EnvironmentConfig = {
                id: crypto.randomUUID(),
                label: label.trim(),
                profileName: source.profileName,
                region: source.region,
                regions: source.regions,
                accountId: source.accountId
            }
            const saved = await window.api.environments.add(env)
            addEnvironment(saved)
            onClose()
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to duplicate')
        }
    }

    return (
        <div style={{ padding: '6px 8px', display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div
                style={{
                    fontSize: 9,
                    fontWeight: 600,
                    color: '#6b7280',
                    textTransform: 'uppercase',
                    letterSpacing: 0.5
                }}
            >
                Duplicate {source.label}
            </div>
            {error && <div style={{ fontSize: 9, color: '#fca5a5' }}>{error}</div>}
            <input
                autoFocus
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder={`Copy of ${source.label}`}
                onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                style={inputStyle}
            />
            <div style={{ display: 'flex', gap: 4 }}>
                <button onClick={handleSave} style={{ ...btnStyle('#2563eb'), flex: 1 }}>
                    Create
                </button>
                <button onClick={onClose} style={{ ...btnStyle('#374151'), flex: 1 }}>
                    Cancel
                </button>
            </div>
        </div>
    )
}

// ─── Environment list entry ───────────────────────────────────────────────

function EnvEntry({ env, isActive }: { env: EnvironmentConfig; isActive: boolean }) {
    const { setActiveEnvId, removeEnvironment } = useAppStore()
    const [duplicating, setDuplicating] = useState(false)

    if (duplicating) {
        return <DuplicateEnvironmentForm source={env} onClose={() => setDuplicating(false)} />
    }

    return (
        <div
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '3px 8px',
                background: isActive ? '#0d2818' : 'transparent',
                borderRadius: 3
            }}
        >
            <div
                onClick={() => setActiveEnvId(env.id)}
                style={{ flex: 1, minWidth: 0, cursor: 'pointer' }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span
                        style={{
                            fontSize: 7,
                            color: isActive ? '#4ade80' : '#374151',
                            flexShrink: 0
                        }}
                    >
                        ●
                    </span>
                    <span
                        style={{ fontSize: 10, fontWeight: isActive ? 600 : 400, color: '#d1d5db' }}
                    >
                        {env.label}
                    </span>
                    {isActive && (
                        <span
                            style={{
                                fontSize: 7,
                                color: '#374151',
                                textTransform: 'uppercase',
                                letterSpacing: 0.5
                            }}
                        >
                            active
                        </span>
                    )}
                </div>
                <div
                    style={{
                        fontSize: 8,
                        color: '#6b7280',
                        fontFamily: 'monospace',
                        paddingLeft: 11
                    }}
                >
                    {env.profileName ?? 'default'} · {env.region}
                    {env.accountId ? ` · ${env.accountId}` : ''}
                </div>
            </div>
            <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
                <button onClick={() => setDuplicating(true)} style={iconBtnStyle} title="Duplicate">
                    ⧉
                </button>
                <button
                    onClick={() => {
                        removeEnvironment(env.id)
                        window.api.environments.remove(env.id).catch(() => {})
                    }}
                    style={{ ...iconBtnStyle, color: '#ef4444' }}
                    title="Remove"
                >
                    ×
                </button>
            </div>
        </div>
    )
}

// ─── Dropdown panel ──────────────────────────────────────────────────────

export function EnvironmentManager({
    anchorRef
}: {
    anchorRef?: React.RefObject<HTMLElement | null>
}) {
    const { environments, activeEnvId } = useAppStore()
    const [open, setOpen] = useState(false)
    const [mode, setMode] = useState<'list' | 'add'>('list')

    useEffect(() => {
        if (!open) setMode('list')
    }, [open])

    return (
        <div style={{ position: 'relative', flexShrink: 0 }}>
            <button
                onClick={() => setOpen(!open)}
                style={{
                    padding: '2px 8px',
                    background: open ? '#1e3a5f' : '#1e2030',
                    border: `1px solid ${open ? '#3b82f6' : '#2a2d37'}`,
                    color: open ? '#93c5fd' : '#9ca3af',
                    borderRadius: 3,
                    fontSize: 9,
                    cursor: 'pointer'
                }}
            >
                {environments.length} env{open ? ' ▲' : ''}
            </button>

            {open && (
                <>
                    {/* Backdrop */}
                    <div
                        onClick={() => setOpen(false)}
                        style={{
                            position: 'fixed',
                            inset: 0,
                            zIndex: 40
                        }}
                    />

                    {/* Dropdown */}
                    <div
                        style={{
                            position: 'absolute',
                            top: '100%',
                            right: 0,
                            marginTop: 4,
                            width: 320,
                            background: '#1a1c28',
                            border: '1px solid #2a2d37',
                            borderRadius: 6,
                            boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                            zIndex: 50,
                            overflow: 'hidden'
                        }}
                    >
                        {mode === 'add' ? (
                            <AddEnvironmentForm onClose={() => setMode('list')} />
                        ) : (
                            <>
                                {/* Header */}
                                <div
                                    style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        padding: '6px 8px',
                                        borderBottom: '1px solid #2a2d37'
                                    }}
                                >
                                    <span
                                        style={{
                                            fontSize: 9,
                                            fontWeight: 600,
                                            color: '#6b7280',
                                            textTransform: 'uppercase',
                                            letterSpacing: 0.5
                                        }}
                                    >
                                        Environments
                                    </span>
                                    <button
                                        onClick={() => setMode('add')}
                                        style={{
                                            padding: '2px 8px',
                                            background: '#2563eb',
                                            border: 'none',
                                            borderRadius: 3,
                                            color: '#fff',
                                            fontSize: 9,
                                            cursor: 'pointer'
                                        }}
                                    >
                                        + Add
                                    </button>
                                </div>

                                {/* List */}
                                <div style={{ maxHeight: 240, overflowY: 'auto' }}>
                                    {environments.length === 0 ? (
                                        <div
                                            style={{
                                                padding: 16,
                                                textAlign: 'center',
                                                fontSize: 9,
                                                color: '#4b5563'
                                            }}
                                        >
                                            No environments — click + Add or go to Accounts tab to
                                            detect.
                                        </div>
                                    ) : (
                                        environments.map((env) => (
                                            <EnvEntry
                                                key={env.id}
                                                env={env}
                                                isActive={env.id === activeEnvId}
                                            />
                                        ))
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                </>
            )}
        </div>
    )
}

// ─── Styles ──────────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
    padding: '4px 6px',
    background: '#111827',
    border: '1px solid #2a2d37',
    borderRadius: 3,
    color: '#e5e7eb',
    fontSize: 10,
    outline: 'none'
}

function btnStyle(background: string): React.CSSProperties {
    return {
        padding: '4px 8px',
        background,
        color: '#fff',
        border: 'none',
        borderRadius: 3,
        fontSize: 10,
        cursor: 'pointer',
        whiteSpace: 'nowrap'
    }
}

const iconBtnStyle: React.CSSProperties = {
    background: 'none',
    border: 'none',
    color: '#6b7280',
    cursor: 'pointer',
    fontSize: 12,
    padding: '1px 3px',
    lineHeight: 1,
    borderRadius: 2
}
