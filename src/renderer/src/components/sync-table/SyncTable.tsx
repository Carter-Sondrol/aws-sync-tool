import React, { useMemo, useState } from 'react'
import type { JSX } from 'react/jsx-runtime'
import type { MappingTable } from '../../../../main/graph-types'
import { type EnvironmentConfig, type GraphNode, useAppStore } from '../../stores/app-store'
import { EnvironmentManager } from '../environment-manager/EnvironmentManager'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getMappingCellValue(
    mapping: MappingTable,
    envId: string,
    logicalId: string,
    paramKey: string
): string {
    const key = paramKey.split('.').pop() ?? paramKey
    const raw = mapping[envId]?.[logicalId]?.[key]
    return raw != null ? String(raw) : ''
}

function getActiveEnvValue(node: GraphNode, paramKey: string): string {
    if (paramKey === 'arn') return node.arn
    const parts = paramKey.split('.')
    let val: unknown = node.data
    for (const p of parts) val = (val as Record<string, unknown> | undefined)?.[p]
    const s = typeof val === 'string' ? val : ''
    return s.match(/^__REF_(.+)__$/)?.[1] ?? s
}

function parseEdgeLogicalId(edge: string): string | null {
    return edge.match(/^\$\.([^.]+)/)?.[1] ?? null
}

// ─── SyncCell (editable) ─────────────────────────────────────────────────────

function SyncCell({
    isActive,
    value,
    onChange
}: {
    isActive: boolean
    value: string
    onChange: (v: string) => void
}) {
    const [editing, setEditing] = useState(false)
    const [draft, setDraft] = useState('')

    if (isActive) {
        return (
            <td style={cellStyle}>
                <span style={{ color: '#4b5563', fontFamily: 'monospace' }}>{value || '—'}</span>
            </td>
        )
    }

    if (editing) {
        return (
            <td style={{ ...cellStyle, padding: '2px 4px' }}>
                <input
                    autoFocus
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onBlur={() => {
                        onChange(draft)
                        setEditing(false)
                    }}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            onChange(draft)
                            setEditing(false)
                        }
                        if (e.key === 'Escape') setEditing(false)
                    }}
                    style={{
                        width: '100%',
                        padding: '2px 4px',
                        background: '#111827',
                        border: '1px solid #60a5fa',
                        borderRadius: 2,
                        color: '#e5e7eb',
                        fontSize: 10,
                        fontFamily: 'monospace',
                        outline: 'none',
                        boxSizing: 'border-box' as const
                    }}
                />
            </td>
        )
    }

    return (
        <td
            onClick={() => {
                setDraft(value)
                setEditing(true)
            }}
            style={{ ...cellStyle, cursor: 'pointer', color: value ? '#d1d5db' : '#2a2d37' }}
        >
            {value || <em style={{ fontStyle: 'normal', color: '#2a2d37' }}>empty</em>}
        </td>
    )
}

// ─── EnvColumnHeader ──────────────────────────────────────────────────────────

function EnvColumnHeader({ env, isActive }: { env: EnvironmentConfig; isActive: boolean }) {
    const { environments, setEnvironments } = useAppStore()
    const [editing, setEditing] = useState(false)
    const [draft, setDraft] = useState('')

    const save = async (label: string) => {
        const trimmed = label.trim()
        if (!trimmed) {
            setEditing(false)
            return
        }
        const updated = { ...env, label: trimmed }
        await window.api.environments.add(updated)
        setEnvironments(environments.map((e) => (e.id === env.id ? updated : e)))
        setEditing(false)
    }

    return (
        <th
            style={{
                padding: '5px 8px',
                minWidth: 160,
                textAlign: 'left',
                fontWeight: 500,
                fontSize: 10,
                color: isActive ? '#60a5fa' : '#9ca3af',
                borderBottom: '1px solid #2a2d37',
                borderRight: '1px solid #1e2030',
                background: '#1a1c28',
                position: 'sticky',
                top: 0
            }}
        >
            {editing ? (
                <input
                    autoFocus
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onBlur={() => save(draft)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') save(draft)
                        if (e.key === 'Escape') setEditing(false)
                    }}
                    style={{
                        width: '100%',
                        background: '#111827',
                        border: '1px solid #60a5fa',
                        borderRadius: 2,
                        color: '#e5e7eb',
                        fontSize: 10,
                        padding: '1px 4px',
                        outline: 'none'
                    }}
                />
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span
                            onClick={() => {
                                setDraft(env.label)
                                setEditing(true)
                            }}
                            style={{ cursor: 'pointer', flex: 1 }}
                        >
                            {env.label}
                        </span>
                        {isActive && (
                            <span
                                style={{
                                    fontSize: 8,
                                    color: '#374151',
                                    textTransform: 'uppercase',
                                    letterSpacing: 0.5
                                }}
                            >
                                source
                            </span>
                        )}
                    </div>
                    {env.accountId && (
                        <span
                            style={{
                                fontSize: 9,
                                color: '#4b5563',
                                fontFamily: 'monospace'
                            }}
                        >
                            {env.accountId}
                        </span>
                    )}
                </div>
            )}
        </th>
    )
}

