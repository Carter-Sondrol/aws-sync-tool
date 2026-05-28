import { readJSON, writeJSON } from '../utils'
import { getLogger } from '../logging'

const log = getLogger('link-service')

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface LinkSource {
    /** ARN of this resource in its native environment */
    arn: string
    /** Environment ID this ARN belongs to */
    envId: string
    /** Whether this source is the "deployable" (primary) version */
    included: boolean
}

export interface ResourceLink {
    /** Stable logical identifier for this resource across all environments */
    unifiedId: string
    /** Optional human-readable label override */
    label?: string
    /** One entry per environment that has this resource */
    sources: LinkSource[]
}

export interface LinksFile {
    version: '1'
    links: ResourceLink[]
}

// ─── Service ──────────────────────────────────────────────────────────────────

export class LinkService {
    private load(): LinksFile {
        const raw = readJSON<unknown>('links.json', { version: '1', links: [] })
        // Handle legacy format (plain array written before versioned envelope)
        if (Array.isArray(raw)) {
            return { version: '1', links: raw as ResourceLink[] }
        }
        return raw as LinksFile
    }

    private save(file: LinksFile): void {
        writeJSON('links.json', file)
    }

    list(): ResourceLink[] {
        return this.load().links
    }

    /** Add or update a cross-env link */
    upsert(link: ResourceLink): void {
        const file = this.load()
        const idx = file.links.findIndex((l) => l.unifiedId === link.unifiedId)
        if (idx >= 0) {
            file.links[idx] = link
        } else {
            file.links.push(link)
        }
        this.save(file)
    }

    /**
     * Add sources to a link, deduplicating by ARN. Creates the link if it
     * doesn't exist. First occurrence of an ARN wins — this matters when
     * source and target ARNs are identical (same-account same-instance), where
     * the caller would otherwise push both an included=true and included=false
     * entry for the same ARN.
     */
    addSources(unifiedId: string, label: string | undefined, newSources: LinkSource[]): {
        created: boolean
        added: number
        deduped: number
    } {
        const file = this.load()
        const idx = file.links.findIndex((l) => l.unifiedId === unifiedId)
        let created = false
        let added = 0
        let deduped = 0
        if (idx >= 0) {
            const existing = file.links[idx]
            const existingArns = new Set(existing.sources.map((s) => s.arn))
            const toAdd: LinkSource[] = []
            const seen = new Set<string>(existingArns)
            for (const s of newSources) {
                if (seen.has(s.arn)) { deduped++; continue }
                seen.add(s.arn)
                toAdd.push(s)
            }
            added = toAdd.length
            file.links[idx] = {
                ...existing,
                label: label ?? existing.label,
                sources: [...existing.sources, ...toAdd]
            }
        } else {
            created = true
            const seen = new Set<string>()
            const deduped_sources: LinkSource[] = []
            for (const s of newSources) {
                if (seen.has(s.arn)) { deduped++; continue }
                seen.add(s.arn)
                deduped_sources.push(s)
            }
            added = deduped_sources.length
            file.links.push({ unifiedId, label, sources: deduped_sources })
        }
        this.save(file)
        log.debug(
            `addSources[${unifiedId}] created=${created} added=${added} deduped=${deduped} total=${file.links.length}`
        )
        return { created, added, deduped }
    }

    remove(unifiedId: string): boolean {
        const file = this.load()
        const before = file.links.length
        file.links = file.links.filter((l) => l.unifiedId !== unifiedId)
        if (file.links.length < before) {
            this.save(file)
            return true
        }
        return false
    }

    /** Find the ARN for a given resource in a target environment */
    resolveArn(sourceArn: string, targetEnvId: string): string | null {
        const links = this.load().links
        for (const link of links) {
            const hasSource = link.sources.some((s) => s.arn === sourceArn)
            if (!hasSource) continue
            const target = link.sources.find((s) => s.envId === targetEnvId)
            if (target) return target.arn
        }
        return null
    }

    /**
     * Build a full ARN → ARN translation map for the given target environment.
     * Useful for rewriting all ARN references in a generated CDK project.
     */
    buildArnMap(targetEnvId: string): Map<string, string> {
        const map = new Map<string, string>()
        for (const link of this.load().links) {
            const targetSource = link.sources.find((s) => s.envId === targetEnvId)
            if (!targetSource) continue
            for (const src of link.sources) {
                if (src.envId !== targetEnvId) {
                    map.set(src.arn, targetSource.arn)
                }
            }
        }
        return map
    }

    /** Count links and how many cover a given env */
    stats(envId?: string): { total: number; withEnv: number } {
        const links = this.load().links
        return {
            total: links.length,
            withEnv: envId
                ? links.filter((l) => l.sources.some((s) => s.envId === envId)).length
                : links.length
        }
    }
}
