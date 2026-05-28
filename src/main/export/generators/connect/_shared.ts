import { decodeRefToken } from '../../../discovery/arn'
import type { GenContext } from '../types'

export function connectInstanceRef(ctx: GenContext): string {
    return ctx.connectInstArnExpr
}

export function resolveConnectNodeRef(
    rawArn: string | undefined,
    ctx: GenContext,
    attrName: string,
    fallback: string
): string {
    if (!rawArn) return fallback
    const decoded = decodeRefToken(rawArn) ?? rawArn
    if (!decoded.startsWith('arn:')) return fallback
    const n = ctx.nodeByArn.get(decoded)
    if (!n) return fallback
    if (n.included && ctx.inScopeArns.has(n.arn.raw)) return `${ctx.nodeId(n)}.${attrName}`
    if (n.included) return JSON.stringify(n.arn.raw)
    // Cross-account: if the node belongs to a different account and has no target env ARN,
    // fall back so callers can skip this reference rather than emitting a broken ARN.
    if (n.arn?.accountId && n.arn.accountId !== ctx.targetAccountId && n.arn.accountId !== 'default') {
        const targetEnvArn = n.envData?.get(ctx.targetAccountId)?.arn.raw
        if (!targetEnvArn) return fallback
    }
    return `arns.${ctx.nodeId(n)}`
}
