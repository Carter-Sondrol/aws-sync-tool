import { useCallback } from 'react'
import { type MatchCandidate, useAppStore } from '../../stores/app-store'
import { findMatches } from '../../utils/match-utils'

export function MatchPanel(): React.JSX.Element {
    const {
        graphs,
        activeEnvId,
        matchTargetEnvId,
        setMatchTargetEnvId,
        matchCandidates,
        confirmedMatchSourceArns,
        rejectedMatchSourceArns,
        environments,
        updateResourceMapping,
        clearMatchState,
        setMatchCandidates
    } = useAppStore()

    const otherEnvs = environments.filter((e) => e.id !== activeEnvId)
    const targetEnv = environments.find((e) => e.id === matchTargetEnvId)

    const runMatch = useCallback(() => {
        if (!activeEnvId || !matchTargetEnvId) return
        const sourceGraph = graphs.get(activeEnvId)
        const targetGraph = graphs.get(matchTargetEnvId)
        if (!sourceGraph || !targetGraph) return
        setMatchCandidates(findMatches(sourceGraph, targetGraph))
    }, [activeEnvId, matchTargetEnvId, graphs, setMatchCandidates])

    const handleTargetChange = (envId: string | null) => {
        setMatchTargetEnvId(envId)
        if (envId) {
            setTimeout(runMatch, 0)
        } else {
            setMatchCandidates([])
        }
    }

    const handleApplyConfirmed = () => {
        if (!matchTargetEnvId) return
        for (const c of matchCandidates) {
            if (!confirmedMatchSourceArns.has(c.sourceArn)) continue
            updateResourceMapping(matchTargetEnvId, c.sourceLogicalId, {
                arn: c.targetArn
            })
        }
    }

    const handleApplyAll = () => {
        if (!matchTargetEnvId) return
        for (const c of matchCandidates) {
            if (rejectedMatchSourceArns.has(c.sourceArn)) continue
            updateResourceMapping(matchTargetEnvId, c.sourceLogicalId, {
                arn: c.targetArn
            })
        }
    }

    const confirmedCount = matchCandidates.filter((c) =>
        confirmedMatchSourceArns.has(c.sourceArn)
    ).length
    const rejectedCount = matchCandidates.filter((c) =>
        rejectedMatchSourceArns.has(c.sourceArn)
    ).length
    const pendingCount = matchCandidates.length - confirmedCount - rejectedCount

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <div style={{ padding: '12px 14px', borderBottom: '1px solid #2a2d37' }}>
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: 8
                    }}
                >
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#e5e7eb' }}>
                        Match Resources
                    </span>
                    <button onClick={clearMatchState} style={miniBtnStyle}>
                        ✕
                    </button>
                </div>

                {!matchTargetEnvId ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <label style={{ fontSize: 10, color: '#6b7280' }}>
                            Match against environment
                        </label>
                        <select
                            value={''}
                            onChange={(e) => handleTargetChange(e.target.value || null)}
                            style={selectStyle}
                        >
                            <option value="">Select target...</option>
                            {otherEnvs.map((env) => (
                                <option key={env.id} value={env.id}>
                                    {env.label}
                                </option>
                            ))}
                        </select>
                    </div>
                ) : (
                    <>
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                                marginBottom: 8
                            }}
                        >
                            <span style={{ fontSize: 10, color: '#6b7280' }}>Target:</span>
                            <button
                                onClick={() => handleTargetChange(null)}
                                style={{
                                    ...miniBtnStyle,
                                    color: '#60a5fa',
                                    background: 'transparent'
                                }}
                            >
                                {targetEnv?.label || matchTargetEnvId} ▾
                            </button>
                        </div>

                        <div style={{ display: 'flex', gap: 6 }}>
                            <button
                                onClick={handleApplyConfirmed}
                                disabled={confirmedCount === 0}
                                style={btnStyle('#3b82f6', confirmedCount === 0)}
                            >
                                Apply ({confirmedCount})
                            </button>
                            <button
                                onClick={handleApplyAll}
                                disabled={pendingCount === 0 && confirmedCount === 0}
                                style={btnStyle(
                                    '#10b981',
                                    pendingCount === 0 && confirmedCount === 0
                                )}
                            >
                                Apply All ({matchCandidates.length - rejectedCount})
                            </button>
                        </div>

                        <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                            <span style={badgeStyle('#10b981')}>✓ {confirmedCount}</span>
                            <span style={badgeStyle('#ef4444')}>✕ {rejectedCount}</span>
                            <span style={badgeStyle('#6b7280')}>○ {pendingCount}</span>
                        </div>
                    </>
                )}
            </div>

            {/* Results */}
            <MatchResults
                matchCandidates={matchCandidates}
                confirmedMatchSourceArns={confirmedMatchSourceArns}
                rejectedMatchSourceArns={rejectedMatchSourceArns}
                hasTarget={!!matchTargetEnvId}
            />
        </div>
    )
}

// ─── Results ──────────────────────────────────────────────────────────────

