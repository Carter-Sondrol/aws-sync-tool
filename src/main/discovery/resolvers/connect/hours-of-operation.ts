import {
    ConnectClient,
    DescribeHoursOfOperationCommand,
    ListHoursOfOperationOverridesCommand
} from '@aws-sdk/client-connect'
import type { ParsedARN } from '../../arn'
import type { Credentials } from '../../CredentialsProvider'
import { BaseResolver } from '../baseResolver'
import { instanceId } from './_shared'

type HoursOfOperationOverride = {
    HoursOfOperationOverrideId?: string
    Name?: string
    Description?: string
    Config?: object[]
    EffectiveFrom?: string
    EffectiveTill?: string
    RecurrenceConfig?: object
    OverrideType?: string
}

type HoursOfOperationData = {
    HoursOfOperationId?: string
    HoursOfOperationArn?: string
    Name?: string
    Description?: string
    TimeZone?: string
    Config?: object[]
    Overrides?: HoursOfOperationOverride[]
    Tags?: object
    InstanceArn?: string
}

export class ConnectHoursOfOperationResolver extends BaseResolver<
    ConnectClient,
    HoursOfOperationData
> {
    readonly service = 'connect'
    // ARN segment uses 'operating-hours' (kebab); the resolver registry keys on
    // service:resourceType, so this must match exactly or no resolver is found
    // and the node is built with only the ARN UUID as its label.
    readonly resourceType = 'operating-hours'
    readonly cfnType = 'AWS::Connect::HoursOfOperation'

    protected createClient(region: string, creds: Credentials): ConnectClient {
        return new ConnectClient({ region, credentials: creds })
    }

    protected async fetchResource(
        client: ConnectClient,
        arn: ParsedARN
    ): Promise<HoursOfOperationData | null> {
        const instId = instanceId(arn)
        const [describeRes, overridesRes] = await Promise.all([
            client.send(
                new DescribeHoursOfOperationCommand({
                    InstanceId: instId,
                    HoursOfOperationId: arn.resourceId
                })
            ),
            client.send(
                new ListHoursOfOperationOverridesCommand({
                    InstanceId: instId,
                    HoursOfOperationId: arn.resourceId
                })
            )
        ])
        const h = describeRes.HoursOfOperation
        if (!h) return null
        const overrides: HoursOfOperationOverride[] = (
            overridesRes.HoursOfOperationOverrideList ?? []
        ).map((o) => ({
            HoursOfOperationOverrideId: o.HoursOfOperationOverrideId,
            Name: o.Name,
            Description: o.Description,
            Config: o.Config as object[] | undefined,
            EffectiveFrom: o.EffectiveFrom,
            EffectiveTill: o.EffectiveTill,
            RecurrenceConfig: o.RecurrenceConfig as object | undefined,
            OverrideType: o.OverrideType
        }))
        return {
            HoursOfOperationId: h.HoursOfOperationId,
            HoursOfOperationArn: h.HoursOfOperationArn,
            Name: h.Name,
            Description: h.Description,
            TimeZone: h.TimeZone,
            Config: h.Config,
            Overrides: overrides,
            Tags: h.Tags,
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

export default ConnectHoursOfOperationResolver
