import type { CdkGenerator } from '../types'

const generator: CdkGenerator = {
    service: 's3',
    resourceType: 'bucket',
    genSynced(node, ctx) {
        const d = node.data
        if (!d) return ''
        const id = ctx.nodeId(node)
        return `    const ${id} = new s3.Bucket(this, '${id}', {
      bucketName: ${JSON.stringify(d.BucketName ?? d.Name)},
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      autoDeleteObjects: false,
    });`
    },
    genReferenced(node, ctx) {
        const id = ctx.nodeId(node)
        return `    const ${id} = s3.Bucket.fromBucketArn(this, '${id}', arns.${id});`
    }
}

export default generator
