import { LambdaClient, GetFunctionCommand } from '@aws-sdk/client-lambda';
import type { AwsCredentials } from '@aws-sync-tool/types';
import { parseARN } from '../../../packages/types/src/arn.js';

export interface LambdaCodeDownloadParams {
  arn: string;
  credentials: AwsCredentials;
}

export interface LambdaCodeDownloadResult {
  functionName: string;
  codeBuffer: ArrayBuffer;
}

export async function downloadLambdaCode(
  params: LambdaCodeDownloadParams,
): Promise<LambdaCodeDownloadResult> {
  const { arn, credentials } = params;

  const parsed = parseARN(arn);
  if (!parsed) {
    throw new Error(`Failed to parse ARN: ${arn}`);
  }

  const client = new LambdaClient({
    region: parsed.region || 'us-east-1',
    credentials: {
      accessKeyId: credentials.accessKeyId,
      secretAccessKey: credentials.secretAccessKey,
      sessionToken: credentials.sessionToken,
    },
  });

  const res = await client.send(new GetFunctionCommand({ FunctionName: parsed.resourceId }));

  const codeLocation = res.Code?.Location;
  if (!codeLocation) {
    throw new Error('No code location available for this function');
  }

  const codeResponse = await fetch(codeLocation);
  if (!codeResponse.ok) {
    throw new Error(`Failed to download code: ${codeResponse.statusText}`);
  }

  const codeBuffer = await codeResponse.arrayBuffer();
  const functionName = res.Configuration?.FunctionName || 'lambda-function';

  return { functionName, codeBuffer };
}
