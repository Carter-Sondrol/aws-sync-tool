import type { CdkGenerator } from '../types'

const generator: CdkGenerator = {
    service: 'kinesis',
    resourceType: 'stream',
    genSynced(node, ctx) {
        const d = node.data
        if (!d) return ''
        const id = ctx.nodeId(node)
        const mode =
            (d.StreamModeDetails as Record<string, string> | undefined)?.StreamMode ?? 'PROVISIONED'
        const shards = typeof d.OpenShardCount === 'number' ? d.OpenShardCount : 1
        const retentionHours = typeof d.RetentionPeriodHours === 'number' ? d.RetentionPeriodHours : 24
        if (mode === 'ON_DEMAND') {
            return `    const ${id} = new kinesis.Stream(this, '${id}', {
      streamName: ${JSON.stringify(d.StreamName)},
      streamMode: kinesis.StreamMode.ON_DEMAND,
      retentionPeriod: cdk.Duration.hours(${retentionHours}),
    });`
        }
        return `    const ${id} = new kinesis.Stream(this, '${id}', {
      streamName: ${JSON.stringify(d.StreamName)},
      shardCount: ${shards},
      retentionPeriod: cdk.Duration.hours(${retentionHours}),
    });`
    },
    genReferenced(node, ctx) {
        const id = ctx.nodeId(node)
        return `    const ${id} = kinesis.Stream.fromStreamArn(this, '${id}', arns.${id});`
    },
}

export default generator
