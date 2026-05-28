// ─── Shared types (no Electron dependencies) ──────────────────────────────────

export interface EnvironmentConfig {
    id: string
    label: string
    profileName?: string
    region: string
    regions?: string[]
    accountId?: string
}

export interface DetectedSession {
    source: string
    accountId?: string
    arn?: string
    userName?: string
    region?: string
    error?: string
}

/** Get all regions for an environment (explicit list or single region) */
export function getAllRegions(environment: EnvironmentConfig): string[] {
    return environment.regions?.length ? environment.regions : [environment.region]
}
