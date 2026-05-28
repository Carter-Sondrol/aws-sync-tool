import type { ParsedARN } from '../../arn'

// ARN format: arn:aws:connect:region:account:instance/INSTANCE_ID[/resource-type/RESOURCE_ID]
export function instanceId(arn: ParsedARN): string {
    return arn.resource.split('/')[1] ?? arn.resourceId
}
