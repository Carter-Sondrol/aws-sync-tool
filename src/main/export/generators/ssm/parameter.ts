import type { CdkGenerator } from '../types'

const generator: CdkGenerator = {
    service: 'ssm',
    resourceType: 'parameter',
    genSynced(node, ctx) {
        const d = node.data
        if (!d) return ''
        const id = ctx.nodeId(node)
        const isSecure = d.Type === 'SecureString'
        const value = isSecure ? 'REPLACE_WITH_SECURE_VALUE' : String(d.Value ?? 'REPLACE_WITH_VALUE')
        return `    const ${id} = new ssm.StringParameter(this, '${id}', {
      parameterName: ${JSON.stringify(d.Name)},
      stringValue: ${JSON.stringify(value)},
    });`
    },
    genReferenced(node, ctx) {
        const id = ctx.nodeId(node)
        return `    const ${id} = ssm.StringParameter.fromStringParameterArn(this, '${id}', arns.${id});`
    },
}

export default generator
