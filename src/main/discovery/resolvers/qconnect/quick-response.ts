import { GetQuickResponseCommand, QConnectClient } from '@aws-sdk/client-qconnect'
import type { ParsedARN } from '../../arn'
import type { Credentials } from '../../CredentialsProvider'
import { BaseResolver } from '../baseResolver'

type QuickResponseData = {
    quickResponseId?: string
    quickResponseArn?: string
    name?: string
    contentType?: string
    status?: string
    description?: string
    shortcutKey?: string
    isActive?: boolean
    channels?: string[]
    language?: string
    contents?: object
    groupingConfiguration?: object
    tags?: Record<string, string>
}

export class QConnectQuickResponseResolver extends BaseResolver<QConnectClient, QuickResponseData> {
    readonly service = 'qconnect'
    readonly resourceType = 'quick-response'
    readonly cfnType = 'AWS::QConnect::QuickResponse'

    protected createClient(region: string, creds: Credentials): QConnectClient {
        return new QConnectClient({ region, credentials: creds })
    }

    protected async fetchResource(
        client: QConnectClient,
        arn: ParsedARN
    ): Promise<QuickResponseData | null> {
        const parts = arn.resource.split('/')
        // Resource format: quick-response/<knowledgeBaseId>/<quickResponseId>
        const kbId = parts[1]
        const qrId = parts[2] ?? parts[1]
        if (!kbId) return null
        const res = await client.send(
            new GetQuickResponseCommand({ knowledgeBaseId: kbId, quickResponseId: qrId })
        )
        const qr = res.quickResponse
        if (!qr) return null
        return {
            quickResponseId: qr.quickResponseId,
            quickResponseArn: qr.quickResponseArn,
            name: qr.name,
            contentType: qr.contentType,
            status: qr.status,
            description: qr.description,
            shortcutKey: qr.shortcutKey,
            isActive: qr.isActive,
            channels: qr.channels,
            language: qr.language,
            contents: qr.contents,
            groupingConfiguration: qr.groupingConfiguration,
            tags: qr.tags
        }
    }

    logicalId(data: Record<string, unknown> | undefined, arn: ParsedARN): string {
        return (data?.name as string | undefined) ?? arn.resourceId
    }

    label(data: Record<string, unknown> | undefined, arn: ParsedARN): string {
        return this.logicalId(data, arn)
    }
}

export default QConnectQuickResponseResolver
