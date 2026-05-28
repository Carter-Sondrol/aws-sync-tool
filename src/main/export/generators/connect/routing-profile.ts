import type { CdkGenerator } from '../types'
import { connectInstanceRef, resolveConnectNodeRef } from './_shared'

const generator: CdkGenerator = {
    service: 'connect',
    resourceType: 'routing-profile',
    genSynced(node, ctx) {
        const d = node.data
        if (!d) return ''
        const id = ctx.nodeId(node)
        const instanceRef = connectInstanceRef(ctx)

        // Fall back to constructing the ARN from ID when full ARN wasn't captured by resolver
        const defaultQueueArn =
            (d.DefaultOutboundQueueArn as string | undefined) ??
            (d.InstanceArn && d.DefaultOutboundQueueId
                ? `${d.InstanceArn}/queue/${d.DefaultOutboundQueueId}`
                : undefined)
        const DEFAULT_QUEUE_FALLBACK = `'REPLACE_WITH_DEFAULT_QUEUE_ARN'`
        const defaultQueueArnCode = resolveConnectNodeRef(
            defaultQueueArn,
            ctx,
            'attrQueueArn',
            DEFAULT_QUEUE_FALLBACK
        )

        // If the default outbound queue can't be resolved (no link, no target counterpart),
        // skip the routing profile entirely so CDK synth/deploy doesn't choke on the placeholder.
        if (defaultQueueArnCode === DEFAULT_QUEUE_FALLBACK) {
            return `    // RoutingProfile '${String(d.Name)}' — default outbound queue '${String(defaultQueueArn ?? '?')}' has no target counterpart, skipping`
        }

        const mediaConcurrencies =
            (d.MediaConcurrencies as Array<{ Channel: string; Concurrency: number }>) ?? []
        const concurrencyItems =
            mediaConcurrencies.length > 0
                ? mediaConcurrencies.map(
                      (mc) =>
                          `{ channel: ${JSON.stringify(mc.Channel)}, concurrency: ${mc.Concurrency} }`
                  )
                : [`{ channel: 'VOICE', concurrency: 1 }`]

        // Queue configs: map each source queue ARN to the target ARN via nodeByArn
        const rawQueueConfigs = (d.QueueConfigs as Array<{
            QueueArn?: string
            QueueId?: string
            Priority?: number
            Delay?: number
            Channel?: string
        }>) ?? []

        const queueConfigItems: string[] = []
        // CloudFormation requires (queueArn, channel) to be unique per routing profile.
        // Fuzzy/auto-link can collapse multiple source queues onto the same target queue,
        // so dedup by (resolved queueArn code, channel) — first occurrence wins.
        const seenQueueChannel = new Set<string>()
        for (const qc of rawQueueConfigs) {
            const instArnStr = d.InstanceArn as string | undefined
            const queueArn = qc.QueueArn
                ?? (instArnStr && qc.QueueId ? `${instArnStr}/queue/${qc.QueueId}` : undefined)
            const queueArnCode = resolveConnectNodeRef(
                queueArn,
                ctx,
                'attrQueueArn',
                `'REPLACE_WITH_QUEUE_ARN'`
            )
            if (!queueArnCode || queueArnCode === `'REPLACE_WITH_QUEUE_ARN'`) continue
            const channel = qc.Channel ?? 'VOICE'
            const dedupKey = `${queueArnCode}::${channel}`
            if (seenQueueChannel.has(dedupKey)) continue
            seenQueueChannel.add(dedupKey)
            queueConfigItems.push(
                `{ delay: ${qc.Delay ?? 0}, priority: ${qc.Priority ?? 1}, queueReference: { channel: ${JSON.stringify(channel)}, queueArn: ${queueArnCode} } }`
            )
        }
        const queueConfigsCode = queueConfigItems.length > 0
            ? `\n      queueConfigs: [${queueConfigItems.join(', ')}],`
            : ''

        return `    const ${id} = new connect.CfnRoutingProfile(this, '${id}', {
      instanceArn: ${instanceRef},
      name: ${JSON.stringify(d.Name)},
      defaultOutboundQueueArn: ${defaultQueueArnCode},
      mediaConcurrencies: [${concurrencyItems.join(', ')}],${queueConfigsCode}
      ${d.Description ? `description: ${JSON.stringify(d.Description)},` : ''}
    });`
    }
}
export default generator
