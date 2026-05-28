import type { CdkGenerator } from '../types'
import { connectInstanceRef } from './_shared'

const generator: CdkGenerator = {
    service: 'connect',
    resourceType: 'operating-hours',
    genSynced(node, ctx) {
        const d = node.data
        if (!d) return ''
        const id = ctx.nodeId(node)
        const instanceRef = connectInstanceRef(ctx)

        // SDK returns PascalCase; CDK expects camelCase props
        const timeSlice = (t: { Hours?: number; Minutes?: number } | undefined) =>
            `{ hours: ${t?.Hours ?? 0}, minutes: ${t?.Minutes ?? 0} }`
        const configLine = (c: { Day?: string; StartTime?: object; EndTime?: object }) =>
            `        { day: ${JSON.stringify(c.Day)}, startTime: ${timeSlice(c.StartTime as any)}, endTime: ${timeSlice(c.EndTime as any)} },`

        // Config from SDK is HoursOfOperationConfig[] with PascalCase keys
        const configLines = ((d.Config as any[]) ?? []).map(configLine)

        // Overrides from ListHoursOfOperationOverridesCommand
        const overrides = (d.Overrides as any[]) ?? []
        let overridesCode = ''
        if (overrides.length > 0) {
            const overrideItems = overrides.map((o: any) => {
                const ovConfigLines = ((o.Config ?? []) as any[]).map(
                    (c: any) =>
                        `            { day: ${JSON.stringify(c.Day)}, startTime: ${timeSlice(c.StartTime)}, endTime: ${timeSlice(c.EndTime)} },`
                )
                const recurrenceVal = o.RecurrenceConfig && Object.keys(o.RecurrenceConfig).length > 0
                    ? o.RecurrenceConfig
                    : null
                const recurrence = recurrenceVal
                    ? `\n          recurrenceConfig: ${JSON.stringify(recurrenceVal)},`
                    : ''
                return `        {
          overrideName: ${JSON.stringify(o.Name ?? 'Override')},
          effectiveFrom: ${JSON.stringify(o.EffectiveFrom ?? '')},
          effectiveTill: ${JSON.stringify(o.EffectiveTill ?? '')},
          overrideConfig: [
${ovConfigLines.join('\n')}
          ],${o.Description ? `\n          overrideDescription: ${JSON.stringify(o.Description)},` : ''}${o.OverrideType ? `\n          overrideType: ${JSON.stringify(o.OverrideType)},` : ''}${recurrence}
        },`
            })
            overridesCode = `\n      hoursOfOperationOverrides: [\n${overrideItems.join('\n')}\n      ],`
        }

        return `    const ${id} = new connect.CfnHoursOfOperation(this, '${id}', {
      instanceArn: ${instanceRef},
      name: ${JSON.stringify(d.Name ?? id)},
      timeZone: ${JSON.stringify(d.TimeZone ?? 'UTC')},
      config: [
${configLines.join('\n')}
      ],
      ${d.Description ? `description: ${JSON.stringify(d.Description)},` : ''}${overridesCode}
    });`
    }
}
export default generator
