import type { CdkGenerator } from '../types'
import { connectInstanceRef } from './_shared'
import { arnRef } from '../shared'

const VALID_TASK_FIELD_TYPES = new Set([
    'NAME',
    'DESCRIPTION',
    'SCHEDULED_TIME',
    'QUICK_CONNECT',
    'URL',
    'NUMBER',
    'TEXT',
    'TEXT_AREA',
    'DATE_TIME',
    'BOOLEAN',
    'SINGLE_SELECT',
    'EMAIL'
])

// CFN pattern: ^[A-Za-z0-9](?:[A-Za-z0-9_.,\s-]*[A-Za-z0-9_.,-])?$
// Remove apostrophes, replace / and # with hyphen, replace parens with space.
function sanitizeSelectOption(value: string): string {
    return value
        .replace(/'/g, '')
        .replace(/[/#]/g, '-')
        .replace(/[()]/g, ' ')
        .replace(/\s+/g, ' ')
        .replace(/[\s-]+$/, '')
        .trim()
}

const generator: CdkGenerator = {
    service: 'connect',
    resourceType: 'task-template',
    genSynced(node, ctx) {
        const d = node.data
        if (!d) return ''
        const id = ctx.nodeId(node)
        const instanceRef = connectInstanceRef(ctx)

        // Filter to only valid field types; EXPIRY_DURATION and others aren't in the CFN spec.
        const rawFields = (d.Fields as Record<string, unknown>[] | undefined) ?? []
        const validFields = rawFields.filter((f) => VALID_TASK_FIELD_TYPES.has(String(f.Type ?? '')))
        const validFieldNames = new Set(
            validFields.map((f) => (f.Id as Record<string, string> | undefined)?.Name ?? '')
        )

        // fields — camelCase CDK props; CDK converts to PascalCase in CFN output.
        const fieldsLines = validFields
            .map((f) => {
                const fid = (f.Id as Record<string, string> | undefined)?.Name ?? ''
                const opts = f.SingleSelectOptions as string[] | undefined
                const parts = [
                    `id: { name: ${JSON.stringify(fid)} }`,
                    `type: ${JSON.stringify(String(f.Type ?? ''))}`
                ]
                if (f.Description) parts.push(`description: ${JSON.stringify(String(f.Description))}`)
                if (opts?.length)
                    parts.push(`singleSelectOptions: ${JSON.stringify(opts.map(sanitizeSelectOption))}`)
                return `      { ${parts.join(', ')} },`
            })
            .join('\n')

        // constraints is typed as `any` on CfnTaskTemplate, so CDK won't auto-convert key names.
        // Use PascalCase here to match what CloudFormation expects.
        const rawC = d.Constraints as Record<string, unknown> | undefined
        const idRefListPascal = (arr: unknown[]) =>
            arr
                .filter((item) =>
                    validFieldNames.has((item as Record<string, Record<string, string>>).Id?.Name ?? '')
                )
                .map(
                    (item) =>
                        `{ Id: { Name: ${JSON.stringify((item as Record<string, Record<string, string>>).Id?.Name ?? '')} } }`
                )
                .join(', ')

        const cParts: string[] = []
        if (Array.isArray(rawC?.RequiredFields) && (rawC!.RequiredFields as unknown[]).length) {
            const list = idRefListPascal(rawC!.RequiredFields as unknown[])
            if (list) cParts.push(`      RequiredFields: [${list}],`)
        }
        if (Array.isArray(rawC?.ReadOnlyFields) && (rawC!.ReadOnlyFields as unknown[]).length) {
            const list = idRefListPascal(rawC!.ReadOnlyFields as unknown[])
            if (list) cParts.push(`      ReadOnlyFields: [${list}],`)
        }
        if (Array.isArray(rawC?.InvisibleFields) && (rawC!.InvisibleFields as unknown[]).length) {
            const list = idRefListPascal(rawC!.InvisibleFields as unknown[])
            if (list) cParts.push(`      InvisibleFields: [${list}],`)
        }

        // defaults — properly typed Array<DefaultFieldValueProperty>, so camelCase.
        const rawDef = d.Defaults as Record<string, unknown> | undefined
        const defVals = (rawDef?.DefaultFieldValues as Record<string, unknown>[] | undefined) ?? []
        const validDefVals = defVals.filter((dv) =>
            validFieldNames.has((dv.Id as Record<string, string>)?.Name ?? '')
        )
        const defaultsLines = validDefVals
            .map(
                (dv) =>
                    `      { id: { name: ${JSON.stringify((dv.Id as Record<string, string>)?.Name ?? '')} }, defaultValue: ${JSON.stringify(String(dv.DefaultValue ?? ''))} },`
            )
            .join('\n')

        // contactFlowArn — required by CFN unless a QUICK_CONNECT field is present.
        // Reconstruct the source ARN from InstanceArn + ContactFlowId, then resolve to:
        //   - In-scope synced flow → CDK ref
        //   - Excluded flow with a target-env counterpart → that target ARN
        //   - Otherwise → no valid ARN; downstream will skip the template
        const cfId = d.ContactFlowId as string | undefined
        const instanceArn = d.InstanceArn as string | undefined
        let contactFlowArnExpr: string | undefined
        if (cfId && instanceArn) {
            const cfArn = `${instanceArn}/contact-flow/${cfId}`
            const cfNode = ctx.nodeByArn.get(cfArn)
            if (cfNode?.included && ctx.inScopeArns.has(cfArn)) {
                contactFlowArnExpr = arnRef(cfArn, ctx)
            } else if (cfNode) {
                // Flow exists in graph but isn't synced — prefer the target-env ARN
                const targetArn = cfNode.envData?.get(ctx.targetAccountId)?.arn.raw
                if (targetArn) contactFlowArnExpr = JSON.stringify(targetArn)
                // else: leave undefined so a source ARN doesn't leak into target deploy
            }
            // No flow node found → leave undefined (don't emit a source ARN that CFN will reject)
        }

        const hasQuickConnectField = validFields.some((f) => String(f.Type ?? '') === 'QUICK_CONNECT')

        // CFN requires contactFlowArn unless a QUICK_CONNECT field is present.
        // If we couldn't resolve a target ARN and there's no QUICK_CONNECT field,
        // skip the template — deploying it would fail with "ContactFlowId provided does not belong".
        if (!hasQuickConnectField && !contactFlowArnExpr) {
            return `    // TaskTemplate '${String(d.Name ?? node.logicalId)}' — no target contact-flow ARN available, skipping`
        }

        const lines: string[] = [
            `      instanceArn: ${instanceRef},`,
            `      name: ${JSON.stringify(String(d.Name ?? node.logicalId))},`,
            `      status: ${JSON.stringify(String(d.Status ?? 'ACTIVE'))},`
        ]
        if (d.Description) lines.push(`      description: ${JSON.stringify(String(d.Description))},`)
        if (contactFlowArnExpr && !hasQuickConnectField)
            lines.push(`      contactFlowArn: ${contactFlowArnExpr},`)
        if (validFields.length) {
            lines.push(`      fields: [`)
            lines.push(fieldsLines)
            lines.push(`      ],`)
        }
        if (cParts.length) {
            lines.push(`      constraints: {`)
            lines.push(...cParts)
            lines.push(`      },`)
        }
        if (validDefVals.length) {
            lines.push(`      defaults: [`)
            lines.push(defaultsLines)
            lines.push(`      ],`)
        }

        return `    const ${id} = new connect.CfnTaskTemplate(this, '${id}', {\n${lines.join('\n')}\n    });`
    }
}
export default generator
