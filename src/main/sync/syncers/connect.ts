import {
    AssociateRoutingProfileQueuesCommand,
    ConnectClient,
    CreateHoursOfOperationOverrideCommand,
    DeleteHoursOfOperationOverrideCommand,
    DisassociateRoutingProfileQueuesCommand,
    ListHoursOfOperationOverridesCommand,
    ListRoutingProfileQueuesCommand,
    UpdateAgentStatusCommand,
    UpdateContactFlowContentCommand,
    UpdateContactFlowModuleContentCommand,
    UpdateContactFlowModuleMetadataCommand,
    UpdateContactFlowNameCommand,
    UpdateEvaluationFormCommand,
    UpdateHoursOfOperationCommand,
    UpdateHoursOfOperationOverrideCommand,
    UpdatePromptCommand,
    UpdateQueueHoursOfOperationCommand,
    UpdateQueueMaxContactsCommand,
    UpdateQueueNameCommand,
    UpdateQueueOutboundCallerConfigCommand,
    UpdateQueueOutboundEmailConfigCommand,
    UpdateQueueStatusCommand,
    UpdateQuickConnectConfigCommand,
    UpdateQuickConnectNameCommand,
    UpdateRoutingProfileAgentAvailabilityTimerCommand,
    UpdateRoutingProfileDefaultOutboundQueueCommand,
    UpdateRoutingProfileNameCommand,
    UpdateRoutingProfileQueuesCommand,
    UpdateRuleCommand,
    UpdateSecurityProfileCommand,
    UpdateTaskTemplateCommand,
    UpdateUserHierarchyGroupNameCommand,
    UpdateViewContentCommand,
    UpdateViewMetadataCommand
} from '@aws-sdk/client-connect'
import { parseARN } from '../../discovery/arn'
import type { Credentials } from '../../discovery/CredentialsProvider'
import { registerSyncer } from '../registry'
import { remapConnectObject } from '../remapping'
import type { ResourceSyncer, SyncContext, SyncPushResult } from '../syncer'

const clientCache = new Map<string, ConnectClient>()

function getClient(region: string, creds: Credentials): ConnectClient {
    const key = `${region}:${creds.accessKeyId}`
    if (!clientCache.has(key)) {
        clientCache.set(key, new ConnectClient({ region, credentials: creds }))
    }
    return clientCache.get(key)!
}

function instanceIdFromArn(arn: string): string {
    const parsed = parseARN(arn)
    if (!parsed) return arn
    const parts = parsed.resource.split('/')
    return parts[1] ?? parsed.resourceId
}

function resourceIdFromArn(arn: string): string {
    return parseARN(arn)?.resourceId ?? arn
}

function regionFromArn(arn: string): string {
    return parseARN(arn)?.region ?? 'us-east-1'
}

// ─── Contact Flow ──────────────────────────────────────────────────────────────

const contactFlowSyncer: ResourceSyncer = {
    service: 'connect',
    resourceType: 'contact-flow',

    async push(
        sourceData,
        _sourceArn,
        targetArn,
        _sourceCredentials,
        targetCredentials,
        context?: SyncContext
    ): Promise<SyncPushResult> {
        const changes: string[] = []
        const skipped: string[] = []

        const creds = await targetCredentials()
        const client = getClient(regionFromArn(targetArn), creds)
        const instId = instanceIdFromArn(targetArn)
        const flowId = resourceIdFromArn(targetArn)

        if (typeof sourceData.Content === 'string') {
            let content = sourceData.Content
            // Contact flow content is base64-encoded JSON. Decode, remap internal Connect IDs,
            // then re-encode before pushing to target instance.
            let decodeFailed = false
            try {
                const decoded = JSON.parse(Buffer.from(content, 'base64').toString('utf-8'))
                const remapped = remapConnectObject(decoded, context?.remapping ?? null)
                if (remapped !== decoded) {
                    content = Buffer.from(JSON.stringify(remapped)).toString('base64')
                    changes.push('content (remapped IDs)')
                } else {
                    changes.push('content')
                }
            } catch {
                // If decode fails, push as-is (might not be base64 or might be corrupted)
                skipped.push('content (decode failed, pushed as-is)')
                decodeFailed = true
            }

            if (!decodeFailed) {
                await client.send(
                    new UpdateContactFlowContentCommand({
                        InstanceId: instId,
                        ContactFlowId: flowId,
                        Content: content
                    })
                )
            }
        } else {
            skipped.push('content (not available)')
        }

        if (typeof sourceData.Name === 'string' || typeof sourceData.Description === 'string') {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await client.send(
                new UpdateContactFlowNameCommand({
                    InstanceId: instId,
                    ContactFlowId: flowId,
                    Name: sourceData.Name as any,
                    Description: sourceData.Description as any
                })
            )
            changes.push('name/description')
        }

        return { ok: true, changes, skipped }
    }
}

