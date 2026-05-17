import { ConnectClient, DescribeEvaluationFormCommand } from '@aws-sdk/client-connect';
import { registerResolver } from '../../resolvers/registry.js';
import type { ResourceResolver, ResolverOutput } from '../../resolvers/resolver-types.js';
import type { ParsedARN } from '../../arn.js';
import { NodeClassification } from '../../discovery/discovery-node.js';
import { extractConnectInstanceId } from './helpers.js';
import { buildARN } from '../../arn.js';

const connectEvaluationFormResolver: ResourceResolver = {
  service: 'connect',
  resourceType: 'evaluation-form',
  cfnType: 'AWS::Connect::EvaluationForm',

  async fetch(arn: ParsedARN, credentials: () => Promise<{ accessKeyId: string; secretAccessKey: string; sessionToken?: string }>): Promise<ResolverOutput> {
    const creds = await credentials();
    const client = new ConnectClient({
      region: arn.region || 'us-east-1',
      credentials: creds,
    });
    const res = await client.send(
      new DescribeEvaluationFormCommand({
        InstanceId: extractConnectInstanceId(arn),
        EvaluationFormId: arn.resourceId,
      }),
    );
    const ef = res.EvaluationForm;
    const data: Record<string, unknown> = {
      EvaluationFormId: ef?.EvaluationFormId,
      EvaluationFormVersion: ef?.EvaluationFormVersion,
      Locked: ef?.Locked,
      EvaluationFormArn: ef?.EvaluationFormArn,
      Title: ef?.Title,
      Description: ef?.Description,
      Status: ef?.Status,
      Items: ef?.Items,
      CreatedTime: ef?.CreatedTime,
      LastModifiedTime: ef?.LastModifiedTime,
    };

    const instanceId = extractConnectInstanceId(arn);
    if (instanceId) {
      data.InstanceArn = buildARN('connect', `instance/${instanceId}`, arn.region, arn.accountId, arn.partition);
    }

    return {
      data,
      logicalId: String(data.Title ?? arn.resourceId),
      classification: NodeClassification.RESOURCE,
    };
  },
};

registerResolver('connect:evaluation-form', connectEvaluationFormResolver);
