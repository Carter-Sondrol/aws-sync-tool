import {
    GetKnowledgeBaseCommand,
    ListMessageTemplatesCommand,
    ListQuickResponsesCommand,
    QConnectClient
} from '@aws-sdk/client-qconnect'
import type { ParsedARN } from '../../arn'
import type { Credentials } from '../../CredentialsProvider'
import { BaseResolver } from '../baseResolver'
import { knowledgeBaseId } from './_shared'

type KnowledgeBaseData = {
    knowledgeBaseId?: string
    knowledgeBaseArn?: string
    name?: string
    knowledgeBaseType?: string
    status?: string
    tags?: Record<string, string>
}

export class QConnectKnowledgeBaseResolver extends BaseResolver<QConnectClient, KnowledgeBaseData> {
    readonly service = 'qconnect'
    readonly resourceType = 'knowledge-base'
    readonly cfnType = 'AWS::QConnect::KnowledgeBase'

    protected createClient(region: string, creds: Credentials): QConnectClient {
        return new QConnectClient({ region, credentials: creds })
    }

    protected async fetchResource(
        client: QConnectClient,
        arn: ParsedARN
    ): Promise<KnowledgeBaseData | null> {
        const kbId = knowledgeBaseId(arn)
        const res = await client.send(new GetKnowledgeBaseCommand({ knowledgeBaseId: kbId }))
        const kb = res.knowledgeBase
        if (!kb) return null

        const data: KnowledgeBaseData = {
            knowledgeBaseId: kb.knowledgeBaseId,
            knowledgeBaseArn: kb.knowledgeBaseArn,
            name: kb.name,
            knowledgeBaseType: kb.knowledgeBaseType,
            status: kb.status,
            tags: kb.tags
        }

        const childArns: string[] = []
        const childMetadata: Record<string, { name: string }> = {}

        await Promise.allSettled([
            client.send(new ListQuickResponsesCommand({ knowledgeBaseId: kbId })).then((r) => {
                r.quickResponseSummaries?.forEach((qr) => {
                    if (qr.quickResponseArn) {
                        childArns.push(qr.quickResponseArn)
                        if (qr.name) childMetadata[qr.quickResponseArn] = { name: qr.name }
                    }
                })
            }),
            client.send(new ListMessageTemplatesCommand({ knowledgeBaseId: kbId })).then((r) => {
                r.messageTemplateSummaries?.forEach((mt) => {
                    if (mt.messageTemplateArn) {
                        childArns.push(mt.messageTemplateArn)
                        if (mt.name) childMetadata[mt.messageTemplateArn] = { name: mt.name }
                    }
                })
            })
        ])

        if (childArns.length > 0) (data as Record<string, unknown>)._childArns = childArns
        if (Object.keys(childMetadata).length > 0)
            (data as Record<string, unknown>)._childMetadata = childMetadata

        return data
    }

    logicalId(data: Record<string, unknown> | undefined, arn: ParsedARN): string {
        return (data?.name as string | undefined) ?? arn.resourceId
    }

    label(data: Record<string, unknown> | undefined, arn: ParsedARN): string {
        return this.logicalId(data, arn)
    }
}

export default QConnectKnowledgeBaseResolver
