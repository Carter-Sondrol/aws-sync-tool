import type { CdkGenerator } from '../types'

const generator: CdkGenerator = {
    service: 'kms',
    resourceType: 'key',
    genSynced(node, ctx) {
        const d = node.data
        if (!d) return ''
        const id = ctx.nodeId(node)
        const rotate = d.EnableKeyRotation !== false
        return `    const ${id} = new kms.Key(this, '${id}', {
      description: ${JSON.stringify(d.Description ?? '')},
      enableKeyRotation: ${rotate},
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });`
    },
    genReferenced(node, ctx) {
        const id = ctx.nodeId(node)
        return `    const ${id} = kms.Key.fromKeyArn(this, '${id}', arns.${id});`
    },
}

export default generator
