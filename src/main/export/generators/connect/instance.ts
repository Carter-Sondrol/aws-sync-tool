import type { CdkGenerator } from '../types'

const generator: CdkGenerator = {
    service: 'connect',
    resourceType: 'instance',
    genSynced(node, ctx) {
        const instId = ctx.nodeId(node)
        const arnForEnv = node.envData?.get(ctx.targetAccountId)?.arn.raw ?? node.arn.raw
        return `    // Connect instance '${node.logicalId}' — must exist before deploying child resources\n    const ${instId}Arn = ${JSON.stringify(arnForEnv)};`
    },
    genReferenced(node, ctx) {
        const id = ctx.nodeId(node)
        return `    // Connect instance already exists — referenced via ARN_MAP\n    const ${id}Arn = arns.${id};`
    }
}
export default generator
