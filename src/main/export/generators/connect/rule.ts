import type { CdkGenerator } from '../types'
import { connectInstanceRef, resolveConnectNodeRef } from './_shared'

const generator: CdkGenerator = {
    service: 'connect',
    resourceType: 'rule',
    genSynced(node, ctx) {
        const d = node.data
        if (!d) return ''
        const id = ctx.nodeId(node)
        const instanceRef = connectInstanceRef(ctx)
        const instArn = d.InstanceArn as string | undefined

        // Build triggerEventSource — CDK expects camelCase
        const triggerSource = d.TriggerEventSource as Record<string, unknown> | undefined
        const triggerParts = [
            `eventSourceName: ${JSON.stringify(String(triggerSource?.EventSourceName ?? 'REPLACE_WITH_EVENT_SOURCE'))}`
        ]
        if (triggerSource?.IntegrationAssociationId && instArn) {
            const intAssocArn = `${instArn}/integration-association/${String(triggerSource.IntegrationAssociationId)}`
            triggerParts.push(`integrationAssociationArn: ${JSON.stringify(intAssocArn)}`)
        }
        const triggerCode = `{ ${triggerParts.join(', ')} }`

        // Map the API Actions array → CDK ActionsProperty (camelCase).
        const rawActions = (d.Actions as Record<string, unknown>[] | undefined) ?? []

        const assignContactCategory: string[] = []
        const eventBridgeActions: string[] = []
        const sendNotificationActions: string[] = []
        const taskActions: string[] = []
        const submitAutoEvalActions: string[] = []
        const endAssocTasksActions: string[] = []

        for (const action of rawActions) {
            const type = String((action as Record<string, unknown>).ActionType ?? '')
            const a = action as Record<string, unknown>

            if (type === 'ASSIGN_CONTACT_CATEGORY') {
                assignContactCategory.push('{}')
            } else if (type === 'GENERATE_EVENTBRIDGE_EVENT') {
                const eb = a.EventBridgeAction as Record<string, unknown> | undefined
                eventBridgeActions.push(`{ name: ${JSON.stringify(String(eb?.Name ?? ''))} }`)
            } else if (type === 'SEND_NOTIFICATION') {
                const sn = a.SendNotificationAction as Record<string, unknown> | undefined
                if (sn) {
                    const recip = sn.Recipient as Record<string, unknown> | undefined
                    const recipParts: string[] = []
                    if (Array.isArray(recip?.UserIds) && (recip!.UserIds as unknown[]).length && instArn) {
                        // Convert user UUIDs to full agent ARNs (required by CloudFormation pattern validation).
                        // For cross-account deploys, omit user ARNs belonging to the source account —
                        // those agents don't exist in the target instance.
                        const agentArnExprs: string[] = []
                        for (const uid of recip!.UserIds as string[]) {
                            const fullArn = uid.startsWith('arn:') ? uid : `${instArn}/agent/${uid}`
                            const agentNode = ctx.nodeByArn.get(fullArn)
                            if (agentNode) {
                                const agentAccount = agentNode.arn?.accountId
                                if (agentAccount && agentAccount !== ctx.targetAccountId && agentAccount !== 'default') continue
                                if (!agentNode.included) {
                                    agentArnExprs.push(`arns.${ctx.nodeId(agentNode)}`)
                                    continue
                                }
                            }
                            agentArnExprs.push(JSON.stringify(fullArn))
                        }
                        if (agentArnExprs.length > 0) {
                            recipParts.push(`userArns: [${agentArnExprs.join(', ')}]`)
                        }
                    }
                    if (recip?.UserTags && Object.keys(recip.UserTags as object).length)
                        recipParts.push(`userTags: ${JSON.stringify(recip.UserTags)}`)
                    // Skip this action if the recipient is empty — Connect rejects notifications with no recipients
                    if (recipParts.length === 0) continue
                    const snLines = [
                        `content: ${JSON.stringify(String(sn.Content ?? ''))},`,
                        `contentType: ${JSON.stringify(String(sn.ContentType ?? 'PLAIN_TEXT'))},`,
                        `deliveryMethod: ${JSON.stringify(String(sn.DeliveryMethod ?? 'EMAIL'))},`,
                        `recipient: { ${recipParts.join(', ')} } as any,`
                    ]
                    if (sn.Subject) snLines.push(`subject: ${JSON.stringify(String(sn.Subject))},`)
                    sendNotificationActions.push(`{ ${snLines.join(' ')} }`)
                }
            } else if (type === 'CREATE_TASK') {
                const ta = a.TaskAction as Record<string, unknown> | undefined
                if (ta) {
                    const cfId = ta.ContactFlowId as string | undefined
                    const cfArn = cfId && instArn ? `${instArn}/contact-flow/${cfId}` : undefined
                    const cfArnExpr = resolveConnectNodeRef(
                        cfArn,
                        ctx,
                        'attrContactFlowArn',
                        `'REPLACE_WITH_CONTACT_FLOW_ARN'`
                    )
                    const tLines = [
                        `name: ${JSON.stringify(String(ta.Name ?? ''))},`,
                        `contactFlowArn: ${cfArnExpr},`
                    ]
                    if (ta.Description)
                        tLines.push(`description: ${JSON.stringify(String(ta.Description))},`)
                    taskActions.push(`{ ${tLines.join(' ')} }`)
                }
            } else if (type === 'SUBMIT_AUTO_EVALUATION') {
                const sae = a.SubmitAutoEvaluationAction as Record<string, unknown> | undefined
                if (sae?.EvaluationFormId) {
                    const efArn = instArn
                        ? `${instArn}/evaluation-form/${String(sae.EvaluationFormId)}`
                        : undefined
                    const efExpr = resolveConnectNodeRef(
                        efArn,
                        ctx,
                        'attrEvaluationFormArn',
                        `'REPLACE_WITH_EVALUATION_FORM_ARN'`
                    )
                    submitAutoEvalActions.push(`{ evaluationFormArn: ${efExpr} }`)
                }
            } else if (type === 'END_ASSOCIATED_TASKS') {
                endAssocTasksActions.push('{}')
            }
        }

        const actionParts: string[] = []
        if (assignContactCategory.length)
            actionParts.push(`assignContactCategoryActions: [${assignContactCategory.join(', ')}],`)
        if (eventBridgeActions.length)
            actionParts.push(`eventBridgeActions: [${eventBridgeActions.join(', ')}],`)
        if (sendNotificationActions.length)
            actionParts.push(`sendNotificationActions: [${sendNotificationActions.join(', ')}],`)
        if (taskActions.length) actionParts.push(`taskActions: [${taskActions.join(', ')}],`)
        if (submitAutoEvalActions.length)
            actionParts.push(`submitAutoEvaluationActions: [${submitAutoEvalActions.join(', ')}],`)
        if (endAssocTasksActions.length)
            actionParts.push(`endAssociatedTasksActions: [${endAssocTasksActions.join(', ')}],`)

        // If no valid actions were recognized, skip generation — CloudFormation rejects empty Actions.
        if (actionParts.length === 0) {
            return `    // Rule '${String(d.Name)}' — no recognized actions found; skip creation (TODO: review ActionType values)`
        }

        const actionsCode = `{\n        ${actionParts.join('\n        ')}\n      }`

        return `    const ${id} = new connect.CfnRule(this, '${id}', {
      instanceArn: ${instanceRef},
      name: ${JSON.stringify(d.Name)},
      triggerEventSource: ${triggerCode},
      function: ${JSON.stringify(String(d.Function ?? 'true'))},
      actions: ${actionsCode},
      publishStatus: ${JSON.stringify(d.PublishStatus ?? 'DRAFT')},
    });`
    }
}
export default generator
