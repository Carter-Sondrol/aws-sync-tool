import type { CdkGenerator } from '../types'
import { connectInstanceRef } from './_shared'

const generator: CdkGenerator = {
    service: 'connect',
    resourceType: 'predefined-attribute',
    genSynced(node, ctx) {
        const d = node.data
        if (!d) return ''
        const id = ctx.nodeId(node)
        const instanceRef = connectInstanceRef(ctx)

        const values = d.Values as { StringList?: string[] } | undefined
        const stringList = values?.StringList ?? []

        // CloudFormation requires at least 1 value in StringList — skip if empty
        if (stringList.length === 0) {
            return `    // PredefinedAttribute '${String(d.Name)}' — empty StringList, skipping (TODO: add values)`
        }

        return `    const ${id} = new connect.CfnPredefinedAttribute(this, '${id}', {
      instanceArn: ${instanceRef},
      name: ${JSON.stringify(d.Name)},
      values: {
        stringList: ${JSON.stringify(stringList)},
      },
    });`
    }
}
export default generator
