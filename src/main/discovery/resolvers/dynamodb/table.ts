import type { DescribeTableOutput } from '@aws-sdk/client-dynamodb'
import { DescribeTableCommand, DynamoDBClient, ListTablesCommand } from '@aws-sdk/client-dynamodb'
import { type ParsedARN, parseARN } from '../../arn'
import type { Credentials } from '../../CredentialsProvider'
import { BaseResolver } from '../baseResolver'

export class DynamoDBTableResolver extends BaseResolver<DynamoDBClient, DescribeTableOutput> {
    readonly service = 'dynamodb'
    readonly resourceType = 'table'
    readonly cfnType = 'AWS::DynamoDB::Table'

    protected createClient(region: string, creds: Credentials): DynamoDBClient {
        return new DynamoDBClient({ region, credentials: creds })
    }

    protected async fetchResource(
        client: DynamoDBClient,
        arn: ParsedARN
    ): Promise<DescribeTableOutput | null> {
        const res = await client.send(new DescribeTableCommand({ TableName: arn.resourceId }))
        if (!res.Table) return null
        const t = res.Table
        return {
            Table: {
                TableName: t.TableName,
                TableArn: t.TableArn,
                TableId: t.TableId,
                TableStatus: t.TableStatus,
                AttributeDefinitions: t.AttributeDefinitions,
                KeySchema: t.KeySchema,
                BillingModeSummary: t.BillingModeSummary,
                ProvisionedThroughput: t.ProvisionedThroughput,
                StreamSpecification: t.StreamSpecification,
                LatestStreamArn: t.LatestStreamArn,
                GlobalSecondaryIndexes: t.GlobalSecondaryIndexes,
                LocalSecondaryIndexes: t.LocalSecondaryIndexes,
                SSEDescription: t.SSEDescription
            }
        }
    }

    logicalId(data: Record<string, unknown> | undefined, arn: ParsedARN): string {
        const table = data?.Table as { TableName?: string } | undefined
        return table?.TableName ?? arn.resourceId
    }

    label(data: Record<string, unknown> | undefined, arn: ParsedARN): string {
        return this.logicalId(data, arn)
    }

    async resolveByName(name: string): Promise<ParsedARN | null> {
        try {
            const client = await this.client('us-east-1')
            const res = await client.send(new DescribeTableCommand({ TableName: name }))
            if (!res.Table?.TableArn) return null
            // Parse the ARN from the response to get proper structure
            const arn = parseARN(res.Table.TableArn)
            return arn ?? null
        } catch {
            return null
        }
    }

    async list(
        regions: string[],
        accountId: string
    ): Promise<Array<{ arn: string; name: string }>> {
        const results: Array<{ arn: string; name: string }> = []
        await Promise.allSettled(
            regions.map(async (r) => {
                const creds = await this.getCredentials()
                const client = new DynamoDBClient({ region: r, credentials: creds })
                let lastKey: string | undefined
                do {
                    const res = await client.send(
                        new ListTablesCommand({ Limit: 100, ExclusiveStartTableName: lastKey })
                    )
                    for (const name of res.TableNames ?? []) {
                        results.push({
                            arn: `arn:aws:dynamodb:${r}:${accountId}:table/${name}`,
                            name
                        })
                    }
                    lastKey = res.LastEvaluatedTableName
                } while (lastKey)
            })
        )
        return results
    }
}

export default DynamoDBTableResolver
