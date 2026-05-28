import {
    APIGatewayClient,
    type PatchOperation,
    UpdateRestApiCommand
} from '@aws-sdk/client-api-gateway'
import { ApiGatewayV2Client, UpdateApiCommand } from '@aws-sdk/client-apigatewayv2'
import { parseARN } from '../../discovery/arn'
import { registerSyncer } from '../registry'
import type { ResourceSyncer, SyncPushResult } from '../syncer'

function regionFromArn(arn: string): string {
    return parseARN(arn)?.region ?? 'us-east-1'
}

function resourceIdFromArn(arn: string): string {
    return parseARN(arn)?.resourceId ?? arn
}

// ─── API Gateway v2 (HTTP API) ─────────────────────────────────────────────────

const apiGatewayV2Syncer: ResourceSyncer = {
    service: 'apigateway',
    resourceType: 'apis',

    async push(
        sourceData,
        _sourceArn,
        targetArn,
        _sourceCredentials,
        targetCredentials
    ): Promise<SyncPushResult> {
        const changes: string[] = []
        const skipped: string[] = []

        const creds = await targetCredentials()
        const client = new ApiGatewayV2Client({
            region: regionFromArn(targetArn),
            credentials: creds
        })
        const apiId = resourceIdFromArn(targetArn)

        if (typeof sourceData.Name !== 'string' && typeof sourceData.Description !== 'string') {
            skipped.push('no updatable fields in source data')
            return { ok: true, changes, skipped }
        }

        await client.send(
            new UpdateApiCommand({
                ApiId: apiId,
                Name: sourceData.Name as string | undefined,
                Description: sourceData.Description as string | undefined
            })
        )
        if (sourceData.Name) changes.push('name')
        if (sourceData.Description) changes.push('description')
        return { ok: true, changes, skipped }
    }
}

// ─── API Gateway REST API ──────────────────────────────────────────────────────

const apiGatewayRestSyncer: ResourceSyncer = {
    service: 'apigateway',
    resourceType: 'restapis',

    async push(
        sourceData,
        _sourceArn,
        targetArn,
        _sourceCredentials,
        targetCredentials
    ): Promise<SyncPushResult> {
        const changes: string[] = []
        const skipped: string[] = []

        const creds = await targetCredentials()
        const client = new APIGatewayClient({
            region: regionFromArn(targetArn),
            credentials: creds
        })
        const apiId = resourceIdFromArn(targetArn)

        const patchOperations: PatchOperation[] = []
        if (typeof sourceData.Name === 'string') {
            patchOperations.push({ op: 'replace', path: '/name', value: sourceData.Name })
            changes.push('name')
        }
        if (typeof sourceData.Description === 'string') {
            patchOperations.push({
                op: 'replace',
                path: '/description',
                value: sourceData.Description
            })
            changes.push('description')
        }

        if (patchOperations.length === 0) {
            skipped.push('no updatable fields in source data')
            return { ok: true, changes, skipped }
        }

        await client.send(new UpdateRestApiCommand({ restApiId: apiId, patchOperations }))
        return { ok: true, changes, skipped }
    }
}

// ─── Register all ──────────────────────────────────────────────────────────────

registerSyncer('apigateway:apis', apiGatewayV2Syncer)
registerSyncer('apigateway:restapis', apiGatewayRestSyncer)
