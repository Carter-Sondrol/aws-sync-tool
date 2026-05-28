import { GetMessageTemplateCommand, QConnectClient } from '@aws-sdk/client-qconnect'
import type { ParsedARN } from '../../arn'
import type { Credentials } from '../../CredentialsProvider'
import { BaseResolver } from '../baseResolver'

type MessageTemplateData = {
    messageTemplateId?: string
    messageTemplateArn?: string
    name?: string
    channel?: string
    channelSubtype?: string
    description?: string
    content?: object
    defaultAttributes?: object
    groupingConfiguration?: object
    language?: string
    tags?: Record<string, string>
}

export class QConnectMessageTemplateResolver extends BaseResolver<
    QConnectClient,
    MessageTemplateData
> {
    readonly service = 'qconnect'
    readonly resourceType = 'message-template'
    readonly cfnType = 'AWS::QConnect::MessageTemplate'

    protected createClient(region: string, creds: Credentials): QConnectClient {
        return new QConnectClient({ region, credentials: creds })
    }

    protected async fetchResource(
        client: QConnectClient,
        arn: ParsedARN
    ): Promise<MessageTemplateData | null> {
        const parts = arn.resource.split('/')
        // Resource format: message-template/<knowledgeBaseId>/<messageTemplateId>
        const kbId = parts[1]
        const mtId = parts[2] ?? parts[1]
        if (!kbId) return null
        const res = await client.send(
            new GetMessageTemplateCommand({ knowledgeBaseId: kbId, messageTemplateId: mtId })
        )
        const mt = res.messageTemplate
        if (!mt) return null
        return {
            messageTemplateId: mt.messageTemplateId,
            messageTemplateArn: mt.messageTemplateArn,
            name: mt.name,
            channel: mt.channel,
            channelSubtype: mt.channelSubtype,
            description: mt.description,
            content: mt.content,
            defaultAttributes: mt.defaultAttributes,
            groupingConfiguration: mt.groupingConfiguration,
            language: mt.language,
            tags: mt.tags
        }
    }

    logicalId(data: Record<string, unknown> | undefined, arn: ParsedARN): string {
        return (data?.name as string | undefined) ?? arn.resourceId
    }

    label(data: Record<string, unknown> | undefined, arn: ParsedARN): string {
        return this.logicalId(data, arn)
    }
}

export default QConnectMessageTemplateResolver
