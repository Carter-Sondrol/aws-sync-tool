import { GetFunctionCommand, GetLayerVersionCommand, LambdaClient } from '@aws-sdk/client-lambda'
import AdmZip from 'adm-zip'
import { mkdirSync, rmSync } from 'fs'
import https from 'https'
import { join, resolve as pathResolve, sep } from 'path'
import type { Credentials } from '../discovery/CredentialsProvider'
import type { LambdaArtifact } from './generators/types'

const MAX_REDIRECTS = 5
const MAX_ZIP_BYTES = 300 * 1024 * 1024 // 300 MB

function fetchBuffer(url: string, depth = 0): Promise<Buffer> {
    return new Promise((resolvePromise: (buf: Buffer) => void, reject) => {
        if (depth >= MAX_REDIRECTS) {
            reject(new Error(`Too many redirects (>=${MAX_REDIRECTS})`))
            return
        }
        if (!url.startsWith('https://')) {
            reject(new Error(`Refusing non-HTTPS URL: ${url}`))
            return
        }
        https
            .get(url, (res) => {
                if ((res.statusCode === 301 || res.statusCode === 302) && res.headers.location) {
                    res.destroy()
                    fetchBuffer(res.headers.location, depth + 1).then(resolvePromise, reject)
                    return
                }
                if (!res.statusCode || res.statusCode < 200 || res.statusCode >= 300) {
                    res.destroy()
                    reject(new Error(`HTTP ${res.statusCode} downloading artifact`))
                    return
                }
                const contentLength = res.headers['content-length']
                    ? Number(res.headers['content-length'])
                    : null
                if (contentLength !== null && contentLength > MAX_ZIP_BYTES) {
                    res.destroy()
                    reject(
                        new Error(
                            `Artifact too large: ${contentLength} bytes (limit ${MAX_ZIP_BYTES})`
                        )
                    )
                    return
                }
                const chunks: Buffer[] = []
                let received = 0
                res.on('data', (c: Buffer) => {
                    received += c.length
                    if (received > MAX_ZIP_BYTES) {
                        res.destroy()
                        reject(
                            new Error(
                                `Artifact exceeded size limit during download (>${MAX_ZIP_BYTES} bytes)`
                            )
                        )
                        return
                    }
                    chunks.push(c)
                })
                res.on('end', () => resolvePromise(Buffer.concat(chunks)))
                res.on('error', reject)
            })
            .on('error', reject)
    })
}

function extractZipSafe(zip: AdmZip, targetDir: string): void {
    const resolvedTarget = pathResolve(targetDir)
    for (const entry of zip.getEntries()) {
        const entryPath = pathResolve(targetDir, entry.entryName)
        if (!entryPath.startsWith(resolvedTarget + sep)) {
            throw new Error(`Zip path traversal detected: ${entry.entryName}`)
        }
    }
    zip.extractAllTo(targetDir, true)
}

export async function downloadLambdaArtifacts(
    artifacts: LambdaArtifact[],
    credentials: Credentials,
    outputDir: string
): Promise<{ downloaded: number; errors: Array<{ id: string; error: string }> }> {
    const errors: Array<{ id: string; error: string }> = []
    let downloaded = 0

    const clientCache = new Map<string, LambdaClient>()
    const getClient = (region: string) => {
        if (!clientCache.has(region)) {
            clientCache.set(region, new LambdaClient({ region, credentials }))
        }
        return clientCache.get(region)!
    }

    for (const artifact of artifacts) {
        try {
            const client = getClient(artifact.region)

            let downloadUrl: string | undefined

            if (artifact.type === 'function') {
                const res = await client.send(
                    new GetFunctionCommand({ FunctionName: artifact.functionName || artifact.arn })
                )
                downloadUrl = res.Code?.Location
            } else {
                if (!artifact.layerName || artifact.layerVersion == null) {
                    errors.push({ id: artifact.id, error: 'Missing layer name or version in ARN' })
                    continue
                }
                const res = await client.send(
                    new GetLayerVersionCommand({
                        LayerName: artifact.layerName,
                        VersionNumber: artifact.layerVersion
                    })
                )
                downloadUrl = res.Content?.Location
            }

            if (!downloadUrl) {
                errors.push({ id: artifact.id, error: 'No download URL returned by AWS' })
                continue
            }

            const zipBuffer = await fetchBuffer(downloadUrl)
            const zip = new AdmZip(zipBuffer)

            const targetDir =
                artifact.type === 'function'
                    ? join(outputDir, 'src', artifact.id)
                    : join(outputDir, 'layers', artifact.id)

            rmSync(targetDir, { recursive: true, force: true })
            mkdirSync(targetDir, { recursive: true })
            extractZipSafe(zip, targetDir)
            downloaded++
        } catch (err) {
            errors.push({
                id: artifact.id,
                error:
                    err instanceof Error
                        ? err.name !== 'Error'
                            ? `${err.name}: ${err.message}`
                            : err.message
                        : String(err)
            })
        }
    }

    return { downloaded, errors }
}
