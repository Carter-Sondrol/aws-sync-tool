#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { AwsyncPipelineStackStack } from '../lib/stack';
import { AwsyncPipelineStackContactFlows1Stack } from '../lib/awsyncpipelinestackcontactflows1-stack';
import { AwsyncPipelineStackContactFlows2Stack } from '../lib/awsyncpipelinestackcontactflows2-stack';

const app = new cdk.App();
new AwsyncPipelineStackStack(app, 'AwsyncPipelineStack', { env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION } });
new AwsyncPipelineStackContactFlows1Stack(app, 'AwsyncPipelineStackContactFlows1', { env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION } });
new AwsyncPipelineStackContactFlows2Stack(app, 'AwsyncPipelineStackContactFlows2', { env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION } });
