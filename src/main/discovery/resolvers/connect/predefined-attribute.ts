import { ConnectClient, DescribePredefinedAttributeCommand } from '@aws-sdk/client-connect'
import type { ParsedARN } from '../../arn'
import type { Credentials } from '../../CredentialsProvider'
import { BaseResolver } from '../baseResolver'
import { instanceId } from './_shared'

type PredefinedAttributeData = {
    Name?: string
    Values?: {
        StringList?: string[]
    }
    InstanceArn?: string
}

export class ConnectPredefinedAttributeResolver extends BaseResolver<
    ConnectClient,
    PredefinedAttributeData
> {
    readonly service = 'connect'
    readonly resourceType = 'predefined-attribute'
    readonly cfnType = 'AWS::Connect::PredefinedAttribute'

    protected createClient(region: string, creds: Credentials): ConnectClient {
        return new ConnectClient({ region, credentials: creds })
    }

    protected async fetchResource(
        client: ConnectClient,
        arn: ParsedARN
    ): Promise<PredefinedAttributeData | null> {
        const instId = instanceId(arn)
        const res = await client.send(
            new DescribePredefinedAttributeCommand({
                InstanceId: instId,
                Name: arn.resourceId
            })
        )
        const a = res.PredefinedAttribute
        if (!a) return null
        return {
            Name: a.Name,
            Values: a.Values?.StringList ? { StringList: a.Values.StringList } : undefined,
            InstanceArn: `arn:${arn.partition}:connect:${arn.region}:${arn.accountId}:instance/${instId}`
        }
    }

    logicalId(data: Record<string, unknown> | undefined, arn: ParsedARN): string {
        return (data?.Name as string | undefined) ?? arn.resourceId
    }

    label(data: Record<string, unknown> | undefined, arn: ParsedARN): string {
        return this.logicalId(data, arn)
    }
}

export default ConnectPredefinedAttributeResolver
