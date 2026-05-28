import type { CdkGenerator } from '../types'
import { connectInstanceRef } from './_shared'

const CONNECT_BUILTIN_AGENT_STATUSES = new Set(['Available', 'Offline'])

const generator: CdkGenerator = {
    service: 'connect',
    resourceType: 'agent-state',
    genSynced(node, ctx) {
        const d = node.data
        if (!d) return ''
        const id = ctx.nodeId(node)
        const instanceRef = connectInstanceRef(ctx)
        const name = d.Name as string | undefined

        if (name && CONNECT_BUILTIN_AGENT_STATUSES.has(name)) {
            return `    // Agent status '${name}' is built into every Connect instance — skipping creation`
        }

        return `    const ${id} = new connect.CfnAgentStatus(this, '${id}', {
      instanceArn: ${instanceRef},
      name: ${JSON.stringify(name)},
      state: ${JSON.stringify(d.State ?? 'ENABLED')},
      ${d.Type ? `type: ${JSON.stringify(d.Type)},` : ''}
      ${d.DisplayOrder !== undefined ? `displayOrder: ${d.DisplayOrder},` : ''}
      ${d.Description ? `description: ${JSON.stringify(d.Description)},` : ''}
    });`
    }
}
export default generator