// ─── Section header ───────────────────────────────────────────────────────────

function SectionHeader({
    label,
    count,
    collapsed,
    onToggle,
    colSpan
}: {
    label: string
    count: number
    collapsed: boolean
    onToggle: () => void
    colSpan: number
}): JSX.Element {
    return (
        <tr>
            <td
                colSpan={colSpan}
                onClick={onToggle}
                style={{
                    padding: '5px 8px',
                    background: '#111827',
                    borderBottom: '1px solid #2a2d37',
                    borderTop: '1px solid #2a2d37',
                    cursor: 'pointer',
                    userSelect: 'none'
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 8, color: '#4b5563' }}>{collapsed ? '▶' : '▼'}</span>
                    <span
                        style={{
                            fontSize: 10,
                            fontWeight: 600,
                            color: '#6b7280',
                            textTransform: 'uppercase',
                            letterSpacing: 0.8,
                            flex: 1
                        }}
                    >
                        {label}
                    </span>
                    <span style={{ fontSize: 9, color: '#374151' }}>{count}</span>
                </div>
            </td>
        </tr>
    )
}

// ─── Node group header ────────────────────────────────────────────────────────

function NodeGroupHeader({ node, colSpan }: { node: GraphNode; colSpan: number }) {
    return (
        <tr style={{ background: '#111520' }}>
            <td
                colSpan={colSpan}
                style={{
                    padding: '3px 8px 3px 12px',
                    color: '#9ca3af',
                    fontSize: 10,
                    fontWeight: 600,
                    borderBottom: '1px solid #1e2030',
                    borderTop: '1px solid #1e2030'
                }}
            >
                {node.label || node.logicalId}
                <span
                    style={{
                        marginLeft: 6,
                        fontSize: 9,
                        color: '#374151',
                        fontFamily: 'monospace'
                    }}
                >
                    {node.service}
                </span>
            </td>
        </tr>
    )
}

// ─── SyncTable ────────────────────────────────────────────────────────────────

interface DynRefEntry {
    node: GraphNode
    paramKey: string
    displayKey: string
    edgeLogicalId: string | null
    edgeNode: GraphNode | null
}

interface DynValEntry {
    node: GraphNode
    paramKey: string
    displayKey: string
}

