import type { CdkGenerator } from '../types'

const generator: CdkGenerator = {
    service: 'cloudformation',
    resourceType: 'stack',
    genSynced(node, _ctx) {
        const d = node.data
        if (!d) return ''
        return `    // CloudFormation stack '${String(d.StackName ?? node.logicalId)}' — child resources are declared as individual constructs above`
    },
    genReferenced(node, ctx) {
        const id = ctx.nodeId(node)
        return `    // Existing CloudFormation stack — referenced by ARN\n    const ${id}Arn = arns.${id};`
    },
}

export default generator
