import {
    type Architecture,
    GetFunctionCommand,
    GetFunctionUrlConfigCommand,
    LambdaClient,
    UpdateFunctionCodeCommand,
    UpdateFunctionConfigurationCommand,
    UpdateFunctionUrlConfigCommand
} from '@aws-sdk/client-lambda'
import * as https from 'https'
import { parseARN } from '../../discovery/arn'
import type { Credentials } from '../../discovery/CredentialsProvider'
import { registerSyncer } from '../registry'
import type { ResourceSyncer, SyncPushResult } from '../syncer'

const clientCache = new Map<string, LambdaClient>()

function getClient(region: string, creds: Credentials): LambdaClient {
    const key = `${region}:${creds.accessKeyId}`
    if (!clientCache.has(key)) {
        clientCache.set(key, new LambdaClient({ region, credentials: creds }))
    }
    return clientCache.get(key)!
}

function downloadUrl(url: string): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        https
            .get(url, (res) => {
                const chunks: Buffer[] = []
                res.on('data', (c: Buffer) => chunks.push(c))
                res.on('end', () => resolve(Buffer.concat(chunks)))
                res.on('error', reject)
            })
            .on('error', reject)
    })
}

const lambdaSyncer: ResourceSyncer = {
    service: 'lambda',
    resourceType: 'function',

    async push(
        sourceData,
        sourceArn,
        targetArn,
        sourceCredentials,
        targetCredentials
    ): Promise<SyncPushResult> {
        const changes: string[] = []
        const skipped: string[] = []

        const sourceRegion = parseARN(sourceArn)?.region ?? 'us-east-1'
        const targetRegion = parseARN(targetArn)?.region ?? 'us-east-1'
        const targetFunctionName = parseARN(targetArn)?.resourceId ?? targetArn

        const [sourceCreds, targetCreds] = await Promise.all([
            sourceCredentials(),
            targetCredentials()
        ])
        const sourceClient = getClient(sourceRegion, sourceCreds)
        const targetClient = getClient(targetRegion, targetCreds)

        // Download source code
        const sourceFunc = await sourceClient.send(
            new GetFunctionCommand({ FunctionName: parseARN(sourceArn)?.resourceId ?? sourceArn })
        )
        const codeLocation = sourceFunc.Code?.Location
        if (!codeLocation) {
            return {
                ok: false,
                changes,
                skipped,
                error: 'Could not get source function code location'
            }
        }

        const zipBuffer = await downloadUrl(codeLocation)

        // Update target code
        await targetClient.send(
            new UpdateFunctionCodeCommand({
                FunctionName: targetFunctionName,
                ZipFile: zipBuffer,
                Architectures: sourceData.Architectures as Architecture[] | undefined
            })
        )
        changes.push('code')

        // Update configuration
        const configUpdate: Record<string, unknown> = { FunctionName: targetFunctionName }
        const fields: Array<[string, string]> = [
            ['Runtime', 'runtime'],
            ['Handler', 'handler'],
            ['Role', 'role'],
            ['Timeout', 'timeout'],
            ['MemorySize', 'memorySize'],
            ['Description', 'description']
        ]
        for (const [dataKey, label] of fields) {
            if (sourceData[dataKey] !== undefined) {
                configUpdate[dataKey] = sourceData[dataKey]
                changes.push(label)
            }
        }
        if (sourceData.Environment) {
            configUpdate.Environment = sourceData.Environment
            changes.push('environment')
        }
        if (sourceData.VpcConfig) {
            configUpdate.VpcConfig = sourceData.VpcConfig
            changes.push('vpcConfig')
        }
        if (sourceData.Layers) {
            configUpdate.Layers = (sourceData.Layers as Array<{ Arn?: string }>)
                .map((l) => l.Arn)
                .filter(Boolean)
            changes.push('layers')
        }
        if (sourceData.KmsKeyArn) {
            configUpdate.KMSKeyArn = sourceData.KmsKeyArn
            changes.push('kmsKeyArn')
        }
        if (sourceData.DeadLetterConfig) {
            configUpdate.DeadLetterConfig = sourceData.DeadLetterConfig
            changes.push('deadLetterConfig')
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await targetClient.send(new UpdateFunctionConfigurationCommand(configUpdate as any))

        // Check for function URL config on source; mirror if present
        try {
            const sourceUrlCfg = await sourceClient.send(
                new GetFunctionUrlConfigCommand({
                    FunctionName: parseARN(sourceArn)?.resourceId ?? sourceArn
                })
            )
            if (sourceUrlCfg.AuthType) {
                try {
                    await targetClient.send(
                        new UpdateFunctionUrlConfigCommand({
                            FunctionName: targetFunctionName,
                            AuthType: sourceUrlCfg.AuthType,
                            Cors: sourceUrlCfg.Cors,
                            InvokeMode: sourceUrlCfg.InvokeMode
                        })
                    )
                    changes.push('functionUrl')
                } catch {
                    skipped.push('functionUrl (target URL not configured)')
                }
            }
        } catch {
            // source has no function URL — nothing to do
        }

        return { ok: true, changes, skipped }
    }
}

registerSyncer('lambda:function', lambdaSyncer)
