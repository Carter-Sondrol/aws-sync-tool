import type { CdkGenerator } from '../types'

const generator: CdkGenerator = {
    service: 'iam',
    resourceType: 'role',
    genSynced(node, ctx) {
        const d = node.data
        if (!d) return ''
        const id = ctx.nodeId(node)
        let principalCode = `new iam.ServicePrincipal('lambda.amazonaws.com')`

        try {
            const doc = JSON.parse(String(d.AssumeRolePolicyDocument ?? '{}')) as {
                Statement?: Array<{
                    Principal?: { Service?: string | string[]; AWS?: string | string[] }
                }>
            }
            const stmt = doc.Statement?.[0]
            if (stmt?.Principal?.Service) {
                const svc = Array.isArray(stmt.Principal.Service)
                    ? stmt.Principal.Service[0]
                    : stmt.Principal.Service
                principalCode = `new iam.ServicePrincipal(${JSON.stringify(svc)})`
            } else if (stmt?.Principal?.AWS) {
                const aws = Array.isArray(stmt.Principal.AWS)
                    ? stmt.Principal.AWS[0]
                    : stmt.Principal.AWS
                principalCode = `new iam.ArnPrincipal(${JSON.stringify(aws)})`
            }
        } catch {
            // keep default
        }

        const attachedPolicies =
            (d.AttachedManagedPolicies as Array<{ PolicyArn: string; PolicyName: string }>) ?? []
        const managedPolicyLines = attachedPolicies.map((p, i) => {
            const arn = String(p.PolicyArn ?? '')
            if (arn.includes(':aws:iam::aws:policy/')) {
                const policyName = arn.split('/').pop() ?? p.PolicyName
                return `      iam.ManagedPolicy.fromAwsManagedPolicyName(${JSON.stringify(policyName)}),`
            }
            const policyNode = ctx.nodeByArn.get(arn)
            if (policyNode?.included && ctx.inScopeArns.has(policyNode.arn.raw))
                return `      ${ctx.nodeId(policyNode)},`
            if (policyNode?.included)
                return `      iam.ManagedPolicy.fromManagedPolicyArn(this, '${id}Mp${i}', ${JSON.stringify(policyNode.arn.raw)}),`
            if (policyNode)
                return `      iam.ManagedPolicy.fromManagedPolicyArn(this, '${id}Mp${i}', arns.${ctx.nodeId(policyNode)}),`
            return `      iam.ManagedPolicy.fromManagedPolicyArn(this, '${id}Mp${i}', ${JSON.stringify(arn)}),`
        })
        const managedPoliciesCode = managedPolicyLines.length
            ? `      managedPolicies: [\n${managedPolicyLines.join('\n')}\n      ],`
            : ''

        const inlinePoliciesRaw = (d.InlinePolicies as Record<string, string> | undefined) ?? {}
        const inlineEntries = Object.entries(inlinePoliciesRaw)
        let inlinePoliciesCode = ''
        if (inlineEntries.length) {
            const lines = inlineEntries.map(([name, docStr]) => {
                try {
                    const doc = JSON.parse(docStr)
                    return `        ${JSON.stringify(name)}: iam.PolicyDocument.fromJson(${JSON.stringify(doc, null, 2).replace(/\n/g, '\n        ')}),`
                } catch {
                    return `        ${JSON.stringify(name)}: iam.PolicyDocument.fromJson({}), // TODO: parse failed`
                }
            })
            inlinePoliciesCode = `      inlinePolicies: {\n${lines.join('\n')}\n      },`
        }

        return `    const ${id} = new iam.Role(this, '${id}', {
      roleName: ${JSON.stringify(d.RoleName)},
      assumedBy: ${principalCode},
      ${d.Description ? `description: ${JSON.stringify(d.Description)},` : ''}
      ${d.MaxSessionDuration ? `maxSessionDuration: cdk.Duration.seconds(${d.MaxSessionDuration}),` : ''}
${managedPoliciesCode}
${inlinePoliciesCode}
    });`
    },
    genReferenced(node, ctx) {
        const id = ctx.nodeId(node)
        return `    const ${id} = iam.Role.fromRoleArn(this, '${id}', arns.${id});`
    }
}

export default generator
