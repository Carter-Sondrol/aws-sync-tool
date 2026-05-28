import type { CdkGenerator } from '../types'

const generator: CdkGenerator = {
    service: 'cloudfront',
    resourceType: 'distribution',
    genSynced(node, ctx) {
        const d = node.data
        if (!d) return ''
        const id = ctx.nodeId(node)
        const origins = (d.Origins as Array<{ Id?: string; DomainName?: string }>) ?? []
        const firstOrigin = origins[0]
        const originDomain = firstOrigin?.DomainName ?? 'REPLACE_WITH_ORIGIN_DOMAIN'
        return `    // TODO: CloudFront distribution '${node.logicalId}' — review and complete config
    // DomainName: ${String(d.DomainName ?? '')}
    // Origins: ${origins.map((o) => o.DomainName).join(', ')}
    const ${id} = new cloudfront.Distribution(this, '${id}', {
      defaultBehavior: {
        origin: new origins.HttpOrigin(${JSON.stringify(originDomain)}),
      },
      ${d.Comment ? `comment: ${JSON.stringify(d.Comment)},` : ''}
      ${d.DefaultRootObject ? `defaultRootObject: ${JSON.stringify(d.DefaultRootObject)},` : ''}
    });`
    },
    genReferenced(node, ctx) {
        const d = node.data
        if (!d) return ''
        const id = ctx.nodeId(node)
        const distributionId = String(d.DistributionId ?? node.logicalId)
        const domainName = String(d.DomainName ?? 'REPLACE_WITH_DOMAIN_NAME')
        return `    const ${id} = cloudfront.Distribution.fromDistributionAttributes(this, '${id}', {
      distributionId: ${JSON.stringify(distributionId)},
      domainName: ${JSON.stringify(domainName)},
    });`
    },
}

export default generator
