import type { CdkGenerator } from '../types'
import { connectInstanceRef } from './_shared'

const generator: CdkGenerator = {
    service: 'connect',
    resourceType: 'view',
    genSynced(node, ctx) {
        const d = node.data
        if (!d) return ''
        const id = ctx.nodeId(node)
        const instanceRef = connectInstanceRef(ctx)

        // Template from the API is a JSON string — embed as parsed object literal
        let templateExpr = '{}'
        if (d.Template && typeof d.Template === 'string') {
            try {
                templateExpr = JSON.stringify(JSON.parse(d.Template))
            } catch {
                templateExpr = JSON.stringify(d.Template)
            }
        }

        const actions = (d.Actions as string[] | undefined) ?? []

        return `    const ${id} = new connect.CfnView(this, '${id}', {
      instanceArn: ${instanceRef},
      name: ${JSON.stringify(d.Name)},
      template: ${templateExpr},
      actions: ${JSON.stringify(actions)},
      ${d.Description ? `description: ${JSON.stringify(d.Description)},` : ''}
    });`
    }
}
export default generator
