import * as cdk from 'aws-cdk-lib';
import * as connect from 'aws-cdk-lib/aws-connect';
import * as fs from 'fs';
import * as path from 'path';
import { Construct } from 'constructs';
import { ARN_MAP } from './arns';
import { ENV_OVERRIDES } from './overrides';

export class AwsyncPipelineStackContactFlows2Stack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
    const Mycdtfa2DevArnParam = new cdk.CfnParameter(this, "Mycdtfa2DevArn", {
      type: 'String',
      description: 'ARN of the Amazon Connect instance to deploy resources into',
      default: "arn:aws:connect:us-west-2:797776209609:instance/bd754747-7bce-46be-890e-cd37bd7e0f17",
    });
    const account = this.node.tryGetContext('account') as string ?? Object.keys(ARN_MAP)[0] ?? 'default';
    const arns = ARN_MAP[account] ?? {};
    const envOverrides = ENV_OVERRIDES[account] ?? {};


    // ── Synced resources (to be created/updated) ────────────────────────────
    const MCOSubmenu = new connect.CfnContactFlow(this, 'MCOSubmenu', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "MCO Submenu",
      type: "CONTACT_FLOW",
      content: fs.readFileSync(path.join(__dirname, '../flows/MCOSubmenu.json'), 'utf-8'),
      
    });

    const DefaultAgentHold = new connect.CfnContactFlow(this, 'DefaultAgentHold', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "Default agent hold",
      type: "AGENT_HOLD",
      content: fs.readFileSync(path.join(__dirname, '../flows/DefaultAgentHold.json'), 'utf-8'),
      description: "Audio played for the agent when on hold",
    });

    const DefaultAgentTransfer = new connect.CfnContactFlow(this, 'DefaultAgentTransfer', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "Default agent transfer",
      type: "AGENT_TRANSFER",
      content: fs.readFileSync(path.join(__dirname, '../flows/DefaultAgentTransfer.json'), 'utf-8'),
      description: "Default flow to transfer to an agent.",
    });

    const DefaultAgentWhisper = new connect.CfnContactFlow(this, 'DefaultAgentWhisper', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "Default agent whisper",
      type: "AGENT_WHISPER",
      content: fs.readFileSync(path.join(__dirname, '../flows/DefaultAgentWhisper.json'), 'utf-8'),
      description: "Default whisper played to the agent.",
    });

    const BOEMenu = new connect.CfnContactFlow(this, 'BOEMenu', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "BOE Menu",
      type: "CONTACT_FLOW",
      content: fs.readFileSync(path.join(__dirname, '../flows/BOEMenu.json'), 'utf-8'),
      
    });

    const STFCollectionsMenu = new connect.CfnContactFlow(this, 'STFCollectionsMenu', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "STF Collections Menu",
      type: "CONTACT_FLOW",
      content: fs.readFileSync(path.join(__dirname, '../flows/STFCollectionsMenu.json'), 'utf-8'),
      
    });

    const SurveyDisconnectFlow = new connect.CfnContactFlow(this, 'SurveyDisconnectFlow', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "Survey Disconnect Flow",
      type: "CONTACT_FLOW",
      content: fs.readFileSync(path.join(__dirname, '../flows/SurveyDisconnectFlow.json'), 'utf-8'),
      
    });

    const SUTMenu = new connect.CfnContactFlow(this, 'SUTMenu', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "SUT Menu",
      type: "CONTACT_FLOW",
      content: fs.readFileSync(path.join(__dirname, '../flows/SUTMenu.json'), 'utf-8'),
      
    });

    const STFRegistrationLicenseMenu = new connect.CfnContactFlow(this, 'STFRegistrationLicenseMenu', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "STF Registration License Menu",
      type: "CONTACT_FLOW",
      content: fs.readFileSync(path.join(__dirname, '../flows/STFRegistrationLicenseMenu.json'), 'utf-8'),
      
    });

    const TrainingEntry = new connect.CfnContactFlow(this, 'TrainingEntry', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "Training Entry",
      type: "CONTACT_FLOW",
      content: fs.readFileSync(path.join(__dirname, '../flows/TrainingEntry.json'), 'utf-8'),
      description: "Direct-to-queue flow for Training lines. Routes to Q_CSC_Training via Pre-Queue Preparation.",
    });
  }
}
