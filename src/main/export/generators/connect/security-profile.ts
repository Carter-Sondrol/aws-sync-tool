import type { CdkGenerator } from '../types'
import { connectInstanceRef } from './_shared'

const CONNECT_BUILTIN_SECURITY_PROFILES = new Set(['Admin', 'Agent', 'CallCenterManager', 'QualityAnalyst'])

const generator: CdkGenerator = {
    service: 'connect',
    resourceType: 'security-profile',
    genSynced(node, ctx) {
        const d = node.data
        if (!d) return ''
        const id = ctx.nodeId(node)
        const instanceRef = connectInstanceRef(ctx)
        const name = d.SecurityProfileName as string | undefined
        const permissions = (d.Permissions as string[]) ?? []

        if (name && CONNECT_BUILTIN_SECURITY_PROFILES.has(name)) {
            return `    // Security profile '${name}' is built into every Connect instance — skipping creation`
        }

        return `    const ${id} = new connect.CfnSecurityProfile(this, '${id}', {
      instanceArn: ${instanceRef},
      securityProfileName: ${JSON.stringify(name)},
      ${permissions.length ? `permissions: ${JSON.stringify(permissions)},` : ''}
      ${d.Description ? `description: ${JSON.stringify(d.Description)},` : ''}
    });`
    }
}
export default generator
