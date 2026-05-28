import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { EnvironmentPanel } from './components/account-panel/AccountPanel'
import {
    ForceGraphComponent,
    type ForceGraphHandle
} from './components/force-graph/ForceGraphComponent'
import { MatchPanel } from './components/match-panel/MatchPanel'
import { NodeInspector } from './components/node-inspector/NodeInspector'
import { SyncTable } from './components/sync-table/SyncTable'
import { GROUP_NODE_PREFIX } from './hooks/use-force-graph-data'
import { useGraphSync } from './hooks/use-graph-sync'
import {
    type GeneratedStubSummary,
    type GraphEdge,
    type GraphNode,
    useAppStore
} from './stores/app-store'

function getGroupNodeChildren(
    groupId: string,
    nodes: Map<string, GraphNode>,
    edges: GraphEdge[]
): string[] {
    const rest = groupId.slice(GROUP_NODE_PREFIX.length)
    const parts = rest.split(':::')
    if (parts.length < 3) return []
    const [parentArn, childService, childResourceType] = parts
    return edges
        .filter((e) => {
            if (e.source !== parentArn) return false
            const child = nodes.get(e.target)
            return child?.service === childService && child?.resourceType === childResourceType
        })
        .map((e) => e.target)
}

// ─── Tabs ──────────────────────────────────────────────────────────────────────

const tabs = [
    { key: 'accounts' as const, label: 'Accounts', icon: '◈' },
    { key: 'discovery' as const, label: 'Discover', icon: '⊕' },
    { key: 'resources' as const, label: 'Resources', icon: '◫' },
    { key: 'match' as const, label: 'Match', icon: '⇄' },
    { key: 'export' as const, label: 'Export', icon: '↗' }
] as const

// ─── Services ─────────────────────────────────────────────────────────────────

const SERVICES = [
    { key: 'lambda', label: 'Lambda', color: '#f97316' },
    { key: 'dynamodb', label: 'DynamoDB', color: '#22c55e' },
    { key: 's3', label: 'S3', color: '#eab308' },
    { key: 'iam:role', label: 'IAM Roles', color: '#a855f7' },
    { key: 'iam:policy', label: 'IAM Policies', color: '#a855f7' },
    { key: 'connect', label: 'Connect', color: '#3b82f6' },
    { key: 'connect:queues', label: 'Connect Queues', color: '#3b82f6' },
    { key: 'connect:contact-flows', label: 'Connect Flows', color: '#3b82f6' },
    { key: 'connect:routing-profiles', label: 'Connect Routing', color: '#3b82f6' },
    { key: 'connect:agent-statuses', label: 'Agent Statuses', color: '#3b82f6' },
    { key: 'connect:security-profiles', label: 'Security Profiles', color: '#3b82f6' },
    { key: 'connect:hierarchy-groups', label: 'Hierarchy Groups', color: '#3b82f6' },
    { key: 'connect:rules', label: 'Connect Rules', color: '#3b82f6' },
    { key: 'connect:task-templates', label: 'Task Templates', color: '#3b82f6' },
    { key: 'apigateway:restapis', label: 'REST APIs', color: '#06b6d4' },
    { key: 'apigateway:apis', label: 'HTTP APIs', color: '#06b6d4' },
    { key: 'cloudformation', label: 'CloudFormation', color: '#f43f5e' },
    { key: 'sqs', label: 'SQS', color: '#f59e0b' },
    { key: 'sns', label: 'SNS', color: '#10b981' },
    { key: 'secretsmanager', label: 'Secrets Manager', color: '#ec4899' },
    { key: 'ssm', label: 'SSM Parameters', color: '#64748b' },
    { key: 'eventbridge', label: 'EventBridge', color: '#8b5cf6' },
    { key: 'stepfunctions', label: 'Step Functions', color: '#0ea5e9' },
    { key: 'kms', label: 'KMS Keys', color: '#ef4444' },
    { key: 'kinesis', label: 'Kinesis Streams', color: '#06b6d4' },
    { key: 'cloudfront', label: 'CloudFront', color: '#f97316' }
] as const

const MAX_DISCOVERY_DEPTH = [
    { value: 1, label: '1 hop — seed + immediate refs' },
    { value: 2, label: '2 hops — recommended for Connect' },
    { value: 3, label: '3 hops — full traversal' }
] as const

const ALL_REGIONS = [
    'us-east-1',
    'us-east-2',
    'us-west-1',
    'us-west-2',
    'ca-central-1',
    'sa-east-1',
    'eu-west-1',
    'eu-west-2',
    'eu-west-3',
    'eu-central-1',
    'eu-north-1',
    'eu-south-1',
    'ap-southeast-1',
    'ap-southeast-2',
    'ap-northeast-1',
    'ap-northeast-2',
    'ap-northeast-3',
    'ap-south-1',
    'ap-east-1',
    'me-south-1',
    'af-south-1'
] as const

const EXCLUDE_TYPES = [
    { value: 'cloudwatch', label: 'CloudWatch' },
    { value: 'iam', label: 'IAM' },
    { value: 'security-profile', label: 'Security profiles' },
    { value: 'agent-status', label: 'Agent statuses' },
    { value: 'agent-state', label: 'Agent statuses (state)' },
    { value: 'queue', label: 'Queues' },
    { value: 'contact-flow', label: 'Contact flows' },
    { value: 'routing-profile', label: 'Routing profiles' },
    { value: 'quick-connect', label: 'Quick connects' },
    { value: 'hours-of-operation', label: 'Hours of operation' },
    { value: 'agent-hierarchy', label: 'Hierarchy groups' },
    { value: 'rule', label: 'Connect rules' },
    { value: 'task-template', label: 'Task templates' }
] as const

type ServiceKey = (typeof SERVICES)[number]['key']

interface ServiceResource {
    arn: string
    name: string
    type?: string
}

// ─── Stub Summary ─────────────────────────────────────────────────────────────

function StubSummary({ stubs }: { stubs: GeneratedStubSummary[] }) {
    const [open, setOpen] = useState(true)

    return (
        <div
            style={{
                marginTop: 8,
                border: '1px solid #2a2d37',
                borderRadius: 4,
                overflow: 'hidden'
            }}
        >
            <div
                onClick={() => setOpen((v) => !v)}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '6px 8px',
                    background: '#111827',
                    cursor: 'pointer',
                    userSelect: 'none'
                }}
            >
                <span style={{ fontSize: 8, color: '#f97316' }}>{open ? '▼' : '▶'}</span>
                <span style={{ fontSize: 10, fontWeight: 600, color: '#f97316', flex: 1 }}>
                    {stubs.length} resolver stub{stubs.length !== 1 ? 's' : ''} generated
                </span>
                <button
                    onClick={(e) => {
                        e.stopPropagation()
                        window.location.reload()
                    }}
                    style={{
                        padding: '2px 8px',
                        background: '#1e3a5f',
                        border: '1px solid #3b82f6',
                        color: '#60a5fa',
                        borderRadius: 3,
                        fontSize: 9,
                        cursor: 'pointer'
                    }}
                >
                    Reload App
                </button>
            </div>
            {open && (
                <div style={{ background: '#0d1117' }}>
                    {stubs.map((stub, i) => (
                        <div
                            key={i}
                            style={{
                                padding: '4px 8px',
                                borderTop: '1px solid #1e2030',
                                fontSize: 9,
                                fontFamily: 'monospace'
                            }}
                        >
                            <div
                                style={{
                                    color: stub.probeSucceeded ? '#86efac' : '#d1d5db',
                                    marginBottom: 2
                                }}
                            >
                                {stub.cfnType}
                                {stub.probeSucceeded ? ' ✓' : ''}
                            </div>
                            {stub.resolverFile && (
                                <div style={{ color: '#4b5563' }}>
                                    resolver:{' '}
                                    {stub.resolverFile.split('/src/')[1] ?? stub.resolverFile}
                                </div>
                            )}
                            {stub.syncerFile && (
                                <div style={{ color: '#4b5563' }}>
                                    syncer: {stub.syncerFile.split('/src/')[1] ?? stub.syncerFile}
                                    {' — add '}
                                    <span style={{ color: '#60a5fa' }}>
                                        {`import './${stub.syncerFile.split('/').pop()?.replace('.ts', '')}'`}
                                    </span>
                                    {' to sync/index.ts'}
                                </div>
                            )}
                            {stub.error && <div style={{ color: '#f87171' }}>⚠ {stub.error}</div>}
                        </div>
                    ))}
                    <div
                        style={{
                            padding: '6px 8px',
                            borderTop: '1px solid #1e2030',
                            fontSize: 9,
                            color: '#374151'
                        }}
                    >
                        Resolver stubs auto-load on reload. Add the syncer import to
                        src/main/sync/index.ts manually.
                    </div>
                </div>
            )}
        </div>
    )
}

// ─── Discovery Panel ──────────────────────────────────────────────────────────