// ─── Contact Flow Module ───────────────────────────────────────────────────────

const contactFlowModuleSyncer: ResourceSyncer = {
    service: 'connect',
    resourceType: 'contact-flow-module',

    async push(
        sourceData,
        _sourceArn,
        targetArn,
        _sourceCredentials,
        targetCredentials,
        context?: SyncContext
    ): Promise<SyncPushResult> {
        const changes: string[] = []
        const skipped: string[] = []

        const creds = await targetCredentials()
        const client = getClient(regionFromArn(targetArn), creds)
        const instId = instanceIdFromArn(targetArn)
        const moduleId = resourceIdFromArn(targetArn)

        if (typeof sourceData.Content === 'string') {
            let content = sourceData.Content
            // Contact flow module content is also base64-encoded JSON with internal IDs
            try {
                const decoded = JSON.parse(Buffer.from(content, 'base64').toString('utf-8'))
                const remapped = remapConnectObject(decoded, context?.remapping ?? null)
                if (remapped !== decoded) {
                    content = Buffer.from(JSON.stringify(remapped)).toString('base64')
                    changes.push('content (remapped IDs)')
                } else {
                    changes.push('content')
                }
            } catch {
                skipped.push('content (decode failed, pushed as-is)')
            }
            await client.send(
                new UpdateContactFlowModuleContentCommand({
                    InstanceId: instId,
                    ContactFlowModuleId: moduleId,
                    Content: content
                })
            )
        } else {
            skipped.push('content (not available)')
        }

        if (typeof sourceData.Name === 'string' || typeof sourceData.Description === 'string') {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await client.send(
                new UpdateContactFlowModuleMetadataCommand({
                    InstanceId: instId,
                    ContactFlowModuleId: moduleId,
                    Name: sourceData.Name as any,
                    Description: sourceData.Description as any,
                    State: sourceData.Status as any
                })
            )
            changes.push('name/description/state')
        }

        return { ok: true, changes, skipped }
    }
}

// ─── Queue ─────────────────────────────────────────────────────────────────────

const queueSyncer: ResourceSyncer = {
    service: 'connect',
    resourceType: 'queue',

    async push(
        sourceData,
        _sourceArn,
        targetArn,
        _sourceCredentials,
        targetCredentials,
        context?: SyncContext
    ): Promise<SyncPushResult> {
        const changes: string[] = []
        const skipped: string[] = []

        const creds = await targetCredentials()
        const client = getClient(regionFromArn(targetArn), creds)
        const instId = instanceIdFromArn(targetArn)
        const queueId = resourceIdFromArn(targetArn)
        const remap = (id: string | undefined): string | undefined =>
            id !== undefined ? (context?.remapping?.resolveId(id, 'connect') ?? id) : undefined

        const ops: Array<Promise<void>> = []

        if (typeof sourceData.Name === 'string' || typeof sourceData.Description === 'string') {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ops.push(
                client
                    .send(
                        new UpdateQueueNameCommand({
                            InstanceId: instId,
                            QueueId: queueId,
                            Name: sourceData.Name as any,
                            Description: sourceData.Description as any
                        })
                    )
                    .then(() => {
                        changes.push('name/description')
                    })
            )
        }
        if (typeof sourceData.HoursOfOperationId === 'string') {
            const remappedHoursId = remap(sourceData.HoursOfOperationId)
            if (remappedHoursId) {
                ops.push(
                    client
                        .send(
                            new UpdateQueueHoursOfOperationCommand({
                                InstanceId: instId,
                                QueueId: queueId,
                                HoursOfOperationId: remappedHoursId
                            })
                        )
                        .then(() => {
                            changes.push('hoursOfOperation')
                        })
                )
            }
        }
        if (typeof sourceData.MaxContacts === 'number') {
            ops.push(
                client
                    .send(
                        new UpdateQueueMaxContactsCommand({
                            InstanceId: instId,
                            QueueId: queueId,
                            MaxContacts: sourceData.MaxContacts
                        })
                    )
                    .then(() => {
                        changes.push('maxContacts')
                    })
            )
        }
        const status = (sourceData.Status ?? sourceData.QueueStatus) as string | undefined
        if (status === 'ENABLED' || status === 'DISABLED') {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ops.push(
                client
                    .send(
                        new UpdateQueueStatusCommand({
                            InstanceId: instId,
                            QueueId: queueId,
                            Status: status as any
                        })
                    )
                    .then(() => {
                        changes.push('status')
                    })
            )
        }
        if (sourceData.OutboundCallerConfig) {
            const callerConfig = sourceData.OutboundCallerConfig as Record<string, unknown>
            const remappedOutboundFlowId = remap(callerConfig.OutboundFlowId as string | undefined)
            const remappedCallerConfig: Record<string, unknown> = { ...callerConfig }
            if (remappedOutboundFlowId) {
                remappedCallerConfig.OutboundFlowId = remappedOutboundFlowId
            } else {
                delete remappedCallerConfig.OutboundFlowId
            }
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ops.push(
                client
                    .send(
                        new UpdateQueueOutboundCallerConfigCommand({
                            InstanceId: instId,
                            QueueId: queueId,
                            OutboundCallerConfig: remappedCallerConfig as any
                        })
                    )
                    .then(() => {
                        changes.push('outboundCallerConfig')
                    })
            )
        }
        if (sourceData.OutboundEmailConfig) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ops.push(
                client
                    .send(
                        new UpdateQueueOutboundEmailConfigCommand({
                            InstanceId: instId,
                            QueueId: queueId,
                            OutboundEmailConfig: sourceData.OutboundEmailConfig as any
                        })
                    )
                    .then(() => {
                        changes.push('outboundEmailConfig')
                    })
            )
        }

        await Promise.all(ops)
        return { ok: true, changes, skipped }
    }
}

