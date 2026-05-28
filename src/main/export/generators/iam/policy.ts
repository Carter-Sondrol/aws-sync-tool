import type { CdkGenerator } from '../types'

const generator: CdkGenerator = {
    service: 'iam',
    resourceType: 'policy',
    genSynced(node, ctx) {
        const d = node.data
        if (!d) return ''
        const id = ctx.nodeId(node)
        let documentCode = '// TODO: add policy statements'
        try {
            const doc = JSON.parse(String(d.Document ?? '{}'))
            if (doc.Statement?.length) {
                documentCode = `document: iam.PolicyDocument.fromJson(${JSON.stringify(doc, null, 2).replace(/\n/g, '\n      ')}),`
            }
        } catch {
            // keep placeholder
        }
        return `    const ${id} = new iam.ManagedPolicy(this, '${id}', {
      managedPolicyName: ${JSON.stringify(d.PolicyName)},
      ${documentCode}
    });`
    },
    genReferenced(node, ctx) {
        const id = ctx.nodeId(node)
        return `    const ${id} = iam.ManagedPolicy.fromManagedPolicyArn(this, '${id}', arns.${id});`
    }
}

export default generator
