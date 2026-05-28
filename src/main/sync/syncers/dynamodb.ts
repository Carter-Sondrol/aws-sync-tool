import { BillingMode, DynamoDBClient, UpdateTableCommand } from '@aws-sdk/client-dynamodb'
import { parseARN } from '../../discovery/arn'
import type { Credentials } from '../../discovery/CredentialsProvider'
import { registerSyncer } from '../registry'
import type { ResourceSyncer, SyncPushResult } from '../syncer'

const clientCache = new Map<string, DynamoDBClient>()

function getClient(region: string, creds: Credentials): DynamoDBClient {
    const key = `${region}:${creds.accessKeyId}`
    if (!clientCache.has(key)) {
        clientCache.set(key, new DynamoDBClient({ region, credentials: creds }))
    }
    return clientCache.get(key)!
}

const dynamoTableSyncer: ResourceSyncer = {
    service: 'dynamodb',
    resourceType: 'table',

    async push(
        sourceData,
        _sourceArn,
        targetArn,
        _sourceCredentials,
        targetCredentials
    ): Promise<SyncPushResult> {
        const changes: string[] = []
        const skipped: string[] = []

        const parsed = parseARN(targetArn)
        const targetRegion = parsed?.region ?? 'us-east-1'
        const tableName = parsed?.resourceId ?? targetArn

        const creds = await targetCredentials()
        const client = getClient(targetRegion, creds)

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const billing = sourceData.BillingModeSummary as any
        const billingMode = billing?.BillingMode as string | undefined

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const throughput = sourceData.ProvisionedThroughput as any

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const stream = sourceData.StreamSpecification as any

        const update: Record<string, unknown> = { TableName: tableName }

        if (billingMode === 'PAY_PER_REQUEST') {
            update.BillingMode = BillingMode.PAY_PER_REQUEST
            changes.push('billingMode:PAY_PER_REQUEST')
        } else if (billingMode === 'PROVISIONED' && throughput) {
            update.BillingMode = BillingMode.PROVISIONED
            update.ProvisionedThroughput = {
                ReadCapacityUnits: throughput.ReadCapacityUnits,
                WriteCapacityUnits: throughput.WriteCapacityUnits
            }
            changes.push('billingMode:PROVISIONED', 'provisionedThroughput')
        } else {
            skipped.push('billingMode (unknown or missing)')
        }

        if (stream) {
            update.StreamSpecification = stream
            changes.push('streamSpecification')
        }

        if (changes.length === 0) {
            skipped.push('no updatable config found')
            return { ok: true, changes, skipped }
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await client.send(new UpdateTableCommand(update as any))

        skipped.push(
            'keySchema (immutable)',
            'attributeDefinitions (immutable)',
            'localSecondaryIndexes (immutable)'
        )
        return { ok: true, changes, skipped }
    }
}

registerSyncer('dynamodb:table', dynamoTableSyncer)
