import type { ParsedARN } from '../../arn'

// QConnect ARN formats:
// Knowledge Base (Wisdom service): arn:aws:wisdom:region:account:knowledge-base/KB_ID
// Quick Response: arn:aws:qconnect:region:account:quick-response/QR_ID
// Message Template: arn:aws:qconnect:region:account:message-template/MT_ID

export function knowledgeBaseId(arn: ParsedARN): string {
    // Wisdom knowledge-base ARN: resource = 'knowledge-base/KB_ID'
    return arn.resource.split('/')[1] ?? arn.resourceId
}

export function quickResponseId(arn: ParsedARN): string {
    // QConnect quick-response ARN: resource = 'quick-response/QR_ID'
    return arn.resource.split('/')[1] ?? arn.resourceId
}

export function messageTemplateId(arn: ParsedARN): string {
    // QConnect message-template ARN: resource = 'message-template/MT_ID'
    return arn.resource.split('/')[1] ?? arn.resourceId
}
