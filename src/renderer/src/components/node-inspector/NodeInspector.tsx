import { useEffect, useMemo, useState } from 'react'
import {
    type GraphNode,
    type ParamConfig,
    type ResourceMapping,
    useAppStore
} from '../../stores/app-store'

// ─── Sync capability registry (client-side, mirrors what syncers implement) ────

const SYNC_CAPABILITY: Record<string, 'full' | 'partial'> = {
    'lambda:function': 'full',
    'iam:role': 'full',
    'iam:policy': 'full',
    'connect:contact-flow': 'full',
    'connect:contact-flow-module': 'full',
    'connect:queue': 'full',
    'connect:routing-profile': 'full',
    'connect:hours-of-operation': 'full',
    'connect:quick-connect': 'full',
    'connect:agent-state': 'full',
    'connect:security-profile': 'partial',
    'connect:agent-hierarchy': 'partial',
    'connect:rule': 'full',
    'connect:task-template': 'full',
    'dynamodb:table': 'partial',
    's3:bucket': 'partial',
    'sqs:queue': 'full',
    'sns:topic': 'partial',
    'secretsmanager:secret': 'partial',
    'ssm:parameter': 'partial',
    'events:rule': 'full',
    'states:stateMachine': 'full',
    'kms:key': 'partial',
    'kinesis:stream': 'partial'
}

const SYNC_PARTIAL_NOTE: Record<string, string> = {
    'connect:security-profile': 'description only',
    'connect:agent-hierarchy': 'name only',
    'dynamodb:table': 'billing & throughput only (schema immutable)',
    's3:bucket': 'notification config only (name immutable)',
    'sns:topic': 'display name & KMS key only (name immutable)',
    'secretsmanager:secret': 'description & KMS key only (secret value excluded)',
    'ssm:parameter': 'value & type only (SecureString values not synced)',
    'kms:key': 'description, key policy, rotation (key material immutable)',
    'kinesis:stream': 'shard count & retention only (stream type immutable)'
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getNestedValue(obj: unknown, path: string[]): unknown {
    let current = obj
    for (const key of path) {
        if (current === null || typeof current !== 'object') return undefined
        current = (current as Record<string, unknown>)[key]
    }
    return current
}

function toLogicalId(name: string): string {
    return name
        .replace(/[^a-zA-Z0-9 _-]/g, '')
        .split(/[\s_-]+/)
        .filter(Boolean)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join('')
}

async function persistGraph(): Promise<void> {
    const { graph, activeEnvId } = useAppStore.getState()
    if (!activeEnvId) return
    const diskNodes: Record<string, GraphNode> = {}
    for (const [arn, node] of graph.nodes) {
        diskNodes[arn] = node
    }
    await window.api.graphs.save(activeEnvId, { nodes: diskNodes, edges: graph.edges })
}

async function persistMapping(): Promise<void> {
    const { mapping } = useAppStore.getState()
    await window.api.mapping.save(mapping)
}

// ─── Inclusion Controls ────────────────────────────────────────────────────────

function InclusionControls({
    node,
    onSetIncluded,
    onSetHidden
}: {
    node: GraphNode
    onSetIncluded: (v: boolean) => void
    onSetHidden: (v: boolean) => void
}) {
    const toggle = (active: boolean, onClick: () => void, onLabel: string, offLabel: string) => (
        <button
            type="button"
            onClick={onClick}
            style={{
                padding: '4px 10px',
                background: active ? '#1e3a5f' : '#16181f',
                border: `1px solid ${active ? '#3b82f6' : '#2a2d37'}`,
                borderRadius: 4,
                color: active ? '#93c5fd' : '#6b7280',
                fontSize: 10,
                cursor: 'pointer',
                fontWeight: active ? 600 : 400
            }}
        >
            {active ? onLabel : offLabel}
        </button>
    )

    return (
        <div style={{ display: 'flex', gap: 6 }}>
            {toggle(node.included, () => onSetIncluded(!node.included), '● Included', '○ Excluded')}
            {toggle(node.hidden, () => onSetHidden(!node.hidden), '◉ Hidden', '◎ Visible')}
        </div>
    )
}

// ─── Group Header ──────────────────────────────────────────────────────────────

function GroupHeader({
    label,
    count,
    isArray,
    depth,
    isExpanded,
    hasDynamic,
    onToggle
}: {
    label: string
    count: number
    isArray: boolean
    depth: number
    isExpanded: boolean
    hasDynamic: boolean
    onToggle: () => void
}) {
    return (
        <div
            onClick={onToggle}
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                padding: '2px 0',
                paddingLeft: depth * 12,
                cursor: 'pointer'
            }}
        >
            <span style={{ color: '#4b5563', fontSize: 10, flexShrink: 0 }}>
                {isExpanded ? '▾' : '▸'}
            </span>
            <span style={{ fontSize: 10, fontFamily: 'monospace', color: '#9ca3af' }}>{label}</span>
            <span style={{ fontSize: 9, color: '#374151' }}>
                {isArray ? `[${count}]` : `{${count}}`}
            </span>
            {hasDynamic && (
                <span style={{ fontSize: 10, color: '#60a5fa' }} title="contains dynamic params">
                    ⊙
                </span>
            )}
        </div>
    )
}

