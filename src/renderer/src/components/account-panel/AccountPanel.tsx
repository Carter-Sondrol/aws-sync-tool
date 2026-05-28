import { useEffect, useState } from 'react'
import { type EnvironmentConfig, useAppStore } from '../../stores/app-store'

type DetectedSession = {
    source: string
    accountId?: string
    arn?: string
    userName?: string
    region?: string
    error?: string
}

type ValidationResult = {
    valid: boolean
    accountId?: string
    arn?: string
    userName?: string
    error?: string
}

export function EnvironmentPanel() {
    const { environments, activeEnvId, setEnvironments, addEnvironment, removeEnvironment } =
        useAppStore()

    const [detecting, setDetecting] = useState(false)
    const [detectedSessions, setDetectedSessions] = useState<DetectedSession[]>([])

    const [validatingEnvId, setValidatingEnvId] = useState<string | null>(null)
    const [validation, setValidation] = useState<{
        forId: string
        result: ValidationResult
    } | null>(null)

    const [error, setError] = useState('')

    const _activeEnvironment = environments.find((e) => e.id === activeEnvId) ?? null

    useEffect(() => {
        window.api.environments
            .list()
            .then(setEnvironments)
            .catch(() => {})
    }, [setEnvironments])

    const handleDetect = async (): Promise<void> => {
        setDetecting(true)
        setError('')
        setDetectedSessions([])
        try {
            const sessions = await window.api.environments.detectSessions()
            setDetectedSessions(sessions)
            const working = sessions.filter((s) => !s.error)
            if (working.length === 0) {
                setError(
                    'No working AWS credentials found. Run `aws configure` or `aws sso login`.'
                )
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Detection failed')
        } finally {
            setDetecting(false)
        }
    }

    const handleAddFromSession = async (session: DetectedSession): Promise<void> => {
        const profilePart = session.source.startsWith('profile:')
            ? session.source.slice('profile:'.length)
            : undefined
        const primaryRegion = session.region ?? 'us-west-2'
        const environment: EnvironmentConfig = {
            id: crypto.randomUUID(),
            label: session.accountId ?? profilePart ?? 'Default',
            profileName: profilePart,
            region: primaryRegion,
            accountId: session.accountId
        }
        try {
            const saved = await window.api.environments.add(environment)
            addEnvironment(saved)
            setDetectedSessions([])
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to add environment')
        }
    }

    const handleValidate = async (env: EnvironmentConfig): Promise<void> => {
        setValidatingEnvId(env.id)
        setError('')
        try {
            const result = await window.api.environments.validate(env.id)
            setValidation({ forId: env.id, result })
            if (!result.valid) setError(result.error ?? 'Validation failed')
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Validation failed')
        } finally {
            setValidatingEnvId(null)
        }
    }

    const handleRemove = async (env: EnvironmentConfig): Promise<void> => {
        try {
            await window.api.environments.remove(env.id)
            removeEnvironment(env.id)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to remove environment')
        }
    }

    // Warn if profile already used, but don't block
    const profileReuseCount = (session: DetectedSession): number =>
        session.source === 'default'
            ? environments.filter((e) => !e.profileName && e.accountId === session.accountId).length
            : environments.filter((e) => e.profileName === session.source.slice('profile:'.length))
                  .length

    return (
        <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#e5e7eb' }}>
                    AWS Accounts
                </span>
                <button
                    onClick={handleDetect}
                    disabled={detecting}
                    style={btnStyle('#7c3aed', detecting)}
                >
                    {detecting ? 'Scanning...' : '⚡ Detect Sessions'}
                </button>
            </div>

            {/* Error */}
            {error && (
                <div
                    style={{
                        padding: 8,
                        background: '#450a0a',
                        border: '1px solid #ef4444',
                        borderRadius: 4,
                        fontSize: 11,
                        color: '#fca5a5'
                    }}
                >
                    {error}
                </div>
            )}

            {/* Detected sessions */}
            {detectedSessions.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <div
                        style={{
                            fontSize: 10,
                            fontWeight: 600,
                            color: '#6b7280',
                            textTransform: 'uppercase',
                            letterSpacing: 1
                        }}
                    >
                        Detected ({detectedSessions.filter((s) => !s.error).length} working)
                    </div>
                    {detectedSessions.map((s, i) => {
                        const reuseCount = profileReuseCount(s)
                        return (
                            <div
                                key={i}
                                style={{
                                    padding: 8,
                                    background: s.error ? '#1c1917' : '#16181f',
                                    border: `1px solid ${s.error ? '#78350f' : '#2a2d37'}`,
                                    borderRadius: 4,
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    gap: 8
                                }}
                            >
                                <div style={{ minWidth: 0 }}>
                                    <div
                                        style={{
                                            fontSize: 11,
                                            fontWeight: 500,
                                            color: s.error ? '#f59e0b' : '#e5e7eb'
                                        }}
                                    >
                                        {s.source}
                                        {s.userName && (
                                            <span style={{ color: '#9ca3af', fontWeight: 400 }}>
                                                {' '}
                                                · {s.userName}
                                            </span>
                                        )}
                                    </div>
                                    {s.accountId && (
                                        <div
                                            style={{
                                                fontSize: 10,
                                                color: '#6b7280',
                                                fontFamily: 'monospace'
                                            }}
                                        >
                                            {s.accountId} · {s.region}
                                        </div>
                                    )}
                                    {s.error && (
                                        <div style={{ fontSize: 10, color: '#f59e0b' }}>
                                            {s.error}
                                        </div>
                                    )}
                                    {!s.error && reuseCount > 0 && (
                                        <div
                                            style={{ fontSize: 9, color: '#f59e0b', marginTop: 2 }}
                                        >
                                            Profile already used by {reuseCount} environment
                                            {reuseCount > 1 ? 's' : ''} — adding will create a new
                                            logical env with the same profile
                                        </div>
                                    )}
                                </div>
                                {!s.error && (
                                    <button
                                        onClick={() => handleAddFromSession(s)}
                                        style={btnStyle('#16a34a')}
                                    >
                                        Add
                                    </button>
                                )}
                            </div>
                        )
                    })}
                </div>
            )}

            {/* Environment list with per-entry actions */}
            {environments.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div
                        style={{
                            fontSize: 10,
                            fontWeight: 600,
                            color: '#6b7280',
                            textTransform: 'uppercase',
                            letterSpacing: 1
                        }}
                    >
                        Environments ({environments.length})
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {environments.map((env) => {
                            const envValidation =
                                validation?.forId === env.id ? validation.result : null
                            return (
                                <div
                                    key={env.id}
                                    style={{
                                        background: env.id === activeEnvId ? '#0d2818' : '#16181f',
                                        border: `1px solid ${env.id === activeEnvId ? '#166534' : '#2a2d37'}`,
                                        borderRadius: 4,
                                        overflow: 'hidden'
                                    }}
                                >
                                    <div
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 6,
                                            padding: '6px 8px'
                                        }}
                                    >
                                        <span
                                            style={{
                                                fontSize: 7,
                                                color:
                                                    env.id === activeEnvId ? '#4ade80' : '#374151',
                                                flexShrink: 0
                                            }}
                                        >
                                            ●
                                        </span>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div
                                                style={{
                                                    fontSize: 11,
                                                    fontWeight: env.id === activeEnvId ? 600 : 400,
                                                    color: '#d1d5db'
                                                }}
                                            >
                                                {env.label}
                                            </div>
                                            <div
                                                style={{
                                                    fontSize: 9,
                                                    color: '#6b7280',
                                                    fontFamily: 'monospace'
                                                }}
                                            >
                                                {env.profileName ?? 'default'} · {env.region}
                                                {env.accountId ? ` · ${env.accountId}` : ''}
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleValidate(env)}
                                            disabled={validatingEnvId === env.id}
                                            style={{
                                                padding: '2px 6px',
                                                background:
                                                    validatingEnvId === env.id
                                                        ? '#374151'
                                                        : '#1e2030',
                                                border: '1px solid #2a2d37',
                                                borderRadius: 3,
                                                color:
                                                    validatingEnvId === env.id
                                                        ? '#6b7280'
                                                        : '#9ca3af',
                                                fontSize: 9,
                                                cursor:
                                                    validatingEnvId === env.id
                                                        ? 'not-allowed'
                                                        : 'pointer',
                                                flexShrink: 0
                                            }}
                                        >
                                            {validatingEnvId === env.id ? '⟳' : '✓'} Validate
                                        </button>
                                        <button
                                            onClick={() => handleRemove(env)}
                                            style={{
                                                background: 'none',
                                                border: 'none',
                                                color: '#6b7280',
                                                cursor: 'pointer',
                                                fontSize: 14,
                                                padding: '0 2px',
                                                lineHeight: 1,
                                                flexShrink: 0
                                            }}
                                        >
                                            ×
                                        </button>
                                    </div>

                                    {/* Validation result */}
                                    {envValidation && (
                                        <div
                                            style={{
                                                padding: '4px 8px 6px',
                                                borderTop: '1px solid #2a2d37',
                                                fontSize: 9,
                                                fontFamily: 'monospace'
                                            }}
                                        >
                                            {envValidation.valid ? (
                                                <div style={{ color: '#86efac' }}>
                                                    ✓ Valid
                                                    {envValidation.accountId &&
                                                        ` · ${envValidation.accountId}`}
                                                    {envValidation.userName && (
                                                        <div
                                                            style={{
                                                                color: '#4ade80',
                                                                marginTop: 2
                                                            }}
                                                        >
                                                            {envValidation.userName}
                                                        </div>
                                                    )}
                                                    {envValidation.arn && (
                                                        <div
                                                            style={{
                                                                color: '#6b7280',
                                                                wordBreak: 'break-all',
                                                                marginTop: 1
                                                            }}
                                                        >
                                                            {envValidation.arn}
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <div style={{ color: '#fca5a5' }}>
                                                    ✕ {envValidation.error ?? 'Invalid'}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                </div>
            )}
        </div>
    )
}

function btnStyle(background: string, disabled = false): React.CSSProperties {
    return {
        padding: '4px 10px',
        background,
        color: '#fff',
        border: 'none',
        borderRadius: 4,
        fontSize: 11,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.6 : 1,
        whiteSpace: 'nowrap'
    }
}