function DiscoveryPanel() {
    const {
        activeEnvId,
        environments,
        discoveryProgresses,
        setDiscoveryProgress,
        seedArns,
        setSeedArns,
        removeSeedArn
    } = useAppStore()

    const [manualInput, setManualInput] = useState('')
    const [error, setError] = useState('')

    const [browsingService, setBrowsingService] = useState<ServiceKey | null>(null)
    const [serviceItems, setServiceItems] = useState<ServiceResource[]>([])
    const [loadingBrowse, setLoadingBrowse] = useState(false)
    const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
    const [browseFilter, setBrowseFilter] = useState('')
    const [maxDepth, setMaxDepth] = useState(2)
    const [excludedTypes, setExcludedTypes] = useState<Set<string>>(new Set(['cloudwatch', 'iam']))
    const [excludeTypesInput, setExcludeTypesInput] = useState('')
    const [selectedEnvIds, setSelectedEnvIds] = useState<Set<string>>(new Set())

    const activeEnvironment = environments.find((e) => e.id === activeEnvId)

    // Browse targeting — which environment(s) to list from
    const [browseEnvId, setBrowseEnvId] = useState<string>('')
    useEffect(() => {
        if (activeEnvId && browseEnvId !== activeEnvId) {
            setBrowseEnvId(activeEnvId)
        }
    }, [activeEnvId])

    const browseEnvironment = environments.find((e) => e.id === browseEnvId)
    const defaultRegion = browseEnvironment?.region ?? 'us-west-2'
    const [browseRegion, setBrowseRegion] = useState('us-west-2')

    // Default browse region to env's primary when target env changes
    useEffect(() => {
        if (defaultRegion && defaultRegion !== browseRegion) {
            setBrowseRegion(defaultRegion)
        }
    }, [browseEnvId, defaultRegion])

    const progress = discoveryProgresses[activeEnvId ?? ''] ?? {
        phase: 'idle',
        resolved: 0,
        total: 0
    }
    const isRunning = progress.phase === 'running'

    const toggleExcludedType = (type: string) => {
        setExcludedTypes((prev) => {
            const next = new Set(prev)
            if (next.has(type)) next.delete(type)
            else next.add(type)
            return next
        })
    }

    const browseService = async (serviceKey: ServiceKey, region?: string, targetEnvId?: string) => {
        if (!targetEnvId && targetEnvId !== '') {
            setError('Select an environment first')
            return
        }
        setBrowsingService(serviceKey)
        setServiceItems([])
        setLoadingBrowse(true)
        setSelectedItems(new Set())
        setBrowseFilter('')
        setError('')
        try {
            const all = targetEnvId === '__all__'
            if (all) {
                const results = await Promise.allSettled(
                    environments.map((env) => window.api.discovery.listService(env.id, serviceKey))
                )
                const items: ServiceResource[] = []
                for (const r of results) {
                    if (r.status === 'fulfilled') items.push(...r.value)
                }
                setServiceItems(items)
            } else {
                const items = await window.api.discovery.listService(
                    targetEnvId!,
                    serviceKey,
                    region || undefined
                )
                setServiceItems(items)
            }
        } catch (e) {
            setError(e instanceof Error ? e.message : String(e))
            setBrowsingService(null)
        } finally {
            setLoadingBrowse(false)
        }
    }

    const closeBrowse = () => {
        setBrowsingService(null)
        setServiceItems([])
        setSelectedItems(new Set())
        setBrowseFilter('')
    }

    const filteredServiceItems = useMemo(() => {
        const term = browseFilter.trim().toLowerCase()
        if (!term) return serviceItems
        return serviceItems.filter(
            (item) =>
                item.name.toLowerCase().includes(term) || item.arn.toLowerCase().includes(term)
        )
    }, [browseFilter, serviceItems])

    const toggleItem = (arn: string) => {
        setSelectedItems((prev) => {
            const next = new Set(prev)
            next.has(arn) ? next.delete(arn) : next.add(arn)
            return next
        })
    }

    const addSelectedToSeeds = () => {
        const toAdd = serviceItems
            .filter((r) => selectedItems.has(r.arn) && !seedArns.includes(r.arn))
            .map((r) => r.arn)
        if (toAdd.length > 0) setSeedArns([...seedArns, ...toAdd])
        closeBrowse()
    }

    const addManualSeed = () => {
        const trimmed = manualInput.trim()
        if (!trimmed) return
        if (!trimmed.startsWith('arn:') && trimmed.includes(' ')) {
            setError(
                'Use an ARN, S3 bucket name, DynamoDB table name, or a prefixed value like s3:bucket-name'
            )
            return
        }
        if (seedArns.includes(trimmed)) return
        setSeedArns([...seedArns, trimmed])
        setManualInput('')
        setError('')
    }

    const removeSeed = (arn: string) => removeSeedArn(arn)

    const handleStart = async () => {
        if (!activeEnvId) {
            setError('Select an environment first')
            return
        }
        if (seedArns.length === 0) {
            setError('Add at least one seed')
            return
        }
        setError('')

        const customExcludeTypes = excludeTypesInput
            .split(',')
            .map((value) => value.trim().toLowerCase())
            .filter(Boolean)

        const excludeResourceTypes = Array.from(
            new Set([...Array.from(excludedTypes), ...customExcludeTypes])
        )

        const result = await window.api.discovery.start(
            activeEnvId,
            seedArns,
            excludeResourceTypes,
            maxDepth
        )
        if (!result.ok) setError(result.error ?? 'Failed to start')
    }

    const handleStartAll = async () => {
        const envIds =
            selectedEnvIds.size > 0 ? Array.from(selectedEnvIds) : environments.map((e) => e.id)
        if (envIds.length === 0) {
            setError('No environments to discover')
            return
        }
        if (seedArns.length === 0) {
            setError('Add at least one seed')
            return
        }
        setError('')

        const customExcludeTypes = excludeTypesInput
            .split(',')
            .map((value) => value.trim().toLowerCase())
            .filter(Boolean)

        const excludeResourceTypes = Array.from(
            new Set([...Array.from(excludedTypes), ...customExcludeTypes])
        )

        for (const envId of envIds) {
            setDiscoveryProgress(envId, { phase: 'running', resolved: 0, total: 0 })
        }

        const result = await window.api.discovery.startAll(
            envIds,
            seedArns,
            excludeResourceTypes,
            maxDepth
        )
        if (!result.ok) setError(result.error ?? 'Failed to start discovery')
    }

    const handleCancel = () => window.api.discovery.cancel()

    const progressPct =
        progress.total > 0 ? Math.round((progress.resolved / progress.total) * 100) : 0
    const selectedCount = selectedItems.size
    const activeSvc = SERVICES.find((s) => s.key === browsingService)

    return (
        <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {/* Account context */}
            <div
                style={{
                    padding: 8,
                    background: activeEnvironment ? '#0d1f12' : '#1c1917',
                    border: `1px solid ${activeEnvironment ? '#166534' : '#44403c'}`,
                    borderRadius: 4,
                    fontSize: 11
                }}
            >
                {activeEnvironment ? (
                    <>
                        <span style={{ color: '#4ade80' }}>◉ </span>
                        <span style={{ color: '#d1fae5', fontWeight: 600 }}>
                            {activeEnvironment.label}
                        </span>
                        <span style={{ color: '#6b7280' }}>
                            {' '}
                            · {activeEnvironment.profileName ?? 'default'}
                        </span>
                    </>
                ) : (
                    <span style={{ color: '#a8a29e' }}>
                        No environment selected — add one from the Sync Parameters table
                    </span>
                )}
            </div>

            {/* ── Service Browser ───────────────────────────────────────────────── */}
            {browsingService === null ? (
                <div>
                    <div
                        style={{
                            fontSize: 10,
                            fontWeight: 600,
                            color: '#6b7280',
                            textTransform: 'uppercase',
                            letterSpacing: 1,
                            marginBottom: 6,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8
                        }}
                    >
                        <span>Browse Resources</span>
                        <div
                            style={{
                                marginLeft: 'auto',
                                display: 'flex',
                                gap: 4,
                                alignItems: 'center'
                            }}
                        >
                            {environments.length > 0 && (
                                <select
                                    value={browseEnvId}
                                    onChange={(e) => setBrowseEnvId(e.target.value)}
                                    style={{
                                        padding: '2px 4px',
                                        background: '#16181f',
                                        border: '1px solid #2a2d37',
                                        borderRadius: 3,
                                        color: '#9ca3af',
                                        fontSize: 9,
                                        outline: 'none'
                                    }}
                                >
                                    {environments.map((env) => (
                                        <option key={env.id} value={env.id}>
                                            {env.label}
                                        </option>
                                    ))}
                                    {environments.length > 1 && (
                                        <option value="__all__">All environments</option>
                                    )}
                                </select>
                            )}
                            {browseEnvironment && (
                                <select
                                    value={browseRegion}
                                    onChange={(e) => setBrowseRegion(e.target.value)}
                                    style={{
                                        padding: '2px 4px',
                                        background: '#16181f',
                                        border: '1px solid #2a2d37',
                                        borderRadius: 3,
                                        color: '#9ca3af',
                                        fontSize: 9,
                                        outline: 'none'
                                    }}
                                >
                                    {ALL_REGIONS.map((r) => (
                                        <option key={r} value={r}>
                                            {r}
                                        </option>
                                    ))}
                                </select>
                            )}
                        </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
                        {SERVICES.map((svc) => (
                            <button
                                key={svc.key}
                                onClick={() =>
                                    browseService(
                                        svc.key,
                                        browseRegion,
                                        browseEnvId === '__all__' ? '__all__' : browseEnvId
                                    )
                                }
                                disabled={!browseEnvId || isRunning}
                                style={{
                                    padding: '6px 8px',
                                    background: '#1a1c24',
                                    border: '1px solid #2a2d37',
                                    borderLeft: `3px solid ${svc.color}`,
                                    borderRadius: 3,
                                    color: '#d1d5db',
                                    fontSize: 11,
                                    fontWeight: 500,
                                    textAlign: 'left',
                                    cursor: !activeEnvId || isRunning ? 'not-allowed' : 'pointer',
                                    opacity: !activeEnvId || isRunning ? 0.4 : 1
                                }}
                            >
                                {svc.label}
                            </button>
                        ))}
                    </div>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {/* Browse header */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <button
                            onClick={closeBrowse}
                            style={{
                                background: 'none',
                                border: 'none',
                                color: '#60a5fa',
                                cursor: 'pointer',
                                fontSize: 11,
                                padding: 0
                            }}
                        >
                            ← Back
                        </button>
                        <span style={{ fontSize: 11, fontWeight: 600, color: '#d1d5db', flex: 1 }}>
                            {activeSvc?.label}
                        </span>
                        {browseEnvId !== '__all__' && browseEnvironment && (
                            <select
                                value={browseRegion}
                                onChange={(e) =>
                                    browseService(browsingService!, e.target.value, browseEnvId)
                                }
                                style={{
                                    padding: '2px 4px',
                                    background: '#16181f',
                                    border: '1px solid #2a2d37',
                                    borderRadius: 3,
                                    color: '#9ca3af',
                                    fontSize: 9,
                                    outline: 'none'
                                }}
                            >
                                {ALL_REGIONS.map((r) => (
                                    <option key={r} value={r}>
                                        {r}
                                    </option>
                                ))}
                            </select>
                        )}
                        {environments.length > 0 && (
                            <select
                                value={browseEnvId}
                                onChange={(e) => setBrowseEnvId(e.target.value)}
                                style={{
                                    padding: '2px 4px',
                                    background: '#16181f',
                                    border: '1px solid #2a2d37',
                                    borderRadius: 3,
                                    color: '#9ca3af',
                                    fontSize: 9,
                                    outline: 'none'
                                }}
                            >
                                {environments.map((env) => (
                                    <option key={env.id} value={env.id}>
                                        {env.label}
                                    </option>
                                ))}
                                {environments.length > 1 && (
                                    <option value="__all__">All environments</option>
                                )}
                            </select>
                        )}
                        {serviceItems.length > 0 && (
                            <span style={{ fontSize: 10, color: '#6b7280' }}>
                                {selectedCount}/{serviceItems.length}
                            </span>
                        )}
                    </div>

                    {loadingBrowse ? (
                        <div
                            style={{
                                padding: 16,
                                textAlign: 'center',
                                fontSize: 11,
                                color: '#6b7280'
                            }}
                        >
                            Loading…
                        </div>
                    ) : serviceItems.length === 0 ? (
                        <div
                            style={{
                                padding: 16,
                                textAlign: 'center',
                                fontSize: 11,
                                color: '#6b7280'
                            }}
                        >
                            No resources found
                        </div>
                    ) : (
                        <>
                            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                                <button
                                    onClick={() =>
                                        setSelectedItems(
                                            new Set(filteredServiceItems.map((r) => r.arn))
                                        )
                                    }
                                    style={miniBtn}
                                >
                                    All
                                </button>
                                <button onClick={() => setSelectedItems(new Set())} style={miniBtn}>
                                    None
                                </button>
                                <input
                                    value={browseFilter}
                                    onChange={(e) => setBrowseFilter(e.target.value)}
                                    placeholder="Filter resources..."
                                    style={{
                                        flex: '1 1 120px',
                                        padding: '4px 8px',
                                        borderRadius: 4,
                                        border: '1px solid #2a2d37',
                                        background: '#111827',
                                        color: '#e5e7eb',
                                        fontSize: 11
                                    }}
                                />
                            </div>

                            <div
                                style={{
                                    maxHeight: 220,
                                    overflowY: 'auto',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: 1
                                }}
                            >
                                {filteredServiceItems.length === 0 ? (
                                    <div
                                        style={{
                                            padding: 16,
                                            textAlign: 'center',
                                            fontSize: 11,
                                            color: '#6b7280'
                                        }}
                                    >
                                        No matching resources
                                    </div>
                                ) : (
                                    filteredServiceItems.map((item) => {
                                        const checked = selectedItems.has(item.arn)
                                        return (
                                            <div
                                                key={item.arn}
                                                onClick={() => toggleItem(item.arn)}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'flex-start',
                                                    gap: 6,
                                                    padding: '4px 6px',
                                                    borderRadius: 3,
                                                    cursor: 'pointer',
                                                    background: checked ? '#1e3a5f' : 'transparent',
                                                    border: `1px solid ${checked ? '#3b82f6' : 'transparent'}`
                                                }}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={checked}
                                                    onChange={() => toggleItem(item.arn)}
                                                    onClick={(e) => e.stopPropagation()}
                                                    style={{
                                                        marginTop: 2,
                                                        cursor: 'pointer',
                                                        flexShrink: 0
                                                    }}
                                                />
                                                <div style={{ minWidth: 0 }}>
                                                    <div
                                                        style={{
                                                            fontSize: 11,
                                                            color: '#e5e7eb',
                                                            fontWeight: 500,
                                                            overflow: 'hidden',
                                                            textOverflow: 'ellipsis',
                                                            whiteSpace: 'nowrap'
                                                        }}
                                                    >
                                                        {item.name}
                                                    </div>
                                                    <div
                                                        style={{
                                                            fontSize: 9,
                                                            color: '#4b5563',
                                                            fontFamily: 'monospace',
                                                            overflow: 'hidden',
                                                            textOverflow: 'ellipsis',
                                                            whiteSpace: 'nowrap'
                                                        }}
                                                    >
                                                        {item.arn}
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    })
                                )}
                            </div>

                            <button
                                onClick={addSelectedToSeeds}
                                disabled={selectedCount === 0}
                                style={{
                                    ...btnStyle('#2563eb', selectedCount === 0),
                                    width: '100%'
                                }}
                            >
                                {selectedCount > 0
                                    ? `Add ${selectedCount} to Seeds`
                                    : 'Add to Seeds'}
                            </button>
                        </>
                    )}
                </div>
            )}

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

            {/* ── Seeds ─────────────────────────────────────────────────────────── */}
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
                    Seeds{seedArns.length > 0 ? ` (${seedArns.length})` : ''}
                </div>

                {/* Manual input */}
                <div style={{ display: 'flex', gap: 4 }}>
                    <input
                        value={manualInput}
                        onChange={(e) => setManualInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && addManualSeed()}
                        placeholder="arn:aws:lambda:us-east-1:123…"
                        disabled={isRunning}
                        style={inputStyle}
                    />
                    <button
                        onClick={addManualSeed}
                        disabled={isRunning || !manualInput.trim()}
                        style={btnStyle('#374151', isRunning || !manualInput.trim())}
                    >
                        +
                    </button>
                </div>

                {seedArns.map((arn) => (
                    <div
                        key={arn}
                        style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '4px 8px',
                            background: '#16181f',
                            border: '1px solid #2a2d37',
                            borderRadius: 3,
                            fontSize: 10,
                            fontFamily: 'monospace',
                            color: '#9ca3af'
                        }}
                    >
                        <span
                            style={{
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                            }}
                        >
                            {arn}
                        </span>
                        <button
                            onClick={() => removeSeed(arn)}
                            disabled={isRunning}
                            style={{
                                background: 'none',
                                border: 'none',
                                color: '#6b7280',
                                cursor: 'pointer',
                                flexShrink: 0,
                                padding: '0 2px'
                            }}
                        >
                            ×
                        </button>
                    </div>
                ))}
            </div>

            <div
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                    padding: 10,
                    border: '1px solid #2a2d37',
                    borderRadius: 6,
                    background: '#111827'
                }}
            >
                <div
                    style={{
                        fontSize: 10,
                        fontWeight: 600,
                        color: '#6b7280',
                        textTransform: 'uppercase',
                        letterSpacing: 1
                    }}
                >
                    Discovery scope
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {MAX_DISCOVERY_DEPTH.map((option) => (
                        <button
                            key={option.value}
                            onClick={() => setMaxDepth(option.value)}
                            disabled={isRunning}
                            style={{
                                padding: '6px 10px',
                                borderRadius: 4,
                                border: `1px solid ${maxDepth === option.value ? '#3b82f6' : '#2a2d37'}`,
                                background: maxDepth === option.value ? '#1f3d7d' : '#111827',
                                color: maxDepth === option.value ? '#93c5fd' : '#cbd5e1',
                                cursor: isRunning ? 'not-allowed' : 'pointer',
                                fontSize: 11,
                                whiteSpace: 'nowrap'
                            }}
                        >
                            {option.label}
                        </button>
                    ))}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <div style={{ fontSize: 10, color: '#6b7280' }}>
                        Skip types — highlighted types are fetched as empty placeholders (no data,
                        excluded from CDK export). All other types are discovered and marked{' '}
                        <strong style={{ color: '#86efac' }}>Synced</strong> by default; you can
                        change individual nodes to Referenced in the graph.
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {EXCLUDE_TYPES.map((type) => {
                            const selected = excludedTypes.has(type.value)
                            return (
                                <button
                                    key={type.value}
                                    onClick={() => toggleExcludedType(type.value)}
                                    disabled={isRunning}
                                    style={{
                                        padding: '5px 10px',
                                        borderRadius: 4,
                                        border: `1px solid ${selected ? '#2563eb' : '#2a2d37'}`,
                                        background: selected ? '#1e3a5f' : '#111827',
                                        color: selected ? '#93c5fd' : '#6b7280',
                                        cursor: isRunning ? 'not-allowed' : 'pointer',
                                        fontSize: 11
                                    }}
                                >
                                    {type.label}
                                </button>
                            )
                        })}
                    </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <label style={{ fontSize: 10, color: '#9ca3af', display: 'block' }}>
                        Additional skip types
                    </label>
                    <input
                        value={excludeTypesInput}
                        onChange={(e) => setExcludeTypesInput(e.target.value)}
                        placeholder="security-profile, agent-status, queue"
                        disabled={isRunning}
                        style={{
                            padding: '8px 10px',
                            borderRadius: 6,
                            border: '1px solid #2a2d37',
                            background: '#111827',
                            color: '#e5e7eb',
                            fontSize: 11
                        }}
                    />
                </div>
            </div>

            {/* Start / Cancel */}
            {isRunning ? (
                <button onClick={handleCancel} style={{ ...btnStyle('#7f1d1d'), width: '100%' }}>
                    ✕ Cancel
                </button>
            ) : (
                <button
                    onClick={handleStart}
                    disabled={!activeEnvId || seedArns.length === 0}
                    style={{
                        ...btnStyle('#2563eb', !activeEnvId || seedArns.length === 0),
                        width: '100%'
                    }}
                >
                    ▶ Start Discovery
                </button>
            )}

            {/* Multi-environment discovery */}
            {environments.length > 1 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div
                        style={{
                            fontSize: 10,
                            fontWeight: 500,
                            color: '#9ca3af',
                            textTransform: 'uppercase',
                            letterSpacing: 0.5
                        }}
                    >
                        Multi-environment
                    </div>

                    <div
                        style={{
                            maxHeight: 120,
                            overflowY: 'auto',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 2
                        }}
                    >
                        {environments.map((env) => {
                            const checked = selectedEnvIds.has(env.id)
                            return (
                                <label
                                    key={env.id}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 6,
                                        padding: '3px 6px',
                                        borderRadius: 3,
                                        cursor: 'pointer',
                                        fontSize: 11,
                                        color: '#d1d5db'
                                    }}
                                >
                                    <input
                                        type="checkbox"
                                        checked={checked}
                                        onChange={(e) => {
                                            const next = new Set(selectedEnvIds)
                                            if (e.target.checked) next.add(env.id)
                                            else next.delete(env.id)
                                            setSelectedEnvIds(next)
                                        }}
                                        style={{ accentColor: '#3b82f6' }}
                                    />
                                    <span style={{ flex: 1 }}>{env.label}</span>
                                    {env.accountId && (
                                        <span
                                            style={{
                                                fontSize: 9,
                                                color: '#6b7280',
                                                fontFamily: 'monospace'
                                            }}
                                        >
                                            {env.accountId}
                                        </span>
                                    )}
                                </label>
                            )
                        })}
                    </div>

                    <button
                        onClick={handleStartAll}
                        disabled={seedArns.length === 0}
                        style={{
                            ...btnStyle('#4338ca', seedArns.length === 0),
                            width: '100%'
                        }}
                    >
                        ▶ Discover All ({selectedEnvIds.size || environments.length})
                    </button>
                </div>
            )}

            {/* Progress */}
            {progress.phase !== 'idle' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div
                        style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            fontSize: 10,
                            color: '#9ca3af'
                        }}
                    >
                        <span>
                            {progress.phase === 'running' && '⟳ Running'}
                            {progress.phase === 'complete' && '✓ Complete'}
                            {progress.phase === 'error' && '✕ Error'}
                        </span>
                        <span>
                            {progress.resolved} / {progress.total}
                        </span>
                    </div>

                    <div
                        style={{
                            height: 4,
                            background: '#1e2030',
                            borderRadius: 2,
                            overflow: 'hidden'
                        }}
                    >
                        <div
                            style={{
                                height: '100%',
                                width: `${progressPct}%`,
                                background: progress.phase === 'error' ? '#ef4444' : '#3b82f6',
                                borderRadius: 2,
                                transition: 'width 0.2s ease'
                            }}
                        />
                    </div>

                    {progress.currentArn && (
                        <div
                            style={{
                                fontSize: 9,
                                color: '#4b5563',
                                fontFamily: 'monospace',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                            }}
                        >
                            {progress.currentArn}
                        </div>
                    )}

                    {progress.phase === 'error' && progress.error && (
                        <div style={{ fontSize: 10, color: '#f87171' }}>{progress.error}</div>
                    )}
                    {progress.phase === 'complete' &&
                        progress.generatedStubs &&
                        progress.generatedStubs.length > 0 && (
                            <StubSummary stubs={progress.generatedStubs} />
                        )}
                </div>
            )}

            {/* Per-environment progress */}
            {Object.keys(discoveryProgresses).filter(
                (id) => discoveryProgresses[id].phase !== 'idle'
            ).length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div
                        style={{
                            fontSize: 10,
                            fontWeight: 500,
                            color: '#9ca3af',
                            textTransform: 'uppercase',
                            letterSpacing: 0.5
                        }}
                    >
                        All Environments
                    </div>

                    {Object.entries(discoveryProgresses)
                        .filter(([, p]) => p.phase !== 'idle')
                        .map(([envId, envProgress]) => {
                            const env = environments.find((e) => e.id === envId)
                            const pct =
                                envProgress.total > 0
                                    ? (envProgress.resolved / envProgress.total) * 100
                                    : 0
                            return (
                                <div
                                    key={envId}
                                    style={{ display: 'flex', flexDirection: 'column', gap: 3 }}
                                >
                                    <div
                                        style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            fontSize: 10,
                                            color: '#9ca3af'
                                        }}
                                    >
                                        <span>{env?.label ?? envId}</span>
                                        <span>
                                            {envProgress.phase === 'running' && '⟳'}
                                            {envProgress.phase === 'complete' && '✓'}
                                            {envProgress.phase === 'error' && '✕'}{' '}
                                            {envProgress.resolved} / {envProgress.total}
                                        </span>
                                    </div>

                                    <div
                                        style={{
                                            height: 3,
                                            background: '#1e2030',
                                            borderRadius: 2,
                                            overflow: 'hidden'
                                        }}
                                    >
                                        <div
                                            style={{
                                                height: '100%',
                                                width: `${pct}%`,
                                                background:
                                                    envProgress.phase === 'error'
                                                        ? '#ef4444'
                                                        : '#3b82f6',
                                                borderRadius: 2,
                                                transition: 'width 0.2s ease'
                                            }}
                                        />
                                    </div>

                                    {envProgress.currentArn && (
                                        <div
                                            style={{
                                                fontSize: 9,
                                                color: '#4b5563',
                                                fontFamily: 'monospace',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                whiteSpace: 'nowrap'
                                            }}
                                        >
                                            {envProgress.currentArn}
                                        </div>
                                    )}

                                    {envProgress.phase === 'error' && envProgress.error && (
                                        <div style={{ fontSize: 10, color: '#f87171' }}>
                                            {envProgress.error}
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                </div>
            )}
        </div>
    )
}

// ─── Export Panel ─────────────────────────────────────────────────────────────

function ExportPanel() {
    const { graph, mapping, activeEnvId } = useAppStore()
    const [stackName, setStackName] = useState('MyStack')
    const [outputDir, setOutputDir] = useState('')
    const [exporting, setExporting] = useState(false)
    const [result, setResult] = useState<{
        ok: boolean
        error?: string
        artifactErrors?: Array<{ id: string; error: string }>
    } | null>(null)
    const [validating, setValidating] = useState(false)
    const [validateResult, setValidateResult] = useState<{ ok: boolean; output: string } | null>(
        null
    )

    // Graph JSON export
    const [graphExporting, setGraphExporting] = useState(false)
    const [graphExportResult, setGraphExportResult] = useState<{
        ok: boolean
        path?: string
        error?: string
    } | null>(null)

    const nodes = useMemo(() => Array.from(graph.nodes.values()), [graph.nodes])
    const synced = nodes.filter((n) => n.included && n.discoveryState === 'resolved')
    const referenced = nodes.filter((n) => !n.included && !n.hidden)
    const missingTargetArn = referenced.filter(
        (n) => !Object.values(mapping).some((acct) => acct[n.logicalId]?.arn)
    )
    const canExport = stackName.trim() && outputDir && (synced.length > 0 || referenced.length > 0)
    const canValidate = !!(result?.ok && outputDir)

    const pickFolder = async () => {
        const dir = await window.api.dialog.openFolder()
        if (dir) {
            setOutputDir(dir)
            setResult(null)
            setValidateResult(null)
        }
    }

    const handleValidate = async () => {
        if (!canValidate) return
        setValidating(true)
        setValidateResult(null)
        const res = await window.api.exports.validate(outputDir)
        setValidateResult(res)
        setValidating(false)
    }

    const handleExport = async () => {
        if (!canExport) return
        setExporting(true)
        setResult(null)
        const res = await window.api.exports.cdk(outputDir, stackName.trim(), activeEnvId ?? '')
        setResult(res)
        setExporting(false)
    }

    const handleExportGraphJson = async () => {
        setGraphExporting(true)
        setGraphExportResult(null)
        try {
            const path = await window.api.dialog.saveFile({ defaultPath: 'graph-data.json' })
            if (!path) {
                setGraphExporting(false)
                return
            }
            const res = await window.api.exports.graphJson(path)
            setGraphExportResult(res.ok ? { ok: true, path } : { ok: false, error: res.error })
        } catch (err) {
            setGraphExportResult({
                ok: false,
                error: err instanceof Error ? err.message : String(err)
            })
        } finally {
            setGraphExporting(false)
        }
    }

    return (
        <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* Summary */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={exportSectionLabel}>Export Summary</div>
                <SummaryRow
                    color="#22c55e"
                    label="Synced (will be created)"
                    count={synced.length}
                />
                <SummaryRow
                    color="#60a5fa"
                    label="Referenced (already exist)"
                    count={referenced.length}
                />
                {nodes.length === 0 && (
                    <div style={{ fontSize: 10, color: '#4b5563', padding: 8 }}>
                        No resources in graph — run discovery first, then mark nodes as Synced or
                        Referenced.
                    </div>
                )}
            </div>

            {/* Stack name */}
            <div>
                <div style={exportSectionLabel}>Stack Name</div>
                <input
                    value={stackName}
                    onChange={(e) => setStackName(e.target.value)}
                    style={{ ...exportInputStyle, width: '100%' }}
                    placeholder="MyStack"
                />
            </div>

            {/* Output directory */}
            <div>
                <div style={exportSectionLabel}>Output Directory</div>
                <div style={{ display: 'flex', gap: 4 }}>
                    <input
                        value={outputDir}
                        onChange={(e) => setOutputDir(e.target.value)}
                        placeholder="Select a folder…"
                        style={{
                            ...exportInputStyle,
                            flex: 1,
                            color: outputDir ? '#e5e7eb' : '#4b5563'
                        }}
                    />
                    <button onClick={pickFolder} style={btnStyle('#374151')}>
                        Browse
                    </button>
                </div>
            </div>

            {missingTargetArn.length > 0 && (
                <div
                    style={{
                        padding: '8px 10px',
                        background: '#1c0a00',
                        border: '1px solid #f97316',
                        borderRadius: 4,
                        marginBottom: 8
                    }}
                >
                    <div
                        style={{ fontSize: 10, fontWeight: 600, color: '#f97316', marginBottom: 4 }}
                    >
                        {missingTargetArn.length} excluded node
                        {missingTargetArn.length !== 1 ? 's' : ''} missing account ARN
                    </div>
                    {missingTargetArn.slice(0, 5).map((n) => (
                        <div
                            key={n.logicalId}
                            style={{ fontSize: 9, color: '#9ca3af', fontFamily: 'monospace' }}
                        >
                            • {n.logicalId}
                        </div>
                    ))}
                    {missingTargetArn.length > 5 && (
                        <div style={{ fontSize: 9, color: '#6b7280' }}>
                            …and {missingTargetArn.length - 5} more
                        </div>
                    )}
                    <div style={{ fontSize: 9, color: '#6b7280', marginTop: 4 }}>
                        These will export as REPLACE_WITH_TARGET_ARN placeholders.
                    </div>
                </div>
            )}
            {/* Export button */}
            <button
                onClick={handleExport}
                disabled={!canExport || exporting}
                style={{
                    ...btnStyle('#2563eb', !canExport || exporting),
                    width: '100%',
                    padding: '8px'
                }}
            >
                {exporting ? '⟳ Generating…' : '↗ Export CDK Project'}
            </button>

            {/* Result */}
            {result && (
                <div
                    style={{
                        padding: 8,
                        background: result.ok ? '#052e16' : '#450a0a',
                        border: `1px solid ${result.ok ? '#22c55e' : '#ef4444'}`,
                        borderRadius: 4,
                        fontSize: 11,
                        color: result.ok ? '#4ade80' : '#fca5a5'
                    }}
                >
                    {result.ok ? `✓ CDK project written to ${outputDir}` : `✕ ${result.error}`}
                    {result.artifactErrors && result.artifactErrors.length > 0 && (
                        <div style={{ marginTop: 4, color: '#fb923c' }}>
                            ⚠ {result.artifactErrors.length} artifact(s) could not be downloaded
                            (placeholders used): {result.artifactErrors.map((e) => e.id).join(', ')}
                        </div>
                    )}
                </div>
            )}

            {canValidate && (
                <button
                    onClick={handleValidate}
                    disabled={validating}
                    style={{ ...btnStyle('#374151', validating), width: '100%', padding: '8px' }}
                >
                    {validating ? '⟳ Running cdk synth…' : '✓ Validate (cdk synth)'}
                </button>
            )}

            {validateResult && (
                <div
                    style={{
                        padding: 8,
                        background: validateResult.ok ? '#052e16' : '#450a0a',
                        border: `1px solid ${validateResult.ok ? '#22c55e' : '#ef4444'}`,
                        borderRadius: 4,
                        fontSize: 10,
                        color: validateResult.ok ? '#4ade80' : '#fca5a5',
                        fontFamily: 'monospace',
                        whiteSpace: 'pre-wrap',
                        maxHeight: 200,
                        overflowY: 'auto'
                    }}
                >
                    {validateResult.ok ? '✓ cdk synth passed\n' : '✕ cdk synth failed\n'}
                    {validateResult.output}
                </div>
            )}

            {/* Graph JSON export */}
            <div
                style={{
                    borderTop: '1px solid #2a2d37',
                    paddingTop: 10,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8
                }}
            >
                <div style={exportSectionLabel}>Export Graph Data</div>
                <p style={{ fontSize: 10, color: '#6b7280', margin: 0, lineHeight: 1.5 }}>
                    Save all environments' graph data (nodes, edges, ARNs, labels) as a JSON file.
                </p>
                <button
                    onClick={handleExportGraphJson}
                    disabled={graphExporting}
                    style={{
                        ...btnStyle('#4338ca', graphExporting),
                        width: '100%',
                        padding: '8px'
                    }}
                >
                    {graphExporting ? '⟳ Exporting…' : '↓ Export Graph as JSON'}
                </button>
                {graphExportResult && (
                    <div
                        style={{
                            padding: 8,
                            background: graphExportResult.ok ? '#052e16' : '#450a0a',
                            border: `1px solid ${graphExportResult.ok ? '#22c55e' : '#ef4444'}`,
                            borderRadius: 4,
                            fontSize: 11,
                            color: graphExportResult.ok ? '#4ade80' : '#fca5a5'
                        }}
                    >
                        {graphExportResult.ok
                            ? `✓ Graph data saved to ${graphExportResult.path}`
                            : `✕ ${graphExportResult.error}`}
                    </div>
                )}
            </div>

            {/* What gets generated */}
            <div style={{ borderTop: '1px solid #2a2d37', paddingTop: 10 }}>
                <div style={exportSectionLabel}>Generated Files</div>
                {[
                    ['lib/arns.ts', 'ARN mapping for referenced resources — edit per account'],
                    ['lib/stack.ts', 'CDK stack with all constructs wired up'],
                    ['bin/app.ts', 'CDK app entry point'],
                    ['src/<FnId>/', 'Lambda function code (downloaded from AWS or placeholder)'],
                    [
                        'layers/<LayerId>/',
                        'Lambda layer content (downloaded from AWS or placeholder)'
                    ]
                ].map(([file, desc]) => (
                    <div
                        key={file}
                        style={{ display: 'flex', gap: 6, padding: '2px 0', fontSize: 10 }}
                    >
                        <span style={{ color: '#60a5fa', fontFamily: 'monospace', flexShrink: 0 }}>
                            {file}
                        </span>
                        <span style={{ color: '#4b5563' }}>{desc}</span>
                    </div>
                ))}
            </div>
        </div>
    )
}

function SummaryRow({ color, label, count }: { color: string; label: string; count: number }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}>
            <span
                style={{ width: 8, height: 8, borderRadius: 2, background: color, flexShrink: 0 }}
            />
            <span style={{ fontSize: 11, color: '#d1d5db', flex: 1 }}>{label}</span>
            <span style={{ fontSize: 11, fontWeight: 600, color: count > 0 ? color : '#4b5563' }}>
                {count}
            </span>
        </div>
    )
}