// ─── Param Row ─────────────────────────────────────────────────────────────────

function ParamRow({
    paramKey,
    displayKey,
    depth,
    value,
    config,
    node,
    onToggleDynamic,
    onSetEdge
}: {
    paramKey: string
    displayKey?: string
    depth?: number
    value: unknown
    config: ParamConfig | undefined
    node: GraphNode
    onToggleDynamic: (key: string, dynamic: boolean) => void
    onSetEdge: (key: string, edge: string | undefined) => void
}) {
    const { graph } = useAppStore()
    const dynamic = config?.dynamic ?? false
    const edge = config?.edge
    const label = displayKey ?? paramKey.split('.').pop() ?? paramKey
    const indent = (depth ?? 0) * 12

    const [edgePickerOpen, setEdgePickerOpen] = useState(false)
    const [edgeSearch, setEdgeSearch] = useState('')

    const allNodes = useMemo(() => Array.from(graph.nodes.values()), [graph.nodes])
    const filteredNodes = useMemo(() => {
        const term = edgeSearch.toLowerCase()
        if (!term) return allNodes
        return allNodes.filter(
            (n) => (n.label || n.logicalId).toLowerCase().includes(term) || n.service.includes(term)
        )
    }, [allNodes, edgeSearch])

    const displayValue = (() => {
        if (typeof value === 'string') {
            const decoded = value.match(/^__REF_(.+)__$/)?.[1] ?? value
            return decoded.length > 50 ? `${decoded.slice(0, 24)}…${decoded.slice(-20)}` : decoded
        }
        return String(value ?? '')
    })()

    return (
        <div style={{ marginBottom: dynamic ? 8 : 0 }}>
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '3px 0',
                    paddingLeft: indent
                }}
            >
                <button
                    type="button"
                    onClick={() => onToggleDynamic(paramKey, !dynamic)}
                    title={
                        dynamic ? 'Dynamic — varies per account' : 'Static — same in all accounts'
                    }
                    style={{
                        background: 'none',
                        border: 'none',
                        color: dynamic ? '#60a5fa' : '#374151',
                        cursor: 'pointer',
                        fontSize: 12,
                        padding: 0,
                        flexShrink: 0,
                        lineHeight: 1
                    }}
                >
                    {dynamic ? '⊙' : '○'}
                </button>
                <span
                    style={{
                        fontSize: 10,
                        color: '#6b7280',
                        fontFamily: 'monospace',
                        width: 90,
                        flexShrink: 0,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                    }}
                    title={paramKey}
                >
                    {label}
                </span>
                <span
                    style={{
                        fontSize: 10,
                        color: '#d1d5db',
                        fontFamily: 'monospace',
                        flex: 1,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                    }}
                    title={displayValue}
                >
                    {displayValue}
                </span>
                {edge ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
                        <span
                            onClick={() => setEdgePickerOpen((v) => !v)}
                            role="button"
                            style={{
                                fontSize: 9,
                                color: '#a78bfa',
                                fontFamily: 'monospace',
                                maxWidth: 72,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                cursor: 'pointer'
                            }}
                            title={edge}
                        >
                            → {edge.slice(2).split('.')[0]}
                        </span>
                        <button
                            type="button"
                            onClick={() => {
                                onSetEdge(paramKey, undefined)
                                setEdgePickerOpen(false)
                            }}
                            style={{
                                background: 'none',
                                border: 'none',
                                color: '#4b5563',
                                cursor: 'pointer',
                                fontSize: 10,
                                padding: 0,
                                lineHeight: 1
                            }}
                            title="Remove edge"
                        >
                            ×
                        </button>
                    </div>
                ) : (
                    <button
                        type="button"
                        onClick={() => setEdgePickerOpen((v) => !v)}
                        title="Link to another node"
                        style={{
                            background: 'none',
                            border: 'none',
                            color: '#374151',
                            cursor: 'pointer',
                            fontSize: 11,
                            padding: 0,
                            flexShrink: 0,
                            lineHeight: 1
                        }}
                    >
                        ↔
                    </button>
                )}
            </div>

            {edgePickerOpen && (
                <div style={{ marginLeft: indent + 18, marginBottom: 4 }}>
                    <input
                        autoFocus
                        value={edgeSearch}
                        onChange={(e) => setEdgeSearch(e.target.value)}
                        placeholder="Search nodes…"
                        style={{
                            width: '100%',
                            padding: '3px 6px',
                            background: '#0d0f16',
                            border: '1px solid #374151',
                            borderRadius: 3,
                            color: '#e5e7eb',
                            fontSize: 10,
                            outline: 'none',
                            boxSizing: 'border-box' as const
                        }}
                    />
                    <div
                        style={{
                            maxHeight: 120,
                            overflowY: 'auto',
                            border: '1px solid #2a2d37',
                            borderTop: 'none',
                            borderRadius: '0 0 3px 3px'
                        }}
                    >
                        {filteredNodes.slice(0, 30).map((n) => (
                            <div
                                key={n.arn}
                                onClick={() => {
                                    onSetEdge(paramKey, `$.${n.logicalId}.arn`)
                                    setEdgePickerOpen(false)
                                    setEdgeSearch('')
                                }}
                                style={{
                                    display: 'flex',
                                    gap: 6,
                                    padding: '3px 6px',
                                    cursor: 'pointer',
                                    borderBottom: '1px solid #1e2030',
                                    background:
                                        n.arn ===
                                        (edge
                                            ? node.referencedArns.find((a) => a === n.arn)
                                            : undefined)
                                            ? '#1e3a5f'
                                            : 'transparent'
                                }}
                            >
                                <span
                                    style={{
                                        fontSize: 10,
                                        color: '#d1d5db',
                                        flex: 1,
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap'
                                    }}
                                >
                                    {n.label || n.logicalId}
                                </span>
                                <span
                                    style={{
                                        fontSize: 9,
                                        color: '#4b5563',
                                        fontFamily: 'monospace',
                                        flexShrink: 0
                                    }}
                                >
                                    {n.service}
                                </span>
                            </div>
                        ))}
                        {filteredNodes.length === 0 && (
                            <div style={{ padding: '4px 6px', fontSize: 10, color: '#4b5563' }}>
                                No nodes found
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}

// ─── Data Tree Renderer ────────────────────────────────────────────────────────

function collectDataRows(
    data: Record<string, unknown> | unknown[],
    prefix: string,
    depth: number,
    expandedPaths: Set<string>,
    hasDynamicChild: (path: string) => boolean,
    onToggleExpand: (path: string) => void,
    node: GraphNode,
    onToggleDynamic: (key: string, dynamic: boolean) => void,
    onSetEdge: (key: string, edge: string | undefined) => void,
    results: React.ReactNode[]
): void {
    const entries: [string, unknown][] = Array.isArray(data)
        ? (data as unknown[]).map((v, i) => [String(i), v])
        : Object.entries(data as Record<string, unknown>)

    for (const [k, v] of entries) {
        if (depth === 0 && k.startsWith('_')) continue
        if (v === null || v === undefined || v === '') continue

        const path = prefix ? `${prefix}.${k}` : k

        if (typeof v === 'object' && v !== null) {
            const isEmpty = Array.isArray(v)
                ? v.length === 0
                : Object.keys(v as object).length === 0
            if (isEmpty) continue

            const isArr = Array.isArray(v)
            const count = isArr ? (v as unknown[]).length : Object.keys(v as object).length
            const isExpanded = expandedPaths.has(path)

            results.push(
                <GroupHeader
                    key={`group:${path}`}
                    label={k}
                    count={count}
                    isArray={isArr}
                    depth={depth}
                    isExpanded={isExpanded}
                    hasDynamic={hasDynamicChild(path)}
                    onToggle={() => onToggleExpand(path)}
                />
            )

            if (isExpanded) {
                collectDataRows(
                    v as Record<string, unknown>,
                    path,
                    depth + 1,
                    expandedPaths,
                    hasDynamicChild,
                    onToggleExpand,
                    node,
                    onToggleDynamic,
                    onSetEdge,
                    results
                )
            }
        } else {
            results.push(
                <ParamRow
                    key={`leaf:${path}`}
                    paramKey={path}
                    displayKey={k}
                    depth={depth}
                    value={v}
                    config={node.paramConfig?.[path]}
                    node={node}
                    onToggleDynamic={onToggleDynamic}
                    onSetEdge={onSetEdge}
                />
            )
        }
    }
}

// ─── Component ────────────────────────────────────────────────────────────────

interface NodeInspectorProps {
    arn: string
    onClose: () => void
}

export function NodeInspector({ arn, onClose }: NodeInspectorProps) {
    const {
        graph,
        updateNode,
        mapping,
        updateResourceMapping,
        removeResourceMapping,
        environments,
        activeEnvId,
        addSeedArn,
        setSelectedNodeArns
    } = useAppStore()
    const node = graph.nodes.get(arn)

    const [logicalId, setLogicalId] = useState('')
    const [logicalIdDirty, setLogicalIdDirty] = useState(false)
    const [stackId, setStackId] = useState('')
    const [stackIdDirty, setStackIdDirty] = useState(false)
    const [discoveryError, setDiscoveryError] = useState('')
    const [expandedParams, setExpandedParams] = useState<Set<string>>(new Set())

    const toggleExpandParam = (path: string) => {
        setExpandedParams((prev) => {
            const next = new Set(prev)
            if (next.has(path)) next.delete(path)
            else next.add(path)
            return next
        })
    }

    useEffect(() => {
        if (!node) return
        const id = node.logicalId || toLogicalId(node.label || node.logicalId)
        setLogicalId(id)
        setLogicalIdDirty(false)
        setStackId(node.stackId ?? '')
        setStackIdDirty(false)
        setExpandedParams(new Set())
    }, [arn])

    if (!node) {
        return <div style={{ padding: 16, fontSize: 11, color: '#6b7280' }}>Node not found.</div>
    }

    const setIncluded = async (included: boolean) => {
        const paramUpdates: Partial<GraphNode> = { included }

        if (!included && !node.paramConfig?.arn?.dynamic) {
            paramUpdates.paramConfig = {
                ...(node.paramConfig ?? {}),
                arn: { ...(node.paramConfig?.arn ?? {}), dynamic: true }
            }
            for (const env of environments) {
                const existing = mapping[env.id]?.[node.logicalId] ?? {}
                if (!('arn' in existing)) {
                    updateResourceMapping(env.id, node.logicalId, {
                        ...existing,
                        arn: node.arn
                    } as ResourceMapping)
                }
            }
            await persistMapping()
        }

        updateNode(arn, paramUpdates)
        await persistGraph()
    }

    const setHidden = async (hidden: boolean) => {
        updateNode(arn, { hidden })
        await persistGraph()
    }

    const setAllChildrenIncluded = async (included: boolean) => {
        const childArns = graph.edges
            .filter((e) => e.source === arn && e.target !== arn)
            .map((e) => e.target)
            .filter((v, i, arr) => arr.indexOf(v) === i)
        for (const childArn of childArns) {
            updateNode(childArn, { included })
        }
        await persistGraph()
    }

    const toggleParamDynamic = async (paramKey: string, dynamic: boolean) => {
        const current = node.paramConfig ?? {}
        const entry = current[paramKey]
        const updated: Record<string, ParamConfig> = {
            ...current,
            [paramKey]: { ...(entry ?? {}), dynamic }
        }
        updateNode(arn, { paramConfig: updated })

        const mappingKey = paramKey.split('.').pop() ?? paramKey
        let mappingDirty = false

        if (dynamic) {
            // Pre-populate each account's mapping with the discovered value (if not already set)
            const rawValue =
                paramKey === 'arn' ? node.arn : getNestedValue(node.data, paramKey.split('.'))
            const currentStr =
                typeof rawValue === 'string'
                    ? (rawValue.match(/^__REF_(.+)__$/)?.[1] ?? rawValue)
                    : rawValue !== undefined && rawValue !== null
                      ? String(rawValue)
                      : undefined

            if (currentStr !== undefined) {
                for (const env of environments) {
                    const existingMapping = mapping[env.id]?.[node.logicalId] ?? {}
                    if (!(mappingKey in existingMapping)) {
                        updateResourceMapping(env.id, node.logicalId, {
                            ...existingMapping,
                            [mappingKey]: currentStr
                        })
                        mappingDirty = true
                    }
                }
            }
        } else {
            for (const env of environments) {
                const existingMapping = mapping[env.id]?.[node.logicalId]
                if (!existingMapping || !(mappingKey in existingMapping)) continue
                const { [mappingKey]: _, ...rest } = existingMapping
                if (Object.keys(rest).length > 0) {
                    updateResourceMapping(env.id, node.logicalId, rest as ResourceMapping)
                } else {
                    removeResourceMapping(env.id, node.logicalId)
                }
                mappingDirty = true
            }
        }

        if (mappingDirty) await persistMapping()
        await persistGraph()
    }

    const setParamEdge = async (paramKey: string, edge: string | undefined) => {
        const current = node.paramConfig ?? {}
        const entry = current[paramKey]
        const { edge: _e, ...rest } = entry ?? {}
        const updated: Record<string, ParamConfig> = {
            ...current,
            [paramKey]: edge !== undefined ? { ...rest, edge } : rest
        }
        updateNode(arn, { paramConfig: updated })
        await persistGraph()
    }

    const discoverFromNode = async () => {
        if (!activeEnvId) {
            setDiscoveryError('Select an environment first')
            return
        }

        addSeedArn(node.arn)
        setDiscoveryError('')
        const result = await window.api.discovery.start(activeEnvId, [node.arn])
        if (!result.ok) setDiscoveryError(result.error ?? 'Failed to start discovery')
    }

    const saveLogicalId = async () => {
        const trimmed = logicalId.trim()
        if (!trimmed) return
        updateNode(arn, { logicalId: trimmed })
        setLogicalIdDirty(false)
        await persistGraph()
    }

    const saveStackId = async () => {
        updateNode(arn, { stackId: stackId.trim() || undefined })
        setStackIdDirty(false)
        await persistGraph()
    }

    const handleSaveCfnParams = async (updated: Array<Record<string, unknown>>) => {
        updateNode(arn, { data: { ...node.data, Parameters: updated } })
        await persistGraph()
    }

    const outgoing = node.referencedArns
        .map((refArn) => ({ arn: refArn, node: graph.nodes.get(refArn) }))
        .filter(({ arn: a }) => a !== node.arn)

    const incoming = graph.edges
        .filter((e) => e.target === arn && e.source !== arn)
        .map((e) => ({ arn: e.source, node: graph.nodes.get(e.source) }))

    const childArns = graph.edges
        .filter((e) => e.source === arn && e.target !== arn)
        .map((e) => e.target)
        .filter((v, i, arr) => arr.indexOf(v) === i)

    return (
        <div
            style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 0,
                height: '100%',
                overflow: 'auto'
            }}
        >
            {/* Close */}
            <div
                style={{
                    padding: '8px 12px',
                    borderBottom: '1px solid #2a2d37',
                    flexShrink: 0,
                    display: 'flex',
                    justifyContent: 'flex-end'
                }}
            >
                <button
                    onClick={onClose}
                    style={{
                        background: 'none',
                        border: 'none',
                        color: '#6b7280',
                        cursor: 'pointer',
                        fontSize: 14,
                        padding: '0 2px',
                        lineHeight: 1
                    }}
                    title="Close"
                >
                    ×
                </button>
            </div>

            {/* Header */}
            <div style={{ padding: '10px 12px', borderBottom: '1px solid #2a2d37', flexShrink: 0 }}>
                <div
                    style={{
                        fontSize: 14,
                        fontWeight: 600,
                        color: '#f1f5f9',
                        marginBottom: 3,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                    }}
                >
                    {node.label || node.logicalId}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                    <span
                        style={{
                            fontSize: 10,
                            padding: '2px 6px',
                            background: '#1e2030',
                            border: '1px solid #2a2d37',
                            borderRadius: 10,
                            color: '#9ca3af',
                            fontFamily: 'monospace'
                        }}
                    >
                        {node.service}
                    </span>
                    {node.resourceType && node.resourceType !== 'unknown' && (
                        <span style={{ fontSize: 10, color: '#4b5563' }}>
                            {node.resourceType}
                        </span>
                    )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span
                        style={{
                            fontSize: 9,
                            color: '#4b5563',
                            fontFamily: 'monospace',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            flex: 1
                        }}
                        title={node.arn}
                    >
                        {node.arn}
                    </span>
                    <button
                        onClick={() => navigator.clipboard.writeText(node.arn)}
                        title="Copy ARN"
                        style={{
                            background: 'none',
                            border: '1px solid #2a2d37',
                            color: '#6b7280',
                            borderRadius: 3,
                            fontSize: 9,
                            padding: '1px 5px',
                            cursor: 'pointer',
                            flexShrink: 0
                        }}
                    >
                        copy
                    </button>
                </div>
                <button
                    onClick={discoverFromNode}
                    style={{
                        marginTop: 8,
                        width: '100%',
                        padding: '5px 8px',
                        background: '#1e40af',
                        border: 'none',
                        borderRadius: 4,
                        color: '#dbeafe',
                        fontSize: 11,
                        cursor: 'pointer'
                    }}
                >
                    Discover from this node
                </button>
                {discoveryError && (
                    <div style={{ marginTop: 6, fontSize: 10, color: '#fca5a5' }}>
                        {discoveryError}
                    </div>
                )}
            </div>

            <div
                style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 16 }}
            >
                {/* Inclusion */}
                <section>
                    <div style={sectionLabel}>Node Status</div>
                    <InclusionControls
                        node={node}
                        onSetIncluded={setIncluded}
                        onSetHidden={setHidden}
                    />
                    {childArns.length > 0 && (
                        <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                            <button
                                type="button"
                                onClick={() => setAllChildrenIncluded(true)}
                                style={{ ...smallBtn('#1e3a5f'), fontSize: 10, padding: '3px 8px' }}
                                title="Mark all directly connected nodes as Synced"
                            >
                                Sync {childArns.length} children
                            </button>
                            <button
                                type="button"
                                onClick={() => setAllChildrenIncluded(false)}
                                style={{ ...smallBtn('#374151'), fontSize: 10, padding: '3px 8px' }}
                                title="Mark all directly connected nodes as Referenced"
                            >
                                Ref {childArns.length} children
                            </button>
                        </div>
                    )}
                    {!node.included && !node.hidden && (
                        <div style={{ fontSize: 9, color: '#9ca3af', marginTop: 6 }}>
                            Referenced — its ARN per environment can be set in the Sync table.
                        </div>
                    )}
                </section>

                {/* Sync */}
                <SyncSection node={node} />

                {/* Logical ID */}
                <section>
                    <div style={sectionLabel}>Logical ID</div>
                    <div style={{ display: 'flex', gap: 4 }}>
                        <input
                            value={logicalId}
                            onChange={(e) => {
                                setLogicalId(e.target.value)
                                setLogicalIdDirty(true)
                            }}
                            onKeyDown={(e) => e.key === 'Enter' && saveLogicalId()}
                            style={{
                                flex: 1,
                                padding: '5px 8px',
                                background: '#16181f',
                                border: `1px solid ${logicalIdDirty ? '#60a5fa' : '#2a2d37'}`,
                                borderRadius: 4,
                                color: '#e5e7eb',
                                fontSize: 11,
                                outline: 'none',
                                fontFamily: 'monospace'
                            }}
                        />
                        {logicalIdDirty && (
                            <button onClick={saveLogicalId} style={smallBtn('#1e40af')}>
                                Save
                            </button>
                        )}
                    </div>
                </section>

                {/* Stack */}
                <section>
                    <div style={sectionLabel}>Stack</div>
                    <div style={{ fontSize: 10, color: '#6b7280', marginBottom: 6 }}>
                        Nodes in the same stack are exported together. Leave blank for the default
                        stack.
                    </div>
                    <div style={{ display: 'flex', gap: 4 }}>
                        <input
                            value={stackId}
                            onChange={(e) => {
                                setStackId(e.target.value)
                                setStackIdDirty(true)
                            }}
                            onKeyDown={(e) => e.key === 'Enter' && saveStackId()}
                            placeholder="default"
                            style={{
                                flex: 1,
                                padding: '5px 8px',
                                background: '#16181f',
                                border: `1px solid ${stackIdDirty ? '#60a5fa' : '#2a2d37'}`,
                                borderRadius: 4,
                                color: '#e5e7eb',
                                fontSize: 11,
                                outline: 'none',
                                fontFamily: 'monospace'
                            }}
                        />
                        {stackIdDirty && (
                            <button onClick={saveStackId} style={smallBtn('#1e40af')}>
                                Save
                            </button>
                        )}
                    </div>
                </section>

                {/* Parameters */}
                {(() => {
                    const dynamicLeafPaths = new Set<string>(
                        Object.entries(node.paramConfig ?? {})
                            .filter(([, c]) => c.dynamic)
                            .map(([k]) => k)
                    )
                    const hasDynamicChild = (prefix: string): boolean => {
                        const prefixDot = prefix + '.'
                        for (const dp of dynamicLeafPaths) {
                            if (dp === prefix || dp.startsWith(prefixDot)) return true
                        }
                        return false
                    }
                    const rows: React.ReactNode[] = [
                        <ParamRow
                            key="leaf:arn"
                            paramKey="arn"
                            displayKey="ARN"
                            depth={0}
                            value={node.arn}
                            config={node.paramConfig?.arn}
                            node={node}
                            onToggleDynamic={toggleParamDynamic}
                            onSetEdge={setParamEdge}
                        />
                    ]
                    collectDataRows(
                        node.data,
                        '',
                        0,
                        expandedParams,
                        hasDynamicChild,
                        toggleExpandParam,
                        node,
                        toggleParamDynamic,
                        setParamEdge,
                        rows
                    )
                    return (
                        <section>
                            <div style={sectionLabel}>Parameters</div>
                            {rows.length > 0 ? (
                                rows
                            ) : (
                                <div
                                    style={{ fontSize: 10, color: '#4b5563', fontStyle: 'italic' }}
                                >
                                    No parameters.
                                </div>
                            )}
                        </section>
                    )
                })()}

                {/* CFN Parameters */}
                {node.service === 'cloudformation' && (
                    <CfnParamsSection node={node} onSave={handleSaveCfnParams} />
                )}

                {/* Relationships */}
                {(outgoing.length > 0 || incoming.length > 0) && (
                    <section>
                        <div style={sectionLabel}>Relationships</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            {incoming.map(({ arn: refArn, node: refNode }) => (
                                <RelationshipRow
                                    key={`in:${refArn}`}
                                    arn={refArn}
                                    label={refNode?.label || refArn}
                                    service={refNode?.service}
                                    direction="in"
                                    onClick={() => setSelectedNodeArns([refArn])}
                                />
                            ))}
                            {outgoing.map(({ arn: refArn, node: refNode }) => (
                                <RelationshipRow
                                    key={`out:${refArn}`}
                                    arn={refArn}
                                    label={refNode?.label || refArn}
                                    service={refNode?.service}
                                    direction="out"
                                    onClick={() => setSelectedNodeArns([refArn])}
                                />
                            ))}
                        </div>
                    </section>
                )}
            </div>
        </div>
    )
}

