import type { Credentials } from '../discovery/CredentialsProvider'
import type { RemappingContext } from './remapping'

export interface SyncPushResult {
    ok: boolean
    changes: string[]
    skipped: string[]
    error?: string
}

/** Optional context passed to syncers for cross-environment ID resolution */
export interface SyncContext {
    remapping: RemappingContext | null
}

export interface ResourceSyncer {
    service: string
    resourceType: string

    push(
        sourceData: Record<string, unknown>,
        sourceArn: string,
        targetArn: string,
        sourceCredentials: () => Promise<Credentials>,
        targetCredentials: () => Promise<Credentials>,
        context?: SyncContext
    ): Promise<SyncPushResult>
}
