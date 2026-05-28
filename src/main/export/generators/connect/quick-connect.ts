import type { CdkGenerator } from '../types'
import { connectInstanceRef, resolveConnectNodeRef } from './_shared'

const generator: CdkGenerator = {
    service: 'connect',
    resourceType: 'quick-connect',
    genSynced(node, ctx) {
        const d = node.data
        if (!d) return ''
        const id = ctx.nodeId(node)
        const instanceRef = connectInstanceRef(ctx)

        const qcConfig = d.QuickConnectConfig as Record<string, unknown> | undefined
        const qcType = (qcConfig?.QuickConnectType as string) ?? 'PHONE_NUMBER'

        let configCode: string
        if (qcType === 'PHONE_NUMBER') {
            const phoneConfig = qcConfig?.PhoneConfig as Record<string, unknown> | undefined
            configCode = `{ quickConnectType: 'PHONE_NUMBER', phoneConfig: { phoneNumber: ${JSON.stringify(phoneConfig?.PhoneNumber ?? 'REPLACE_WITH_PHONE_NUMBER')} } }`
        } else if (qcType === 'QUEUE') {
            const queueConfig = qcConfig?.QueueConfig as Record<string, unknown> | undefined
            // API returns QueueId/ContactFlowId (UUIDs) — reconstruct full ARNs from instance ARN
            const { partition, region, accountId, resource } = node.arn
            const instId = resource.split('/')[1] ?? ''
            const queueId = (queueConfig?.QueueArn ?? queueConfig?.QueueId) as string | undefined
            const flowId = (queueConfig?.ContactFlowArn ?? queueConfig?.ContactFlowId) as string | undefined
            const queueFullArn = queueId
                ? (queueId.startsWith('arn:')
                    ? queueId
                    : `arn:${partition}:connect:${region}:${accountId}:instance/${instId}/queue/${queueId}`)
                : undefined
            const flowFullArn = flowId
                ? (flowId.startsWith('arn:')
                    ? flowId
                    : `arn:${partition}:connect:${region}:${accountId}:instance/${instId}/contact-flow/${flowId}`)
                : undefined
            const QUEUE_FB = `'REPLACE_WITH_QUEUE_ARN'`
            const FLOW_FB = `'REPLACE_WITH_CONTACT_FLOW_ARN'`
            const queueRef = resolveConnectNodeRef(queueFullArn, ctx, 'attrQueueArn', QUEUE_FB)
            const flowRef = resolveConnectNodeRef(flowFullArn, ctx, 'attrContactFlowArn', FLOW_FB)
            // QuickConnect of type QUEUE requires both a valid queue ARN AND contact flow ARN
            // in the target account. If either can't be resolved, skip rather than failing deploy.
            if (queueRef === QUEUE_FB || flowRef === FLOW_FB) {
                return `    // QuickConnect '${String(d.Name)}' — queue or contact flow has no target counterpart, skipping`
            }
            configCode = `{ quickConnectType: 'QUEUE', queueConfig: { queueArn: ${queueRef}, contactFlowArn: ${flowRef} } }`
        } else {
            configCode = `{ quickConnectType: ${JSON.stringify(qcType)} /* TODO: configure quickConnectConfig */ }`
        }

        return `    const ${id} = new connect.CfnQuickConnect(this, '${id}', {
      instanceArn: ${instanceRef},
      name: ${JSON.stringify(d.Name)},
      quickConnectConfig: ${configCode},
      ${d.Description ? `description: ${JSON.stringify(d.Description)},` : ''}
    });`
    }
}
export default generator