// ─── Sync Section ─────────────────────────────────────────────────────────────

function SyncSection({ node }: { node: GraphNode }) {
    const { environments, mapping, activeEnvId } = useAppStore()
    const key = `${node.service}:${node.resourceType}`
    const capability = SYNC_CAPABILITY[key]

    const sourceArnAccountId = node.arn.split(':')[4] ?? ''
    const sourceEnv =
        environments.find((e) => e.accountId === sourceArnAccountId) ??
        environments.find((e) => e.id === activeEnvId)

    const targets = useMemo(
        () =>
            environments
                .filter((e) => {
                    const targetArn = mapping[e.id]?.[node.logicalId]?.arn
                    return (
                        typeof targetArn === 'string' &&
                        targetArn.length > 0 &&
                        e.id !== sourceEnv?.id
                    )
                })
                .map((e) => ({
                    account: e,
                    targetArn: mapping[e.id]![node.logicalId]!.arn as string
                })),
        [environments, mapping, node.logicalId, sourceEnv]
    )

    const [pushState, setPushState] = useState<
        Record<
            string,
            {
                loading: boolean
                result: { ok: boolean; changes: string[]; skipped: string[]; error?: string } | null
            }
        >
    >({})

    const handlePush = async (targetEnvId: string, targetArn: string) => {
        if (!sourceEnv) return
        setPushState((prev) => ({ ...prev, [targetEnvId]: { loading: true, result: null } }))
        const result = await window.api.sync.push(sourceEnv.id, node.arn, targetEnvId, targetArn)
        setPushState((prev) => ({ ...prev, [targetEnvId]: { loading: false, result } }))
    }

    return (
        <section>
            <div style={sectionLabel}>
                Direct Sync
                {capability ? (
                    <span
                        style={{
                            marginLeft: 6,
                            fontSize: 9,
                            padding: '1px 5px',
                            borderRadius: 8,
                            background: capability === 'full' ? '#052e16' : '#1c1400',
                            border: `1px solid ${capability === 'full' ? '#166534' : '#92400e'}`,
                            color: capability === 'full' ? '#4ade80' : '#f59e0b',
                            fontWeight: 400,
                            textTransform: 'none',
                            letterSpacing: 0
                        }}
                    >
                        {capability === 'full' ? 'full' : 'partial'}
                    </span>
                ) : (
                    <span
                        style={{
                            marginLeft: 6,
                            fontSize: 9,
                            padding: '1px 5px',
                            borderRadius: 8,
                            background: '#1a0a00',
                            border: '1px solid #4b2020',
                            color: '#6b7280',
                            fontWeight: 400,
                            textTransform: 'none',
                            letterSpacing: 0
                        }}
                    >
                        not supported
                    </span>
                )}
            </div>

            {capability === 'partial' && SYNC_PARTIAL_NOTE[key] && (
                <div style={{ fontSize: 9, color: '#6b7280', marginBottom: 6 }}>
                    {SYNC_PARTIAL_NOTE[key]}
                </div>
            )}

            {!capability && (
                <div style={{ fontSize: 10, color: '#4b5563', fontStyle: 'italic' }}>
                    This resource type cannot be updated via direct API.
                </div>
            )}

            {capability && targets.length === 0 && (
                <div style={{ fontSize: 10, color: '#4b5563', fontStyle: 'italic' }}>
                    No target ARNs mapped. Mark ARN as dynamic in Parameters and set a target ARN
                    per environment in the Sync table.
                </div>
            )}

            {capability && !sourceEnv && (
                <div style={{ fontSize: 10, color: '#f87171', marginBottom: 6 }}>
                    Source environment not found — add the environment this resource was discovered
                    from.
                </div>
            )}

            {capability &&
                targets.map(({ account, targetArn }) => {
                    const state = pushState[account.id]
                    const result = state?.result
                    return (
                        <div key={account.id} style={{ marginBottom: 8 }}>
                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 6,
                                    marginBottom: 3
                                }}
                            >
                                <span
                                    style={{
                                        fontSize: 10,
                                        color: '#9ca3af',
                                        flex: 1,
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap'
                                    }}
                                    title={`${account.label} — ${targetArn}`}
                                >
                                    {account.label}
                                </span>
                                <button
                                    type="button"
                                    disabled={state?.loading || !sourceEnv}
                                    onClick={() => handlePush(account.id, targetArn)}
                                    style={{
                                        padding: '3px 10px',
                                        background:
                                            result?.ok === false
                                                ? '#450a0a'
                                                : result?.ok
                                                  ? '#052e16'
                                                  : '#1e3a5f',
                                        border: `1px solid ${result?.ok === false ? '#ef4444' : result?.ok ? '#22c55e' : '#3b82f6'}`,
                                        borderRadius: 4,
                                        color:
                                            result?.ok === false
                                                ? '#fca5a5'
                                                : result?.ok
                                                  ? '#4ade80'
                                                  : '#93c5fd',
                                        fontSize: 10,
                                        cursor:
                                            state?.loading || !sourceEnv
                                                ? 'not-allowed'
                                                : 'pointer',
                                        opacity: !sourceEnv ? 0.4 : 1,
                                        flexShrink: 0
                                    }}
                                >
                                    {state?.loading
                                        ? '⟳'
                                        : result?.ok === false
                                          ? '✕ Failed'
                                          : result?.ok
                                            ? '✓ Pushed'
                                            : 'Push →'}
                                </button>
                            </div>
                            <div
                                style={{
                                    fontSize: 9,
                                    color: '#374151',
                                    fontFamily: 'monospace',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap'
                                }}
                                title={targetArn}
                            >
                                → {targetArn}
                            </div>
                            {result && (
                                <div
                                    style={{
                                        marginTop: 4,
                                        padding: '4px 6px',
                                        background: result.ok ? '#0a1a0f' : '#1a0505',
                                        borderRadius: 3,
                                        fontSize: 9,
                                        color: result.ok ? '#4ade80' : '#fca5a5'
                                    }}
                                >
                                    {result.error && <div>{result.error}</div>}
                                    {result.changes.length > 0 && (
                                        <div>Updated: {result.changes.join(', ')}</div>
                                    )}
                                    {result.skipped.length > 0 && (
                                        <div style={{ color: '#6b7280' }}>
                                            Skipped: {result.skipped.join(', ')}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )
                })}
        </section>
    )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function CfnParamsSection({
    node,
    onSave
}: {
    node: GraphNode
    onSave: (updated: Array<Record<string, unknown>>) => Promise<void>
}) {
    const params =
        (node.data.Parameters as
            | Array<{ ParameterKey?: string; ParameterValue?: string }>
            | undefined) ?? []

    const [values, setValues] = useState<Record<string, string>>(() =>
        Object.fromEntries(params.map((p) => [p.ParameterKey ?? '', p.ParameterValue ?? '']))
    )

    useEffect(() => {
        setValues(
            Object.fromEntries(params.map((p) => [p.ParameterKey ?? '', p.ParameterValue ?? '']))
        )
    }, [node.arn])

    if (params.length === 0) return null

    const save = (key: string) => {
        const updated = params.map((p) =>
            p.ParameterKey === key ? { ...p, ParameterValue: values[key] ?? p.ParameterValue } : p
        )
        onSave(updated as Array<Record<string, unknown>>)
    }

    return (
        <section>
            <div style={sectionLabel}>CFN Parameters</div>
            <div
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 1,
                    background: '#0d0f16',
                    border: '1px solid #2a2d37',
                    borderRadius: 4,
                    overflow: 'hidden'
                }}
            >
                {params.map((p) => {
                    const key = p.ParameterKey ?? ''
                    const dirty = values[key] !== (p.ParameterValue ?? '')
                    return (
                        <div
                            key={key}
                            style={{
                                display: 'flex',
                                padding: '4px 8px',
                                borderBottom: '1px solid #1e2030',
                                gap: 8,
                                alignItems: 'center'
                            }}
                        >
                            <span
                                style={{
                                    fontSize: 10,
                                    color: '#6b7280',
                                    fontFamily: 'monospace',
                                    flexShrink: 0,
                                    width: 100,
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap'
                                }}
                                title={key}
                            >
                                {key}
                            </span>
                            <input
                                value={values[key] ?? ''}
                                onChange={(e) =>
                                    setValues((prev) => ({ ...prev, [key]: e.target.value }))
                                }
                                onBlur={() => dirty && save(key)}
                                onKeyDown={(e) => e.key === 'Enter' && dirty && save(key)}
                                style={{
                                    ...inputStyle,
                                    flex: 1,
                                    fontSize: 10,
                                    border: `1px solid ${dirty ? '#60a5fa' : '#2a2d37'}`
                                }}
                            />
                        </div>
                    )
                })}
            </div>
        </section>
    )
}

function RelationshipRow({
    arn,
    label,
    service,
    direction,
    onClick
}: {
    arn: string
    label: string
    service?: string
    direction: 'in' | 'out'
    onClick?: () => void
}) {
    return (
        <div
            onClick={onClick}
            role={onClick ? 'button' : undefined}
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '3px 6px',
                background: '#0d0f16',
                border: '1px solid #1e2030',
                borderRadius: 3,
                cursor: onClick ? 'pointer' : 'default'
            }}
            title={arn}
        >
            <span
                style={{
                    fontSize: 9,
                    color: direction === 'out' ? '#60a5fa' : '#a78bfa',
                    flexShrink: 0
                }}
            >
                {direction === 'out' ? '→' : '←'}
            </span>
            <span
                style={{
                    fontSize: 10,
                    color: '#d1d5db',
                    flex: 1,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                }}
            >
                {label}
            </span>
            {service && (
                <span
                    style={{
                        fontSize: 9,
                        color: '#4b5563',
                        fontFamily: 'monospace',
                        flexShrink: 0
                    }}
                >
                    {service}
                </span>
            )}
        </div>
    )
}

const sectionLabel: React.CSSProperties = {
    fontSize: 10,
    fontWeight: 600,
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 6
}

const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '4px 8px',
    background: '#16181f',
    border: '1px solid #2a2d37',
    borderRadius: 4,
    color: '#e5e7eb',
    fontSize: 11,
    outline: 'none',
    fontFamily: 'monospace',
    boxSizing: 'border-box'
}

function smallBtn(bg: string, disabled = false): React.CSSProperties {
    return {
        padding: '4px 8px',
        background: bg,
        color: '#fff',
        border: 'none',
        borderRadius: 4,
        fontSize: 10,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        flexShrink: 0
    }
}
