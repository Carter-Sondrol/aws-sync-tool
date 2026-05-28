import type { CdkGenerator, GenContext } from '../types'
import type { GraphNode } from '../../../graph-types'

const KB_FALLBACK = `'REPLACE_WITH_KNOWLEDGE_BASE_ARN'`

function resolveWisdomKbArn(rawArn: string | undefined, ctx: GenContext): string {
    if (!rawArn) return KB_FALLBACK
    const n = ctx.nodeByArn.get(rawArn)
    if (!n) return JSON.stringify(rawArn)
    if (n.included && ctx.inScopeArns.has(n.arn.raw)) return `${ctx.nodeId(n)}.attrKnowledgeBaseArn`
    if (n.included) return JSON.stringify(n.arn.raw)
    if (n.envData?.has(ctx.targetAccountId)) return `arns.${ctx.nodeId(n)}`
    return KB_FALLBACK
}

/**
 * QConnect message-template ARN: wisdom:...:message-template/<KB_ID>/<MT_ID>
 * Derive the parent KB ARN from the resource's own ARN when the resolver
 * didn't capture knowledgeBaseArn directly.
 */
function deriveKbArnFromMtArn(mtArn: string): string | undefined {
    const m = mtArn.match(/^(arn:[^:]+:wisdom:[^:]+:[^:]+):message-template\/([^/]+)\//)
    if (!m) return undefined
    return `${m[1]}:knowledge-base/${m[2]}`
}

function genQConnectMessageTemplateSynced(node: GraphNode, ctx: GenContext): string {
    const d = node.data
    if (!d) return ''
    const id = ctx.nodeId(node)
    const rawKbArn =
        (d.knowledgeBaseArn as string | undefined) ?? deriveKbArnFromMtArn(node.arn.raw)
    const kbArnExpr = resolveWisdomKbArn(rawKbArn, ctx)
    if (kbArnExpr === KB_FALLBACK) {
        return `    // MessageTemplate '${String(d.name ?? node.logicalId)}' — knowledge base not linked to target, skipping`
    }

    // QConnect API returns content under lowercase channel keys (e.g. { sms: {...} } or { email: {...} }).
    // CFN expects the typed-content keys: smsMessageTemplateContent / emailMessageTemplateContent.
    const rawContent = (d.content ?? {}) as Record<string, unknown>
    const cfnContent: Record<string, unknown> = {}
    if (rawContent.sms) cfnContent.smsMessageTemplateContent = rawContent.sms
    if (rawContent.email) cfnContent.emailMessageTemplateContent = rawContent.email

    return `    const ${id} = new wisdom.CfnMessageTemplate(this, '${id}', {
      knowledgeBaseArn: ${kbArnExpr},
      name: ${JSON.stringify(d.name ?? node.logicalId)},
      channelSubtype: ${JSON.stringify(d.channelSubtype ?? 'EMAIL')},
      content: ${JSON.stringify(cfnContent)} as any,
      ${d.description ? `description: ${JSON.stringify(d.description)},` : ''}
      ${d.language ? `language: ${JSON.stringify(d.language)},` : ''}
      ${d.defaultAttributes ? `defaultAttributes: ${JSON.stringify(d.defaultAttributes)} as any,` : ''}
      ${d.groupingConfiguration ? `groupingConfiguration: ${JSON.stringify(d.groupingConfiguration)} as any,` : ''}
    });`
}

const generator: CdkGenerator = {
    service: 'qconnect',
    resourceType: 'message-template',
    genSynced(node, ctx) {
        return genQConnectMessageTemplateSynced(node, ctx)
    }
}

export default generator
