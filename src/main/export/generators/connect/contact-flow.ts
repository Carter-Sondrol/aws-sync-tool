import type { CdkGenerator, GeneratedFile } from '../types'
import { connectInstanceRef } from './_shared'

const generator: CdkGenerator = {
    service: 'connect',
    resourceType: 'contact-flow',
    genSynced(node, ctx): { code: string; files?: GeneratedFile[] } {
        const d = node.data
        if (!d) return { code: '// No flow data available' }
        const content = d.Content as string | undefined
        const id = ctx.nodeId(node)
        const instanceRef = connectInstanceRef(ctx)

        let contentCode: string
        let flowFile: { path: string; content: string } | undefined

        if (content) {
            try {
                JSON.parse(content)
                flowFile = {
                    path: `flows/${id}.json`,
                    content: JSON.stringify(JSON.parse(content), null, 2)
                }
                contentCode = `fs.readFileSync(path.join(__dirname, '../flows/${id}.json'), 'utf-8')`
            } catch {
                contentCode = JSON.stringify(content)
            }
        } else {
            contentCode = `'{}' // TODO: add contact flow content`
        }

        const code = `    const ${id} = new connect.CfnContactFlow(this, '${id}', {
      instanceArn: ${instanceRef},
      name: ${JSON.stringify(d.Name)},
      type: ${JSON.stringify(d.Type ?? 'CONTACT_FLOW')},
      content: ${contentCode},
      ${d.Description ? `description: ${JSON.stringify(d.Description)},` : ''}
    });`

        return { code, files: flowFile ? [flowFile] : undefined }
    }
}
export default generator
