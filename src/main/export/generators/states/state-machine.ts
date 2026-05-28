import type { CdkGenerator } from '../types'

const generator: CdkGenerator = {
    service: 'states',
    resourceType: 'stateMachine',
    genSynced(node, ctx) {
        const d = node.data
        if (!d) return ''
        const id = ctx.nodeId(node)
        let definitionCode: string
        if (typeof d.Definition === 'string' && d.Definition) {
            try {
                JSON.parse(d.Definition)
                definitionCode = `stepfunctions.DefinitionBody.fromString(${JSON.stringify(d.Definition)})`
            } catch {
                definitionCode = `stepfunctions.DefinitionBody.fromString('{}') // TODO: add state machine definition`
            }
        } else {
            definitionCode = `stepfunctions.DefinitionBody.fromString('{}') // TODO: add state machine definition`
        }
        const roleArnRaw = String(d.RoleArn ?? '')
        const roleNode = roleArnRaw ? ctx.nodeByArn.get(roleArnRaw) : null
        let roleCode = `      role: iam.Role.fromRoleArn(this, '${id}Role', ${JSON.stringify(roleArnRaw)}),`
        if (roleNode && !roleNode.hidden) {
            const roleId = ctx.nodeId(roleNode)
            if (roleNode.included && ctx.inScopeArns.has(roleNode.arn.raw)) {
                roleCode = `      role: ${roleId},`
            } else if (roleNode.included) {
                roleCode = `      role: iam.Role.fromRoleArn(this, '${id}Role', ${JSON.stringify(roleNode.arn.raw)}),`
            } else {
                roleCode = `      role: iam.Role.fromRoleArn(this, '${id}Role', arns.${roleId}),`
            }
        }
        const smType = String(d.Type ?? 'STANDARD')
        return `    const ${id} = new stepfunctions.StateMachine(this, '${id}', {
      stateMachineName: ${JSON.stringify(d.Name)},
      definitionBody: ${definitionCode},
${roleCode}
      ${smType === 'EXPRESS' ? `stateMachineType: stepfunctions.StateMachineType.EXPRESS,` : ''}
    });`
    },
    genReferenced(node, ctx) {
        const id = ctx.nodeId(node)
        return `    const ${id} = stepfunctions.StateMachine.fromStateMachineArn(this, '${id}', arns.${id});`
    },
}

export default generator
