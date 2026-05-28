import {
    ConnectClient,
    UpdateUserConfigCommand,
    UpdateUserHierarchyCommand,
    UpdateUserRoutingProfileCommand,
    UpdateUserSecurityProfilesCommand
} from '@aws-sdk/client-connect'
import { parseARN } from '../../discovery/arn'
import type { Credentials } from '../../discovery/CredentialsProvider'
import { registerSyncer } from '../registry'
import type { ResourceSyncer, SyncContext, SyncPushResult } from '../syncer'

const clientCache = new Map<string, ConnectClient>()

function getClient(region: string, creds: Credentials): ConnectClient {
    const key = `${region}:${creds.accessKeyId}`
    if (!clientCache.has(key))
        clientCache.set(key, new ConnectClient({ region, credentials: creds }))
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

const connectUserSyncer: ResourceSyncer = {
    service: 'connect',
    resourceType: 'user',

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
        const userId = resourceIdFromArn(targetArn)

        // Helper to remap Connect resource IDs through the mapping table
        const remap = (id: string | undefined): string | undefined =>
            id !== undefined ? (context?.remapping?.resolveId(id, 'connect') ?? id) : undefined

        // Sync routing profile assignment
        if (typeof sourceData.RoutingProfileId === 'string') {
            const mapped = remap(sourceData.RoutingProfileId)
            if (mapped) {
                await client.send(
                    new UpdateUserRoutingProfileCommand({
                        InstanceId: instId,
                        UserId: userId,
                        RoutingProfileId: mapped
                    })
                )
                changes.push('routingProfile')
            }
        }

        // Sync security profiles assignment (replaces all)
        if (
            Array.isArray(sourceData.SecurityProfileIds) &&
            sourceData.SecurityProfileIds.length > 0
        ) {
            const mapped = sourceData.SecurityProfileIds.map((id: string) => remap(id)).filter(
                Boolean
            ) as string[]
            await client.send(
                new UpdateUserSecurityProfilesCommand({
                    InstanceId: instId,
                    UserId: userId,
                    SecurityProfileIds: mapped
                })
            )
            changes.push('securityProfiles')
        }

        // Sync hierarchy group assignment (null clears it)
        if (sourceData.HierarchyGroupId !== undefined) {
            const mapped = sourceData.HierarchyGroupId
                ? remap(sourceData.HierarchyGroupId as string)
                : undefined
            await client.send(
                new UpdateUserHierarchyCommand({
                    InstanceId: instId,
                    UserId: userId,
                    HierarchyGroupId: mapped ?? undefined
                })
            )
            changes.push('hierarchyGroup')
        }

        // Sync per-channel configs (auto-accept, ACW timeout, phone numbers, persistent connection, voice enhancement)
        const hasConfig = [
            sourceData.AutoAcceptConfigs,
            sourceData.AfterContactWorkConfigs,
            sourceData.PersistentConnectionConfigs,
            sourceData.PhoneNumberConfigs,
            sourceData.VoiceEnhancementConfigs
        ].some((arr) => Array.isArray(arr))

        if (hasConfig) {
            const configUpdate: Record<string, unknown> = { InstanceId: instId, UserId: userId }
            if (Array.isArray(sourceData.AutoAcceptConfigs)) {
                configUpdate.AutoAcceptConfigs = sourceData.AutoAcceptConfigs.map(
                    (cfg: Record<string, unknown>) => ({
                        ...cfg,
                        RoutingProfileId: remap(cfg.RoutingProfileId as string | undefined)
                    })
                )
            }
            if (Array.isArray(sourceData.AfterContactWorkConfigs)) {
                configUpdate.AfterContactWorkConfigs = sourceData.AfterContactWorkConfigs.map(
                    (cfg: Record<string, unknown>) => ({
                        ...cfg,
                        RoutingProfileId: remap(cfg.RoutingProfileId as string | undefined)
                    })
                )
            }
            if (Array.isArray(sourceData.PersistentConnectionConfigs)) {
                configUpdate.PersistentConnectionConfigs = sourceData.PersistentConnectionConfigs
            }
            if (Array.isArray(sourceData.PhoneNumberConfigs)) {
                configUpdate.PhoneNumberConfigs = sourceData.PhoneNumberConfigs.map(
                    (cfg: Record<string, unknown>) => ({
                        ...cfg,
                        PhoneNumberId: remap(cfg.PhoneNumberId as string | undefined)
                    })
                )
            }
            if (Array.isArray(sourceData.VoiceEnhancementConfigs)) {
                configUpdate.VoiceEnhancementConfigs = sourceData.VoiceEnhancementConfigs
            }

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await client.send(new UpdateUserConfigCommand(configUpdate as any))
            changes.push('userConfig')
        }

        return { ok: true, changes, skipped }
    }
}

registerSyncer('connect:user', connectUserSyncer)
