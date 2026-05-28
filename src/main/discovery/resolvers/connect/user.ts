import { ConnectClient, DescribeUserCommand } from '@aws-sdk/client-connect'
import type { ParsedARN } from '../../arn'
import type { Credentials } from '../../CredentialsProvider'
import { BaseResolver } from '../baseResolver'
import { instanceId } from './_shared'

type AfterContactWorkConfigPerChannel = {
    Channel?: string
    AfterContactWorkConfig?: {
        AfterContactWorkTimeLimit?: number
    }
    AgentFirstCallbackAfterContactWorkConfig?: {
        AfterContactWorkTimeLimit?: number
    }
}

type AutoAcceptConfigPerChannel = {
    Channel?: string
    AutoAccept?: boolean
    AgentFirstCallbackAutoAccept?: boolean
}

type PersistentConnectionConfigPerChannel = {
    Channel?: string
    PersistentConnection?: boolean
}

type PhoneNumberConfigPerChannel = {
    Channel?: string
    PhoneNumber?: string
    PhoneType?: string
}

type VoiceEnhancementConfigPerChannel = {
    Channel?: string
    VoiceEnhancementMode?: string
}

type UserData = {
    UserId?: string
    UserArn?: string
    Username?: string
    DirectoryUserId?: string
    IdentityInfo?: {
        FirstName?: string
        LastName?: string
        Email?: string
        SecondaryEmail?: string
        Mobile?: string
    }
    PhoneConfig?: {
        PhoneType?: string
        AutoAccept?: boolean
        AfterContactWorkTimeLimit?: number
        DeskPhoneNumber?: string
    }
    AfterContactWorkConfigs?: AfterContactWorkConfigPerChannel[]
    AutoAcceptConfigs?: AutoAcceptConfigPerChannel[]
    PersistentConnectionConfigs?: PersistentConnectionConfigPerChannel[]
    PhoneNumberConfigs?: PhoneNumberConfigPerChannel[]
    VoiceEnhancementConfigs?: VoiceEnhancementConfigPerChannel[]
    RoutingProfileId?: string
    RoutingProfileArn?: string
    SecurityProfileIds?: string[]
    SecurityProfileArns?: string[]
    HierarchyGroupId?: string
    HierarchyGroupArn?: string
    Tags?: Record<string, string>
    InstanceArn?: string
}

export class ConnectUserResolver extends BaseResolver<ConnectClient, UserData> {
    readonly service = 'connect'
    readonly resourceType = 'user'
    readonly cfnType = 'AWS::Connect::User'

    protected createClient(region: string, creds: Credentials): ConnectClient {
        return new ConnectClient({ region, credentials: creds })
    }

    protected async fetchResource(client: ConnectClient, arn: ParsedARN): Promise<UserData | null> {
        const instId = instanceId(arn)
        const res = await client.send(
            new DescribeUserCommand({ InstanceId: instId, UserId: arn.resourceId })
        )
        const u = res.User
        if (!u) return null

        const instArn = `arn:${arn.partition}:connect:${arn.region}:${arn.accountId}:instance/${instId}`

        // Reconstruct ARNs from IDs since the API returns only IDs for related resources
        const routingProfileArn = u.RoutingProfileId
            ? `${instArn}/routing-profile/${u.RoutingProfileId}`
            : undefined
        const securityProfileArns = (u.SecurityProfileIds ?? []).map(
            (id) => `${instArn}/security-profile/${id}`
        )
        const hierarchyGroupArn = u.HierarchyGroupId
            ? `${instArn}/agent-group/${u.HierarchyGroupId}`
            : undefined

        return {
            UserId: u.Id,
            UserArn: u.Arn,
            Username: u.Username,
            DirectoryUserId: u.DirectoryUserId,
            IdentityInfo: u.IdentityInfo
                ? {
                      FirstName: u.IdentityInfo.FirstName,
                      LastName: u.IdentityInfo.LastName,
                      Email: u.IdentityInfo.Email,
                      SecondaryEmail: u.IdentityInfo.SecondaryEmail,
                      Mobile: u.IdentityInfo.Mobile
                  }
                : undefined,
            PhoneConfig: u.PhoneConfig
                ? {
                      PhoneType: u.PhoneConfig.PhoneType,
                      AutoAccept: u.PhoneConfig.AutoAccept,
                      AfterContactWorkTimeLimit: u.PhoneConfig.AfterContactWorkTimeLimit,
                      DeskPhoneNumber: u.PhoneConfig.DeskPhoneNumber
                  }
                : undefined,
            // Per-channel configurations (newer API fields)
            AfterContactWorkConfigs: u.AfterContactWorkConfigs
                ? u.AfterContactWorkConfigs.map((c) => ({
                      Channel: c.Channel,
                      AfterContactWorkConfig: c.AfterContactWorkConfig
                          ? {
                                AfterContactWorkTimeLimit:
                                    c.AfterContactWorkConfig.AfterContactWorkTimeLimit
                            }
                          : undefined,
                      AgentFirstCallbackAfterContactWorkConfig:
                          c.AgentFirstCallbackAfterContactWorkConfig
                              ? {
                                    AfterContactWorkTimeLimit:
                                        c.AgentFirstCallbackAfterContactWorkConfig
                                            .AfterContactWorkTimeLimit
                                }
                              : undefined
                  }))
                : undefined,
            AutoAcceptConfigs: u.AutoAcceptConfigs
                ? u.AutoAcceptConfigs.map((c) => ({
                      Channel: c.Channel,
                      AutoAccept: c.AutoAccept,
                      AgentFirstCallbackAutoAccept: c.AgentFirstCallbackAutoAccept
                  }))
                : undefined,
            PersistentConnectionConfigs: u.PersistentConnectionConfigs
                ? u.PersistentConnectionConfigs.map((c) => ({
                      Channel: c.Channel,
                      PersistentConnection: c.PersistentConnection
                  }))
                : undefined,
            PhoneNumberConfigs: u.PhoneNumberConfigs
                ? u.PhoneNumberConfigs.map((c) => ({
                      Channel: c.Channel,
                      PhoneNumber: c.PhoneNumber,
                      PhoneType: c.PhoneType
                  }))
                : undefined,
            VoiceEnhancementConfigs: u.VoiceEnhancementConfigs
                ? u.VoiceEnhancementConfigs.map((c) => ({
                      Channel: c.Channel,
                      VoiceEnhancementMode: c.VoiceEnhancementMode
                  }))
                : undefined,
            RoutingProfileId: u.RoutingProfileId,
            RoutingProfileArn: routingProfileArn,
            SecurityProfileIds: u.SecurityProfileIds,
            SecurityProfileArns: securityProfileArns,
            HierarchyGroupId: u.HierarchyGroupId,
            HierarchyGroupArn: hierarchyGroupArn,
            Tags: u.Tags,
            InstanceArn: instArn
        }
    }

    logicalId(data: Record<string, unknown> | undefined, arn: ParsedARN): string {
        return (data?.Username as string | undefined) ?? arn.resourceId
    }

    label(data: Record<string, unknown> | undefined, arn: ParsedARN): string {
        const info = data?.IdentityInfo as Record<string, string | undefined> | undefined
        if (info?.FirstName || info?.LastName) {
            return [info.FirstName, info.LastName].filter(Boolean).join(' ')
        }
        return this.logicalId(data, arn)
    }
}

export default ConnectUserResolver