function MatchResults({
    matchCandidates,
    confirmedMatchSourceArns,
    rejectedMatchSourceArns,
    hasTarget
}: {
    matchCandidates: MatchCandidate[]
    confirmedMatchSourceArns: Set<string>
    rejectedMatchSourceArns: Set<string>
    hasTarget: boolean
}): React.JSX.Element {
    if (matchCandidates.length === 0 && hasTarget) {
        return (
            <div style={{ flex: 1, overflow: 'auto' }}>
                <div style={{ padding: 24, textAlign: 'center', color: '#6b7280', fontSize: 11 }}>
                    No matches found between environments.
                </div>
            </div>
        )
    }

    if (!hasTarget) {
        return (
            <div style={{ flex: 1, overflow: 'auto' }}>
                <div style={{ padding: 24, textAlign: 'center', color: '#6b7280', fontSize: 11 }}>
                    Select a target environment to find matches.
                </div>
            </div>
        )
    }

    const grouped = groupByStrategy(matchCandidates)

    return (
        <div style={{ flex: 1, overflow: 'auto' }}>
            {Object.entries(grouped).map(([label, candidates]) => (
                <MatchGroup
                    key={label}
                    label={label}
                    candidates={candidates}
                    confirmed={confirmedMatchSourceArns}
                    rejected={rejectedMatchSourceArns}
                />
            ))}
        </div>
    )
}

function groupByStrategy(candidates: MatchCandidate[]): Record<string, MatchCandidate[]> {
    const groups: Record<string, MatchCandidate[]> = {}
    for (const c of candidates) {
        const key = `${c.strategy} (${c.confidence})`
        if (!groups[key]) groups[key] = []
        groups[key].push(c)
    }
    return groups
}

function MatchGroup({
    label,
    candidates,
    confirmed,
    rejected
}: {
    label: string
    candidates: MatchCandidate[]
    confirmed: Set<string>
    rejected: Set<string>
}): React.JSX.Element {
    const { confirmMatch, rejectMatch } = useAppStore()

    return (
        <div style={{ borderBottom: '1px solid #2a2d37' }}>
            <div
                style={{
                    padding: '6px 14px',
                    background: '#1a1c28',
                    fontSize: 10,
                    color: '#9ca3af',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: 0.5
                }}
            >
                {label}
            </div>
            {candidates.map((c) => (
                <MatchRow
                    key={c.sourceArn}
                    candidate={c}
                    confirmed={confirmed}
                    rejected={rejected}
                    onConfirm={() => confirmMatch(c.sourceArn)}
                    onReject={() => rejectMatch(c.sourceArn)}
                />
            ))}
        </div>
    )
}

function MatchRow({
    candidate,
    confirmed,
    rejected,
    onConfirm,
    onReject
}: {
    candidate: MatchCandidate
    confirmed: Set<string>
    rejected: Set<string>
    onConfirm: () => void
    onReject: () => void
}): React.JSX.Element {
    const isConfirmed = confirmed.has(candidate.sourceArn)
    const isRejected = rejected.has(candidate.sourceArn)

    return (
        <div
            style={{
                padding: '8px 14px',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                background: isConfirmed ? '#0c2a1a' : isRejected ? '#2a0c0c' : 'transparent',
                opacity: isRejected ? 0.5 : 1
            }}
        >
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                    <span style={{ fontSize: 11, color: '#e5e7eb', fontWeight: 500 }}>
                        {candidate.sourceLabel}
                    </span>
                    <span style={{ fontSize: 9, color: '#6b7280' }}>::</span>
                    <span style={{ fontSize: 11, color: '#60a5fa', fontWeight: 500 }}>
                        {candidate.targetLabel}
                    </span>
                </div>
                <div
                    style={{
                        fontSize: 9,
                        color: '#6b7280',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                    }}
                >
                    {candidate.sourceLogicalId} → {candidate.targetLogicalId}
                </div>
            </div>

            <button
                onClick={isConfirmed ? onReject : onConfirm}
                style={{
                    ...miniBtnStyle,
                    color: isConfirmed ? '#ef4444' : '#10b981',
                    background: 'transparent'
                }}
            >
                {isConfirmed ? '✓' : '○'}
            </button>
        </div>
    )
}

// ─── Styles ────────────────────────────────────────────────────────────────

const miniBtnStyle: React.CSSProperties = {
    padding: '2px 6px',
    background: '#1e2030',
    border: 'none',
    borderRadius: 3,
    color: '#e5e7eb',
    fontSize: 10,
    cursor: 'pointer'
}

const selectStyle: React.CSSProperties = {
    padding: '5px 8px',
    background: '#1e2030',
    border: '1px solid #2a2d37',
    borderRadius: 4,
    color: '#e5e7eb',
    fontSize: 11,
    outline: 'none'
}

function btnStyle(background: string, disabled = false): React.CSSProperties {
    return {
        padding: '5px 10px',
        background: disabled ? '#2a2d37' : background,
        color: disabled ? '#6b7280' : '#fff',
        border: 'none',
        borderRadius: 4,
        fontSize: 11,
        cursor: disabled ? 'not-allowed' : 'pointer'
    }
}

function badgeStyle(color: string): React.CSSProperties {
    return {
        fontSize: 10,
        color,
        fontWeight: 600
    }
}
