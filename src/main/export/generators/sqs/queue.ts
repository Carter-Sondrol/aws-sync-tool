import type { CdkGenerator } from '../types'

const generator: CdkGenerator = {
    service: 'sqs',
    resourceType: 'queue',
    genSynced(node, ctx) {
        const d = node.data
        if (!d) return ''
        const id = ctx.nodeId(node)
        const retention =
            typeof d.MessageRetentionPeriod === 'number' ? d.MessageRetentionPeriod : 345600
        const visibility = typeof d.VisibilityTimeout === 'number' ? d.VisibilityTimeout : 30
        const delay = typeof d.DelaySeconds === 'number' ? d.DelaySeconds : 0
        const fifo = d.FifoQueue === true
        return `    const ${id} = new sqs.Queue(this, '${id}', {
      queueName: ${JSON.stringify(d.QueueName)},
      retentionPeriod: cdk.Duration.seconds(${retention}),
      visibilityTimeout: cdk.Duration.seconds(${visibility}),
      ${delay > 0 ? `deliveryDelay: cdk.Duration.seconds(${delay}),` : ''}
      ${fifo ? `fifo: true,` : ''}
      ${fifo && d.ContentBasedDeduplication ? `contentBasedDeduplication: true,` : ''}
    });`
    },
    genReferenced(node, ctx) {
        const id = ctx.nodeId(node)
        return `    const ${id} = sqs.Queue.fromQueueArn(this, '${id}', arns.${id});`
    },
}

export default generator
