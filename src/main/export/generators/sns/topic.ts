import type { CdkGenerator } from '../types'

const generator: CdkGenerator = {
    service: 'sns',
    resourceType: 'topic',
    genSynced(node, ctx) {
        const d = node.data
        if (!d) return ''
        const id = ctx.nodeId(node)
        const fifo = d.FifoTopic === true
        return `    const ${id} = new sns.Topic(this, '${id}', {
      topicName: ${JSON.stringify(d.TopicName)},
      ${fifo ? `fifo: true,` : ''}
      ${fifo && d.ContentBasedDeduplication ? `contentBasedDeduplication: true,` : ''}
      ${d.DisplayName ? `displayName: ${JSON.stringify(d.DisplayName)},` : ''}
    });`
    },
    genReferenced(node, ctx) {
        const id = ctx.nodeId(node)
        return `    const ${id} = sns.Topic.fromTopicArn(this, '${id}', arns.${id});`
    },
}

export default generator
