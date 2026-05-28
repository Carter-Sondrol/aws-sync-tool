import { decodeRefToken } from '../../../discovery/arn'
import type { CdkGenerator } from '../types'
import { connectInstanceRef } from './_shared'

const generator: CdkGenerator = {
    service: 'connect',
    resourceType: 'queue',
    genSynced(node, ctx) {
        const d = node.data
        if (!d) return ''
        const id = ctx.nodeId(node)
        const instanceRef = connectInstanceRef(ctx)

        // HOO ARN may be a ref token (from extractARNs) or may need to be constructed from ID
        const rawHooArnField = d.HoursOfOperationArn as string | undefined
        const decodedHooArnField = rawHooArnField
            ? (decodeRefToken(rawHooArnField) ?? rawHooArnField)
            : undefined
        const rawInstanceArn = d.InstanceArn as string | undefined
        const decodedInstanceArn = rawInstanceArn
            ? (decodeRefToken(rawInstanceArn) ?? rawInstanceArn)
            : undefined
        const hooId = d.HoursOfOperationId as string | undefined
        const hooArn =
            (decodedHooArnField?.startsWith('arn:') ? decodedHooArnField : null) ??
            (decodedInstanceArn?.startsWith('arn:') && hooId
                ? `${decodedInstanceArn}/operating-hours/${hooId}`
                : undefined)
        const hooRef = hooArn ? (ctx.nodeByArn.get(hooArn) ?? null) : null

        let hooArnCode: string
        if (hooRef) {
            if (hooRef.included && ctx.inScopeArns.has(hooRef.arn.raw)) {
                hooArnCode = `${ctx.nodeId(hooRef)}.attrHoursOfOperationArn`
            } else if (hooRef.included) {
                hooArnCode = JSON.stringify(hooRef.arn.raw)
            } else {
                hooArnCode = `arns.${ctx.nodeId(hooRef)}`
            }
        } else {
            hooArnCode = `'REPLACE_WITH_HOURS_OF_OPERATION_ARN'`
        }

        return `    const ${id} = new connect.CfnQueue(this, '${id}', {
      instanceArn: ${instanceRef},
      name: ${JSON.stringify(d.Name)},
      hoursOfOperationArn: ${hooArnCode},
      ${d.Description ? `description: ${JSON.stringify(d.Description)},` : ''}
    });`
    }
}
export default generator
