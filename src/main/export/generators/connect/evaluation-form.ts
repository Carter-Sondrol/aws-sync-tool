import type { CdkGenerator } from '../types'
import { connectInstanceRef } from './_shared'

function toCamelKeys(obj: unknown): unknown {
    if (Array.isArray(obj)) return obj.map(toCamelKeys)
    if (obj && typeof obj === 'object') {
        const result: Record<string, unknown> = {}
        for (const [k, v] of Object.entries(obj)) {
            const camelKey = k.charAt(0).toLowerCase() + k.slice(1)
            result[camelKey] = toCamelKeys(v)
        }
        return result
    }
    return obj
}

const generator: CdkGenerator = {
    service: 'connect',
    resourceType: 'evaluation-form',
    genSynced(node, ctx) {
        const d = node.data
        if (!d) return ''
        const id = ctx.nodeId(node)
        const instanceRef = connectInstanceRef(ctx)
        const items = toCamelKeys(d.Items ?? [])
        const scoringStrategy = d.ScoringStrategy
            ? `scoringStrategy: ${JSON.stringify(toCamelKeys(d.ScoringStrategy))},`
            : ''

        // Cast props as any — CDK's EvaluationFormBaseItemProperty union types are too strict
        return `    const ${id} = new connect.CfnEvaluationForm(this, '${id}', ({
      instanceArn: ${instanceRef},
      title: ${JSON.stringify(d.Title ?? id)},
      status: ${JSON.stringify(d.Status ?? 'DRAFT')},
      items: ${JSON.stringify(items)},
      ${d.Description ? `description: ${JSON.stringify(d.Description)},` : ''}
      ${scoringStrategy}
    }) as any);`
    }
}
export default generator
