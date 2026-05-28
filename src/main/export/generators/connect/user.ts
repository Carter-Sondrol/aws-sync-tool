import type { CdkGenerator } from '../types'
import { connectInstanceRef, resolveConnectNodeRef } from './_shared'

const generator: CdkGenerator = {
    service: 'connect',
    resourceType: 'agent', // ARN resource type is 'agent'
    genSynced(node, ctx) {
        const d = node.data
        if (!d) return ''
        const id = ctx.nodeId(node)
        const instanceRef = connectInstanceRef(ctx)

        const phoneConfig = d.PhoneConfig as Record<string, unknown> | undefined
        const phoneType = (phoneConfig?.PhoneType as string | undefined) ?? 'SOFT_PHONE'
        const autoAccept = phoneConfig?.AutoAccept as boolean | undefined
        const afterContactWorkTime = phoneConfig?.AfterContactWorkTimeLimit as number | undefined
        const deskPhoneNumber = phoneConfig?.DeskPhoneNumber as string | undefined

        const routingProfileArnExpr = resolveConnectNodeRef(
            d.RoutingProfileArn as string | undefined,
            ctx,
            'attrRoutingProfileArn',
            `'REPLACE_WITH_ROUTING_PROFILE_ARN'`
        )

        const rawSecurityArns = (d.SecurityProfileArns as string[] | undefined) ?? []
        const securityProfileExprs = rawSecurityArns.map((raw, i) =>
            resolveConnectNodeRef(
                raw,
                ctx,
                'attrSecurityProfileArn',
                `'REPLACE_WITH_SECURITY_PROFILE_ARN_${i}'`
            )
        )

        const hierarchyGroupArnExpr = d.HierarchyGroupArn
            ? resolveConnectNodeRef(
                  d.HierarchyGroupArn as string,
                  ctx,
                  'attrUserHierarchyGroupArn',
                  JSON.stringify(d.HierarchyGroupArn)
              )
            : undefined

        const identityInfo = d.IdentityInfo as Record<string, unknown> | undefined
        const identityLines: string[] = []
        if (identityInfo?.FirstName)
            identityLines.push(`        firstName: ${JSON.stringify(identityInfo.FirstName)},`)
        if (identityInfo?.LastName)
            identityLines.push(`        lastName: ${JSON.stringify(identityInfo.LastName)},`)
        if (identityInfo?.Email)
            identityLines.push(`        email: ${JSON.stringify(identityInfo.Email)},`)
        if (identityInfo?.SecondaryEmail)
            identityLines.push(
                `        secondaryEmail: ${JSON.stringify(identityInfo.SecondaryEmail)},`
            )
        if (identityInfo?.Mobile)
            identityLines.push(`        mobile: ${JSON.stringify(identityInfo.Mobile)},`)

        const phoneConfigLines: string[] = [`        phoneType: ${JSON.stringify(phoneType)},`]
        if (autoAccept !== undefined) phoneConfigLines.push(`        autoAccept: ${autoAccept},`)
        if (afterContactWorkTime !== undefined)
            phoneConfigLines.push(`        afterContactWorkTimeLimit: ${afterContactWorkTime},`)
        if (deskPhoneNumber)
            phoneConfigLines.push(`        deskPhoneNumber: ${JSON.stringify(deskPhoneNumber)},`)

        const lines: string[] = [
            `      instanceArn: ${instanceRef},`,
            `      username: ${JSON.stringify(d.Username)},`,
            `      phoneConfig: {`,
            ...phoneConfigLines,
            `      },`,
            `      routingProfileArn: ${routingProfileArnExpr},`,
            `      securityProfileArns: [${securityProfileExprs.join(', ')}],`
        ]
        if (d.DirectoryUserId)
            lines.push(`      directoryUserId: ${JSON.stringify(d.DirectoryUserId)},`)
        if (hierarchyGroupArnExpr) lines.push(`      hierarchyGroupArn: ${hierarchyGroupArnExpr},`)
        if (identityLines.length) {
            lines.push(`      identityInfo: {`)
            lines.push(...identityLines)
            lines.push(`      },`)
        }

        return `    const ${id} = new connect.CfnUser(this, '${id}', {\n${lines.join('\n')}\n    });`
    }
}
export default generator
