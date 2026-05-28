import type { CdkGenerator } from '../types'
import { DYNAMO_ATTR_TYPE } from '../shared'

const generator: CdkGenerator = {
    service: 'dynamodb',
    resourceType: 'table',
    genSynced(node, ctx) {
        const d = node.data
        if (!d) return ''
        const id = ctx.nodeId(node)
        const keySchema = (d.KeySchema as Array<{ AttributeName: string; KeyType: string }>) ?? []
        const attrDefs =
            (d.AttributeDefinitions as Array<{ AttributeName: string; AttributeType: string }>) ?? []

        const attrTypeMap: Record<string, string> = {}
        attrDefs.forEach((a) => {
            attrTypeMap[a.AttributeName] =
                DYNAMO_ATTR_TYPE[a.AttributeType] ?? 'dynamodb.AttributeType.STRING'
        })

        const hashKey = keySchema.find((k) => k.KeyType === 'HASH')
        const rangeKey = keySchema.find((k) => k.KeyType === 'RANGE')

        const pkCode = hashKey
            ? `partitionKey: { name: ${JSON.stringify(hashKey.AttributeName)}, type: ${attrTypeMap[hashKey.AttributeName] ?? 'dynamodb.AttributeType.STRING'} },`
            : `partitionKey: { name: 'pk', type: dynamodb.AttributeType.STRING },`

        const skCode = rangeKey
            ? `      sortKey: { name: ${JSON.stringify(rangeKey.AttributeName)}, type: ${attrTypeMap[rangeKey.AttributeName] ?? 'dynamodb.AttributeType.STRING'} },`
            : ''

        const billing =
            (d.BillingModeSummary as Record<string, string>)?.BillingMode === 'PAY_PER_REQUEST'
                ? `      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,`
                : `      billingMode: dynamodb.BillingMode.PROVISIONED,\n      readCapacity: ${(d.ProvisionedThroughput as Record<string, number>)?.ReadCapacityUnits ?? 5},\n      writeCapacity: ${(d.ProvisionedThroughput as Record<string, number>)?.WriteCapacityUnits ?? 5},`

        const streamSpec = d.StreamSpecification as Record<string, unknown> | undefined
        const stream = streamSpec?.StreamEnabled
            ? `      stream: dynamodb.StreamViewType.${String(streamSpec.StreamViewType ?? 'NEW_AND_OLD_IMAGES')},`
            : ''

        const sseDesc = d.SSEDescription as
            | { SSEType?: string; Status?: string; KMSMasterKeyArn?: string }
            | undefined
        let encryptionCode = ''
        if (sseDesc?.Status === 'ENABLED' && sseDesc?.SSEType === 'KMS') {
            const keyArn = sseDesc.KMSMasterKeyArn ?? ''
            if (keyArn && !keyArn.includes('alias/aws/')) {
                encryptionCode = `      encryption: dynamodb.TableEncryption.CUSTOMER_MANAGED,\n      // encryptionKey: kms.Key.fromKeyArn(this, '${id}Key', ${JSON.stringify(keyArn)}), // TODO: import KMS key`
            } else {
                encryptionCode = `      encryption: dynamodb.TableEncryption.AWS_MANAGED,`
            }
        }

        type IndexDef = {
            IndexName?: string
            KeySchema?: Array<{ AttributeName: string; KeyType: string }>
            Projection?: { ProjectionType?: string; NonKeyAttributes?: string[] }
            ProvisionedThroughput?: { ReadCapacityUnits?: number; WriteCapacityUnits?: number }
        }

        const gsis = (d.GlobalSecondaryIndexes as IndexDef[]) ?? []
        const gsiLines = gsis.map((gsi) => {
            const gsiHash = gsi.KeySchema?.find((k) => k.KeyType === 'HASH')
            const gsiRange = gsi.KeySchema?.find((k) => k.KeyType === 'RANGE')
            const projType = gsi.Projection?.ProjectionType ?? 'ALL'
            const nonKeyAttrs = gsi.Projection?.NonKeyAttributes ?? []
            const nonKeyCode = nonKeyAttrs.length
                ? `\n        nonKeyAttributes: ${JSON.stringify(nonKeyAttrs)},`
                : ''
            const gsiSkLine = gsiRange
                ? `\n        sortKey: { name: ${JSON.stringify(gsiRange.AttributeName)}, type: ${attrTypeMap[gsiRange.AttributeName] ?? 'dynamodb.AttributeType.STRING'} },`
                : ''
            const throughputLines = gsi.ProvisionedThroughput
                ? `\n        readCapacity: ${gsi.ProvisionedThroughput.ReadCapacityUnits ?? 5},\n        writeCapacity: ${gsi.ProvisionedThroughput.WriteCapacityUnits ?? 5},`
                : ''
            return `    ${id}.addGlobalSecondaryIndex({
        indexName: ${JSON.stringify(gsi.IndexName ?? '')},
        partitionKey: { name: ${JSON.stringify(gsiHash?.AttributeName ?? '')}, type: ${attrTypeMap[gsiHash?.AttributeName ?? ''] ?? 'dynamodb.AttributeType.STRING'} },${gsiSkLine}
        projectionType: dynamodb.ProjectionType.${projType},${nonKeyCode}${throughputLines}
      });`
        })

        const lsis = (d.LocalSecondaryIndexes as IndexDef[]) ?? []
        const lsiLines = lsis.map((lsi) => {
            const lsiRange = lsi.KeySchema?.find((k) => k.KeyType === 'RANGE')
            const projType = lsi.Projection?.ProjectionType ?? 'ALL'
            const nonKeyAttrs = lsi.Projection?.NonKeyAttributes ?? []
            const nonKeyCode = nonKeyAttrs.length
                ? `\n        nonKeyAttributes: ${JSON.stringify(nonKeyAttrs)},`
                : ''
            return `    ${id}.addLocalSecondaryIndex({
        indexName: ${JSON.stringify(lsi.IndexName ?? '')},
        sortKey: { name: ${JSON.stringify(lsiRange?.AttributeName ?? '')}, type: ${attrTypeMap[lsiRange?.AttributeName ?? ''] ?? 'dynamodb.AttributeType.STRING'} },
        projectionType: dynamodb.ProjectionType.${projType},${nonKeyCode}
      });`
        })

        const indexLines = [...gsiLines, ...lsiLines].join('\n')

        return `    const ${id} = new dynamodb.Table(this, '${id}', {
      tableName: ${JSON.stringify(d.TableName)},
      ${pkCode}
${skCode}
${billing}
${stream}
${encryptionCode}
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });${indexLines ? `\n${indexLines}` : ''}`
    },
    genReferenced(node, ctx) {
        const id = ctx.nodeId(node)
        return `    const ${id} = dynamodb.Table.fromTableArn(this, '${id}', arns.${id});`
    }
}

export default generator
