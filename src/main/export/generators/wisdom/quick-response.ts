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
 * QConnect quick-response ARN: wisdom:...:quick-response/<KB_ID>/<QR_ID>
 * Derive the parent KB ARN from the resource's own ARN when the resolver
 * didn't capture knowledgeBaseArn directly.
 */
function deriveKbArnFromQrArn(qrArn: string): string | undefined {
    const m = qrArn.match(/^(arn:[^:]+:wisdom:[^:]+:[^:]+):quick-response\/([^/]+)\//)
    if (!m) return undefined
    return `${m[1]}:knowledge-base/${m[2]}`
}

/**
 * Rewrite a source-account ARN to its target-account equivalent via the graph.
 * Returns null if the ARN can't be translated (no node, or no target-env snapshot).
 */
function rewriteArnToTarget(rawArn: string, ctx: GenContext): string | null {
    const n = ctx.nodeByArn.get(rawArn)
    if (!n) return null
    return n.envData?.get(ctx.targetAccountId)?.arn.raw ?? null
}

function genQConnectQuickResponseSynced(node: GraphNode, ctx: GenContext): string {
    const d = node.data
    if (!d) return ''
    const id = ctx.nodeId(node)
    const rawKbArn =
        (d.knowledgeBaseArn as string | undefined) ?? deriveKbArnFromQrArn(node.arn.raw)
    const kbArnExpr = resolveWisdomKbArn(rawKbArn, ctx)
    if (kbArnExpr === KB_FALLBACK) {
        return `    // QuickResponse '${String(d.name ?? node.logicalId)}' — knowledge base not linked to target, skipping`
    }

    const contents = d.contents as Record<string, { content?: string } | undefined> | undefined
    const plainText = contents?.plainText?.content
    const markdown = contents?.markdown?.content

    // CFN requires QuickResponse content to have minLength 1; empty source data
    // would fail at deploy. Skip such resources with a comment.
    const hasContent =
        (typeof plainText === 'string' && plainText.length > 0) ||
        (typeof markdown === 'string' && markdown.length > 0)
    if (!hasContent) {
        return `    // QuickResponse '${String(d.name ?? node.logicalId)}' — empty content, skipping (CFN minLength=1)`
    }

    // CDK's CfnQuickResponse `content` is `{ content: string }` — a single flat
    // field. The service decides plainText vs markdown from `contentType`, not
    // from a nested key. Emitting `{ plainText: { content: ... } }` makes CFN
    // see no Content field and pass an empty string to the API, which then
    // rejects with minLength=1.
    const contentStr =
        typeof plainText === 'string' && plainText.length > 0
            ? plainText
            : String(markdown)
    const contentObj = `{ content: ${JSON.stringify(contentStr)} }`

    // groupingConfiguration.values may carry source-account routing-profile ARNs.
    // QConnect validates these against the target instance — rewrite to target ARNs,
    // dropping entries we can't translate. If no values survive, omit the field.
    let groupingExpr = ''
    const grouping = d.groupingConfiguration as
        | { criteria?: string; values?: unknown }
        | undefined
    if (grouping && Array.isArray(grouping.values) && typeof grouping.criteria === 'string') {
        const rewritten: string[] = []
        for (const v of grouping.values) {
            if (typeof v !== 'string' || !v.startsWith('arn:')) continue
            const targetArn = rewriteArnToTarget(v, ctx)
            if (targetArn) rewritten.push(targetArn)
        }
        if (rewritten.length > 0) {
            groupingExpr = `groupingConfiguration: ${JSON.stringify({ criteria: grouping.criteria, values: rewritten })} as any,`
        }
    }

    return `    const ${id} = new wisdom.CfnQuickResponse(this, '${id}', {
      knowledgeBaseArn: ${kbArnExpr},
      name: ${JSON.stringify(d.name ?? node.logicalId)},
      content: ${contentObj} as any,
      ${d.contentType ? `contentType: ${JSON.stringify(d.contentType)},` : ''}
      ${d.description ? `description: ${JSON.stringify(d.description)},` : ''}
      ${d.shortcutKey ? `shortcutKey: ${JSON.stringify(d.shortcutKey)},` : ''}
      ${d.isActive !== undefined ? `isActive: ${d.isActive},` : ''}
      ${d.channels ? `channels: ${JSON.stringify(d.channels)},` : ''}
      ${d.language ? `language: ${JSON.stringify(d.language)},` : ''}
      ${groupingExpr}
    });`
}

const generator: CdkGenerator = {
    service: 'qconnect',
    resourceType: 'quick-response',
    genSynced(node, ctx) {
        return genQConnectQuickResponseSynced(node, ctx)
    }
}

export default generator