const exportSectionLabel: React.CSSProperties = {
    fontSize: 10,
    fontWeight: 600,
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 6
}

const exportInputStyle: React.CSSProperties = {
    padding: '5px 8px',
    background: '#16181f',
    border: '1px solid #2a2d37',
    borderRadius: 4,
    color: '#e5e7eb',
    fontSize: 11,
    outline: 'none'
}

// ─── Resource Tree ────────────────────────────────────────────────────────────

const SERVICE_COLORS: Record<string, string> = {
    lambda: '#f97316',
    dynamodb: '#22c55e',
    connect: '#3b82f6',
    iam: '#a855f7',
    s3: '#eab308',
    apigateway: '#06b6d4',
    cloudformation: '#f43f5e',
    ssm: '#64748b',
    secretsmanager: '#ec4899',
    sqs: '#f59e0b',
    sns: '#10b981'
}

const RESOURCE_TYPE_LABELS: Record<string, string> = {
    'contact-flow': 'Contact Flows',
    'contact-flow-module': 'Flow Modules',
    queue: 'Queues',
    'routing-profile': 'Routing Profiles',
    'hours-of-operation': 'Hours of Operation',
    'agent-state': 'Agent Statuses',
    'security-profile': 'Security Profiles',
    'agent-hierarchy': 'Hierarchy Groups',
    'quick-connect': 'Quick Connects',
    rule: 'Rules',
    'task-template': 'Task Templates',
    instance: 'Instances',
    function: 'Functions',
    table: 'Tables',
    bucket: 'Buckets',
    role: 'Roles',
    policy: 'Policies',
    'rest-api': 'REST APIs',
    api: 'APIs',
    stack: 'Stacks'
}

