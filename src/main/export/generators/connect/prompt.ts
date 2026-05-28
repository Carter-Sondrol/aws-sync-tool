import type { CdkGenerator } from '../types'
import { connectInstanceRef } from './_shared'

const generator: CdkGenerator = {
    service: 'connect',
    resourceType: 'prompt',
    genSynced(node, ctx) {
        const d = node.data
        if (!d) return ''
        const id = ctx.nodeId(node)
        const instanceRef = connectInstanceRef(ctx)

        return `    const ${id} = new connect.CfnPrompt(this, '${id}', {
      instanceArn: ${instanceRef},
      name: ${JSON.stringify(d.Name)},
      // s3Uri: 'REPLACE_WITH_S3_URI', // Upload prompt audio file to S3 and set this URI
      ${d.Description ? `description: ${JSON.stringify(d.Description)},` : ''}
    });`
    }
}
export default generator
