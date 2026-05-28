import { ConnectClient, DescribePhoneNumberCommand } from '@aws-sdk/client-connect'
import type { ParsedARN } from '../../arn'
import type { Credentials } from '../../CredentialsProvider'
import { BaseResolver } from '../baseResolver'

type PhoneNumberData = {
    PhoneNumberId?: string
    PhoneNumberArn?: string
    PhoneNumber?: string
    PhoneNumberType?: string
    PhoneNumberCountryCode?: string
    PhoneNumberDescription?: string
    TargetArn?: string
    Tags?: Record<string, string>
}

export class ConnectPhoneNumberResolver extends BaseResolver<ConnectClient, PhoneNumberData> {
    readonly service = 'connect'
    readonly resourceType = 'phone-number'
    readonly cfnType = 'AWS::Connect::PhoneNumber'

    protected createClient(region: string, creds: Credentials): ConnectClient {
        return new ConnectClient({ region, credentials: creds })
    }

    protected async fetchResource(
        client: ConnectClient,
        arn: ParsedARN
    ): Promise<PhoneNumberData | null> {
        const res = await client.send(
            new DescribePhoneNumberCommand({ PhoneNumberId: arn.resourceId })
        )
        const p = res.ClaimedPhoneNumberSummary
        if (!p) return null
        return {
            PhoneNumberId: p.PhoneNumberId,
            PhoneNumberArn: p.PhoneNumberArn,
            PhoneNumber: p.PhoneNumber,
            PhoneNumberType: p.PhoneNumberType,
            PhoneNumberCountryCode: p.PhoneNumberCountryCode,
            PhoneNumberDescription: p.PhoneNumberDescription,
            TargetArn: p.TargetArn,
            Tags: p.Tags
        }
    }

    logicalId(data: Record<string, unknown> | undefined, arn: ParsedARN): string {
        return (
            (data?.PhoneNumber as string | undefined)?.replace(/[^a-zA-Z0-9]/g, '') ??
            arn.resourceId
        )
    }

    label(data: Record<string, unknown> | undefined, arn: ParsedARN): string {
        return (data?.PhoneNumber as string | undefined) ?? arn.resourceId
    }
}

export default ConnectPhoneNumberResolver