// ─── Routing Profile ───────────────────────────────────────────────────────────

const routingProfileSyncer: ResourceSyncer = {
    service: 'connect',
    resourceType: 'routing-profile',

    async push(
        sourceData,
        _sourceArn,
        targetArn,
        _sourceCredentials,
        targetCredentials,
        context?: SyncContext
    ): Promise<SyncPushResult> {
        const changes: string[] = []
        const skipped: string[] = []

        const creds = await targetCredentials()
        const client = getClient(regionFromArn(targetArn), creds)
        const instId = instanceIdFromArn(targetArn)
        const profileId = resourceIdFromArn(targetArn)
        const remap = (id: string | undefined): string | undefined =>
            id !== undefined ? (context?.remapping?.resolveId(id, 'connect') ?? id) : undefined

        // Helper type for queue config from resolver
        type QueueConfig = {
            QueueId: string
            Priority: number
            Delay: number
            Channel: string
        }

        const ops: Array<Promise<void>> = []

        if (typeof sourceData.Name === 'string' || typeof sourceData.Description === 'string') {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ops.push(
                client
                    .send(
                        new UpdateRoutingProfileNameCommand({
                            InstanceId: instId,
                            RoutingProfileId: profileId,
                            Name: sourceData.Name as any,
                            Description: sourceData.Description as any
                        })
                    )
                    .then(() => {
                        changes.push('name/description')
                    })
            )
        }
        if (typeof sourceData.DefaultOutboundQueueId === 'string') {
            const remappedQueueId = remap(sourceData.DefaultOutboundQueueId)
            if (remappedQueueId) {
                ops.push(
                    client
                        .send(
                            new UpdateRoutingProfileDefaultOutboundQueueCommand({
                                InstanceId: instId,
                                RoutingProfileId: profileId,
                                DefaultOutboundQueueId: remappedQueueId
                            })
                        )
                        .then(() => {
                            changes.push('defaultOutboundQueue')
                        })
                )
            }
        }
        if (typeof sourceData.AgentAvailabilityTimer === 'string') {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ops.push(
                client
                    .send(
                        new UpdateRoutingProfileAgentAvailabilityTimerCommand({
                            InstanceId: instId,
                            RoutingProfileId: profileId,
                            AgentAvailabilityTimer: sourceData.AgentAvailabilityTimer as any
                        })
                    )
                    .then(() => {
                        changes.push('agentAvailabilityTimer')
                    })
            )
        }

        await Promise.all(ops)

        // Reconcile queue associations — match by remapped QueueId+Channel
        const sourceConfigs = (sourceData.QueueConfigs as QueueConfig[] | undefined) ?? []
        if (sourceConfigs.length > 0 || sourceData.QueueConfigs !== undefined) {
            const existingRes = await client.send(
                new ListRoutingProfileQueuesCommand({
                    InstanceId: instId,
                    RoutingProfileId: profileId
                })
            )
            const existing = (existingRes.RoutingProfileQueueConfigSummaryList ??
                []) as QueueConfig[]

            // Remap source queue IDs to target IDs for comparison
            const remappedSourceConfigs = sourceConfigs
                .map((q) => ({ ...q, QueueId: remap(q.QueueId) as string | undefined }))
                .filter((q): q is QueueConfig => !!q.QueueId)
            const key = (q: QueueConfig) => `${q.QueueId}:${q.Channel}`
            const existingByKey = new Map(existing.map((q) => [key(q), q]))
            const sourceByKey = new Map(remappedSourceConfigs.map((q) => [key(q), q]))

            // Find queues to associate (in source but not target)
            const toAssociate: QueueConfig[] = [...remappedSourceConfigs].filter(
                (q) => !existingByKey.has(key(q))
            )
            // Find queues to update (in both, different Priority/Delay)
            const toUpdate: QueueConfig[] = [...remappedSourceConfigs].filter((q) => {
                const existing = existingByKey.get(key(q))
                return existing && (existing.Priority !== q.Priority || existing.Delay !== q.Delay)
            })
            // Find queues to disassociate (in target but not source)
            const toDisassociate: QueueConfig[] = [...existing].filter(
                (q) => !sourceByKey.has(key(q))
            )

            if (toAssociate.length > 0) {
                await client.send(
                    new AssociateRoutingProfileQueuesCommand({
                        InstanceId: instId,
                        RoutingProfileId: profileId,
                        QueueConfigs: toAssociate.map((q) => ({
                            QueueReference: { QueueId: q.QueueId, Channel: q.Channel as any },
                            Priority: q.Priority,
                            Delay: q.Delay
                        }))
                    })
                )
                changes.push(`queues:associate:${toAssociate.length}`)
            }

            if (toUpdate.length > 0) {
                await client.send(
                    new UpdateRoutingProfileQueuesCommand({
                        InstanceId: instId,
                        RoutingProfileId: profileId,
                        QueueConfigs: toUpdate.map((q) => ({
                            QueueReference: { QueueId: q.QueueId, Channel: q.Channel as any },
                            Priority: q.Priority,
                            Delay: q.Delay
                        }))
                    })
                )
                changes.push(`queues:update:${toUpdate.length}`)
            }

            if (toDisassociate.length > 0) {
                await client.send(
                    new DisassociateRoutingProfileQueuesCommand({
                        InstanceId: instId,
                        RoutingProfileId: profileId,
                        QueueReferences: toDisassociate.map((q) => ({
                            QueueId: q.QueueId,
                            Channel: q.Channel as any
                        }))
                    })
                )
                changes.push(`queues:disassociate:${toDisassociate.length}`)
            }
        }

        // Reconcile manual assignment queues — match by remapped QueueId+Channel
        type ManualQueueConfig = { QueueId: string; Channel: string }
        const sourceManualConfigs =
            (sourceData.ManualAssignmentQueueConfigs as ManualQueueConfig[] | undefined) ?? []
        if (
            sourceManualConfigs.length > 0 ||
            sourceData.ManualAssignmentQueueConfigs !== undefined
        ) {
            const existingRes = await client.send(
                new ListRoutingProfileQueuesCommand({
                    InstanceId: instId,
                    RoutingProfileId: profileId
                })
            )
            const existing = (existingRes.RoutingProfileQueueConfigSummaryList ??
                []) as ManualQueueConfig[]

            // Remap source queue IDs to target IDs for comparison
            const remappedManualConfigs = sourceManualConfigs
                .map((q) => ({ ...q, QueueId: remap(q.QueueId)! }))
                .filter((q) => q.QueueId)
            const key = (q: ManualQueueConfig) => `${q.QueueId}:${q.Channel}`
            const existingByKey = new Map(existing.map((q) => [key(q), q]))
            const sourceByKey = new Map(remappedManualConfigs.map((q) => [key(q), q]))

            // Associate manual queues in source but not target
            const toAssociate = [...remappedManualConfigs].filter((q) => !existingByKey.has(key(q)))
            if (toAssociate.length > 0) {
                await client.send(
                    new AssociateRoutingProfileQueuesCommand({
                        InstanceId: instId,
                        RoutingProfileId: profileId,
                        ManualAssignmentQueueConfigs: toAssociate.map((q) => ({
                            QueueReference: { QueueId: q.QueueId, Channel: q.Channel as any }
                        }))
                    })
                )
                changes.push(`manualQueues:associate:${toAssociate.length}`)
            }

            // Disassociate manual queues in target but not source
            const toDisassociate = [...existing].filter((q) => !sourceByKey.has(key(q)))
            if (toDisassociate.length > 0) {
                await client.send(
                    new DisassociateRoutingProfileQueuesCommand({
                        InstanceId: instId,
                        RoutingProfileId: profileId,
                        ManualAssignmentQueueReferences: toDisassociate.map((q) => ({
                            QueueId: q.QueueId,
                            Channel: q.Channel as any
                        }))
                    })
                )
                changes.push(`manualQueues:disassociate:${toDisassociate.length}`)
            }
        }

        return { ok: true, changes, skipped }
    }
}

