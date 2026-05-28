import type { CdkGenerator } from '../types'

const generator: CdkGenerator = {
    service: 'secretsmanager',
    resourceType: 'secret',
    genSynced(node, ctx) {
        const d = node.data
        if (!d) return ''
        const id = ctx.nodeId(node)
        return `    const ${id} = new secretsmanager.Secret(this, '${id}', {
      secretName: ${JSON.stringify(d.Name)},
      ${d.Description ? `description: ${JSON.stringify(d.Description)},` : ''}
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });`
    },
    genReferenced(node, ctx) {
        const id = ctx.nodeId(node)
        return `    const ${id} = secretsmanager.Secret.fromSecretCompleteArn(this, '${id}', arns.${id});`
    },
}

export default generator