export function SyncTable() {
    const {
        environments,
        activeEnvId,
        graph,
        mapping,
        updateResourceMapping,
        removeResourceMapping,
        setSelectedNodeArns
    } = useAppStore()

    const [search, setSearch] = useState('')
    const [sectionsCollapsed, setSectionsCollapsed] = useState<Set<string>>(new Set())

    const toggleSection = (key: string) =>
        setSectionsCollapsed((prev) => {
            const next = new Set(prev)
            next.has(key) ? next.delete(key) : next.add(key)
            return next
        })

    const envColumns = useMemo(() => {
        const active = environments.find((e) => e.id === activeEnvId)
        const others = environments.filter((e) => e.id !== activeEnvId)
        return active ? [active, ...others] : others
    }, [environments, activeEnvId])

    const nodeByLogicalId = useMemo(() => {
        const m = new Map<string, GraphNode>()
        for (const node of graph.nodes.values()) m.set(node.logicalId, node)
        return m
    }, [graph.nodes])

    const { dynRefGroups, dynValGroups, refResourceNodes } = useMemo(() => {
        const term = search.trim().toLowerCase()

        // Excluded nodes referenced by any included node
        const referencedExcludedArns = new Set<string>()
        for (const node of graph.nodes.values()) {
            if (!node.included) continue
            for (const arn of node.discoveredRefs) {
                const refNode = graph.nodes.get(arn)
                if (refNode && !refNode.included && !refNode.hidden) referencedExcludedArns.add(arn)
            }
        }

        const dynRefByNode = new Map<string, { node: GraphNode; entries: DynRefEntry[] }>()
        const dynValByNode = new Map<string, { node: GraphNode; entries: DynValEntry[] }>()

        for (const node of graph.nodes.values()) {
            if (!node.included || node.hidden) continue

            for (const [key, cfg] of Object.entries(node.paramConfig ?? {})) {
                if (key === 'arn') continue
                if (!cfg.dynamic) continue

                const displayKey = key.split('.').pop() ?? key

                if (cfg.edge) {
                    const logicalId = parseEdgeLogicalId(cfg.edge)
                    const edgeNode = logicalId ? (nodeByLogicalId.get(logicalId) ?? null) : null
                    if (!dynRefByNode.has(node.arn))
                        dynRefByNode.set(node.arn, { node, entries: [] })
                    dynRefByNode.get(node.arn)!.entries.push({
                        node,
                        paramKey: key,
                        displayKey,
                        edgeLogicalId: logicalId,
                        edgeNode
                    })
                } else {
                    if (!dynValByNode.has(node.arn))
                        dynValByNode.set(node.arn, { node, entries: [] })
                    dynValByNode
                        .get(node.arn)!
                        .entries.push({ node, paramKey: key, displayKey })
                }
            }

            if (node.paramConfig?.arn?.dynamic) {
                if (!dynValByNode.has(node.arn))
                    dynValByNode.set(node.arn, { node, entries: [] })
                dynValByNode
                    .get(node.arn)!
                    .entries.unshift({ node, paramKey: 'arn', displayKey: 'ARN' })
            }
        }

        const filterGroups = <T extends object>(
            groups: Map<string, { node: GraphNode; entries: T[] }>
        ) => {
            if (!term) return Array.from(groups.values())
            return Array.from(groups.values()).filter(({ node }) =>
                (node.label || node.logicalId).toLowerCase().includes(term)
            )
        }

        const filteredRefResources = Array.from(referencedExcludedArns)
            .map((arn) => graph.nodes.get(arn))
            .filter((n): n is GraphNode => !!n)
            .filter((n) => !term || (n.label || n.logicalId).toLowerCase().includes(term))

        return {
            dynRefGroups: filterGroups(dynRefByNode),
            dynValGroups: filterGroups(dynValByNode),
            refResourceNodes: filteredRefResources
        }
    }, [graph.nodes, nodeByLogicalId, search])

    const persistMapping = () => window.api.mapping.save(useAppStore.getState().mapping)

    const handleCellChange = (node: GraphNode, paramKey: string, envId: string, value: string) => {
        const key = paramKey.split('.').pop() ?? paramKey
        const existing = mapping[envId]?.[node.logicalId] ?? {}
        if (value) {
            updateResourceMapping(envId, node.logicalId, { ...existing, [key]: value })
        } else {
            const { [key]: _, ...rest } = existing
            if (Object.keys(rest).length > 0)
                updateResourceMapping(envId, node.logicalId, rest as typeof existing)
            else removeResourceMapping(envId, node.logicalId)
        }
        persistMapping()
    }

    const colSpan = envColumns.length + 1
    const hasSomething =
        dynRefGroups.length > 0 || dynValGroups.length > 0 || refResourceNodes.length > 0

    if (graph.nodes.size === 0) {
        return (
            <div style={{ padding: 16, textAlign: 'center', fontSize: 10, color: '#4b5563' }}>
                No resources — run discovery first.
            </div>
        )
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* Header */}
            <div
                style={{
                    padding: '5px 8px',
                    flexShrink: 0,
                    borderBottom: '1px solid #2a2d37',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8
                }}
            >
                <span
                    style={{
                        fontSize: 10,
                        fontWeight: 600,
                        color: '#6b7280',
                        textTransform: 'uppercase',
                        letterSpacing: 1,
                        flexShrink: 0
                    }}
                >
                    Sync Parameters
                </span>
                <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Filter..."
                    style={{
                        flex: 1,
                        padding: '3px 8px',
                        background: '#111827',
                        border: '1px solid #2a2d37',
                        borderRadius: 4,
                        color: '#e5e7eb',
                        fontSize: 11,
                        outline: 'none',
                        maxWidth: 200
                    }}
                />
                <EnvironmentManager />
            </div>

            {/* Table */}
            <div style={{ flex: 1, overflow: 'auto' }}>
                {!hasSomething ? (
                    <div
                        style={{ padding: 24, textAlign: 'center', fontSize: 10, color: '#4b5563' }}
                    >
                        {search
                            ? 'No matching parameters.'
                            : 'No dynamic parameters — mark params as dynamic in the node inspector.'}
                    </div>
                ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10 }}>
                        <thead>
                            <tr>
                                <th
                                    style={{
                                        padding: '5px 8px',
                                        textAlign: 'left',
                                        fontWeight: 600,
                                        color: '#6b7280',
                                        fontSize: 9,
                                        textTransform: 'uppercase',
                                        letterSpacing: 1,
                                        minWidth: 160,
                                        background: '#1a1c28',
                                        borderBottom: '1px solid #2a2d37',
                                        borderRight: '1px solid #1e2030',
                                        position: 'sticky',
                                        top: 0
                                    }}
                                >
                                    Resource / Param
                                </th>
                                {envColumns.map((env) => (
                                    <EnvColumnHeader
                                        key={env.id}
                                        env={env}
                                        isActive={env.id === activeEnvId}
                                    />
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {/* ─ Dynamic References ─ */}
                            {dynRefGroups.length > 0 && (
                                <>
                                    <SectionHeader
                                        label="Dynamic References"
                                        count={dynRefGroups.reduce(
                                            (n, g) => n + g.entries.length,
                                            0
                                        )}
                                        collapsed={sectionsCollapsed.has('refs')}
                                        onToggle={() => toggleSection('refs')}
                                        colSpan={colSpan}
                                    />
                                    {!sectionsCollapsed.has('refs') &&
                                        dynRefGroups.map(({ node, entries }) => (
                                            <React.Fragment key={node.arn}>
                                                <NodeGroupHeader node={node} colSpan={colSpan} />
                                                {entries.map((entry) => (
                                                    <tr
                                                        key={`${node.arn}:${entry.paramKey}`}
                                                        style={{
                                                            borderBottom: '1px solid #1a1c28'
                                                        }}
                                                    >
                                                        <td
                                                            style={{
                                                                padding: '3px 8px 3px 20px',
                                                                borderRight: '1px solid #1e2030',
                                                                color: '#6b7280',
                                                                fontFamily: 'monospace',
                                                                fontSize: 10
                                                            }}
                                                        >
                                                            {entry.displayKey}
                                                        </td>
                                                        {envColumns.map((env) => (
                                                            <td
                                                                key={env.id}
                                                                style={{
                                                                    padding: '3px 8px',
                                                                    borderRight: '1px solid #1e2030'
                                                                }}
                                                            >
                                                                {entry.edgeNode ? (
                                                                    <span
                                                                        onClick={() =>
                                                                            setSelectedNodeArns([
                                                                                entry.edgeNode!.arn
                                                                            ])
                                                                        }
                                                                        title={entry.edgeNode.arn}
                                                                        style={{
                                                                            fontSize: 10,
                                                                            fontFamily: 'monospace',
                                                                            color: '#60a5fa',
                                                                            cursor: 'pointer',
                                                                            padding: '1px 5px',
                                                                            background: '#1e3a5f',
                                                                            borderRadius: 3,
                                                                            border: '1px solid #2563eb'
                                                                        }}
                                                                    >
                                                                        {entry.edgeNode.logicalId}
                                                                    </span>
                                                                ) : (
                                                                    <span
                                                                        style={{
                                                                            fontSize: 9,
                                                                            color: '#374151',
                                                                            fontFamily: 'monospace'
                                                                        }}
                                                                    >
                                                                        {entry.edgeLogicalId ?? '?'}
                                                                    </span>
                                                                )}
                                                            </td>
                                                        ))}
                                                    </tr>
                                                ))}
                                            </React.Fragment>
                                        ))}
                                </>
                            )}

                            {/* ─ Dynamic Values ─ */}
                            {dynValGroups.length > 0 && (
                                <>
                                    <SectionHeader
                                        label="Dynamic Values"
                                        count={dynValGroups.reduce(
                                            (n, g) => n + g.entries.length,
                                            0
                                        )}
                                        collapsed={sectionsCollapsed.has('vals')}
                                        onToggle={() => toggleSection('vals')}
                                        colSpan={colSpan}
                                    />
                                    {!sectionsCollapsed.has('vals') &&
                                        dynValGroups.map(({ node, entries }) => (
                                            <React.Fragment key={node.arn}>
                                                <NodeGroupHeader node={node} colSpan={colSpan} />
                                                {entries.map((entry) => {
                                                    const activeVal = getActiveEnvValue(
                                                        node,
                                                        entry.paramKey
                                                    )
                                                    return (
                                                        <tr
                                                            key={`${node.arn}:${entry.paramKey}`}
                                                            style={{
                                                                borderBottom: '1px solid #1a1c28'
                                                            }}
                                                        >
                                                            <td
                                                                style={{
                                                                    padding: '3px 8px 3px 20px',
                                                                    borderRight:
                                                                        '1px solid #1e2030',
                                                                    color: '#6b7280',
                                                                    fontFamily: 'monospace',
                                                                    fontSize: 10
                                                                }}
                                                            >
                                                                {entry.displayKey}
                                                            </td>
                                                            {envColumns.map((env) => {
                                                                const isActive =
                                                                    env.id === activeEnvId
                                                                const val = isActive
                                                                    ? activeVal
                                                                    : getMappingCellValue(
                                                                          mapping,
                                                                          env.id,
                                                                          node.logicalId,
                                                                          entry.paramKey
                                                                      )
                                                                return (
                                                                    <SyncCell
                                                                        key={env.id}
                                                                        isActive={isActive}
                                                                        value={val}
                                                                        onChange={(v) =>
                                                                            handleCellChange(
                                                                                node,
                                                                                entry.paramKey,
                                                                                env.id,
                                                                                v
                                                                            )
                                                                        }
                                                                    />
                                                                )
                                                            })}
                                                        </tr>
                                                    )
                                                })}
                                            </React.Fragment>
                                        ))}
                                </>
                            )}

                            {/* ─ Referenced Resources ─ */}
                            {refResourceNodes.length > 0 && (
                                <>
                                    <SectionHeader
                                        label="Referenced Resources"
                                        count={refResourceNodes.length}
                                        collapsed={sectionsCollapsed.has('refres')}
                                        onToggle={() => toggleSection('refres')}
                                        colSpan={colSpan}
                                    />
                                    {!sectionsCollapsed.has('refres') &&
                                        refResourceNodes.map((node) => (
                                            <tr
                                                key={node.arn}
                                                style={{ borderBottom: '1px solid #1a1c28' }}
                                            >
                                                <td
                                                    style={{
                                                        padding: '3px 8px',
                                                        borderRight: '1px solid #1e2030'
                                                    }}
                                                >
                                                    <div
                                                        style={{
                                                            color: '#9ca3af',
                                                            fontSize: 10,
                                                            fontWeight: 500
                                                        }}
                                                    >
                                                        {node.label || node.logicalId}
                                                        <span
                                                            style={{
                                                                marginLeft: 6,
                                                                fontSize: 9,
                                                                color: '#374151',
                                                                fontFamily: 'monospace'
                                                            }}
                                                        >
                                                            {node.service}
                                                        </span>
                                                    </div>
                                                    <div
                                                        style={{
                                                            fontSize: 9,
                                                            color: '#4b5563',
                                                            fontFamily: 'monospace'
                                                        }}
                                                    >
                                                        ARN
                                                    </div>
                                                </td>
                                                {envColumns.map((env) => {
                                                    const isActive = env.id === activeEnvId
                                                    const val = isActive
                                                        ? node.arn
                                                        : getMappingCellValue(
                                                              mapping,
                                                              env.id,
                                                              node.logicalId,
                                                              'arn'
                                                          )
                                                    return (
                                                        <SyncCell
                                                            key={env.id}
                                                            isActive={isActive}
                                                            value={val}
                                                            onChange={(v) =>
                                                                handleCellChange(
                                                                    node,
                                                                    'arn',
                                                                    env.id,
                                                                    v
                                                                )
                                                            }
                                                        />
                                                    )
                                                })}
                                            </tr>
                                        ))}
                                </>
                            )}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const cellStyle: React.CSSProperties = {
    padding: '3px 8px',
    fontSize: 10,
    fontFamily: 'monospace',
    maxWidth: 180,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    borderRight: '1px solid #1e2030'
}