// ─── Hours of Operation ────────────────────────────────────────────────────────

const hoursOfOperationSyncer: ResourceSyncer = {
    service: 'connect',
    resourceType: 'hoursOfOperation',

    async push(
        sourceData,
        _sourceArn,
        targetArn,
        _sourceCredentials,
        targetCredentials
    ): Promise<SyncPushResult> {
        const changes: string[] = []
        const skipped: string[] = []

        const creds = await targetCredentials()
        const client = getClient(regionFromArn(targetArn), creds)
        const instId = instanceIdFromArn(targetArn)
        const hoursId = resourceIdFromArn(targetArn)

        if (!sourceData.Name || !sourceData.TimeZone || !sourceData.Config) {
            return {
                ok: false,
                changes,
                skipped,
                error: 'Missing required fields: Name, TimeZone, Config'
            }
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await client.send(
            new UpdateHoursOfOperationCommand({
                InstanceId: instId,
                HoursOfOperationId: hoursId,
                Name: sourceData.Name as any,
                Description: sourceData.Description as any,
                TimeZone: sourceData.TimeZone as any,
                Config: sourceData.Config as any
            })
        )
        changes.push('name/description/timeZone/config')

        // Reconcile overrides (scheduled exceptions) — match by name
        const sourceOverrides =
            (sourceData.Overrides as Array<Record<string, unknown>> | undefined) ?? []
        if (sourceOverrides.length > 0 || sourceData.Overrides !== undefined) {
            const existingRes = await client.send(
                new ListHoursOfOperationOverridesCommand({
                    InstanceId: instId,
                    HoursOfOperationId: hoursId
                })
            )
            const existing = existingRes.HoursOfOperationOverrideList ?? []
            const existingByName = new Map(existing.map((o) => [o.Name, o]))
            const sourceByName = new Map(sourceOverrides.map((o) => [o.Name as string, o]))

            await Promise.all([
                // Create overrides present in source but not in target
                ...[...sourceByName.entries()]
                    .filter(([name]) => !existingByName.has(name))
                    .map(async ([, o]) => {
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        await client.send(
                            new CreateHoursOfOperationOverrideCommand({
                                InstanceId: instId,
                                HoursOfOperationId: hoursId,
                                Name: o.Name as any,
                                Description: o.Description as any,
                                Config: o.Config as any,
                                EffectiveFrom: o.EffectiveFrom as any,
                                EffectiveTill: o.EffectiveTill as any
                            })
                        )
                        changes.push(`override:create:${o.Name as string}`)
                    }),
                // Update overrides present in both
                ...[...sourceByName.entries()]
                    .filter(([name]) => existingByName.has(name))
                    .map(async ([name, o]) => {
                        const targetOverrideId =
                            existingByName.get(name)!.HoursOfOperationOverrideId!
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        await client.send(
                            new UpdateHoursOfOperationOverrideCommand({
                                InstanceId: instId,
                                HoursOfOperationId: hoursId,
                                HoursOfOperationOverrideId: targetOverrideId,
                                Name: o.Name as any,
                                Description: o.Description as any,
                                Config: o.Config as any,
                                EffectiveFrom: o.EffectiveFrom as any,
                                EffectiveTill: o.EffectiveTill as any
                            })
                        )
                        changes.push(`override:update:${name}`)
                    }),
                // Delete overrides in target not present in source
                ...existing
                    .filter((o) => o.Name && !sourceByName.has(o.Name))
                    .map(async (o) => {
                        await client.send(
                            new DeleteHoursOfOperationOverrideCommand({
                                InstanceId: instId,
                                HoursOfOperationId: hoursId,
                                HoursOfOperationOverrideId: o.HoursOfOperationOverrideId!
                            })
                        )
                        changes.push(`override:delete:${o.Name}`)
                    })
            ])
        }

        return { ok: true, changes, skipped }
    }
}

// ─── Quick Connect ─────────────────────────────────────────────────────────────

const quickConnectSyncer: ResourceSyncer = {
    service: 'connect',
    resourceType: 'quick-connect',

    async push(
        sourceData,
        _sourceArn,
        targetArn,
        _sourceCredentials,
        targetCredentials,
        context?: SyncContext
    ): Promise<SyncPushResult> {
        const changes: string[] = []
        const skipped: string[] = []

        const creds = await targetCredentials()
        const client = getClient(regionFromArn(targetArn), creds)
        const instId = instanceIdFromArn(targetArn)
        const qcId = resourceIdFromArn(targetArn)

        const ops: Array<Promise<void>> = []

        if (typeof sourceData.Name === 'string' || typeof sourceData.Description === 'string') {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ops.push(
                client
                    .send(
                        new UpdateQuickConnectNameCommand({
                            InstanceId: instId,
                            QuickConnectId: qcId,
                            Name: sourceData.Name as any,
                            Description: sourceData.Description as any
                        })
                    )
                    .then(() => {
                        changes.push('name/description')
                    })
            )
        }
        if (sourceData.QuickConnectConfig) {
            // Remap internal IDs in QuickConnectConfig (QueueId, ContactFlowId)
            const remappedConfig = remapConnectObject(
                sourceData.QuickConnectConfig,
                context?.remapping ?? null
            )
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ops.push(
                client
                    .send(
                        new UpdateQuickConnectConfigCommand({
                            InstanceId: instId,
                            QuickConnectId: qcId,
                            QuickConnectConfig: remappedConfig as any
                        })
                    )
                    .then(() => {
                        changes.push('config')
                    })
            )
        }

        await Promise.all(ops)
        return { ok: true, changes, skipped }
    }
}

// ─── Agent Status ──────────────────────────────────────────────────────────────

const agentStatusSyncer: ResourceSyncer = {
    service: 'connect',
    resourceType: 'agent-state',

    async push(
        sourceData,
        _sourceArn,
        targetArn,
        _sourceCredentials,
        targetCredentials
    ): Promise<SyncPushResult> {
        const changes: string[] = []
        const skipped: string[] = []

        const creds = await targetCredentials()
        const client = getClient(regionFromArn(targetArn), creds)
        const instId = instanceIdFromArn(targetArn)
        const statusId = resourceIdFromArn(targetArn)

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await client.send(
            new UpdateAgentStatusCommand({
                InstanceId: instId,
                AgentStatusId: statusId,
                Name: sourceData.Name as any,
                Description: sourceData.Description as any,
                DisplayOrder: sourceData.DisplayOrder as any,
                State: sourceData.State as any
            })
        )
        changes.push('name/description/displayOrder/state')

        return { ok: true, changes, skipped }
    }
}

// ─── Security Profile ──────────────────────────────────────────────────────────

const securityProfileSyncer: ResourceSyncer = {
    service: 'connect',
    resourceType: 'security-profile',

    async push(
        sourceData,
        _sourceArn,
        targetArn,
        _sourceCredentials,
        targetCredentials
    ): Promise<SyncPushResult> {
        const changes: string[] = []
        const skipped: string[] = []

        const creds = await targetCredentials()
        const client = getClient(regionFromArn(targetArn), creds)
        const instId = instanceIdFromArn(targetArn)
        const profileId = resourceIdFromArn(targetArn)

        // UpdateSecurityProfile replaces the full permission set — pass everything we have
        const update: Record<string, unknown> = {
            InstanceId: instId,
            SecurityProfileId: profileId
        }
        if (typeof sourceData.Description === 'string') {
            update.Description = sourceData.Description
        }
        // Permissions array from resolver (ListSecurityProfilePermissions paginated)
        if (Array.isArray(sourceData.Permissions)) {
            update.Permissions = sourceData.Permissions
        } else {
            skipped.push('permissions (not available)')
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await client.send(new UpdateSecurityProfileCommand(update as any))
        changes.push('description')
        if (Array.isArray(sourceData.Permissions)) changes.push('permissions')

        return { ok: true, changes, skipped }
    }
}

// ─── User Hierarchy Group ──────────────────────────────────────────────────────

const userHierarchyGroupSyncer: ResourceSyncer = {
    service: 'connect',
    resourceType: 'agent-hierarchy',

    async push(
        sourceData,
        _sourceArn,
        targetArn,
        _sourceCredentials,
        targetCredentials
    ): Promise<SyncPushResult> {
        const changes: string[] = []
        const skipped: string[] = []

        const creds = await targetCredentials()
        const client = getClient(regionFromArn(targetArn), creds)
        const instId = instanceIdFromArn(targetArn)
        const groupId = resourceIdFromArn(targetArn)

        if (typeof sourceData.Name !== 'string') {
            return { ok: false, changes, skipped, error: 'Missing required field: Name' }
        }

        await client.send(
            new UpdateUserHierarchyGroupNameCommand({
                InstanceId: instId,
                HierarchyGroupId: groupId,
                Name: sourceData.Name
            })
        )
        changes.push('name')

        return { ok: true, changes, skipped }
    }
}

// ─── Rule ──────────────────────────────────────────────────────────────────────

const ruleSyncer: ResourceSyncer = {
    service: 'connect',
    resourceType: 'rule',

    async push(
        sourceData,
        _sourceArn,
        targetArn,
        _sourceCredentials,
        targetCredentials
    ): Promise<SyncPushResult> {
        const changes: string[] = []
        const skipped: string[] = []

        const creds = await targetCredentials()
        const region = regionFromArn(targetArn)
        const instId = instanceIdFromArn(targetArn)
        const ruleId = resourceIdFromArn(targetArn)

        const client = getClient(region, creds)

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await client.send(
            new UpdateRuleCommand({
                InstanceId: instId,
                RuleId: ruleId,
                Name: sourceData.Name as any,
                Function: sourceData.Function as any,
                Actions: sourceData.Actions as any,
                PublishStatus: sourceData.PublishStatus as any
            })
        )
        changes.push('name/function/actions/publishStatus')

        return { ok: true, changes, skipped }
    }
}

// ─── Task Template ─────────────────────────────────────────────────────────────

const taskTemplateSyncer: ResourceSyncer = {
    service: 'connect',
    resourceType: 'task-template',

    async push(
        sourceData,
        _sourceArn,
        targetArn,
        _sourceCredentials,
        targetCredentials
    ): Promise<SyncPushResult> {
        const changes: string[] = []
        const skipped: string[] = []

        const creds = await targetCredentials()
        const region = regionFromArn(targetArn)
        const instId = instanceIdFromArn(targetArn)
        const templateId = resourceIdFromArn(targetArn)

        const client = getClient(region, creds)

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await client.send(
            new UpdateTaskTemplateCommand({
                InstanceId: instId,
                TaskTemplateId: templateId,
                Name: sourceData.Name as any,
                Description: sourceData.Description as any,
                Status: sourceData.Status as any,
                Fields: sourceData.Fields as any,
                Constraints: sourceData.Constraints as any,
                Defaults: sourceData.Defaults as any
            })
        )
        changes.push('name/description/status/fields/constraints/defaults')

        return { ok: true, changes, skipped }
    }
}

// ─── Evaluation Form ───────────────────────────────────────────────────────────

const evaluationFormSyncer: ResourceSyncer = {
    service: 'connect',
    resourceType: 'evaluation-form',

    async push(
        sourceData,
        _sourceArn,
        targetArn,
        _sourceCredentials,
        targetCredentials
    ): Promise<SyncPushResult> {
        const changes: string[] = []
        const skipped: string[] = []

        if (!sourceData.Title || !sourceData.Items) {
            return { ok: false, changes, skipped, error: 'Missing required fields: Title, Items' }
        }
        if (typeof sourceData.EvaluationFormVersion !== 'number') {
            return {
                ok: false,
                changes,
                skipped,
                error: 'Missing EvaluationFormVersion — re-discover the source node'
            }
        }

        const creds = await targetCredentials()
        const client = getClient(regionFromArn(targetArn), creds)
        const instId = instanceIdFromArn(targetArn)
        const formId = resourceIdFromArn(targetArn)

        const update = {
            InstanceId: instId,
            EvaluationFormId: formId,
            EvaluationFormVersion: sourceData.EvaluationFormVersion,
            CreateNewVersion: true,
            Title: sourceData.Title,
            Description: sourceData.Description,
            Items: sourceData.Items,
            ScoringStrategy: sourceData.ScoringStrategy
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await client.send(new UpdateEvaluationFormCommand(update as any))
        changes.push('title/description/items/scoringStrategy')

        return { ok: true, changes, skipped }
    }
}

// ─── View ──────────────────────────────────────────────────────────────────────

const viewSyncer: ResourceSyncer = {
    service: 'connect',
    resourceType: 'view',

    async push(
        sourceData,
        _sourceArn,
        targetArn,
        _sourceCredentials,
        targetCredentials
    ): Promise<SyncPushResult> {
        const changes: string[] = []
        const skipped: string[] = []

        if (sourceData.Type === 'AWS_MANAGED') {
            skipped.push('AWS_MANAGED views cannot be updated')
            return { ok: true, changes, skipped }
        }

        const creds = await targetCredentials()
        const client = getClient(regionFromArn(targetArn), creds)
        const instId = instanceIdFromArn(targetArn)
        const viewId = resourceIdFromArn(targetArn)

        const ops: Array<Promise<void>> = []

        if (sourceData.Template !== undefined || sourceData.Actions !== undefined) {
            const status = (sourceData.Status as string | undefined) ?? 'SAVED'
            ops.push(
                client
                    .send(
                        new UpdateViewContentCommand({
                            InstanceId: instId,
                            ViewId: viewId,
                            Status: status as 'PUBLISHED' | 'SAVED',
                            Content: {
                                Template: sourceData.Template as string | undefined,
                                Actions: sourceData.Actions as string[] | undefined
                            }
                        })
                    )
                    .then(() => {
                        changes.push('content/template/actions')
                    })
            )
        }

        if (typeof sourceData.Name === 'string' || typeof sourceData.Description === 'string') {
            ops.push(
                client
                    .send(
                        new UpdateViewMetadataCommand({
                            InstanceId: instId,
                            ViewId: viewId,
                            Name: sourceData.Name as string | undefined,
                            Description: sourceData.Description as string | undefined
                        })
                    )
                    .then(() => {
                        changes.push('name/description')
                    })
            )
        }

        if (ops.length === 0) {
            skipped.push('no updatable fields in source data')
            return { ok: true, changes, skipped }
        }

        await Promise.all(ops)
        return { ok: true, changes, skipped }
    }
}

// ─── Prompt ────────────────────────────────────────────────────────────────────

const promptSyncer: ResourceSyncer = {
    service: 'connect',
    resourceType: 'prompt',

    async push(
        sourceData,
        _sourceArn,
        targetArn,
        _sourceCredentials,
        targetCredentials
    ): Promise<SyncPushResult> {
        const changes: string[] = []
        const skipped: string[] = []

        const creds = await targetCredentials()
        const client = getClient(regionFromArn(targetArn), creds)
        const instId = instanceIdFromArn(targetArn)
        const promptId = resourceIdFromArn(targetArn)

        if (typeof sourceData.Name !== 'string' && typeof sourceData.Description !== 'string') {
            skipped.push('no updatable fields in source data')
            return { ok: true, changes, skipped }
        }

        await client.send(
            new UpdatePromptCommand({
                InstanceId: instId,
                PromptId: promptId,
                Name: sourceData.Name as string | undefined,
                Description: sourceData.Description as string | undefined
            })
        )
        if (sourceData.Name) changes.push('name')
        if (sourceData.Description) changes.push('description')

        return { ok: true, changes, skipped }
    }
}

// ─── Register all ──────────────────────────────────────────────────────────────

registerSyncer('connect:contact-flow', contactFlowSyncer)
registerSyncer('connect:contact-flow-module', contactFlowModuleSyncer)
registerSyncer('connect:queue', queueSyncer)
registerSyncer('connect:routing-profile', routingProfileSyncer)
registerSyncer('connect:hoursOfOperation', hoursOfOperationSyncer)
registerSyncer('connect:quick-connect', quickConnectSyncer)
registerSyncer('connect:agent-state', agentStatusSyncer)
registerSyncer('connect:security-profile', securityProfileSyncer)
registerSyncer('connect:agent-hierarchy', userHierarchyGroupSyncer)
registerSyncer('connect:rule', ruleSyncer)
registerSyncer('connect:task-template', taskTemplateSyncer)
registerSyncer('connect:evaluation-form', evaluationFormSyncer)
registerSyncer('connect:view', viewSyncer)
registerSyncer('connect:prompt', promptSyncer)
