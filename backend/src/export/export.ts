/**
 * export.ts  — Backend Hono route
 *
 * Endpoints:
 *   POST /api/export/cdk       → returns a zip (base64) of a CDK TypeScript app
 *   POST /api/export/cfn       → returns a CloudFormation template JSON
 *   POST /api/export/raw       → returns graph nodes as raw JSON with ARNs remapped
 *
 * Place in: backend/src/routes/export.ts
 *
 * Register in index.ts:
 *   import { router } from './routes/export.js';
 *   app.route('/api/export', router);
 */

import { Hono } from 'hono';
import type { DiscoveryNode } from '../discovery/discovery-node.js';
import { NodeClassification } from '../discovery/discovery-node.js';
import type { GraphStore } from '../graph/store.js';
import { toDiscoveredNode } from '../discovery/node-serializer.js';

export function createExportRouter(graphStore: GraphStore) {
  const router = new Hono();

  // ─── Types ────────────────────────────────────────────────────────────────────

  interface ExportRequest {
    /** ARNs of nodes to include (empty = all non-aws-managed nodes in graph) */
    includeArns?: string[];
    /** Source account ID (for ARN remapping) */
    sourceAccountId?: string;
    /** Target account ID */
    targetAccountId?: string;
    /** Source region */
    sourceRegion?: string;
    /** Target region */
    targetRegion?: string;
    /** CDK stack name */
    stackName?: string;
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────────

  function remapArn(arn: string, req: ExportRequest): string {
    let result = arn;
    if (req.sourceAccountId && req.targetAccountId) {
      result = result.replace(new RegExp(req.sourceAccountId, 'g'), req.targetAccountId);
    }
    if (req.sourceRegion && req.targetRegion) {
      result = result.replace(new RegExp(req.sourceRegion, 'g'), req.targetRegion);
    }
    return result;
  }

  function remapValue(val: unknown, req: ExportRequest): unknown {
    if (typeof val === 'string') return remapArn(val, req);
    if (Array.isArray(val)) return val.map((v) => remapValue(v, req));
    if (val && typeof val === 'object') {
      const result: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(val as Record<string, unknown>)) {
        result[k] = remapValue(v, req);
      }
      return result;
    }
    return val;
  }

  function getExportNodes(req: ExportRequest): Array<[string, DiscoveryNode]> {
    const allNodes = graphStore.getAllNodes();
    const entries: Array<[string, DiscoveryNode]> = [];
    for (const [arn, node] of allNodes) {
      if (node.classification === NodeClassification.AWS_MANAGED) continue;
      if (node.referenceOnly) continue;
      if (req.includeArns && req.includeArns.length > 0 && !req.includeArns.includes(arn)) continue;
      entries.push([arn, node]);
    }
    return entries;
  }

  function toLogicalId(str: string): string {
    return str.replace(/[^a-zA-Z0-9]/g, '_').replace(/^_+/, '').replace(/^(\d)/, 'R$1');
  }

  // ─── Raw JSON export ──────────────────────────────────────────────────────────

  router.post('/raw', async (c) => {
    try {
      const req = await c.req.json<ExportRequest>();
      const nodes = getExportNodes(req);
      const edges = graphStore.getAllEdges();

      const exportedNodes: Record<string, unknown> = {};
      for (const [arn, node] of nodes) {
        const remappedArn = remapArn(arn, req);
        const serialized = toDiscoveredNode(remappedArn, node);
        exportedNodes[remappedArn] = {
          ...serialized,
          properties: remapValue(serialized.properties, req),
          referencedArns: serialized.referencedArns.map((a) => remapArn(a, req)),
        };
      }

      return c.json({
        data: {
          exportedAt: new Date().toISOString(),
          nodeCount: nodes.length,
          nodes: exportedNodes,
          edges: edges
            .filter(
              (e) =>
                exportedNodes[remapArn(e.source, req)] || exportedNodes[remapArn(e.target, req)],
            )
            .map((e) => ({
              ...e,
              source: remapArn(e.source, req),
              target: remapArn(e.target, req),
            })),
        },
      });
    } catch (err) {
      return c.json({ error: err instanceof Error ? err.message : String(err) });
    }
  });

  // ─── CloudFormation export ────────────────────────────────────────────────────

  router.post('/cfn', async (c) => {
    try {
      const req = await c.req.json<ExportRequest>();
      const nodes = getExportNodes(req);

      const template: Record<string, unknown> = {
        AWSTemplateFormatVersion: '2010-09-09',
        Description: `Exported by AWS Sync Tool — ${new Date().toISOString()}`,
        Parameters: {},
        Resources: {},
        Outputs: {},
      };

      const resources = template.Resources as Record<string, unknown>;
      const outputs = template.Outputs as Record<string, unknown>;

      for (const [arn, node] of nodes) {
        if (!node.cfnType) continue;
        const logicalId = toLogicalId(node.logicalId);
        const props = remapValue(node.properties, req) as Record<string, unknown>;

        // Generate CFN resource properties based on service
        const cfnProps = buildCfnProperties(node, props, req);

        resources[logicalId] = {
          Type: node.cfnType,
          Properties: cfnProps,
          ...(node.metadata?.isEmpty
            ? { Metadata: { 'aws-sync-tool': { note: 'manually created placeholder' } } }
            : {}),
        };

        // Emit outputs for ARNs that other stacks might reference
        outputs[`${logicalId}Arn`] = {
          Value: { Ref: logicalId },
          Export: { Name: `${req.stackName || 'SyncedStack'}-${logicalId}` },
        };
      }

      const templateStr = JSON.stringify(template, null, 2);
      c.header('Content-Disposition', 'attachment; filename="template.json"');
      c.header('Content-Type', 'application/json');
      return c.body(templateStr);
    } catch (err) {
      return c.json({ error: err instanceof Error ? err.message : String(err) });
    }
  });

  // ─── CDK export ───────────────────────────────────────────────────────────────

  router.post('/cdk', async (c) => {
    try {
      const req = await c.req.json<ExportRequest>();
      const nodes = getExportNodes(req);
      const stackName = req.stackName || 'SyncedStack';

      const files: Record<string, string> = {};

      // package.json
      files['package.json'] = JSON.stringify(
        {
          name: stackName.toLowerCase().replace(/\s+/g, '-'),
          version: '0.1.0',
          bin: { app: 'bin/app.js' },
          scripts: {
            build: 'tsc',
            cdk: 'cdk',
            synth: 'cdk synth',
            deploy: 'cdk deploy',
          },
          dependencies: {
            'aws-cdk-lib': '^2.100.0',
            constructs: '^10.0.0',
          },
          devDependencies: {
            '@types/node': '^18',
            typescript: '~5.2',
            'aws-cdk': '^2.100.0',
          },
        },
        null,
        2,
      );

      // tsconfig.json
      files['tsconfig.json'] = JSON.stringify(
        {
          compilerOptions: {
            target: 'ES2020',
            module: 'commonjs',
            lib: ['es2020'],
            strict: true,
            outDir: './cdk.out',
            rootDir: '.',
          },
          exclude: ['node_modules', 'cdk.out'],
        },
        null,
        2,
      );

      // cdk.json
      files['cdk.json'] = JSON.stringify({ app: 'npx ts-node bin/app.ts' }, null, 2);

      // config/mapping.ts
      files['config/mapping.ts'] = buildMappingConfig(req);

      // bin/app.ts
      files['bin/app.ts'] = buildCdkAppEntry(stackName);

      // lib/stack.ts
      files[`lib/${stackName}.ts`] = buildCdkStack(nodes, stackName, req);

      // README.md
      files['README.md'] = buildReadme(stackName, req);

      // Return as a JSON object with file contents (client can zip if needed)
      return c.json({
        data: {
          stackName,
          exportedAt: new Date().toISOString(),
          nodeCount: nodes.length,
          files,
        },
      });
    } catch (err) {
      return c.json({ error: err instanceof Error ? err.message : String(err) });
    }
  });

  // ─── CDK generators ───────────────────────────────────────────────────────────

  function buildMappingConfig(req: ExportRequest): string {
    return `/**
 * Account mapping configuration
 * Adjust these values for your target environment.
 */
export const mapping = {
  sourceAccountId: '${req.sourceAccountId || 'REPLACE_ME'}',
  targetAccountId: '${req.targetAccountId || 'REPLACE_ME'}',
  sourceRegion: '${req.sourceRegion || 'us-east-1'}',
  targetRegion: '${req.targetRegion || 'us-east-1'}',
};
`;
  }

  function buildCdkAppEntry(stackName: string): string {
    return `import * as cdk from 'aws-cdk-lib';
import { ${stackName} } from '../lib/${stackName}';
import { mapping } from '../config/mapping';

const app = new cdk.App();

new ${stackName}(app, '${stackName}', {
  env: {
    account: mapping.targetAccountId,
    region: mapping.targetRegion,
  },
});
`;
  }

  function buildCdkStack(
    nodes: Array<[string, DiscoveryNode]>,
    stackName: string,
    req: ExportRequest,
  ): string {
    const imports = new Set<string>(['* as cdk from \'aws-cdk-lib\'']);
    const constructs: string[] = [];

    for (const [, node] of nodes) {
      const props = remapValue(node.properties, req) as Record<string, unknown>;
      const code = generateCdkConstruct(node, props, req, imports);
      if (code) constructs.push(code);
    }

    const importLines = Array.from(imports)
      .map((i) => (i.startsWith('*') ? `import ${i};` : `import { ${i} } from 'aws-cdk-lib';`))
      .join('\n');

    return `${importLines}
import { Construct } from 'constructs';
import { mapping } from '../config/mapping';

// Generated by AWS Sync Tool — ${new Date().toISOString()}
// Source account: ${req.sourceAccountId || 'unknown'} (${req.sourceRegion || 'unknown'})
// Target account: ${req.targetAccountId || 'REPLACE_ME'} (${req.targetRegion || req.sourceRegion || 'us-east-1'})

export class ${stackName} extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

${constructs.map((c) => c.split('\n').map((l) => '    ' + l).join('\n')).join('\n\n')}
  }
}
`;
  }

  function generateCdkConstruct(
    node: DiscoveryNode,
    props: Record<string, unknown>,
    _req: ExportRequest,
    imports: Set<string>,
  ): string {
    const id = toLogicalId(node.logicalId);

    switch (node.service) {
      case 'lambda': {
        imports.add("aws_lambda as lambda from 'aws-cdk-lib/aws-lambda'");
        const runtime = String(props.Runtime || 'nodejs18.x');
        const handler = String(props.Handler || 'index.handler');
        const timeout = Number(props.Timeout || 3);
        const memory = Number(props.MemorySize || 128);
        return `// Lambda function: ${node.logicalId}
const ${id} = new lambda.Function(this, '${id}', {
  functionName: '${node.logicalId}',
  runtime: lambda.Runtime.${runtimeToCdkEnum(runtime)},
  handler: '${handler}',
  code: lambda.Code.fromInline('// Replace with your deployment package'),
  timeout: cdk.Duration.seconds(${timeout}),
  memorySize: ${memory},
  ${props.Environment && (props.Environment as any).Variables ? `environment: ${JSON.stringify((props.Environment as any).Variables || {}, null, 2).replace(/\n/g, '\n  ')},` : '// environment: {}'}
});`;
      }

      case 'dynamodb': {
        imports.add("aws_dynamodb as dynamodb from 'aws-cdk-lib/aws-dynamodb'");
        const keySchema = (props.KeySchema as any[]) || [];
        const hashKey = keySchema.find((k: any) => k.KeyType === 'HASH');
        const rangeKey = keySchema.find((k: any) => k.KeyType === 'RANGE');
        const billing = props.BillingMode === 'PAY_PER_REQUEST' ? 'dynamodb.BillingMode.PAY_PER_REQUEST' : 'dynamodb.BillingMode.PROVISIONED';
        return `// DynamoDB table: ${node.logicalId}
const ${id} = new dynamodb.Table(this, '${id}', {
  tableName: '${node.logicalId}',
  partitionKey: { name: '${hashKey?.AttributeName || 'id'}', type: dynamodb.AttributeType.STRING },
  ${rangeKey ? `sortKey: { name: '${rangeKey.AttributeName}', type: dynamodb.AttributeType.STRING },` : ''}
  billingMode: ${billing},
  removalPolicy: cdk.RemovalPolicy.RETAIN,
});`;
      }

      case 's3': {
        imports.add("aws_s3 as s3 from 'aws-cdk-lib/aws-s3'");
        const versioned = props.Versioning === 'Enabled';
        return `// S3 bucket: ${node.logicalId}
const ${id} = new s3.Bucket(this, '${id}', {
  bucketName: '${node.logicalId}',
  versioned: ${versioned},
  encryption: s3.BucketEncryption.S3_MANAGED,
  blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
  removalPolicy: cdk.RemovalPolicy.RETAIN,
});`;
      }

      case 'iam': {
        if (node.classification === NodeClassification.AWS_MANAGED) return '';
        imports.add("aws_iam as iam from 'aws-cdk-lib/aws-iam'");
        if (node.cfnType === 'AWS::IAM::Role') {
          const assumeDoc = props.AssumeRolePolicyDocument;
          return `// IAM role: ${node.logicalId}
const ${id} = new iam.Role(this, '${id}', {
  roleName: '${node.logicalId}',
  assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'), // review: ${JSON.stringify(assumeDoc).slice(0, 80)}...
  managedPolicies: [
    iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
  ],
});`;
        }
        return '';
      }

      case 'connect': {
        // Connect uses L1 (CFN) constructs in CDK
        imports.add("aws_connect as connect from 'aws-cdk-lib/aws-connect'");
        if (!node.cfnType) return '';

        const cfnType = node.cfnType.replace('AWS::Connect::', '');
        return `// Connect ${cfnType}: ${node.logicalId}
// NOTE: Connect resources often require the InstanceArn.
// Review and complete the properties below.
const ${id} = new connect.Cfn${cfnType}(this, '${id}', {
  // instanceArn: connectInstance.attrArn,
  // TODO: fill in required properties for ${node.cfnType}
  // Raw config: ${JSON.stringify(Object.fromEntries(Object.entries(props).slice(0, 3))).slice(0, 120)}...
} as any);`;
      }

      default:
        // Emit as a CfnResource for unsupported types
        if (!node.cfnType) return '';
        return `// ${node.cfnType}: ${node.logicalId}
// Unsupported service '${node.service}' — emitting as raw CloudFormation resource.
const ${id} = new cdk.CfnResource(this, '${id}', {
  type: '${node.cfnType}',
  properties: ${JSON.stringify(props, null, 2).replace(/\n/g, '\n  ')},
});`;
    }
  }

  function runtimeToCdkEnum(runtime: string): string {
    const map: Record<string, string> = {
      'nodejs20.x': 'NODEJS_20_X',
      'nodejs18.x': 'NODEJS_18_X',
      'nodejs16.x': 'NODEJS_16_X',
      'python3.12': 'PYTHON_3_12',
      'python3.11': 'PYTHON_3_11',
      'python3.10': 'PYTHON_3_10',
      'python3.9': 'PYTHON_3_9',
      'java21': 'JAVA_21',
      'java17': 'JAVA_17',
      'dotnet8': 'DOTNET_8',
    };
    return map[runtime] || 'NODEJS_18_X';
  }

  function buildCfnProperties(
    node: DiscoveryNode,
    props: Record<string, unknown>,
    _req: ExportRequest,
  ): Record<string, unknown> {
    // Service-specific property mapping to CFN schema
    switch (node.service) {
      case 'lambda':
        return {
          FunctionName: node.logicalId,
          Runtime: props.Runtime,
          Handler: props.Handler,
          Role: props.Role,
          Code: { ZipFile: '# Replace with your deployment package' },
          Timeout: props.Timeout,
          MemorySize: props.MemorySize,
          Environment: props.Environment,
          ...(props.VpcConfig ? { VpcConfig: props.VpcConfig } : {}),
        };
      case 'dynamodb':
        return {
          TableName: node.logicalId,
          KeySchema: props.KeySchema,
          AttributeDefinitions: props.AttributeDefinitions,
          BillingMode: props.BillingMode || 'PAY_PER_REQUEST',
        };
      case 's3':
        return {
          BucketName: node.logicalId,
          VersioningConfiguration: props.Versioning === 'Enabled' ? { Status: 'Enabled' } : undefined,
        };
      case 'iam':
        if (node.cfnType === 'AWS::IAM::Role') {
          return {
            RoleName: node.logicalId,
            AssumeRolePolicyDocument: props.AssumeRolePolicyDocument,
            ...(props.PermissionsBoundary ? { PermissionsBoundary: props.PermissionsBoundary } : {}),
          };
        }
        return props;
      default:
        return props;
    }
  }

  function buildReadme(stackName: string, req: ExportRequest): string {
    return `# ${stackName}

Generated by AWS Sync Tool on ${new Date().toISOString()}.

## Account Mapping

| | Account ID | Region |
|---|---|---|
| Source | \`${req.sourceAccountId || 'unknown'}\` | \`${req.sourceRegion || 'unknown'}\` |
| Target | \`${req.targetAccountId || 'REPLACE_ME'}\` | \`${req.targetRegion || req.sourceRegion || 'us-east-1'}\` |

## Setup

\`\`\`bash
npm install
\`\`\`

1. Review \`config/mapping.ts\` — verify account IDs and regions.
2. Review each construct in \`lib/${stackName}.ts\`.
3. For Lambda functions, replace the inline code placeholder with your actual deployment package.
4. For Connect resources, verify \`instanceArn\` references are correct.

## Deploy

\`\`\`bash
npx cdk bootstrap aws://${req.targetAccountId || 'ACCOUNT'}/${req.targetRegion || 'REGION'}
npx cdk synth
npx cdk deploy
\`\`\`

## Notes

- AWS-managed resources (service-linked roles, AWS-managed policies) are excluded from this stack.
  They are assumed to exist in the target account.
- S3 buckets and DynamoDB tables use \`RETAIN\` removal policy to protect data.
- Review IAM roles carefully — assume-role policies may reference account-specific principals.
`;
  }

  return router;
}