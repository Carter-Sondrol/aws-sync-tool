import type { DetectedSession, EnvironmentConfig } from '../types'
import { readJSON, writeJSON } from '../utils'

// ─── Credential validation (extracted from main/index.ts) ──────────────────────

interface STSValidationResult {
    valid: boolean
    accountId?: string
    arn?: string
    userName?: string
    error?: string
}

async function validateWithSTS(
    profileName: string | undefined,
    region: string
): Promise<STSValidationResult> {
    try {
        const { fromIni } = await import('@aws-sdk/credential-provider-ini')
        const { defaultProvider } = await import('@aws-sdk/credential-provider-node')
        const { STSClient, GetCallerIdentityCommand } = await import('@aws-sdk/client-sts')

        const provider = profileName ? fromIni({ profile: profileName }) : defaultProvider()
        const creds = await provider()

        const client = new STSClient({
            region,
            credentials: {
                accessKeyId: creds.accessKeyId,
                secretAccessKey: creds.secretAccessKey,
                sessionToken: creds.sessionToken
            }
        })

        const response = await client.send(new GetCallerIdentityCommand({}))
        const arn = response.Arn || ''
        const userNameMatch = arn.match(/user\/([^/]+)/)
        const roleMatch = arn.match(/assumed-role\/([^/]+)/)

        return {
            valid: true,
            accountId: response.Account,
            arn,
            userName: userNameMatch?.[1] ?? roleMatch?.[1]
        }
    } catch (err) {
        return { valid: false, error: err instanceof Error ? err.message : String(err) }
    }
}

// ─── Profile detection ────────────────────────────────────────────────────────

function parseProfileNames(): string[] {
    const { readFileSync } = require('fs')
    const { join } = require('path')
    const profiles: string[] = []
    const home = process.env.HOME || process.env.USERPROFILE || ''
    const files = [join(home, '.aws', 'config'), join(home, '.aws', 'credentials')]
    for (const file of files) {
        try {
            const content = readFileSync(file, 'utf-8')
            const regex = /^\[(?:profile\s+)?([^\]]+)\]/gm
            let match: RegExpExecArray | null
            while ((match = regex.exec(content)) !== null) {
                const name = match[1].trim()
                if (name && name !== 'default' && !profiles.includes(name)) profiles.push(name)
            }
        } catch {
            // file not present
        }
    }
    return profiles
}

function getProfileRegion(profileName: string): string {
    const { readFileSync } = require('fs')
    const { join } = require('path')
    const home = process.env.HOME || process.env.USERPROFILE || ''
    try {
        const content = readFileSync(join(home, '.aws', 'config'), 'utf-8')
        const sectionRe = new RegExp(
            `^\\[(?:profile\\s+)?${profileName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\]([\\s\\S]*?)(?=^\\[|$)`,
            'gm'
        )
        const section = sectionRe.exec(content)
        if (section) {
            const regionMatch = /region\s*=\s*(.+)/.exec(section[1])
            if (regionMatch) return regionMatch[1].trim()
        }
    } catch {
        // ignore
    }
    return process.env.AWS_DEFAULT_REGION || process.env.AWS_REGION || 'us-east-1'
}

// ─── Service interface ────────────────────────────────────────────────────────

export class AccountService {
    list(): EnvironmentConfig[] {
        return readJSON<EnvironmentConfig[]>('environments.json', [])
    }

    add(account: EnvironmentConfig): EnvironmentConfig {
        const accounts = this.list()
        const idx = accounts.findIndex((a) => a.id === account.id)
        if (idx >= 0) accounts[idx] = account
        else accounts.push(account)
        writeJSON('environments.json', accounts)
        return account
    }

    remove(id: string): void {
        const accounts = this.list().filter((a) => a.id !== id)
        writeJSON('environments.json', accounts)
    }

    async validate(id: string): Promise<STSValidationResult> {
        const accounts = this.list()
        const account = accounts.find((a) => a.id === id)
        if (!account) return { valid: false, error: 'Environment not found' }

        const result = await validateWithSTS(account.profileName, account.region)

        if (result.valid && result.accountId && !account.accountId) {
            account.accountId = result.accountId
            writeJSON(
                'environments.json',
                accounts.map((a) => (a.id === id ? account : a))
            )
        }
        return result
    }

    async detectSessions(): Promise<DetectedSession[]> {
        const results: DetectedSession[] = []
        const defaultRegion =
            process.env.AWS_DEFAULT_REGION || process.env.AWS_REGION || 'us-east-1'
        results.push({ source: 'default', ...(await validateWithSTS(undefined, defaultRegion)) })

        for (const profileName of parseProfileNames().slice(0, 20)) {
            const region = getProfileRegion(profileName)
            results.push({
                source: `profile:${profileName}`,
                region,
                ...(await validateWithSTS(profileName, region))
            })
        }
        return results
    }

    /** Resolve AWS credentials for an environment */
    async resolveCredentials(environment: EnvironmentConfig) {
        const { fromIni } = await import('@aws-sdk/credential-provider-ini')
        const { defaultProvider } = await import('@aws-sdk/credential-provider-node')
        const provider = environment.profileName
            ? fromIni({ profile: environment.profileName })
            : defaultProvider()
        return provider()
    }
}
