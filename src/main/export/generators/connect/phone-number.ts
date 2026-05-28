import type { CdkGenerator } from '../types'
import { connectInstanceRef } from './_shared'

const generator: CdkGenerator = {
    service: 'connect',
    resourceType: 'phone-number',
    genSynced(node, ctx) {
        const d = node.data
        if (!d) return ''
        const id = ctx.nodeId(node)
        const instanceRef = connectInstanceRef(ctx)

        return `    const ${id} = new connect.CfnPhoneNumber(this, '${id}', {
      targetArn: ${instanceRef},
      type: ${JSON.stringify(d.PhoneNumberType ?? 'DID')},
      ${d.PhoneNumberCountryCode ? `countryCode: ${JSON.stringify(d.PhoneNumberCountryCode)},` : ''}
      ${d.PhoneNumberDescription ? `description: ${JSON.stringify(d.PhoneNumberDescription)},` : ''}
    });`
    }
}
export default generator