const RESOURCE_TYPE_ORDER: Record<string, string[]> = {
    connect: [
        'instance',
        'hours-of-operation',
        'queue',
        'routing-profile',
        'contact-flow',
        'contact-flow-module',
        'agent-state',
        'security-profile',
        'agent-hierarchy',
        'quick-connect',
        'rule',
        'task-template'
    ]
}

function statusColor(node: GraphNode): string {
    if (node.hidden) return '#374151'
    if (!node.included) return '#f97316'
    return '#22c55e'
}

function ResourceList() {
    const {
        graph,
        selectedNodeArns,
        setSelectedNodeArns,
        collapsedNodeArns,
        toggleCollapseNode,
        updateNode,
        mapping
    } = useAppStore()

    const [search, setSearch] = useState('')
    const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())
    const lastClickedArnRef = useRef<string | null>(null)
    const [treeMenu, setTreeMenu] = useState<{ x: number; y: number; arn: string } | null>(null)

    const allNodes = useMemo(() => Array.from(graph.nodes.values()), [graph.nodes])

    const nodesWithChildren = useMemo(
        () => new Set(graph.edges.map((e) => e.source)),
        [graph.edges]
    )

    // Group nodes by service → resourceType, sorted within each group
    const groups = useMemo(() => {
        const term = search.trim().toLowerCase()
        const svcMap = new Map<string, Map<string, GraphNode[]>>()

        for (const node of allNodes) {
            const svc = node.service
            const rt = node.resourceType
            if (!svcMap.has(svc)) svcMap.set(svc, new Map())
            const rtMap = svcMap.get(svc)!
            if (!rtMap.has(rt)) rtMap.set(rt, [])
            rtMap.get(rt)!.push(node)
        }

        // Sort nodes within each sub-group
        for (const rtMap of svcMap.values()) {
            for (const nodes of rtMap.values()) {
                nodes.sort((a, b) => (a.label || a.logicalId).localeCompare(b.label || b.logicalId))
            }
        }

        // Filter if search active
        if (term) {
            for (const [svc, rtMap] of svcMap) {
                for (const [rt, nodes] of rtMap) {
                    const filtered = nodes.filter(
                        (n) =>
                            (n.label || '').toLowerCase().includes(term) ||
                            n.logicalId.toLowerCase().includes(term) ||
                            n.arn.toLowerCase().includes(term)
                    )
                    if (filtered.length > 0) rtMap.set(rt, filtered)
                    else rtMap.delete(rt)
                }
                if (rtMap.size === 0) svcMap.delete(svc)
            }
        }

        const SERVICE_ORDER = [
            'lambda',
            'dynamodb',
            's3',
            'iam',
            'connect',
            'apigateway',
            'cloudformation'
        ]
        return Array.from(svcMap.entries())
            .sort(([a], [b]) => {
                const ai = SERVICE_ORDER.indexOf(a)
                const bi = SERVICE_ORDER.indexOf(b)
                if (ai >= 0 && bi >= 0) return ai - bi
                if (ai >= 0) return -1
                if (bi >= 0) return 1
                return a.localeCompare(b)
            })
            .map(([svc, rtMap]) => {
                const typeOrder = RESOURCE_TYPE_ORDER[svc] ?? []
                const subGroups = Array.from(rtMap.entries())
                    .sort(([a], [b]) => {
                        const ai = typeOrder.indexOf(a)
                        const bi = typeOrder.indexOf(b)
                        if (ai >= 0 && bi >= 0) return ai - bi
                        if (ai >= 0) return -1
                        if (bi >= 0) return 1
                        return a.localeCompare(b)
                    })
                    .map(([rt, nodes]) => ({ rt, nodes }))
                const totalCount = subGroups.reduce((sum, sg) => sum + sg.nodes.length, 0)
                return { svc, subGroups, totalCount, hasSubGroups: rtMap.size > 1 }
            })
    }, [allNodes, search])

    const flatNodeArns = useMemo(() => {
        const arns: string[] = []
        for (const { subGroups } of groups) {
            for (const { nodes } of subGroups) {
                for (const n of nodes) arns.push(n.arn)
            }
        }
        return arns
    }, [groups])

    const handleNodeClick = (arn: string, e: React.MouseEvent) => {
        if (e.shiftKey && lastClickedArnRef.current) {
            const from = flatNodeArns.indexOf(lastClickedArnRef.current)
            const to = flatNodeArns.indexOf(arn)
            if (from !== -1 && to !== -1) {
                const [lo, hi] = from <= to ? [from, to] : [to, from]
                setSelectedNodeArns(flatNodeArns.slice(lo, hi + 1))
                return
            }
        }
        if (e.ctrlKey || e.metaKey) {
            const cur = new Set(selectedNodeArns)
            cur.has(arn) ? cur.delete(arn) : cur.add(arn)
            setSelectedNodeArns(Array.from(cur))
            lastClickedArnRef.current = arn
            return
        }
        setSelectedNodeArns([arn])
        lastClickedArnRef.current = arn
    }

    const [missingExpanded, setMissingExpanded] = useState(false)

    const unmappedRefs = useMemo(
        () =>
            allNodes.filter(
                (n) =>
                    !n.included &&
                    !n.hidden &&
                    !Object.values(mapping).some((acct) => acct[n.logicalId]?.arn)
            ),
        [allNodes, mapping]
    )

    const toggleGroup = (svc: string) =>
        setCollapsedGroups((prev) => {
            const next = new Set(prev)
            next.has(svc) ? next.delete(svc) : next.add(svc)
            return next
        })

    if (allNodes.length === 0) {
        return (
            <div style={{ padding: 16, textAlign: 'center', fontSize: 10, color: '#4b5563' }}>
                No resources yet — run discovery first.
            </div>
        )
    }

    const totalShown = groups.reduce((sum, g) => sum + g.totalCount, 0)

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {unmappedRefs.length > 0 && (
                <div style={{ flexShrink: 0, borderBottom: '1px solid #2a2d37' }}>
                    <div
                        onClick={() => setMissingExpanded((v) => !v)}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '6px 8px',
                            cursor: 'pointer',
                            background: '#1a0a00'
                        }}
                    >
                        <span style={{ fontSize: 9, color: '#f97316' }}>
                            {missingExpanded ? '▼' : '▶'}
                        </span>
                        <span style={{ fontSize: 10, fontWeight: 600, color: '#f97316', flex: 1 }}>
                            {unmappedRefs.length} unmapped reference
                            {unmappedRefs.length !== 1 ? 's' : ''}
                        </span>
                    </div>
                    {missingExpanded && (
                        <div style={{ maxHeight: 200, overflow: 'auto' }}>
                            {unmappedRefs.map((n) => (
                                <div
                                    key={n.arn}
                                    onClick={() => setSelectedNodeArns([n.arn])}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 6,
                                        padding: '3px 8px',
                                        cursor: 'pointer',
                                        borderTop: '1px solid #1e2030'
                                    }}
                                >
                                    <span
                                        style={{
                                            fontSize: 9,
                                            color: statusColor(n),
                                            flexShrink: 0
                                        }}
                                    >
                                        ●
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
                        </div>
                    )}
                </div>
            )}
            {/* Header + search */}
            <div style={{ padding: '8px 8px 4px', flexShrink: 0 }}>
                <div
                    style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: 6
                    }}
                >
                    <span
                        style={{
                            fontSize: 10,
                            fontWeight: 600,
                            color: '#6b7280',
                            textTransform: 'uppercase',
                            letterSpacing: 1
                        }}
                    >
                        {totalShown} / {allNodes.length} nodes
                    </span>
                    <div style={{ display: 'flex', gap: 4 }}>
                        <button onClick={() => setCollapsedGroups(new Set())} style={miniBtn}>
                            All
                        </button>
                        <button
                            onClick={() => setCollapsedGroups(new Set(groups.map((g) => g.svc)))}
                            style={miniBtn}
                        >
                            None
                        </button>
                    </div>
                </div>
                <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Filter resources..."
                    style={{
                        width: '100%',
                        padding: '5px 8px',
                        background: '#111827',
                        border: '1px solid #2a2d37',
                        borderRadius: 4,
                        color: '#e5e7eb',
                        fontSize: 11,
                        outline: 'none',
                        boxSizing: 'border-box'
                    }}
                />
            </div>

            {/* Groups */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '0 8px 8px' }}>
                {groups.map((group) => {
                    const { svc, subGroups, hasSubGroups } = group
                    const color = SERVICE_COLORS[svc] ?? '#60a5fa'
                    const isExpanded = !collapsedGroups.has(svc) || search.trim() !== ''
                    const svcLabel = svc.charAt(0).toUpperCase() + svc.slice(1)

                    return (
                        <div key={svc} style={{ marginBottom: 2 }}>
                            {/* Service group header */}
                            <div
                                onClick={() => toggleGroup(svc)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 6,
                                    padding: '4px 4px',
                                    borderRadius: 3,
                                    cursor: 'pointer',
                                    userSelect: 'none'
                                }}
                            >
                                <span
                                    style={{
                                        fontSize: 8,
                                        color: '#4b5563',
                                        width: 8,
                                        flexShrink: 0
                                    }}
                                >
                                    {isExpanded ? '▼' : '▶'}
                                </span>
                                <span
                                    style={{
                                        width: 8,
                                        height: 8,
                                        borderRadius: 2,
                                        background: color,
                                        flexShrink: 0
                                    }}
                                />
                                <span
                                    style={{
                                        fontSize: 11,
                                        fontWeight: 600,
                                        color: '#d1d5db',
                                        flex: 1
                                    }}
                                >
                                    {svcLabel}
                                </span>
                                <span style={{ fontSize: 10, color: '#4b5563' }}>
                                    {group.totalCount}
                                </span>
                            </div>

                            {/* Resource type subgroups */}
                            {isExpanded &&
                                subGroups.map(({ rt, nodes }) => {
                                    const rtKey = `${svc}:${rt}`
                                    const isRtExpanded =
                                        !collapsedGroups.has(rtKey) || search.trim() !== ''
                                    const rtLabel = RESOURCE_TYPE_LABELS[rt] ?? rt
                                    return (
                                        <div key={rt} style={{ marginLeft: hasSubGroups ? 12 : 0 }}>
                                            {/* Resource type header (only if multiple types) */}
                                            {hasSubGroups && (
                                                <div
                                                    onClick={() => toggleGroup(rtKey)}
                                                    style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: 4,
                                                        fontSize: 9,
                                                        fontWeight: 500,
                                                        color: '#9ca3af',
                                                        padding: '4px 0 2px 4px',
                                                        textTransform: 'uppercase',
                                                        letterSpacing: 0.5,
                                                        cursor: 'pointer',
                                                        userSelect: 'none'
                                                    }}
                                                >
                                                    <span style={{ fontSize: 7, color: '#4b5563' }}>
                                                        {isRtExpanded ? '▼' : '▶'}
                                                    </span>
                                                    <span style={{ flex: 1 }}>{rtLabel}</span>
                                                    <span style={{ color: '#374151' }}>
                                                        {nodes.length}
                                                    </span>
                                                </div>
                                            )}
                                            {/* Nodes */}
                                            {isRtExpanded &&
                                                nodes.map((node) => {
                                                    const isSelected = selectedNodeArns.includes(
                                                        node.arn
                                                    )
                                                    const isCollapsedInGraph =
                                                        collapsedNodeArns.has(node.arn)
                                                    const nodeStatusColor = statusColor(node)
                                                    const hasChildren = nodesWithChildren.has(
                                                        node.arn
                                                    )

                                                    return (
                                                        <div
                                                            key={node.arn}
                                                            style={{
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: 4,
                                                                padding: '2px 4px 2px 20px',
                                                                borderRadius: 3,
                                                                cursor: 'pointer',
                                                                background: isSelected
                                                                    ? '#1e3a5f'
                                                                    : 'transparent',
                                                                border: `1px solid ${isSelected ? '#3b82f6' : 'transparent'}`
                                                            }}
                                                            onClick={(e) =>
                                                                handleNodeClick(node.arn, e)
                                                            }
                                                            onContextMenu={(e) => {
                                                                e.preventDefault()
                                                                e.stopPropagation()
                                                                setTreeMenu({
                                                                    x: e.clientX,
                                                                    y: e.clientY,
                                                                    arn: node.arn
                                                                })
                                                            }}
                                                        >
                                                            <span
                                                                style={{
                                                                    fontSize: 11,
                                                                    color: '#e5e7eb',
                                                                    flex: 1,
                                                                    overflow: 'hidden',
                                                                    textOverflow: 'ellipsis',
                                                                    whiteSpace: 'nowrap'
                                                                }}
                                                                title={node.arn}
                                                            >
                                                                {node.label || node.logicalId}
                                                            </span>
                                                            <span
                                                                style={{
                                                                    width: 5,
                                                                    height: 5,
                                                                    borderRadius: '50%',
                                                                    background: nodeStatusColor,
                                                                    flexShrink: 0
                                                                }}
                                                                title={
                                                                    node.included
                                                                        ? 'included'
                                                                        : node.hidden
                                                                          ? 'hidden'
                                                                          : 'excluded'
                                                                }
                                                            />
                                                            {hasChildren && (
                                                                <span
                                                                    onClick={(e) => {
                                                                        e.stopPropagation()
                                                                        toggleCollapseNode(node.arn)
                                                                    }}
                                                                    title={
                                                                        isCollapsedInGraph
                                                                            ? 'Expand in graph'
                                                                            : 'Collapse in graph'
                                                                    }
                                                                    style={{
                                                                        fontSize: 9,
                                                                        color: isCollapsedInGraph
                                                                            ? '#f97316'
                                                                            : '#374151',
                                                                        cursor: 'pointer',
                                                                        flexShrink: 0,
                                                                        padding: '0 2px'
                                                                    }}
                                                                >
                                                                    {isCollapsedInGraph ? '⊞' : '⊟'}
                                                                </span>
                                                            )}
                                                        </div>
                                                    )
                                                })}
                                        </div>
                                    )
                                })}
                        </div>
                    )
                })}
            </div>

            {treeMenu &&
                (() => {
                    const node = graph.nodes.get(treeMenu.arn)
                    const hasChildren = node
                        ? graph.edges.some((e) => e.source === node.arn)
                        : false
                    const isCollapsed = collapsedNodeArns.has(treeMenu.arn)
                    const treeItems = [
                        {
                            label: 'Include',
                            action: async () => {
                                updateNode(treeMenu.arn, { included: true, hidden: false })
                                await persistGraphNow()
                            }
                        },
                        {
                            label: 'Exclude',
                            action: async () => {
                                updateNode(treeMenu.arn, { included: false, hidden: false })
                                await persistGraphNow()
                            }
                        },
                        {
                            label: 'Hide',
                            action: async () => {
                                updateNode(treeMenu.arn, { hidden: true })
                                await persistGraphNow()
                            }
                        },
                        ...(hasChildren
                            ? [
                                  {
                                      label: isCollapsed ? 'Expand in graph' : 'Collapse in graph',
                                      action: () => toggleCollapseNode(treeMenu.arn)
                                  }
                              ]
                            : []),
                        {
                            label: 'Copy ARN',
                            action: () => navigator.clipboard.writeText(treeMenu.arn)
                        }
                    ]
                    return (
                        <>
                            <div
                                style={{ position: 'fixed', inset: 0, zIndex: 999 }}
                                onClick={() => setTreeMenu(null)}
                                onContextMenu={(e) => {
                                    e.preventDefault()
                                    setTreeMenu(null)
                                }}
                            />
                            <div
                                style={{
                                    position: 'fixed',
                                    left: treeMenu.x,
                                    top: treeMenu.y,
                                    background: '#1e2030',
                                    border: '1px solid #2a2d37',
                                    borderRadius: 4,
                                    overflow: 'hidden',
                                    zIndex: 1000,
                                    minWidth: 130
                                }}
                            >
                                {treeItems.map((item, i) => (
                                    <button
                                        key={i}
                                        onClick={() => {
                                            item.action()
                                            setTreeMenu(null)
                                        }}
                                        style={{
                                            width: '100%',
                                            padding: '7px 12px',
                                            background: 'transparent',
                                            border: 'none',
                                            color: '#e5e7eb',
                                            fontSize: 11,
                                            textAlign: 'left',
                                            cursor: 'pointer',
                                            borderBottom:
                                                i < treeItems.length - 1
                                                    ? '1px solid #2a2d37'
                                                    : 'none'
                                        }}
                                    >
                                        {item.label}
                                    </button>
                                ))}
                            </div>
                        </>
                    )
                })()}
        </div>
    )
}

