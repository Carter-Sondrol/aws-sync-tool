#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { AwsyncStackStack } from '../lib/stack';
import { AwsyncStackCluster1Stack } from '../lib/awsyncstackcluster1-stack';

const app = new cdk.App();
new AwsyncStackStack(app, 'AwsyncStack', { env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION } });
new AwsyncStackCluster1Stack(app, 'AwsyncStackCluster1', { env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION } });
