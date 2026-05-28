// ARN parsing and reference-extraction utilities.

const ARN_REGEX =
    /^arn:(?<partition>[^:]+):(?<service>[^:]*):(?<region>[^:]*):(?<account_id>[^:]*):(?<resource>.+)$/

const FULL_ARN_REGEX = // No groups
    /^arn:[^:]+:[^:]*:[^:]*:[^:]*:[^:]+$/

const ARN_CACHE = new Map<string, ParsedARN>()

export interface ParsedARN {
    raw: string
    partition: string
    service: string
    region: string
    accountId: string
    resource: string
    resourceType: string
    resourceId: string
}

//Regex match for all ARNs
export function parseARNs(value: string): ParsedARN[] | null {
    const normalized = value.replace(/[/:]+$/, '')
    const m = normalized.matchAll(FULL_ARN_REGEX)
    const arns: ParsedARN[] = []
    for (const match of m) {
        const parsed = parseARN(match[0])
        if (parsed) arns.push(parsed)
    }
    return arns
}

export function parseARN(value: string): ParsedARN | null {
    const normalized = value.replace(/[/:]+$/, '')
    if (ARN_CACHE.has(normalized)) return ARN_CACHE.get(normalized)!

    const m = normalized.match(ARN_REGEX)
    if (!m?.groups) return null

    const { partition, service, region, account_id, resource } = m.groups
    const parts = resource.split(/[:/]/).filter(Boolean)
    const resourceType = extractResourceType(service, parts)
    const resourceId =
        service === 'cloudformation' && parts[0] === 'stack'
            ? (parts[1] ?? resource)
            : (parts[parts.length - 1] ?? resource)

    const result: ParsedARN = {
        raw: normalized,
        partition,
        service,
        region,
        accountId: account_id,
        resource,
        resourceType,
        resourceId
    }

    if (ARN_CACHE.size < 4096) ARN_CACHE.set(normalized, result)
    return result
}

function extractResourceType(service: string, parts: string[]): string {
    if (service === 'cloudformation') return parts[0] ?? 'unknown'
    if (service === 'connect') {
        if (parts.length === 2 && parts[0] === 'instance') return 'instance'
        if (parts.length === 2 && parts[0] === 'phone-number') return 'phone-number'
        if (parts.length >= 3 && parts[0] === 'instance') {
            // Connect uses 'transfer-destination' in ARNs for what the API calls quick connects
            const seg = parts[2]
            if (seg === 'transfer-destination') return 'quick-connect'
            if (seg === 'agent-group') return 'agent-hierarchy'
            return seg
        }
        return 'unknown'
    }
    if (service === 'lambda') {
        if (!parts.length) return 'unknown'
        if (parts[0] === 'function') return 'function'
        if (parts[0] === 'layer') return parts.length >= 3 ? 'layerversion' : 'layer'
        return 'unknown'
    }
    if (service === 'iam' && parts.length >= 1) return parts[0]
    if (service === 's3') return parts.length > 1 ? 'object' : 'bucket'
    if (service === 'dynamodb') return parts[0] ?? 'unknown'
    if (service === 'sqs') return 'queue'
    if (service === 'sns') return 'topic'
    if (service === 'ssm' && parts[0] === 'parameter') return 'parameter'
    if (service === 'events' && parts[0] === 'rule') return 'rule'
    // wisdom/qconnect ARNs nest by KB: e.g. message-template/KB/MT, quick-response/KB/QR.
    // First segment is the resource type; deeper segments are scope/IDs.
    if ((service === 'wisdom' || service === 'qconnect') && parts.length >= 1) return parts[0]
    if (parts.length >= 2) return parts[parts.length - 2]
    return parts[0] ?? 'unknown'
}

export function canonicalForGraph(arn: string): string | null {
    const parsed = parseARN(arn)
    if (!parsed) return null
    // Wildcards are not graphable
    if (parsed.resource.includes('*')) return null
    // S3 objects collapse to their bucket
    if (parsed.service === 's3' && parsed.resource.includes('/')) {
        const bucket = parsed.resource.split('/', 1)[0]
        return `arn:${parsed.partition}:s3:::${bucket}`
    }
    return parsed.raw
}

// ─── ARN extraction from resource data ───────────────────────────────────────

export interface ExtractedARNs {
    /** Data with ARNs replaced by __REF_{arn}__ placeholders */
    sanitizedData: Record<string, unknown>
    /** ARN → set of field-path labels that led to it */
    arnPaths: Map<string, Set<string>>
}

const SKIP_SERVICES = new Set(['lambda'])

export function extractARNs(obj: Record<string, unknown>): ExtractedARNs {
    const arnPaths = new Map<string, Set<string>>()

    function addRef(arn: string, key: string): void {
        const set = arnPaths.get(arn)
        if (set) set.add(key)
        else arnPaths.set(arn, new Set([key]))
    }

    function isGraphableArn(value: string): string | null {
        if (!value.startsWith('arn:') || value.length > 512 || value.includes(' ')) return null
        const canonical = canonicalForGraph(value)
        if (!canonical) return null
        const parsed = parseARN(canonical)
        if (!parsed) return null
        // Skip lambda runtimes, cloudformation internals
        if (parsed.service === 'lambda' && parsed.resourceType === 'runtime') return null
        if (
            parsed.service === 'cloudformation' &&
            !['stack', 'stackset'].includes(parsed.resourceType)
        )
            return null
        if (SKIP_SERVICES.has(parsed.service) && parsed.service !== 'lambda') return null
        return canonical
    }

    function walk(value: unknown, path: string[]): unknown {
        if (value == null || typeof value !== 'object') {
            if (typeof value === 'string') {
                const canonical = isGraphableArn(value)
                if (canonical) {
                    addRef(canonical, path.filter(Boolean).join('.'))
                    return `__REF_${canonical}__`
                }
            }
            return value
        }
        if (Array.isArray(value)) {
            return value.map((item, i) => walk(item, [...path, String(i)]))
        }
        const out: Record<string, unknown> = {}
        for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
            out[k] = walk(v, [...path, k])
        }
        return out
    }

    const sanitizedData = walk(obj, []) as Record<string, unknown>
    return { sanitizedData, arnPaths }
}

export function shortLabel(arn: string): string {
    const parsed = parseARN(arn)
    if (!parsed) return arn
    return parsed.resourceId || parsed.resource
}

/** Inverse of the __REF_${arn}__ placeholder written by extractARNs. Returns the original ARN or null. */
export function decodeRefToken(value: string): string | null {
    const m = value.match(/^__REF_(.+)__$/)
    return m ? m[1] : null
}