const miniBtn: React.CSSProperties = {
    padding: '2px 6px',
    background: '#1e2030',
    border: '1px solid #2a2d37',
    color: '#9ca3af',
    borderRadius: 3,
    fontSize: 9,
    cursor: 'pointer'
}

async function persistGraphNow(): Promise<void> {
    const state = useAppStore.getState()
    if (!state.activeEnvId) return
    const diskNodes: Record<string, ReturnType<typeof state.graph.nodes.get>> = {}
    for (const [arn, node] of state.graph.nodes) diskNodes[arn] = node
    await window.api.graphs.save(state.activeEnvId, {
        nodes: diskNodes as any,
        edges: state.graph.edges
    })
}

// ─── App ───────────────────────────────────────────────────────────────────────

export function App() {
    const {
        graph,
        selectedNodeArns,
        setSelectedNodeArns,
        clearSelection,
        sidebarTab,
        setSidebarTab,
        clearGraph: clearStoreGraph,
        activeEnvId,
        discoveryProgresses,
        setDiscoveryProgress,
        uiScale,
        setUiScale,
        collapsedNodeArns,
        toggleCollapseNode,
        updateNodes
    } = useAppStore()

    const syncGraph = useGraphSync()
    const [contextMenu, setContextMenu] = useState<{ x: number; y: number; arn: string } | null>(
        null
    )
    const [searchTerm, setSearchTerm] = useState('')
    const graphAreaRef = useRef<HTMLDivElement>(null)
    const forceGraphRef = useRef<ForceGraphHandle>(null)
    const [syncPanelHeight, setSyncPanelHeight] = useState(220)
    const syncResizeDragRef = useRef<{ startY: number; startHeight: number } | null>(null)

    const handleSyncResizeDown = (e: React.MouseEvent) => {
        syncResizeDragRef.current = { startY: e.clientY, startHeight: syncPanelHeight }
        const onMove = (ev: MouseEvent) => {
            if (!syncResizeDragRef.current) return
            const delta = syncResizeDragRef.current.startY - ev.clientY
            const newHeight = Math.max(
                60,
                Math.min(window.innerHeight * 0.7, syncResizeDragRef.current.startHeight + delta)
            )
            setSyncPanelHeight(newHeight)
        }
        const onUp = () => {
            syncResizeDragRef.current = null
            window.removeEventListener('mousemove', onMove)
            window.removeEventListener('mouseup', onUp)
        }
        window.addEventListener('mousemove', onMove)
        window.addEventListener('mouseup', onUp)
    }

    useEffect(() => {
        syncGraph()
    }, [syncGraph])

    useEffect(() => {
        const offProgress = window.api.discovery.onProgress((progress) => {
            const envId = progress.envId ?? activeEnvId ?? 'default'
            setDiscoveryProgress(envId, progress)
        })
        const offUpdated = window.api.discovery.onGraphUpdated((envId) => syncGraph(envId))
        return () => {
            offProgress()
            offUpdated()
        }
    }, [setDiscoveryProgress, syncGraph, activeEnvId])

    useEffect(() => {
        window.api.zoom.setFactor(uiScale)
    }, [uiScale])

    const onNodeClick = useCallback(
        (arn: string) => {
            setSelectedNodeArns([arn])
            forceGraphRef.current?.centerAt(arn)
        },
        [setSelectedNodeArns]
    )

    const onNodeRightClick = useCallback((arn: string, event: MouseEvent) => {
        event.preventDefault()
        const rect = graphAreaRef.current?.getBoundingClientRect()
        setContextMenu({
            x: event.clientX - (rect?.left ?? 0),
            y: event.clientY - (rect?.top ?? 0),
            arn
        })
    }, [])

    const onPaneClick = useCallback(() => {
        setContextMenu(null)
        clearSelection()
    }, [clearSelection])

    const handleClearGraph = async () => {
        await window.api.graphs.clear(activeEnvId ?? undefined)
        clearStoreGraph()
    }

    const handleBoxSelect = useCallback(
        (arns: string[], additive: boolean) => {
            setSelectedNodeArns(additive ? [...new Set([...selectedNodeArns, ...arns])] : arns)
        },
        [selectedNodeArns, setSelectedNodeArns]
    )

    const handleBulkToggle = async (patch: { included?: boolean; hidden?: boolean }) => {
        updateNodes(selectedNodeArns, patch)
        await persistGraphNow()
    }

    return (
        <div
            style={{
                display: 'flex',
                height: '100vh',
                width: '100vw',
                background: '#0a0c12',
                color: '#e5e7eb'
            }}
        >
            {/* ── Sidebar ────────────────────────────────────────────────────────── */}
            <div
                style={{
                    width: 320,
                    background: '#16181f',
                    borderRight: '1px solid #2a2d37',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden'
                }}
            >
                {/* Tabs */}
                <div style={{ display: 'flex', borderBottom: '1px solid #2a2d37', flexShrink: 0 }}>
                    {tabs.map((tab) => (
                        <button
                            key={tab.key}
                            onClick={() => setSidebarTab(tab.key)}
                            style={{
                                flex: 1,
                                padding: '10px 8px',
                                border: 'none',
                                borderBottom:
                                    sidebarTab === tab.key
                                        ? '2px solid #60a5fa'
                                        : '2px solid transparent',
                                background: sidebarTab === tab.key ? '#1e2030' : 'transparent',
                                cursor: 'pointer',
                                fontSize: 11,
                                fontWeight: sidebarTab === tab.key ? 600 : 400,
                                color: sidebarTab === tab.key ? '#60a5fa' : '#6b7280'
                            }}
                        >
                            {tab.icon} {tab.label}
                        </button>
                    ))}
                </div>

                {/* Panel content */}
                <div style={{ flex: 1, overflow: 'auto' }}>
                    {sidebarTab === 'accounts' && <EnvironmentPanel />}
                    {sidebarTab === 'discovery' && <DiscoveryPanel />}
                    {sidebarTab === 'resources' && <ResourceList />}
                    {sidebarTab === 'match' && <MatchPanel />}
                    {sidebarTab === 'export' && <ExportPanel />}
                </div>
            </div>

            {/* ── Main Graph Area ────────────────────────────────────────────────── */}
            <div
                ref={graphAreaRef}
                style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative' }}
            >
                {/* Toolbar */}
                <div
                    style={{
                        height: 44,
                        background: '#16181f',
                        borderBottom: '1px solid #2a2d37',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        paddingLeft: 12,
                        paddingRight: 12,
                        flexShrink: 0
                    }}
                >
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Search resources..."
                        style={{
                            padding: '5px 8px',
                            background: '#1e2030',
                            border: '1px solid #2a2d37',
                            borderRadius: 4,
                            color: '#e5e7eb',
                            fontSize: 11,
                            outline: 'none',
                            minWidth: 200
                        }}
                    />

                    <div style={{ flex: 1 }} />
                    {!activeEnvId && (
                        <div style={{ fontSize: 11, color: '#f59e0b' }}>
                            No environment selected
                        </div>
                    )}
                    {selectedNodeArns.length > 0 && (
                        <div style={{ fontSize: 11, color: '#60a5fa' }}>
                            {selectedNodeArns.length} selected
                        </div>
                    )}
                    <label
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            color: '#6b7280',
                            fontSize: 10
                        }}
                    >
                        UI
                        <input
                            type="range"
                            min={80}
                            max={135}
                            step={5}
                            value={Math.round(uiScale * 100)}
                            onChange={(event) => setUiScale(Number(event.target.value) / 100)}
                            style={{ width: 90 }}
                        />
                        <span style={{ width: 32, color: '#9ca3af' }}>
                            {Math.round(uiScale * 100)}%
                        </span>
                    </label>
                    <button
                        onClick={handleClearGraph}
                        style={{
                            padding: '5px 10px',
                            background: '#7f1d1d',
                            color: '#fca5a5',
                            border: 'none',
                            borderRadius: 4,
                            fontSize: 11,
                            cursor: 'pointer'
                        }}
                    >
                        Clear Graph
                    </button>
                </div>

                {/* Graph canvas — fills remaining space */}
                <div style={{ flex: 1, position: 'relative', minHeight: 0, overflow: 'hidden' }}>
                    <ForceGraphComponent
                        ref={forceGraphRef}
                        onNodeClick={onNodeClick}
                        onNodeRightClick={onNodeRightClick}
                        onPaneClick={onPaneClick}
                        searchTerm={searchTerm}
                        onBoxSelect={handleBoxSelect}
                    />
                    {/* Bulk action pill */}
                    {selectedNodeArns.length >= 2 && (
                        <div
                            style={{
                                position: 'absolute',
                                bottom: 16,
                                left: '50%',
                                transform: 'translateX(-50%)',
                                background: '#1e2030',
                                border: '1px solid #3b82f6',
                                borderRadius: 8,
                                padding: '6px 10px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                                zIndex: 50,
                                boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
                            }}
                        >
                            <span style={{ fontSize: 10, color: '#60a5fa', marginRight: 2 }}>
                                {selectedNodeArns.length} selected
                            </span>
                            <button
                                onClick={() => handleBulkToggle({ included: true, hidden: false })}
                                style={{ ...miniBtn, color: '#4ade80', borderColor: '#166534' }}
                            >
                                Include all
                            </button>
                            <button
                                onClick={() => handleBulkToggle({ included: false, hidden: false })}
                                style={{ ...miniBtn, color: '#fb923c', borderColor: '#7c2d12' }}
                            >
                                Exclude all
                            </button>
                            <button
                                onClick={() => handleBulkToggle({ hidden: true })}
                                style={{ ...miniBtn, color: '#9ca3af', borderColor: '#374151' }}
                            >
                                Hide all
                            </button>
                        </div>
                    )}
                </div>

                {/* Sync panel resize handle */}
                <div
                    onMouseDown={handleSyncResizeDown}
                    style={{
                        height: 5,
                        cursor: 'ns-resize',
                        background: '#1a1c28',
                        borderTop: '1px solid #2a2d37',
                        flexShrink: 0,
                        zIndex: 10
                    }}
                />

                {/* Sync bottom panel */}
                <div
                    style={{
                        height: syncPanelHeight,
                        flexShrink: 0,
                        overflow: 'hidden',
                        background: '#16181f',
                        borderTop: '1px solid #2a2d37'
                    }}
                >
                    <SyncTable />
                </div>

                {/* Context menu */}
                {contextMenu &&
                    (() => {
                        const isGroup = contextMenu.arn.startsWith(GROUP_NODE_PREFIX)
                        const groupChildren = isGroup
                            ? getGroupNodeChildren(contextMenu.arn, graph.nodes, graph.edges)
                            : []
                        const menuItems = isGroup
                            ? [
                                  {
                                      label: collapsedNodeArns.has(contextMenu.arn)
                                          ? 'Expand'
                                          : 'Collapse',
                                      action: () => toggleCollapseNode(contextMenu.arn)
                                  },
                                  {
                                      label: 'Include All',
                                      action: () => {
                                          updateNodes(groupChildren, {
                                              included: true,
                                              hidden: false
                                          })
                                          persistGraphNow()
                                      }
                                  },
                                  {
                                      label: 'Exclude All',
                                      action: () => {
                                          updateNodes(groupChildren, {
                                              included: false,
                                              hidden: false
                                          })
                                          persistGraphNow()
                                      }
                                  },
                                  {
                                      label: 'Hide All',
                                      action: () => {
                                          updateNodes(groupChildren, { hidden: true })
                                          persistGraphNow()
                                      }
                                  }
                              ]
                            : [
                                  { label: 'Select', action: () => onNodeClick(contextMenu.arn) },
                                  {
                                      label: collapsedNodeArns.has(contextMenu.arn)
                                          ? 'Expand'
                                          : 'Collapse',
                                      action: () => toggleCollapseNode(contextMenu.arn)
                                  },
                                  {
                                      label: 'Match...',
                                      action: () => setSidebarTab('match')
                                  },
                                  {
                                      label: 'Copy ARN',
                                      action: () => navigator.clipboard.writeText(contextMenu.arn)
                                  },
                                  {
                                      label: 'View Details',
                                      action: () => console.log(graph.nodes.get(contextMenu.arn))
                                  }
                              ]
                        return (
                            <div
                                style={{
                                    position: 'absolute',
                                    left: contextMenu.x,
                                    top: contextMenu.y,
                                    background: '#1e2030',
                                    border: '1px solid #2a2d37',
                                    borderRadius: 4,
                                    overflow: 'hidden',
                                    zIndex: 1000
                                }}
                            >
                                {menuItems.map((item, i) => (
                                    <button
                                        key={i}
                                        onClick={() => {
                                            item.action()
                                            setContextMenu(null)
                                        }}
                                        style={{
                                            width: '100%',
                                            padding: '8px 12px',
                                            background: 'transparent',
                                            border: 'none',
                                            color: '#e5e7eb',
                                            fontSize: 11,
                                            textAlign: 'left',
                                            cursor: 'pointer',
                                            borderBottom:
                                                i < menuItems.length - 1
                                                    ? '1px solid #2a2d37'
                                                    : 'none'
                                        }}
                                    >
                                        {item.label}
                                    </button>
                                ))}
                            </div>
                        )
                    })()}
            </div>

            {/* ── Right Inspector Panel ────────────────────────────────────────── */}
            {selectedNodeArns.length === 1 && (
                <div
                    style={{
                        width: 300,
                        background: '#16181f',
                        borderLeft: '1px solid #2a2d37',
                        display: 'flex',
                        flexDirection: 'column',
                        overflow: 'hidden',
                        flexShrink: 0
                    }}
                >
                    <NodeInspector arn={selectedNodeArns[0]} onClose={clearSelection} />
                </div>
            )}
        </div>
    )
}

function btnStyle(background: string, disabled = false): React.CSSProperties {
    return {
        padding: '5px 10px',
        background,
        color: '#fff',
        border: 'none',
        borderRadius: 4,
        fontSize: 11,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1
    }
}

const inputStyle: React.CSSProperties = {
    flex: 1,
    padding: '5px 8px',
    background: '#16181f',
    border: '1px solid #2a2d37',
    borderRadius: 4,
    color: '#e5e7eb',
    fontSize: 11,
    outline: 'none',
    fontFamily: 'monospace'
}
