import type { CdkGenerator } from '../types'

const generator: CdkGenerator = {
    service: 'events',
    resourceType: 'rule',
    genSynced(node, ctx) {
        const d = node.data
        if (!d) return ''
        const id = ctx.nodeId(node)
        let scheduleOrPattern = `      // TODO: configure scheduleExpression or eventPattern`
        if (typeof d.ScheduleExpression === 'string' && d.ScheduleExpression) {
            scheduleOrPattern = `      scheduleExpression: ${JSON.stringify(d.ScheduleExpression)},`
        } else if (typeof d.EventPattern === 'string' && d.EventPattern) {
            try {
                const pattern = JSON.parse(d.EventPattern)
                scheduleOrPattern = `      eventPattern: ${JSON.stringify(pattern, null, 2).replace(/\n/g, '\n      ')},`
            } catch {
                scheduleOrPattern = `      eventPattern: {}, // TODO: parse failed — check original event pattern`
            }
        }
        return `    const ${id} = new events.CfnRule(this, '${id}', {
      name: ${JSON.stringify(d.Name)},
      state: ${JSON.stringify(d.State ?? 'ENABLED')},
${scheduleOrPattern}
      ${d.Description ? `description: ${JSON.stringify(d.Description)},` : ''}
    });`
    },
    genReferenced(node, ctx) {
        const id = ctx.nodeId(node)
        return `    // EventBridge rule — referenced\n    const ${id}Arn = arns.${id};`
    },
}

export default generator
