import * as cdk from 'aws-cdk-lib';
import * as connect from 'aws-cdk-lib/aws-connect';
import * as fs from 'fs';
import * as path from 'path';
import { Construct } from 'constructs';
import { ARN_MAP } from './arns';
import { ENV_OVERRIDES } from './overrides';

export class AwsyncPipelineStackContactFlows1Stack extends cdk.Stack {
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
    const DefaultQueueTransfer = new connect.CfnContactFlow(this, 'DefaultQueueTransfer', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "Default queue transfer",
      type: "QUEUE_TRANSFER",
      content: fs.readFileSync(path.join(__dirname, '../flows/DefaultQueueTransfer.json'), 'utf-8'),
      description: "Default flow used to transfer to a queue.",
    });

    const DefaultOutbound = new connect.CfnContactFlow(this, 'DefaultOutbound', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "Default outbound",
      type: "OUTBOUND_WHISPER",
      content: fs.readFileSync(path.join(__dirname, '../flows/DefaultOutbound.json'), 'utf-8'),
      description: "Default flow for outbound calls.",
    });

    const DefaultCustomerHold = new connect.CfnContactFlow(this, 'DefaultCustomerHold', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "Default customer hold",
      type: "CUSTOMER_HOLD",
      content: fs.readFileSync(path.join(__dirname, '../flows/DefaultCustomerHold.json'), 'utf-8'),
      description: "Default audio the customer hears while on hold.",
    });

    const DirectDialCustomerQueue = new connect.CfnContactFlow(this, 'DirectDialCustomerQueue', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "Direct Dial Customer Queue",
      type: "CUSTOMER_QUEUE",
      content: fs.readFileSync(path.join(__dirname, '../flows/DirectDialCustomerQueue.json'), 'utf-8'),
      
    });

    const QueueQuickConnectSpanish = new connect.CfnContactFlow(this, 'QueueQuickConnectSpanish', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "Queue Quick Connect Spanish",
      type: "QUEUE_TRANSFER",
      content: fs.readFileSync(path.join(__dirname, '../flows/QueueQuickConnectSpanish.json'), 'utf-8'),
      description: "Self-contained queue transfer flow for agent-initiated quick connects to Spanish queues. Sets Lupe voice, es-US language. Includes full pre-queue logic.",
    });

    const DefaultCustomerQueue = new connect.CfnContactFlow(this, 'DefaultCustomerQueue', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "Default customer queue",
      type: "CUSTOMER_QUEUE",
      content: fs.readFileSync(path.join(__dirname, '../flows/DefaultCustomerQueue.json'), 'utf-8'),
      description: "Default audio played when a customer is waiting in queue.",
    });

    const DefaultCustomerWhisper = new connect.CfnContactFlow(this, 'DefaultCustomerWhisper', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "Default customer whisper",
      type: "CUSTOMER_WHISPER",
      content: fs.readFileSync(path.join(__dirname, '../flows/DefaultCustomerWhisper.json'), 'utf-8'),
      description: "Default whisper played to the customer",
    });

    const DirectDialOutbound = new connect.CfnContactFlow(this, 'DirectDialOutbound', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "Direct Dial Outbound",
      type: "OUTBOUND_WHISPER",
      content: fs.readFileSync(path.join(__dirname, '../flows/DirectDialOutbound.json'), 'utf-8'),
      description: "Outbound whisper flow for agent-initiated outbound calls. Sets recording, agent preferred name, and disposition codes.",
    });

    const CustomerQueue = new connect.CfnContactFlow(this, 'CustomerQueue', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "Customer Queue",
      type: "CUSTOMER_QUEUE",
      content: fs.readFileSync(path.join(__dirname, '../flows/CustomerQueue.json'), 'utf-8'),
      
    });

    const QueueQuickConnect = new connect.CfnContactFlow(this, 'QueueQuickConnect', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "Queue Quick Connect",
      type: "QUEUE_TRANSFER",
      content: fs.readFileSync(path.join(__dirname, '../flows/QueueQuickConnect.json'), 'utf-8'),
      description: "Self-contained queue transfer flow for agent-initiated quick connects. Includes full pre-queue logic: HOOP, holiday, meeting, auth, survey, recording, callback, whisper, disposition codes.",
    });

    const MCOMenu = new connect.CfnContactFlow(this, 'MCOMenu', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "MCO Menu",
      type: "CONTACT_FLOW",
      content: fs.readFileSync(path.join(__dirname, '../flows/MCOMenu.json'), 'utf-8'),
      
    });

    const AgentAssistEntry = new connect.CfnContactFlow(this, 'AgentAssistEntry', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "Agent Assist Entry",
      type: "CONTACT_FLOW",
      content: fs.readFileSync(path.join(__dirname, '../flows/AgentAssistEntry.json'), 'utf-8'),
      description: "Direct-to-queue flow for External Agent Assistance line. No greeting. Routes to Q_CSC_Agent_Assist via Pre-Queue Preparation.",
    });

    const CSCTransferEntry = new connect.CfnContactFlow(this, 'CSCTransferEntry', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "CSC Transfer Entry",
      type: "CONTACT_FLOW",
      content: fs.readFileSync(path.join(__dirname, '../flows/CSCTransferEntry.json'), 'utf-8'),
      description: "Direct-to-queue flow for EDD/FTB transfer lines. No greeting. Routes to Q_CSC_Customer_Service_Center via Pre-Queue Preparation.",
    });

    const SUTTaxRates = new connect.CfnContactFlow(this, 'SUTTaxRates', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "SUT Tax Rates",
      type: "CONTACT_FLOW",
      content: fs.readFileSync(path.join(__dirname, '../flows/SUTTaxRates.json'), 'utf-8'),
      
    });

    const WebChatToAgentTransfer = new connect.CfnContactFlow(this, 'WebChatToAgentTransfer', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "Web Chat to Agent Transfer",
      type: "CONTACT_FLOW",
      content: fs.readFileSync(path.join(__dirname, '../flows/WebChatToAgentTransfer.json'), 'utf-8'),
      
    });

    const TaxEvasionEntry = new connect.CfnContactFlow(this, 'TaxEvasionEntry', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "Tax Evasion Entry",
      type: "CONTACT_FLOW",
      content: fs.readFileSync(path.join(__dirname, '../flows/TaxEvasionEntry.json'), 'utf-8'),
      description: "Direct-to-queue flow for Tax Evasion Hotline. Routes to Q_CSC_Customer_Service_Center via Pre-Queue Preparation.",
    });

    const STFMainMenu = new connect.CfnContactFlow(this, 'STFMainMenu', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "STF Main Menu",
      type: "CONTACT_FLOW",
      content: fs.readFileSync(path.join(__dirname, '../flows/STFMainMenu.json'), 'utf-8'),
      
    });

    const DirectDialInbound = new connect.CfnContactFlow(this, 'DirectDialInbound', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "Direct Dial Inbound",
      type: "CONTACT_FLOW",
      content: fs.readFileSync(path.join(__dirname, '../flows/DirectDialInbound.json'), 'utf-8'),
      
    });

    const CUTSMainMenu = new connect.CfnContactFlow(this, 'CUTSMainMenu', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "CUTS Main Menu",
      type: "CONTACT_FLOW",
      content: fs.readFileSync(path.join(__dirname, '../flows/CUTSMainMenu.json'), 'utf-8'),
      
    });

    const NCWCloseoutsEntry = new connect.CfnContactFlow(this, 'NCWCloseoutsEntry', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "NCW Closeouts Entry",
      type: "CONTACT_FLOW",
      content: fs.readFileSync(path.join(__dirname, '../flows/NCWCloseoutsEntry.json'), 'utf-8'),
      description: "Direct-to-queue flow for NCW Closeouts line. Routes to Q_CSC_NCW_Closeouts via Pre-Queue Preparation.",
    });

    const EFTFormsSubmenu = new connect.CfnContactFlow(this, 'EFTFormsSubmenu', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "EFT Forms Submenu",
      type: "CONTACT_FLOW",
      content: fs.readFileSync(path.join(__dirname, '../flows/EFTFormsSubmenu.json'), 'utf-8'),
      
    });

    const ZMigrationFlow = new connect.CfnContactFlow(this, 'ZMigrationFlow', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "z_Migration Flow",
      type: "CONTACT_FLOW",
      content: fs.readFileSync(path.join(__dirname, '../flows/ZMigrationFlow.json'), 'utf-8'),
      
    });

    const EFTClosedOutsideHours = new connect.CfnContactFlow(this, 'EFTClosedOutsideHours', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "EFT Closed Outside Hours",
      type: "CONTACT_FLOW",
      content: fs.readFileSync(path.join(__dirname, '../flows/EFTClosedOutsideHours.json'), 'utf-8'),
      
    });

    const CUTSVerifyClearanceMenu = new connect.CfnContactFlow(this, 'CUTSVerifyClearanceMenu', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "CUTS Verify Clearance Menu",
      type: "CONTACT_FLOW",
      content: fs.readFileSync(path.join(__dirname, '../flows/CUTSVerifyClearanceMenu.json'), 'utf-8'),
      
    });

    const CDTFAEntry = new connect.CfnContactFlow(this, 'CDTFAEntry', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "CDTFA Entry",
      type: "CONTACT_FLOW",
      content: fs.readFileSync(path.join(__dirname, '../flows/CDTFAEntry.json'), 'utf-8'),
      
    });

    const EFTMainMenu = new connect.CfnContactFlow(this, 'EFTMainMenu', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "EFT Main Menu",
      type: "CONTACT_FLOW",
      content: fs.readFileSync(path.join(__dirname, '../flows/EFTMainMenu.json'), 'utf-8'),
      
    });

    const TaxPractitionerEntry = new connect.CfnContactFlow(this, 'TaxPractitionerEntry', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "Tax Practitioner Entry",
      type: "CONTACT_FLOW",
      content: fs.readFileSync(path.join(__dirname, '../flows/TaxPractitionerEntry.json'), 'utf-8'),
      description: "Direct-to-queue flow for Tax Practitioner Hotline. Routes to Q_CSC_Customer_Service_Center via Pre-Queue Preparation.",
    });

    const PreQueuePreparation = new connect.CfnContactFlow(this, 'PreQueuePreparation', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "Pre-Queue Preparation",
      type: "CONTACT_FLOW",
      content: fs.readFileSync(path.join(__dirname, '../flows/PreQueuePreparation.json'), 'utf-8'),
      
    });

    const CUTSEntry = new connect.CfnContactFlow(this, 'CUTSEntry', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "CUTS Entry",
      type: "CONTACT_FLOW",
      content: fs.readFileSync(path.join(__dirname, '../flows/CUTSEntry.json'), 'utf-8'),
      
    });

    const EFTACHCreditSubmenu = new connect.CfnContactFlow(this, 'EFTACHCreditSubmenu', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "EFT ACH Credit Submenu",
      type: "CONTACT_FLOW",
      content: fs.readFileSync(path.join(__dirname, '../flows/EFTACHCreditSubmenu.json'), 'utf-8'),
      
    });

    const MCOReceptionEntry = new connect.CfnContactFlow(this, 'MCOReceptionEntry', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "MCO Reception Entry",
      type: "CONTACT_FLOW",
      content: fs.readFileSync(path.join(__dirname, '../flows/MCOReceptionEntry.json'), 'utf-8'),
      description: "Direct-to-queue flow for MCO Reception Line. Routes to Q_MCO_New_License_or_Acct via Pre-Queue Preparation.",
    });

    const CDTFAMainMenu = new connect.CfnContactFlow(this, 'CDTFAMainMenu', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "CDTFA Main Menu",
      type: "CONTACT_FLOW",
      content: fs.readFileSync(path.join(__dirname, '../flows/CDTFAMainMenu.json'), 'utf-8'),
      
    });

    const EFTEntry = new connect.CfnContactFlow(this, 'EFTEntry', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "EFT Entry",
      type: "CONTACT_FLOW",
      content: fs.readFileSync(path.join(__dirname, '../flows/EFTEntry.json'), 'utf-8'),
      
    });

    const DispositionCodes = new connect.CfnContactFlow(this, 'DispositionCodes', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "Disposition Codes",
      type: "CONTACT_FLOW",
      content: fs.readFileSync(path.join(__dirname, '../flows/DispositionCodes.json'), 'utf-8'),
      
    });

    const EFTACHDebitSubmenu = new connect.CfnContactFlow(this, 'EFTACHDebitSubmenu', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "EFT ACH Debit Submenu",
      type: "CONTACT_FLOW",
      content: fs.readFileSync(path.join(__dirname, '../flows/EFTACHDebitSubmenu.json'), 'utf-8'),
      
    });

    const STFUsernameMenu = new connect.CfnContactFlow(this, 'STFUsernameMenu', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "STF Username Menu",
      type: "CONTACT_FLOW",
      content: fs.readFileSync(path.join(__dirname, '../flows/STFUsernameMenu.json'), 'utf-8'),
      
    });

    const CUTSVerifyUseTaxPaidMenu = new connect.CfnContactFlow(this, 'CUTSVerifyUseTaxPaidMenu', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "CUTS Verify Use Tax Paid Menu",
      type: "CONTACT_FLOW",
      content: fs.readFileSync(path.join(__dirname, '../flows/CUTSVerifyUseTaxPaidMenu.json'), 'utf-8'),
      
    });

    const CROSACDEntry = new connect.CfnContactFlow(this, 'CROSACDEntry', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "CROS ACD Entry",
      type: "CONTACT_FLOW",
      content: fs.readFileSync(path.join(__dirname, '../flows/CROSACDEntry.json'), 'utf-8'),
      description: "Direct-to-queue flow for CROS ACD line. Routes to Q_TSD_CROS via Pre-Queue Preparation.",
    });

    const TaxAdvisorsEntry = new connect.CfnContactFlow(this, 'TaxAdvisorsEntry', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "Tax Advisors Entry",
      type: "CONTACT_FLOW",
      content: fs.readFileSync(path.join(__dirname, '../flows/TaxAdvisorsEntry.json'), 'utf-8'),
      description: "Direct-to-queue flow for Tax Advisors line. Routes to Q_TA_Tax_Advisors via Pre-Queue Preparation.",
    });

    const EFTAuthorizationAgreementMenu = new connect.CfnContactFlow(this, 'EFTAuthorizationAgreementMenu', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "EFT Authorization Agreement Menu",
      type: "CONTACT_FLOW",
      content: fs.readFileSync(path.join(__dirname, '../flows/EFTAuthorizationAgreementMenu.json'), 'utf-8'),
      
    });

    const CSCDirectEntry = new connect.CfnContactFlow(this, 'CSCDirectEntry', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "CSC Direct Entry",
      type: "CONTACT_FLOW",
      content: fs.readFileSync(path.join(__dirname, '../flows/CSCDirectEntry.json'), 'utf-8'),
      description: "Direct-to-queue flow for CSC direct line. Routes to Q_CSC_Training via Pre-Queue Preparation.",
    });

    const SpanishEntry = new connect.CfnContactFlow(this, 'SpanishEntry', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "Spanish Entry",
      type: "CONTACT_FLOW",
      content: fs.readFileSync(path.join(__dirname, '../flows/SpanishEntry.json'), 'utf-8'),
      description: "Direct-to-queue flow for Spanish lines. Sets Lupe voice, es-US language. Routes to Q_CSC_Spanish via Pre-Queue Preparation.",
    });

    const CUTSClearanceRequestSubmenu = new connect.CfnContactFlow(this, 'CUTSClearanceRequestSubmenu', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "CUTS Clearance Request Submenu",
      type: "CONTACT_FLOW",
      content: fs.readFileSync(path.join(__dirname, '../flows/CUTSClearanceRequestSubmenu.json'), 'utf-8'),
      
    });

    const UtilityRouteTaskToAgent = new connect.CfnContactFlow(this, 'UtilityRouteTaskToAgent', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "Utility Route Task to Agent",
      type: "CONTACT_FLOW",
      content: fs.readFileSync(path.join(__dirname, '../flows/UtilityRouteTaskToAgent.json'), 'utf-8'),
      
    });

    const SurveyTestFlow = new connect.CfnContactFlow(this, 'SurveyTestFlow', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "Survey Test Flow",
      type: "CONTACT_FLOW",
      content: fs.readFileSync(path.join(__dirname, '../flows/SurveyTestFlow.json'), 'utf-8'),
      
    });

    const STFReturnsMenu = new connect.CfnContactFlow(this, 'STFReturnsMenu', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "STF Returns Menu",
      type: "CONTACT_FLOW",
      content: fs.readFileSync(path.join(__dirname, '../flows/STFReturnsMenu.json'), 'utf-8'),
      
    });

    const CollectionsMenu = new connect.CfnContactFlow(this, 'CollectionsMenu', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "Collections Menu",
      type: "CONTACT_FLOW",
      content: fs.readFileSync(path.join(__dirname, '../flows/CollectionsMenu.json'), 'utf-8'),
      
    });

    const EFTDebitCreditSubmenu = new connect.CfnContactFlow(this, 'EFTDebitCreditSubmenu', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "EFT Debit Credit Submenu",
      type: "CONTACT_FLOW",
      content: fs.readFileSync(path.join(__dirname, '../flows/EFTDebitCreditSubmenu.json'), 'utf-8'),
      
    });

    const EFTTransferToCSCMenu = new connect.CfnContactFlow(this, 'EFTTransferToCSCMenu', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "EFT Transfer To CSC Menu",
      type: "CONTACT_FLOW",
      content: fs.readFileSync(path.join(__dirname, '../flows/EFTTransferToCSCMenu.json'), 'utf-8'),
      
    });

    const TRAEntry = new connect.CfnContactFlow(this, 'TRAEntry', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "TRA Entry",
      type: "CONTACT_FLOW",
      content: fs.readFileSync(path.join(__dirname, '../flows/TRAEntry.json'), 'utf-8'),
      description: "Entry flow for Taxpayers' Rights Advocate (TRA) program. English-only, no menu — routes directly to Q_TRA queue via Pre-Queue Preparation.",
    });
  }
}
