import * as cdk from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as connect from 'aws-cdk-lib/aws-connect';
import * as path from 'path';
import { Construct } from 'constructs';
import { ARN_MAP } from './arns';
import { ENV_OVERRIDES } from './overrides';

export class AwsyncPipelineStackStack extends cdk.Stack {
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

    // ── Referenced resources (already exist in target account) ──────────────
    const R1Arn = arns.R1; // connect/agent-group-level

    const R2Arn = arns.R2; // connect/agent-group-level

    const R3Arn = arns.R3; // connect/agent-group-level

    const R4Arn = arns.R4; // connect/agent-group-level

    const R5Arn = arns.R5; // connect/agent-group-level

    const R12792023718Arn = arns.R12792023718; // connect/phone-number

    const R19166335587Arn = arns.R19166335587; // connect/phone-number

    const R19169055280Arn = arns.R19169055280; // connect/phone-number

    const CSCTeamSpagnoloArn = arns.CSCTeamSpagnolo; // connect/agent-hierarchy

    const CSCTeamSpecialistArn = arns.CSCTeamSpecialist; // connect/agent-hierarchy

    const CSCTeamSinghArn = arns.CSCTeamSingh; // connect/agent-hierarchy

    const CSCTeamSamadiArn = arns.CSCTeamSamadi; // connect/agent-hierarchy

    const CSCCustomerServiceCenterArn = arns.CSCCustomerServiceCenter; // connect/agent-hierarchy

    const R8004007115MainIncomingArn = arns.R8004007115MainIncoming; // connect/agent-hierarchy

    const CDTFAArn = arns.CDTFA; // connect/agent-hierarchy

    const CSCSectionArn = arns.CSCSection; // connect/agent-hierarchy

    const CSCTeamLetroArn = arns.CSCTeamLetro; // connect/agent-hierarchy

    const CSCTeamMcNamaraArn = arns.CSCTeamMcNamara; // connect/agent-hierarchy

    const CSCTeamIrvinArn = arns.CSCTeamIrvin; // connect/agent-hierarchy

    const CSCTeamRichardsArn = arns.CSCTeamRichards; // connect/agent-hierarchy

    const CSCTeamJonesArn = arns.CSCTeamJones; // connect/agent-hierarchy

    const CSCTeamGarciaArn = arns.CSCTeamGarcia; // connect/agent-hierarchy

    const CSCTeamKumarArn = arns.CSCTeamKumar; // connect/agent-hierarchy

    const CSCTeamDominguezArn = arns.CSCTeamDominguez; // connect/agent-hierarchy

    const CSCTeamChungArn = arns.CSCTeamChung; // connect/agent-hierarchy

    const CSCTeamBTRArn = arns.CSCTeamBTR; // connect/agent-hierarchy

    const CSCTeamColgroveArn = arns.CSCTeamColgrove; // connect/agent-hierarchy

    const C9851ac7C0d740eeA22c191adacd2210Arn = arns.C9851ac7C0d740eeA22c191adacd2210; // connect/operating-hours

    const AxyomAssistAccessTestArn = arns.AxyomAssistAccessTest; // connect/agent-hierarchy

    const AxyomAssistAccessArn = arns.AxyomAssistAccess; // connect/agent-hierarchy

    const LATESTArn = arns.LATEST; // connect/view

    const R19168442116Arn = arns.R19168442116; // connect/phone-number

    const R19169055284Arn = arns.R19169055284; // connect/phone-number

    const R14046719864Arn = arns.R14046719864; // connect/phone-number

    const R12792023676Arn = arns.R12792023676; // connect/phone-number

    const R12138773853Arn = arns.R12138773853; // connect/phone-number

    const R19166335523Arn = arns.R19166335523; // connect/phone-number

    const R19166335118Arn = arns.R19166335118; // connect/phone-number

    const FODFairfieldAgentsArn = arns.FODFairfieldAgents; // connect/agent-hierarchy

    const FODSantaRosaAgentsArn = arns.FODSantaRosaAgents; // connect/agent-hierarchy

    const FODSacramentoAgentsArn = arns.FODSacramentoAgents; // connect/agent-hierarchy

    const TASectionArn = arns.TASection; // connect/agent-hierarchy

    const ConsumerUseTaxArn = arns.ConsumerUseTax; // connect/agent-hierarchy

    const FODVenturaAgentsArn = arns.FODVenturaAgents; // connect/agent-hierarchy

    const RAULRASArn = arns.RAULRAS; // connect/agent-hierarchy

    const FODStocktonAgentsArn = arns.FODStocktonAgents; // connect/agent-hierarchy

    const FODOutOfStateAgentsArn = arns.FODOutOfStateAgents; // connect/agent-hierarchy

    const FODSectionArn = arns.FODSection; // connect/agent-hierarchy

    const TSDCROSMenuArn = arns.TSDCROSMenu; // connect/agent-hierarchy

    const FODFieldOperationsDivisionArn = arns.FODFieldOperationsDivision; // connect/agent-hierarchy

    const TATaxAdvisorsArn = arns.TATaxAdvisors; // connect/agent-hierarchy

    const CUTMenuArn = arns.CUTMenu; // connect/agent-hierarchy

    const MCOAuditArn = arns.MCOAudit; // connect/agent-hierarchy

    const STFCollectionsTeamBArn = arns.STFCollectionsTeamB; // connect/agent-hierarchy

    const TSDCROSArn = arns.TSDCROS; // connect/agent-hierarchy

    const STFRegistrationTeam2Arn = arns.STFRegistrationTeam2; // connect/agent-hierarchy

    const STFReturnProcessingArn = arns.STFReturnProcessing; // connect/agent-hierarchy

    const FODGlendaleAgentsArn = arns.FODGlendaleAgents; // connect/agent-hierarchy

    const STFAEBArn = arns.STFAEB; // connect/agent-hierarchy

    const FODInvestigationsCSBAgentsArn = arns.FODInvestigationsCSBAgents; // connect/agent-hierarchy

    const STFSpecialTaxesAndFeesArn = arns.STFSpecialTaxesAndFees; // connect/agent-hierarchy

    const STFMotorCarrierMCOArn = arns.STFMotorCarrierMCO; // connect/agent-hierarchy

    const STFReturnProcessingTeam3Arn = arns.STFReturnProcessingTeam3; // connect/agent-hierarchy

    const STFCollectionsArn = arns.STFCollections; // connect/agent-hierarchy

    const CUTSectionArn = arns.CUTSection; // connect/agent-hierarchy

    const ElectronicFundsTransferArn = arns.ElectronicFundsTransfer; // connect/agent-hierarchy

    const STFRegistrationTeam1Arn = arns.STFRegistrationTeam1; // connect/agent-hierarchy

    const FODUTCBNorthAgentsArn = arns.FODUTCBNorthAgents; // connect/agent-hierarchy

    const TaxpayerRightsAdvocateArn = arns.TaxpayerRightsAdvocate; // connect/agent-hierarchy

    const STFCollectionsTeamFArn = arns.STFCollectionsTeamF; // connect/agent-hierarchy

    const FODUTCBSouthAgentsArn = arns.FODUTCBSouthAgents; // connect/agent-hierarchy

    const STFRegistrationArn = arns.STFRegistration; // connect/agent-hierarchy

    const FODRiversideAgentsArn = arns.FODRiversideAgents; // connect/agent-hierarchy

    const FODSanFranciscoAgentsArn = arns.FODSanFranciscoAgents; // connect/agent-hierarchy

    const STFCollectionsTeamCArn = arns.STFCollectionsTeamC; // connect/agent-hierarchy

    const TRAMenuArn = arns.TRAMenu; // connect/agent-hierarchy

    const FODSanDiegoAgentsArn = arns.FODSanDiegoAgents; // connect/agent-hierarchy

    const FODReddingAgentsArn = arns.FODReddingAgents; // connect/agent-hierarchy

    const MCORevoCollectionsArn = arns.MCORevoCollections; // connect/agent-hierarchy

    const FODDiamondBarAgentsArn = arns.FODDiamondBarAgents; // connect/agent-hierarchy

    const STFReturnProcessingTeam5Arn = arns.STFReturnProcessingTeam5; // connect/agent-hierarchy

    const STFReturnProcessingTeam2Arn = arns.STFReturnProcessingTeam2; // connect/agent-hierarchy

    const FODSantaClaritaAgentsArn = arns.FODSantaClaritaAgents; // connect/agent-hierarchy

    const MCORegistrationRefundsArn = arns.MCORegistrationRefunds; // connect/agent-hierarchy

    const FODCerritosAgentsArn = arns.FODCerritosAgents; // connect/agent-hierarchy

    const STFRegistrationTeam3Arn = arns.STFRegistrationTeam3; // connect/agent-hierarchy

    const FODElCentroAgentsArn = arns.FODElCentroAgents; // connect/agent-hierarchy

    const STFRegistrationTeam4Arn = arns.STFRegistrationTeam4; // connect/agent-hierarchy

    const STFAEBAgentsArn = arns.STFAEBAgents; // connect/agent-hierarchy

    const FODRanchoCucamongaAgentsArn = arns.FODRanchoCucamongaAgents; // connect/agent-hierarchy

    const FODBakersfieldAgentsArn = arns.FODBakersfieldAgents; // connect/agent-hierarchy

    const STFReturnProcessingTeam1Arn = arns.STFReturnProcessingTeam1; // connect/agent-hierarchy

    const RAUReturnAnalysisUnitAgentsArn = arns.RAUReturnAnalysisUnitAgents; // connect/agent-hierarchy

    const STFReturnProcessingTeam4Arn = arns.STFReturnProcessingTeam4; // connect/agent-hierarchy

    const FODOaklandAgentsArn = arns.FODOaklandAgents; // connect/agent-hierarchy

    const FODFresnoAgentsArn = arns.FODFresnoAgents; // connect/agent-hierarchy

    const FODRiversideSCOPAgentsArn = arns.FODRiversideSCOPAgents; // connect/agent-hierarchy

    const FODRanchoMirageAgentsArn = arns.FODRanchoMirageAgents; // connect/agent-hierarchy

    const RAULRASSectionArn = arns.RAULRASSection; // connect/agent-hierarchy

    const MCOReturnArn = arns.MCOReturn; // connect/agent-hierarchy

    const FODSalinasAgentsArn = arns.FODSalinasAgents; // connect/agent-hierarchy

    const STFCollectionsTeamAArn = arns.STFCollectionsTeamA; // connect/agent-hierarchy

    const STFCollectionsTeamDArn = arns.STFCollectionsTeamD; // connect/agent-hierarchy

    const STFRegistrationTeam5Arn = arns.STFRegistrationTeam5; // connect/agent-hierarchy

    const FODCulverCityAgentsArn = arns.FODCulverCityAgents; // connect/agent-hierarchy

    const STFCollectionsTeamEArn = arns.STFCollectionsTeamE; // connect/agent-hierarchy

    const FODSanJoseAgentsArn = arns.FODSanJoseAgents; // connect/agent-hierarchy

    const TSDCROSSectionArn = arns.TSDCROSSection; // connect/agent-hierarchy

    const TRASectionArn = arns.TRASection; // connect/agent-hierarchy

    const LRASAgentsArn = arns.LRASAgents; // connect/agent-hierarchy

    const TRAAgentsArn = arns.TRAAgents; // connect/agent-hierarchy

    const TSDCROSAgentsArn = arns.TSDCROSAgents; // connect/agent-hierarchy

    const FODIrvineAgentsArn = arns.FODIrvineAgents; // connect/agent-hierarchy

    const CUTSAgentsArn = arns.CUTSAgents; // connect/agent-hierarchy

    const TaxAdvisorAgentsArn = arns.TaxAdvisorAgents; // connect/agent-hierarchy

    const R0ae506d227744686A12364477f9b36f9Arn = arns.R0ae506d227744686A12364477f9b36f9; // connect/flow-module

    const Fa86c8f1554243b29859Db3ba55cc3c1Arn = arns.Fa86c8f1554243b29859Db3ba55cc3c1; // connect/flow-module

    const R7addeec8752440659e30E23db280b47fArn = arns.R7addeec8752440659e30E23db280b47f; // connect/flow-module

    const F8df5b99Dc4641f789deDf90c51ae103Arn = arns.F8df5b99Dc4641f789deDf90c51ae103; // connect/flow-module

    const R371ac0c1B4af4319A237448aaea4b55dArn = arns.R371ac0c1B4af4319A237448aaea4b55d; // connect/flow-module

    const D22491feC7774df2988855dc5070a938Arn = arns.D22491feC7774df2988855dc5070a938; // connect/flow-module

    const R4468d9f788764a0a889a0db7f5219fdfArn = arns.R4468d9f788764a0a889a0db7f5219fdf; // connect/flow-module

    const Fc0ec9c65a65407dB8342f15e4c2fc70Arn = arns.Fc0ec9c65a65407dB8342f15e4c2fc70; // connect/flow-module

    const Bd89f737F10445dcB81c23096bff37ddArn = arns.Bd89f737F10445dcB81c23096bff37dd; // connect/flow-module

    const R84831b48A75b4d189e6f403409e694d3Arn = arns.R84831b48A75b4d189e6f403409e694d3; // connect/flow-module

    const TrafficTypeArn = arns.TrafficType; // connect/predefined-attribute

    const SubtypeArn = arns.Subtype; // connect/predefined-attribute

    const ScreenSharingDetailsArn = arns.ScreenSharingDetails; // connect/predefined-attribute

    const ValidationTestTypeArn = arns.ValidationTestType; // connect/predefined-attribute

    const XSESVIRUSVERDICTArn = arns.XSESVIRUSVERDICT; // connect/predefined-attribute

    const XSESSPAMVERDICTArn = arns.XSESSPAMVERDICT; // connect/predefined-attribute

    const AssignmentTypeArn = arns.AssignmentType; // connect/predefined-attribute

    const CustomerAuthenticationArn = arns.CustomerAuthentication; // connect/predefined-attribute

    const ContactExpiryArn = arns.ContactExpiry; // connect/predefined-attribute

    const EmailSubjectArn = arns.EmailSubject; // connect/predefined-attribute

    const LanguageArn = arns.Language; // connect/predefined-attribute

    const RedactedEmailSubjectArn = arns.RedactedEmailSubject; // connect/predefined-attribute

    const ScreenShareDetailsArn = arns.ScreenShareDetails; // connect/predefined-attribute

    const DirectionArn = arns.Direction; // connect/predefined-attribute

    const CreatedByUserArn = arns.CreatedByUser; // connect/predefined-attribute

    const Fbc17acf862a4dcd82c38dfb82013e0cArn = arns.Fbc17acf862a4dcd82c38dfb82013e0c; // connect/operating-hours

    const C5eeb29253644e02Ace96283bcf12297Arn = arns.C5eeb29253644e02Ace96283bcf12297; // connect/operating-hours

    const R98ab2bf3A52849369e0d729d4265817eArn = arns.R98ab2bf3A52849369e0d729d4265817e; // connect/operating-hours

    const R7fdaa19eC1d043fdB4a8737356bfd2e1Arn = arns.R7fdaa19eC1d043fdB4a8737356bfd2e1; // connect/operating-hours

    const R7b660541892d4c469c5f32efac41d03fArn = arns.R7b660541892d4c469c5f32efac41d03f; // connect/operating-hours

    const R78f86704652149d0AdfcBc25bf47328bArn = arns.R78f86704652149d0AdfcBc25bf47328b; // connect/operating-hours

    const R62f7e7c57a2f42649f4c8b960b356c6aArn = arns.R62f7e7c57a2f42649f4c8b960b356c6a; // connect/operating-hours

    const R5f586cdc6f7647ee96ceEd600c490256Arn = arns.R5f586cdc6f7647ee96ceEd600c490256; // connect/operating-hours

    const R59f0ea9fBeb74cca82d2E28e2a0a9af1Arn = arns.R59f0ea9fBeb74cca82d2E28e2a0a9af1; // connect/operating-hours

    const R4050e6a940cb407cAb768c235bf94ae1Arn = arns.R4050e6a940cb407cAb768c235bf94ae1; // connect/operating-hours

    const R3d95f14c20a246b9B0fc1ff50f78dc12Arn = arns.R3d95f14c20a246b9B0fc1ff50f78dc12; // connect/operating-hours

    const R3c97e7528f4a4e458f58301e51a14cb3Arn = arns.R3c97e7528f4a4e458f58301e51a14cb3; // connect/operating-hours

    const R3c80ede8D6f040a3B483190a7a8f9e2aArn = arns.R3c80ede8D6f040a3B483190a7a8f9e2a; // connect/operating-hours

    const R37016c0f34db47bcBd5e011da63febf5Arn = arns.R37016c0f34db47bcBd5e011da63febf5; // connect/operating-hours

    const R283cec7dDbfe4742A8679732203605b9Arn = arns.R283cec7dDbfe4742A8679732203605b9; // connect/operating-hours

    const R1515d787E3ab424bBf2b39634fc0217eArn = arns.R1515d787E3ab424bBf2b39634fc0217e; // connect/operating-hours

    const R0a5dfac3Ac56478cAd6d7839d576c5e1Arn = arns.R0a5dfac3Ac56478cAd6d7839d576c5e1; // connect/operating-hours

    const R052fdd6534804d429fd23e1792e40a92Arn = arns.R052fdd6534804d429fd23e1792e40a92; // connect/operating-hours

    const R00d2d5b296e14c54A96014dc2051ede4Arn = arns.R00d2d5b296e14c54A96014dc2051ede4; // connect/operating-hours

    const E80c7db27f914b4287c72772347d4997Arn = arns.E80c7db27f914b4287c72772347d4997; // connect/agent

    const E0a96b609a55450bBa8aAb9fb5b8e371Arn = arns.E0a96b609a55450bBa8aAb9fb5b8e371; // connect/agent

    const D3c0c1fc6d9246208d57Df28618ca1d6Arn = arns.D3c0c1fc6d9246208d57Df28618ca1d6; // connect/agent

    const C95fd44e7647404bA502C88e154dd777Arn = arns.C95fd44e7647404bA502C88e154dd777; // connect/agent

    const C7d9e97915dd4eb5Ae12C063ed73b78dArn = arns.C7d9e97915dd4eb5Ae12C063ed73b78d; // connect/agent

    const B7f9e2dd96ee49369b30Cf328ce94fc4Arn = arns.B7f9e2dd96ee49369b30Cf328ce94fc4; // connect/agent

    const R863ce8136913471fAca8A1ccdd2dfe41Arn = arns.R863ce8136913471fAca8A1ccdd2dfe41; // connect/agent

    const R7548570dFc0d4aed8d37Bc48fa3b8487Arn = arns.R7548570dFc0d4aed8d37Bc48fa3b8487; // connect/agent

    const R6b09d5d52dc440b6B79e858a68e79443Arn = arns.R6b09d5d52dc440b6B79e858a68e79443; // connect/agent

    const R62031feeB9064c80Af7b7337fbba8607Arn = arns.R62031feeB9064c80Af7b7337fbba8607; // connect/agent

    const R5a14b476Bf394a40964eE48d2c16419bArn = arns.R5a14b476Bf394a40964eE48d2c16419b; // connect/agent

    const R5720c3293d3947b3Bd528243e5476d36Arn = arns.R5720c3293d3947b3Bd528243e5476d36; // connect/agent

    const R5435a51c7a0344fa913982eaf6865059Arn = arns.R5435a51c7a0344fa913982eaf6865059; // connect/agent

    const R474a796c3b6e43308879714ec804e172Arn = arns.R474a796c3b6e43308879714ec804e172; // connect/agent

    const R4652016635fb48cdA2aeD9c103b28da9Arn = arns.R4652016635fb48cdA2aeD9c103b28da9; // connect/agent

    const R44e371458b974a99Aa67Ce067703aeccArn = arns.R44e371458b974a99Aa67Ce067703aecc; // connect/agent

    const R3bf16bc9129b4110835f6e5464c798bfArn = arns.R3bf16bc9129b4110835f6e5464c798bf; // connect/agent

    const R34c2a4f2Cace47a3A30c8c8d2c066c42Arn = arns.R34c2a4f2Cace47a3A30c8c8d2c066c42; // connect/agent

    const R1a8bd8d97472492cB13b892949112793Arn = arns.R1a8bd8d97472492cB13b892949112793; // connect/agent

    const R0e2ee1a7F46147a1A6ceF7449370ab20Arn = arns.R0e2ee1a7F46147a1A6ceF7449370ab20; // connect/agent

    const R0ce6319063424f4e8510B4388a9b615dArn = arns.R0ce6319063424f4e8510B4388a9b615d; // connect/agent

    const ListArn = arns.List; // connect/unknown

    const FormArn = arns.Form; // connect/unknown

    const DetailArn = arns.Detail; // connect/unknown

    const ConfirmationArn = arns.Confirmation; // connect/unknown

    const CardsArn = arns.Cards; // connect/unknown

    const AfterContactWorkArn = arns.AfterContactWork; // connect/unknown

    const C95fd44e7647404bA502C88e154dd777QueueArn = arns.C95fd44e7647404bA502C88e154dd777Queue; // connect/queue

    const D3c0c1fc6d9246208d57Df28618ca1d6QueueArn = arns.D3c0c1fc6d9246208d57Df28618ca1d6Queue; // connect/queue

    const B7f9e2dd96ee49369b30Cf328ce94fc4QueueArn = arns.B7f9e2dd96ee49369b30Cf328ce94fc4Queue; // connect/queue

    const C7d9e97915dd4eb5Ae12C063ed73b78dQueueArn = arns.C7d9e97915dd4eb5Ae12C063ed73b78dQueue; // connect/queue

    const E0a96b609a55450bBa8aAb9fb5b8e371QueueArn = arns.E0a96b609a55450bBa8aAb9fb5b8e371Queue; // connect/queue

    const E80c7db27f914b4287c72772347d4997QueueArn = arns.E80c7db27f914b4287c72772347d4997Queue; // connect/queue

    const R62031feeB9064c80Af7b7337fbba8607QueueArn = arns.R62031feeB9064c80Af7b7337fbba8607Queue; // connect/queue

    const R7548570dFc0d4aed8d37Bc48fa3b8487QueueArn = arns.R7548570dFc0d4aed8d37Bc48fa3b8487Queue; // connect/queue

    const R474a796c3b6e43308879714ec804e172QueueArn = arns.R474a796c3b6e43308879714ec804e172Queue; // connect/queue

    const R4652016635fb48cdA2aeD9c103b28da9QueueArn = arns.R4652016635fb48cdA2aeD9c103b28da9Queue; // connect/queue

    const R5720c3293d3947b3Bd528243e5476d36QueueArn = arns.R5720c3293d3947b3Bd528243e5476d36Queue; // connect/queue

    const R6b09d5d52dc440b6B79e858a68e79443QueueArn = arns.R6b09d5d52dc440b6B79e858a68e79443Queue; // connect/queue

    const R5a14b476Bf394a40964eE48d2c16419bQueueArn = arns.R5a14b476Bf394a40964eE48d2c16419bQueue; // connect/queue

    const R5435a51c7a0344fa913982eaf6865059QueueArn = arns.R5435a51c7a0344fa913982eaf6865059Queue; // connect/queue

    const R863ce8136913471fAca8A1ccdd2dfe41QueueArn = arns.R863ce8136913471fAca8A1ccdd2dfe41Queue; // connect/queue

    const R0ce6319063424f4e8510B4388a9b615dQueueArn = arns.R0ce6319063424f4e8510B4388a9b615dQueue; // connect/queue

    const R1a8bd8d97472492cB13b892949112793QueueArn = arns.R1a8bd8d97472492cB13b892949112793Queue; // connect/queue

    const R34c2a4f2Cace47a3A30c8c8d2c066c42QueueArn = arns.R34c2a4f2Cace47a3A30c8c8d2c066c42Queue; // connect/queue

    const R44e371458b974a99Aa67Ce067703aeccQueueArn = arns.R44e371458b974a99Aa67Ce067703aeccQueue; // connect/queue

    const R3bf16bc9129b4110835f6e5464c798bfQueueArn = arns.R3bf16bc9129b4110835f6e5464c798bfQueue; // connect/queue

    const R0e2ee1a7F46147a1A6ceF7449370ab20QueueArn = arns.R0e2ee1a7F46147a1A6ceF7449370ab20Queue; // connect/queue

    const AWSServiceRoleForAmazonConnectA13fftWbrUn1aNBhG2qw = iam.Role.fromRoleArn(this, 'AWSServiceRoleForAmazonConnectA13fftWbrUn1aNBhG2qw', arns.AWSServiceRoleForAmazonConnectA13fftWbrUn1aNBhG2qw);

    const AmazonConnectServiceLinkedRolePolicy = iam.ManagedPolicy.fromManagedPolicyArn(this, 'AmazonConnectServiceLinkedRolePolicy', arns.AmazonConnectServiceLinkedRolePolicy);

    // ── Synced resources (to be created/updated) ────────────────────────────
    const LiveChat = new connect.CfnAgentStatus(this, 'LiveChat', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "Live Chat",
      state: "ENABLED",
      type: "CUSTOM",
      displayOrder: 15,
      description: "Not Ready State",
    });

    const CallEvaluations = new connect.CfnAgentStatus(this, 'CallEvaluations', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "Call Evaluations",
      state: "ENABLED",
      type: "CUSTOM",
      displayOrder: 17,
      description: "Not Ready State - Call Evaluations",
    });

    const Lunch = new connect.CfnAgentStatus(this, 'Lunch', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "Lunch",
      state: "ENABLED",
      type: "CUSTOM",
      displayOrder: 14,
      description: "Not Ready State",
    });

    const R5MinuteBreak = new connect.CfnAgentStatus(this, 'R5MinuteBreak', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "5 Minute Break",
      state: "ENABLED",
      type: "CUSTOM",
      displayOrder: 19,
      description: "Not Ready State - 5 Minute Break",
    });

    const ExtendedACW = new connect.CfnAgentStatus(this, 'ExtendedACW', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "Extended ACW",
      state: "ENABLED",
      type: "CUSTOM",
      displayOrder: 16,
      description: "Not Ready State",
    });

    const R15MinuteBreak = new connect.CfnAgentStatus(this, 'R15MinuteBreak', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "15 Minute Break",
      state: "ENABLED",
      type: "CUSTOM",
      displayOrder: 20,
      description: "Not Ready State - 15 Minute Break",
    });

    const Administrative = new connect.CfnAgentStatus(this, 'Administrative', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "Administrative",
      state: "ENABLED",
      type: "CUSTOM",
      displayOrder: 18,
      description: "Not Ready State - Administrative",
    });

    const Name = new connect.CfnAgentStatus(this, 'Name', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "name",
      state: "DISABLED",
      type: "CUSTOM",
      
      description: "desc",
    });

    const Reception = new connect.CfnAgentStatus(this, 'Reception', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "Reception",
      state: "ENABLED",
      type: "CUSTOM",
      displayOrder: 5,
      description: "Not Ready State",
    });

    const NotReady0 = new connect.CfnAgentStatus(this, 'NotReady0', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "Not Ready (0)",
      state: "ENABLED",
      type: "CUSTOM",
      displayOrder: 8,
      description: "Not Ready State",
    });

    const NCWOther = new connect.CfnAgentStatus(this, 'NCWOther', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "NCW (Other)",
      state: "ENABLED",
      type: "CUSTOM",
      displayOrder: 10,
      description: "Not Ready State",
    });

    const TrainerDuties = new connect.CfnAgentStatus(this, 'TrainerDuties', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "Trainer Duties",
      state: "ENABLED",
      type: "CUSTOM",
      displayOrder: 9,
      description: "Not Ready State",
    });

    const Personal = new connect.CfnAgentStatus(this, 'Personal', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "Personal",
      state: "ENABLED",
      type: "CUSTOM",
      displayOrder: 6,
      description: "Not Ready State",
    });

    const NCWReturnedMail = new connect.CfnAgentStatus(this, 'NCWReturnedMail', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "NCW (Returned Mail)",
      state: "ENABLED",
      type: "CUSTOM",
      displayOrder: 12,
      description: "Not Ready State",
    });

    const Referrals = new connect.CfnAgentStatus(this, 'Referrals', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "Referrals",
      state: "ENABLED",
      type: "CUSTOM",
      displayOrder: 4,
      description: "Not Ready State",
    });

    const NCWCloseouts = new connect.CfnAgentStatus(this, 'NCWCloseouts', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "NCW (Closeouts)",
      state: "ENABLED",
      type: "CUSTOM",
      displayOrder: 11,
      description: "Not Ready State",
    });

    const NotScheduled = new connect.CfnAgentStatus(this, 'NotScheduled', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "Not Scheduled",
      state: "ENABLED",
      type: "CUSTOM",
      displayOrder: 7,
      description: "Not Ready State",
    });

    const Meeting = new connect.CfnAgentStatus(this, 'Meeting', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "Meeting",
      state: "ENABLED",
      type: "CUSTOM",
      displayOrder: 13,
      description: "Not Ready State",
    });

    const Training = new connect.CfnAgentStatus(this, 'Training', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "Training",
      state: "ENABLED",
      type: "CUSTOM",
      displayOrder: 3,
      description: "Not Ready State",
    });

    // Agent status 'Offline' is built into every Connect instance — skipping creation

    // Agent status 'Available' is built into every Connect instance — skipping creation

    const Technical = new connect.CfnAgentStatus(this, 'Technical', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "Technical",
      state: "ENABLED",
      type: "CUSTOM",
      displayOrder: 2,
      description: "Not Ready State",
    });

    const CSCSuperUsersOnly = new connect.CfnSecurityProfile(this, 'CSCSuperUsersOnly', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      securityProfileName: "CSC Super Users Only",
      permissions: ["AccessMetrics","AccessMetrics.AgentActivityAudit.Access","AccessMetrics.Dashboards.Access","AccessMetrics.DashboardsWithMyData.View","AccessMetrics.HistoricalMetrics.Access","AccessMetrics.RealTimeMetrics.Access","AgentGrouping.View","AgentStates.View","AgentTimeCard.View","Analytics.PerformanceMetrics.Access","AudioDeviceSettings.Access","BasicAgentAccess","CallRecordings.Redacted.Access","CallRecordings.Unredacted.Access","Capacity.Edit","Capacity.Publish","Capacity.View","CoachingSessions.Create","CoachingSessions.Edit","CoachingSessions.View","ConfigureContactAttributes.View","ContactAttributes.View","ContactLensCustomVocabulary.Edit","ContactLensCustomVocabulary.View","ContactLensPostContactSummary.View","ContactSearch.View","ContactSearchSampleContacts.View","ContactSearchWithCharacteristics.View","ContactSearchWithKeywords.View","ContactTranscripts.Redacted.Access","ContactTranscripts.Unredacted.Access","ContactTranscripts.Unredacted.DownloadButton","ContentManagement.Create","ContentManagement.Delete","ContentManagement.Edit","ContentManagement.MessageTemplates.Create","ContentManagement.MessageTemplates.Delete","ContentManagement.MessageTemplates.Edit","ContentManagement.MessageTemplates.View","ContentManagement.View","CustomMetrics.Create","CustomMetrics.Delete","CustomMetrics.Edit","CustomMetrics.Publish","CustomMetrics.View","CustomViews.Access","CustomerProfiles.CalculatedAttributes.Create","CustomerProfiles.CalculatedAttributes.Edit","CustomerProfiles.CalculatedAttributes.View","CustomerProfiles.PredictiveInsights.View","CustomerProfiles.ProfileExplorer.View","CustomerProfiles.Segments.View","CustomerProfiles.View","Evaluation.Create","Evaluation.Edit","Evaluation.View","EvaluationAssistant.Access","EvaluationCalibrationSessions.Create","EvaluationCalibrationSessions.Edit","EvaluationCalibrationSessions.View","EvaluationForms.Create","EvaluationForms.Delete","EvaluationForms.Edit","EvaluationForms.View","EvaluationReviewRequest.View","EvaluationReviews.View","ForecastScheduleInterval.Edit","ForecastScheduleInterval.View","Forecasting.Edit","Forecasting.Publish","Forecasting.View","GraphTrends.View","HoursOfOperation.View","ManagerBargeIn","ManagerListenIn","ManualAssignAnyContact.Enable","ManualAssignMyContacts.Enable","MetricsReports.Create","MetricsReports.Delete","MetricsReports.Edit","MetricsReports.Publish","MetricsReports.Schedule","MetricsReports.View","MyCoachingSessions.Create","MyCoachingSessions.Edit","MyCoachingSessions.View","MyContacts.View","OutboundCallAccess","Queues.View","RealtimeContactLens.View","ReportSchedules.Create","ReportSchedules.Delete","ReportSchedules.Edit","ReportSchedules.View","RoutingPolicies.Edit","RoutingPolicies.View","Rules.Create","Rules.Delete","Rules.Edit","Rules.View","RulesGenerativeAI.Create","RulesGenerativeAI.Delete","RulesGenerativeAI.Edit","RulesGenerativeAI.View","Scheduling.Edit","Scheduling.Publish","Scheduling.View","ScreenRecording.Access","SelfAssignContacts.Access","StaffCalendar.Edit","StaffCalendar.View","StopContact.Enabled","TeamCalendar.Edit","TeamCalendar.View","ThemeDetection.Create","ThemeDetection.View","TimeOff.Edit","TimeOff.View","TimeOffBalance.View","TransferContact.Enabled","TransferDestinations.View","UpdateContactSchedule.Enabled","Users.Edit","Users.View","Wisdom.View"],
      description: "Profile for CSC users that have the ability to do many administrative tasks such as creating forms. Matthew Spagnolo and Dan Colgrove are the only people assigned to this security profile.",
    });

    const CSCSpecialistProfile = new connect.CfnSecurityProfile(this, 'CSCSpecialistProfile', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      securityProfileName: "CSC_Specialist_Profile",
      permissions: ["AccessMetrics","AccessMetrics.AgentActivityAudit.Access","AccessMetrics.Dashboards.Access","AccessMetrics.DashboardsWithMyData.View","AccessMetrics.HistoricalMetrics.Access","AccessMetrics.RealTimeMetrics.Access","AgentGrouping.View","AgentStates.View","AgentTimeCard.View","Analytics.PerformanceMetrics.Access","AudioDeviceSettings.Access","BasicAgentAccess","CallRecordings.Unredacted.Access","Capacity.Edit","Capacity.Publish","Capacity.View","ConfigureContactAttributes.View","ContactAttributes.View","ContactLensCustomVocabulary.Edit","ContactLensCustomVocabulary.View","ContactLensPostContactSummary.View","ContactSearch.View","ContactSearchSampleContacts.View","ContactSearchWithCharacteristics.View","ContactSearchWithKeywords.View","ContactTranscripts.Unredacted.Access","ContentManagement.Create","ContentManagement.Delete","ContentManagement.Edit","ContentManagement.View","CustomMetrics.View","CustomViews.Access","CustomerProfiles.CalculatedAttributes.View","CustomerProfiles.View","Evaluation.Create","Evaluation.Edit","Evaluation.View","EvaluationForms.Create","EvaluationForms.Delete","EvaluationForms.Edit","EvaluationForms.View","EvaluationReviewRequest.Create","EvaluationReviewRequest.View","EvaluationReviews.Create","EvaluationReviews.View","ForecastScheduleInterval.Edit","ForecastScheduleInterval.View","Forecasting.Edit","Forecasting.Publish","Forecasting.View","GraphTrends.View","ManagerBargeIn","ManagerListenIn","ManualAssignAnyContact.Enable","MetricsReports.Create","MetricsReports.Delete","MetricsReports.Edit","MetricsReports.Publish","MetricsReports.Schedule","MetricsReports.View","MyContacts.View","OutboundCallAccess","Queues.View","RealtimeContactLens.View","ReportSchedules.Create","ReportSchedules.Delete","ReportSchedules.Edit","ReportSchedules.View","RoutingPolicies.View","Scheduling.Edit","Scheduling.Publish","Scheduling.View","ScreenRecording.Access","SelfAssignContacts.Access","StaffCalendar.Edit","StaffCalendar.View","TeamCalendar.Edit","TeamCalendar.View","ThemeDetection.Create","ThemeDetection.View","TimeOff.Edit","TimeOff.View","TransferDestinations.View","Users.Edit","Users.EditPermission","Users.View","Wisdom.View"],
      description: "CSC Specialist Default security profile",
    });

    const CSCTaxTechnicianAITester = new connect.CfnSecurityProfile(this, 'CSCTaxTechnicianAITester', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      securityProfileName: "CSC_Tax_Technician_AI_Tester",
      permissions: ["AccessMetrics.DashboardsWithMyData.View","Analytics.PerformanceMetrics.Access","AudioDeviceSettings.Access","BasicAgentAccess","CallRecordings.Unredacted.Access","ContactAttributes.View","ContactLensCustomVocabulary.View","ContactLensPostContactSummary.View","ContactSearch.View","ContactTranscripts.Unredacted.Access","ContentManagement.View","CustomViews.Access","CustomerProfiles.View","GraphTrends.View","MyContacts.View","OutboundCallAccess","RealtimeContactLens.View","StaffCalendar.Edit","StaffCalendar.View","ThemeDetection.View","Wisdom.View"],
      description: "CSC_Tax_Technician_Agent AI test group",
    });

    const CSCTESTONLY = new connect.CfnSecurityProfile(this, 'CSCTESTONLY', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      securityProfileName: "CSC_TEST_ONLY",
      permissions: ["AccessMetrics.Dashboards.Access","AudioDeviceSettings.Access","BasicAgentAccess","ContactLensPostContactSummary.View","CustomViews.Access","CustomerProfiles.View","GraphTrends.View","MyContacts.View","OutboundCallAccess","RealtimeContactLens.View","RedactedData.View","RestrictTaskCreation.Access","ScreenRecording.Access","StaffCalendar.Edit","StaffCalendar.View","ThemeDetection.View"],
      description: "CSC_Test_Security Profile",
    });

    const CSCTaxTechnicianAgentDefault = new connect.CfnSecurityProfile(this, 'CSCTaxTechnicianAgentDefault', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      securityProfileName: "CSC_Tax_Technician_Agent_Default",
      permissions: ["AccessMetrics.DashboardsWithMyData.View","Analytics.PerformanceMetrics.Access","AudioDeviceSettings.Access","BasicAgentAccess","CallRecordings.Unredacted.Access","ContactAttributes.View","ContactLensCustomVocabulary.View","ContactLensPostContactSummary.View","ContactSearch.View","ContactTranscripts.Unredacted.Access","ContentManagement.View","CustomViews.Access","CustomerProfiles.View","GraphTrends.View","MyContacts.View","OutboundCallAccess","RealtimeContactLens.View","StaffCalendar.Edit","StaffCalendar.View","ThemeDetection.View","TransferDestinations.View"],
      description: "CSC_Tax_Technician_Agent_Default",
    });

    const CSCScheduler = new connect.CfnSecurityProfile(this, 'CSCScheduler', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      securityProfileName: "CSC_Scheduler",
      permissions: ["AccessMetrics","AccessMetrics.AgentActivityAudit.Access","AccessMetrics.Dashboards.Access","AccessMetrics.DashboardsWithMyData.View","AccessMetrics.HistoricalMetrics.Access","AccessMetrics.RealTimeMetrics.Access","AgentGrouping.View","AgentTimeCard.View","Analytics.PerformanceMetrics.Access","AudioDeviceSettings.Access","BasicAgentAccess","Capacity.Edit","Capacity.Publish","Capacity.View","ContactSearch.View","CustomerProfiles.CalculatedAttributes.View","CustomerProfiles.View","EvaluationForms.View","ForecastScheduleInterval.Edit","ForecastScheduleInterval.View","Forecasting.Edit","Forecasting.Publish","Forecasting.View","MyContacts.View","OutboundCallAccess","RealtimeContactLens.View","Rules.View","Scheduling.Edit","Scheduling.Publish","Scheduling.View","StaffCalendar.Edit","StaffCalendar.View","TeamCalendar.Edit","TeamCalendar.View","TimeOff.Approve","TimeOff.Edit","TimeOff.View","TimeOffBalance.Edit","TimeOffBalance.View","Users.View"],
      description: "CSC_Scheduler",
    });

    const CSCRemoteAgentRAULRASSupervisorDefault = new connect.CfnSecurityProfile(this, 'CSCRemoteAgentRAULRASSupervisorDefault', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      securityProfileName: "CSC_Remote_Agent_RAU_LRAS_Supervisor_Default",
      permissions: ["AccessMetrics","AccessMetrics.AgentActivityAudit.Access","AccessMetrics.Dashboards.Access","AccessMetrics.DashboardsWithMyData.View","AccessMetrics.HistoricalMetrics.Access","AccessMetrics.RealTimeMetrics.Access","AgentGrouping.View","AgentStates.Edit","AgentStates.View","AgentTimeCard.View","Analytics.PerformanceMetrics.Access","AudioDeviceSettings.Access","BasicAgentAccess","ContactAttributes.View","ContactLensPostContactSummary.View","ContactSearch.View","ContactSearchWithCharacteristics.View","ContactSearchWithKeywords.View","CustomViews.Access","CustomerProfiles.CalculatedAttributes.View","CustomerProfiles.View","HoursOfOperation.View","MetricsReports.Create","MetricsReports.Delete","MetricsReports.Edit","MetricsReports.Publish","MetricsReports.Schedule","MetricsReports.View","MyContacts.View","OutboundCallAccess","PhoneNumbers.View","Queues.View","ReportSchedules.Create","ReportSchedules.Delete","ReportSchedules.Edit","ReportSchedules.View","RestrictContactAccessByHierarchy.View","RoutingPolicies.Edit","RoutingPolicies.View","TransferDestinations.View","Users.View","Views.View"],
      description: "CSC_Remote_Agent_RAU_LRAS_Supervisor_Default",
    });

    const CSCRickHaleOnly = new connect.CfnSecurityProfile(this, 'CSCRickHaleOnly', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      securityProfileName: "CSC Rick Hale Only",
      permissions: ["AccessMetrics","AccessMetrics.AgentActivityAudit.Access","AccessMetrics.Dashboards.Access","AccessMetrics.DashboardsWithMyData.View","AccessMetrics.HistoricalMetrics.Access","AccessMetrics.RealTimeMetrics.Access","AgentGrouping.View","AgentStates.View","AgentTimeCard.View","Analytics.PerformanceMetrics.Access","AudioDeviceSettings.Access","AutomatedVoiceInteraction.Recordings.Unredacted.Access","AutomatedVoiceInteraction.Transcripts.Unredacted.Access","BasicAgentAccess","CallRecordings.Unredacted.Access","Capacity.Edit","Capacity.Publish","Capacity.View","CoachingSessions.Create","CoachingSessions.Edit","CoachingSessions.View","ConfigureContactAttributes.View","ContactAttributes.View","ContactLensCustomVocabulary.Edit","ContactLensCustomVocabulary.View","ContactLensPostContactSummary.View","ContactSearch.View","ContactSearchSampleContacts.View","ContactSearchWithCharacteristics.View","ContactSearchWithKeywords.View","ContactTranscripts.Redacted.Access","ContactTranscripts.Unredacted.Access","ContactTranscripts.Unredacted.DownloadButton","ContentManagement.Create","ContentManagement.Delete","ContentManagement.Edit","ContentManagement.MessageTemplates.Create","ContentManagement.MessageTemplates.Delete","ContentManagement.MessageTemplates.Edit","ContentManagement.MessageTemplates.View","ContentManagement.View","CustomMetrics.Create","CustomMetrics.Delete","CustomMetrics.Edit","CustomMetrics.Publish","CustomMetrics.View","CustomViews.Access","CustomerProfiles.CalculatedAttributes.Create","CustomerProfiles.CalculatedAttributes.Edit","CustomerProfiles.CalculatedAttributes.View","CustomerProfiles.PredictiveInsights.View","CustomerProfiles.ProfileExplorer.View","CustomerProfiles.Segments.View","CustomerProfiles.View","Evaluation.Create","Evaluation.Edit","Evaluation.View","EvaluationAssistant.Access","EvaluationCalibrationSessions.Create","EvaluationCalibrationSessions.Edit","EvaluationCalibrationSessions.View","EvaluationForms.Create","EvaluationForms.Delete","EvaluationForms.Edit","EvaluationForms.View","EvaluationReviewRequest.Create","EvaluationReviewRequest.View","EvaluationReviews.Create","EvaluationReviews.View","ForecastScheduleInterval.Edit","ForecastScheduleInterval.View","Forecasting.Edit","Forecasting.Publish","Forecasting.View","GraphTrends.View","ManagerBargeIn","ManagerListenIn","ManualAssignAnyContact.Enable","ManualAssignMyContacts.Enable","MetricsReports.Create","MetricsReports.Delete","MetricsReports.Edit","MetricsReports.Publish","MetricsReports.Schedule","MetricsReports.View","MyCoachingSessions.Create","MyCoachingSessions.Edit","MyCoachingSessions.View","MyContacts.View","OutboundCallAccess","Queues.View","RealtimeContactLens.View","ReportSchedules.Create","ReportSchedules.Delete","ReportSchedules.Edit","ReportSchedules.View","RoutingPolicies.Edit","RoutingPolicies.View","Rules.Create","Rules.Delete","Rules.Edit","Rules.View","RulesGenerativeAI.Create","RulesGenerativeAI.Delete","RulesGenerativeAI.Edit","RulesGenerativeAI.View","Scheduling.Edit","Scheduling.Publish","Scheduling.View","ScreenRecording.Access","SelfAssignContacts.Access","StaffCalendar.Edit","StaffCalendar.View","StopContact.Enabled","TeamCalendar.Edit","TeamCalendar.View","ThemeDetection.Create","ThemeDetection.View","TimeOff.Edit","TimeOff.View","TransferContact.Enabled","TransferDestinations.View","UpdateContactSchedule.Enabled","Users.Edit","Users.EditPermission","Users.View","Wisdom.View"],
      description: "CSC Specialist for Rick Hale Only",
    });

    const CSCRemoteAgentDefaultSecurityProfile = new connect.CfnSecurityProfile(this, 'CSCRemoteAgentDefaultSecurityProfile', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      securityProfileName: "CSC_Remote_Agent_Default",
      permissions: ["AccessMetrics.DashboardsWithMyData.View","Analytics.PerformanceMetrics.Access","AudioDeviceSettings.Access","BasicAgentAccess","ChatTestMode","ContactAttributes.View","ContentManagement.View","CustomViews.Access","CustomerProfiles.CalculatedAttributes.View","CustomerProfiles.View","MyContacts.View","OutboundCallAccess","RestrictTaskCreation.Access"],
      description: "CSC_Remote_Agent_Default",
    });

    const CSCBTAISupervisorDefault = new connect.CfnSecurityProfile(this, 'CSCBTAISupervisorDefault', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      securityProfileName: "CSC_BTAI_Supervisor_Default",
      permissions: ["AccessMetrics","AccessMetrics.AgentActivityAudit.Access","AccessMetrics.Dashboards.Access","AccessMetrics.DashboardsWithMyData.View","AccessMetrics.HistoricalMetrics.Access","AccessMetrics.RealTimeMetrics.Access","AgentGrouping.View","AgentStates.View","AgentTimeCard.View","Analytics.PerformanceMetrics.Access","AudioDeviceSettings.Access","BasicAgentAccess","CallRecordings.Unredacted.Access","Capacity.View","CoachingSessions.View","ConfigureContactAttributes.View","ContactAttributes.View","ContactLensCustomVocabulary.View","ContactLensPostContactSummary.View","ContactSearch.View","ContactSearchSampleContacts.View","ContactSearchWithCharacteristics.View","ContactSearchWithKeywords.View","ContactTranscripts.Unredacted.Access","ContentManagement.View","CustomMetrics.View","CustomViews.Access","CustomerProfiles.View","Evaluation.Create","Evaluation.Edit","Evaluation.View","EvaluationCalibrationSessions.View","EvaluationForms.View","EvaluationReviewRequest.View","EvaluationReviews.View","ForecastScheduleInterval.View","Forecasting.View","GraphTrends.View","HoursOfOperation.View","ManagerBargeIn","ManagerListenIn","ManualAssignAnyContact.Enable","MetricsReports.Create","MetricsReports.Delete","MetricsReports.Edit","MetricsReports.Publish","MetricsReports.Schedule","MetricsReports.View","MyCoachingSessions.View","OutboundCallAccess","Queues.View","RealtimeContactLens.View","ReportSchedules.Create","ReportSchedules.Delete","ReportSchedules.Edit","ReportSchedules.View","RoutingPolicies.View","Rules.View","RulesGenerativeAI.View","Scheduling.Edit","Scheduling.Publish","Scheduling.View","ScreenRecording.Access","StaffCalendar.Edit","StaffCalendar.View","TeamCalendar.View","ThemeDetection.View","TimeOff.View","TimeOffBalance.Edit","TimeOffBalance.View","TransferDestinations.View","Users.Edit","Users.View","Wisdom.View"],
      description: "CSC Business Taxes Administrator I Default security profile",
    });

    const CSCBTRDefault = new connect.CfnSecurityProfile(this, 'CSCBTRDefault', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      securityProfileName: "CSC_BTR Default",
      permissions: ["AccessMetrics","AccessMetrics.AgentActivityAudit.Access","AccessMetrics.Dashboards.Access","AccessMetrics.DashboardsWithMyData.View","AccessMetrics.HistoricalMetrics.Access","AccessMetrics.RealTimeMetrics.Access","AgentGrouping.View","AgentStates.View","AgentTimeCard.View","Analytics.PerformanceMetrics.Access","AudioDeviceSettings.Access","BasicAgentAccess","CallRecordings.Unredacted.Access","ContactAttributes.View","ContactLensCustomVocabulary.View","ContactLensPostContactSummary.View","ContactSearch.View","ContactSearchWithCharacteristics.View","ContactSearchWithKeywords.View","ContactTranscripts.Unredacted.Access","CustomViews.Access","Evaluation.Create","Evaluation.Edit","Evaluation.View","GraphTrends.View","ManagerBargeIn","ManagerListenIn","MetricsReports.View","MyContacts.View","OutboundCallAccess","Queues.View","RealtimeContactLens.View","RoutingPolicies.View","ScreenRecording.Access","StaffCalendar.View","ThemeDetection.View","TransferDestinations.View","Users.Edit","Users.View","Wisdom.View"],
      description: "CSC_BTR Default",
    });

    const CDTFASupervisorDefault = new connect.CfnSecurityProfile(this, 'CDTFASupervisorDefault', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      securityProfileName: "CDTFA_Supervisor_Default",
      permissions: ["AccessMetrics","AccessMetrics.AgentActivityAudit.Access","AccessMetrics.Dashboards.Access","AccessMetrics.HistoricalMetrics.Access","AccessMetrics.RealTimeMetrics.Access","AgentGrouping.View","AgentTimeCard.View","AudioDeviceSettings.Access","BasicAgentAccess","ContactSearch.View","ContactSearchWithCharacteristics.View","ContactSearchWithKeywords.View","ContentManagement.View","CustomViews.Access","HoursOfOperation.View","ListenCallRecordings","ManagerBargeIn","ManagerListenIn","MetricsReports.Create","MetricsReports.Delete","MetricsReports.Edit","MetricsReports.Publish","MetricsReports.Schedule","MetricsReports.View","MyContacts.View","OutboundCallAccess","Queues.View","ReportSchedules.Create","ReportSchedules.Delete","ReportSchedules.Edit","ReportSchedules.View","RestrictContactAccessByHierarchy.View","TransferDestinations.View","Users.Edit","Users.View"],
      description: "CDTFA Supervisor Default - No Contact Lens Users",
    });

    const CDTFAAgentDefault = new connect.CfnSecurityProfile(this, 'CDTFAAgentDefault', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      securityProfileName: "CDTFA_Agent_Default",
      permissions: ["AccessMetrics.Dashboards.Access","AudioDeviceSettings.Access","BasicAgentAccess","ChatTestMode","ContactAttributes.View","ContactSearch.View","CustomViews.Access","CustomerProfiles.CalculatedAttributes.View","CustomerProfiles.View","MyContacts.View","OutboundCallAccess","PhoneNumbers.View","RestrictTaskCreation.Access","StopContact.Enabled","TransferContact.Enabled","Views.View"],
      description: "Default Security Profile for CDTFA Agents - No Contact Lens Users",
    });

    const CDTFAProdAdmin = new connect.CfnSecurityProfile(this, 'CDTFAProdAdmin', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      securityProfileName: "CDTFA-Prod_Admin",
      permissions: ["AccessMetrics.AgentActivityAudit.Access","AccessMetrics.Dashboards.Access","AccessMetrics.HistoricalMetrics.Access","AccessMetrics.RealTimeMetrics.Access","AgentGrouping.Edit","AgentGrouping.EnableAndDisable","AgentGrouping.View","AgentStates.View","AgentTimeCard.View","AudioDeviceSettings.Access","BasicAgentAccess","CallRecordings.Redacted.Access","CallRecordings.Redacted.DownloadButton","CallRecordings.Unredacted.Access","CallRecordings.Unredacted.DownloadButton","Capacity.Edit","Capacity.Publish","Capacity.View","ConfigureContactAttributes.View","ContactAttributes.View","ContactSearchWithCharacteristics.View","ContactSearchWithKeywords.View","ContactTranscripts.Redacted.Access","ContactTranscripts.Unredacted.Access","ContactTranscripts.Unredacted.DownloadButton","DeleteCallRecordings","ForecastScheduleInterval.Edit","ForecastScheduleInterval.View","Forecasting.Edit","Forecasting.Publish","Forecasting.View","GraphTrends.View","HoursOfOperation.Edit","HoursOfOperation.View","ManagerBargeIn","ManagerListenIn","MetricsReports.Create","MetricsReports.Delete","MetricsReports.Edit","MetricsReports.Publish","MetricsReports.Schedule","MetricsReports.View","MyContacts.View","OutboundCallAccess","Prompts.View","RealtimeContactLens.View","ReportSchedules.Create","ReportSchedules.Delete","ReportSchedules.Edit","ReportSchedules.View","ReportsAdmin.Access","ReportsAdmin.Delete","ReportsAdmin.Publish","ReportsAdmin.Schedule","ReportsAdmin.View","RestrictTaskCreation.Access","RoutingPolicies.Create","RoutingPolicies.Edit","RoutingPolicies.View","ScreenRecording.Access","ScreenRecording.Delete","ScreenRecording.Download","SecurityProfiles.Create","SecurityProfiles.Delete","SecurityProfiles.Edit","SecurityProfiles.View","StopContact.Enabled","TransferContact.Enabled","TransferDestinations.View","UpdateContactSchedule.Enabled","Users.Edit","Users.View","VideoContact.Access"],
      description: "Custom profile created for an Admin",
    });

    const CSCAgentTestEvals = new connect.CfnSecurityProfile(this, 'CSCAgentTestEvals', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      securityProfileName: "CSC_Agent_Test_Evals",
      permissions: ["AccessMetrics.DashboardsWithMyData.View","Analytics.PerformanceMetrics.Access","AudioDeviceSettings.Access","BasicAgentAccess","CallRecordings.Unredacted.Access","ContactAttributes.View","ContactLensCustomVocabulary.View","ContactLensPostContactSummary.View","ContactTranscripts.Unredacted.Access","ContentManagement.View","CustomViews.Access","CustomerProfiles.View","GraphTrends.View","MyCoachingSessions.View","MyContacts.View","MyReceivedEvaluations.View","OutboundCallAccess","RealtimeContactLens.View","StaffCalendar.Edit","StaffCalendar.View","ThemeDetection.View","TransferDestinations.View","Wisdom.View"],
      description: "CSC_Tax_Technician_Agent_Default",
    });

    // Security profile 'Admin' is built into every Connect instance — skipping creation

    const CUTSSupervisorDefault = new connect.CfnSecurityProfile(this, 'CUTSSupervisorDefault', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      securityProfileName: "CUTS_Supervisor_Default",
      permissions: ["AccessMetrics","AccessMetrics.AgentActivityAudit.Access","AccessMetrics.Dashboards.Access","AccessMetrics.DashboardsWithMyData.View","AccessMetrics.HistoricalMetrics.Access","AccessMetrics.RealTimeMetrics.Access","AgentGrouping.View","AgentStates.View","AgentTimeCard.View","Analytics.PerformanceMetrics.Access","AudioDeviceSettings.Access","BasicAgentAccess","ContactAttributes.View","ContactLensPostContactSummary.View","ContactSearch.View","ContactSearchWithCharacteristics.View","ContactSearchWithKeywords.View","ContentManagement.View","CustomViews.Access","GraphTrends.View","HoursOfOperation.View","ListenCallRecordings","ManagerBargeIn","ManagerListenIn","MetricsReports.Create","MetricsReports.Delete","MetricsReports.Edit","MetricsReports.View","MyContacts.View","OutboundCallAccess","Queues.View","RedactedData.View","RoutingPolicies.View","ThemeDetection.View","TransferDestinations.View","Users.Edit","Users.View"],
      description: "CUTS_Supervisor_Default",
    });

    const STFAgentDefault = new connect.CfnSecurityProfile(this, 'STFAgentDefault', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      securityProfileName: "STF_Agent_Default",
      permissions: ["AccessMetrics.DashboardsWithMyData.View","Analytics.PerformanceMetrics.Access","AudioDeviceSettings.Access","BasicAgentAccess","CallRecordings.Unredacted.Access","ContactAttributes.View","ContactSearch.View","ContactSearchWithCharacteristics.View","ContactSearchWithKeywords.View","ContactTranscripts.Unredacted.Access","CustomViews.Access","CustomerProfiles.CalculatedAttributes.View","CustomerProfiles.View","MyContacts.View","OutboundCallAccess","RestrictTaskCreation.Access","Views.View"],
      description: "STF_Agent_Default that does not have transcription and call summaries.",
    });

    const MCOSupervisorDefault = new connect.CfnSecurityProfile(this, 'MCOSupervisorDefault', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      securityProfileName: "MCO_Supervisor_Default",
      permissions: ["AccessMetrics","AccessMetrics.AgentActivityAudit.Access","AccessMetrics.Dashboards.Access","AccessMetrics.HistoricalMetrics.Access","AccessMetrics.RealTimeMetrics.Access","AgentGrouping.View","AgentStates.View","AgentTimeCard.View","AudioDeviceSettings.Access","BasicAgentAccess","Cases.View","ChatTestMode","ContactAttributes.View","ContactLensPostContactSummary.View","ContactSearch.View","ContactSearchWithCharacteristics.View","ContactSearchWithKeywords.View","ContentManagement.View","CustomViews.Access","Evaluation.Create","Evaluation.Edit","Evaluation.View","EvaluationCalibrationSessions.Create","EvaluationCalibrationSessions.Edit","EvaluationCalibrationSessions.View","GraphTrends.View","HoursOfOperation.View","ListenCallRecordings","ManagerListenIn","MetricsReports.Create","MetricsReports.Delete","MetricsReports.Edit","MetricsReports.Publish","MetricsReports.Schedule","MetricsReports.View","MyContacts.View","OutboundCallAccess","Queues.View","RedactedData.View","ReportSchedules.Create","ReportSchedules.Delete","ReportSchedules.Edit","ReportSchedules.View","RestrictContactAccessByHierarchy.View","RoutingPolicies.View","Rules.View","ThemeDetection.View","TransferDestinations.View","Users.Edit","Users.View","Views.View","VoiceIdAttributesAndSearch.View"],
      description: "MCO_Supervisor_Default",
    });

    const TATaxAdvisorSupervisor = new connect.CfnSecurityProfile(this, 'TATaxAdvisorSupervisor', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      securityProfileName: "TA_Tax_Advisor_Supervisor",
      permissions: ["AccessMetrics","AccessMetrics.AgentActivityAudit.Access","AccessMetrics.Dashboards.Access","AccessMetrics.HistoricalMetrics.Access","AccessMetrics.RealTimeMetrics.Access","AgentGrouping.View","AgentStates.View","AgentTimeCard.View","AudioDeviceSettings.Access","BasicAgentAccess","Cases.View","ChatTestMode","ContactAttributes.View","ContactLensCustomVocabulary.View","ContactLensPostContactSummary.View","ContactSearch.View","ContactSearchWithCharacteristics.View","ContactSearchWithKeywords.View","ContentManagement.View","CustomViews.Access","CustomerProfiles.CalculatedAttributes.View","CustomerProfiles.View","GraphTrends.View","HoursOfOperation.View","ListenCallRecordings","ManagerBargeIn","ManagerListenIn","MetricsReports.Create","MetricsReports.Delete","MetricsReports.Edit","MetricsReports.Publish","MetricsReports.Schedule","MetricsReports.View","MyContacts.View","OutboundCallAccess","Queues.View","RealtimeContactLens.View","ReportSchedules.Create","ReportSchedules.Delete","ReportSchedules.Edit","ReportSchedules.View","RoutingPolicies.View","ThemeDetection.View","TransferDestinations.View","Users.Edit","Users.View","Views.View"],
      description: "TA_Tax_Advisor_Supervisor",
    });

    const TATaxAdvisorAgent = new connect.CfnSecurityProfile(this, 'TATaxAdvisorAgent', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      securityProfileName: "TA_Tax_Advisor_Agent",
      permissions: ["AccessMetrics.RealTimeMetrics.Access","AudioDeviceSettings.Access","BasicAgentAccess","ContactAttributes.View","CustomViews.Access","CustomerProfiles.CalculatedAttributes.View","CustomerProfiles.Segments.View","CustomerProfiles.View","ListenCallRecordings","MyContacts.View","OutboundCallAccess","RestrictTaskCreation.Access"],
      description: "TA_Tax_Advisor_Agent",
    });

    const FODCollectionsAgentDefault = new connect.CfnSecurityProfile(this, 'FODCollectionsAgentDefault', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      securityProfileName: "FOD_Collections_Agent_Default",
      permissions: ["AccessMetrics.DashboardsWithMyData.View","Analytics.PerformanceMetrics.Access","AudioDeviceSettings.Access","BasicAgentAccess","ChatTestMode","ContactAttributes.View","ContentManagement.View","CustomViews.Access","CustomerProfiles.CalculatedAttributes.View","CustomerProfiles.View","MyContacts.View","OutboundCallAccess","RestrictTaskCreation.Access","Views.View"],
      description: "FOD_Collections_Agent_Default",
    });

    // Security profile 'QualityAnalyst' is built into every Connect instance — skipping creation

    // Security profile 'Agent' is built into every Connect instance — skipping creation

    const EFTAgentDefault = new connect.CfnSecurityProfile(this, 'EFTAgentDefault', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      securityProfileName: "EFT_Agent_Default",
      permissions: ["AccessMetrics.Dashboards.Access","AudioDeviceSettings.Access","BasicAgentAccess","ContactAttributes.View","ContentManagement.View","MyContacts.View","OutboundCallAccess","RestrictTaskCreation.Access","Views.View"],
      description: "EFT_Agent_Default",
    });

    const CUTSAgentDefault = new connect.CfnSecurityProfile(this, 'CUTSAgentDefault', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      securityProfileName: "CUTS_Agent_Default",
      permissions: ["AccessMetrics.Dashboards.Access","AccessMetrics.DashboardsWithMyData.View","Analytics.PerformanceMetrics.Access","AudioDeviceSettings.Access","BasicAgentAccess","ContactAttributes.View","ContentManagement.View","CustomViews.Access","CustomerProfiles.CalculatedAttributes.View","CustomerProfiles.View","MyContacts.View","OutboundCallAccess","RestrictTaskCreation.Access"],
      description: "CUTS_Agent_Default",
    });

    const TRAAgentDefault = new connect.CfnSecurityProfile(this, 'TRAAgentDefault', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      securityProfileName: "TRA_Agent_Default",
      permissions: ["AccessMetrics.Dashboards.Access","AudioDeviceSettings.Access","BasicAgentAccess","ContactAttributes.View","MyContacts.View","OutboundCallAccess","RestrictTaskCreation.Access","Views.View"],
      description: "TRA_Agent_Default",
    });

    const STFAgentDefaultWithTranscription = new connect.CfnSecurityProfile(this, 'STFAgentDefaultWithTranscription', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      securityProfileName: "STF_Agent_Default_With_Transcription",
      permissions: ["AccessMetrics.DashboardsWithMyData.View","AccessMetrics.RealTimeMetrics.Access","Analytics.PerformanceMetrics.Access","AudioDeviceSettings.Access","BasicAgentAccess","CallRecordings.Unredacted.Access","ContactAttributes.View","ContactLensCustomVocabulary.View","ContactLensPostContactSummary.View","ContactSearch.View","ContactSearchWithCharacteristics.View","ContactSearchWithKeywords.View","ContactTranscripts.Unredacted.Access","CustomViews.Access","CustomerProfiles.CalculatedAttributes.View","CustomerProfiles.View","GraphTrends.View","MyContacts.View","OutboundCallAccess","RealtimeContactLens.View","RestrictTaskCreation.Access","ThemeDetection.View","Views.View"],
      description: "This is the standard STF Agent security profile that includes the call transcription and summary.",
    });

    const InactiveSecurityProfile = new connect.CfnSecurityProfile(this, 'InactiveSecurityProfile', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      securityProfileName: "Inactive",
      
      description: "Security Profile with no rights for inactive agents",
    });

    const TRASupervisorDefault = new connect.CfnSecurityProfile(this, 'TRASupervisorDefault', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      securityProfileName: "TRA_Supervisor_Default",
      permissions: ["AccessMetrics","AccessMetrics.AgentActivityAudit.Access","AccessMetrics.Dashboards.Access","AccessMetrics.HistoricalMetrics.Access","AccessMetrics.RealTimeMetrics.Access","AgentGrouping.View","AgentStates.Edit","AgentStates.View","AgentTimeCard.View","AudioDeviceSettings.Access","BasicAgentAccess","CaseHistory.View","Cases.View","ChatTestMode","ContactAttributes.View","ContactSearch.View","ContactSearchWithCharacteristics.View","ContactSearchWithKeywords.View","CustomViews.Access","CustomerProfiles.CalculatedAttributes.View","CustomerProfiles.View","HoursOfOperation.View","ManagerBargeIn","ManagerListenIn","MetricsReports.Create","MetricsReports.Delete","MetricsReports.Edit","MetricsReports.Publish","MetricsReports.Schedule","MetricsReports.View","MyContacts.View","OutboundCallAccess","PhoneNumbers.View","Queues.View","ReportSchedules.Create","ReportSchedules.Delete","ReportSchedules.Edit","ReportSchedules.View","RoutingPolicies.View","StopContact.Enabled","TaskTemplates.View","TransferContact.Enabled","TransferDestinations.View","Users.View","Views.View","VoiceIdAttributesAndSearch.View"],
      description: "TRA_Supervisor_Default",
    });

    const MCOAgentDefault = new connect.CfnSecurityProfile(this, 'MCOAgentDefault', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      securityProfileName: "MCO_Agent_Default",
      permissions: ["AccessMetrics.Dashboards.Access","AudioDeviceSettings.Access","BasicAgentAccess","ChatTestMode","ContactAttributes.View","CustomViews.Access","CustomerProfiles.CalculatedAttributes.View","CustomerProfiles.View","MyContacts.View","OutboundCallAccess","RestrictTaskCreation.Access","Views.View"],
      description: "MCO_Agent_Default",
    });

    const EFTSupervisorDefault = new connect.CfnSecurityProfile(this, 'EFTSupervisorDefault', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      securityProfileName: "EFT_Supervisor_Default",
      permissions: ["AccessMetrics","AccessMetrics.AgentActivityAudit.Access","AccessMetrics.Dashboards.Access","AccessMetrics.HistoricalMetrics.Access","AccessMetrics.RealTimeMetrics.Access","AgentGrouping.View","AgentStates.Edit","AgentStates.View","AgentTimeCard.View","AudioDeviceSettings.Access","BasicAgentAccess","CallRecordings.Unredacted.Access","CaseFields.View","CaseHistory.View","CaseTemplates.View","Cases.Create","Cases.Edit","Cases.View","ChatTestMode","ContactAttributes.View","ContactSearch.View","ContactSearchWithCharacteristics.View","ContactSearchWithKeywords.View","ContactTranscripts.Unredacted.Access","ContentManagement.View","CustomViews.Access","CustomerProfiles.CalculatedAttributes.View","CustomerProfiles.View","HoursOfOperation.View","ManagerBargeIn","ManagerListenIn","MetricsReports.Create","MetricsReports.Delete","MetricsReports.Edit","MetricsReports.View","MyContacts.View","OutboundCallAccess","PhoneNumbers.View","Queues.View","RoutingPolicies.View","StopContact.Enabled","TaskTemplates.View","TransferContact.Enabled","TransferDestinations.View","Users.View","Views.View"],
      description: "EFT_Supervisor_Default",
    });

    const STFSupervisorDefault = new connect.CfnSecurityProfile(this, 'STFSupervisorDefault', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      securityProfileName: "STF_Supervisor_Default",
      permissions: ["AccessMetrics","AccessMetrics.AgentActivityAudit.Access","AccessMetrics.Dashboards.Access","AccessMetrics.DashboardsWithMyData.View","AccessMetrics.HistoricalMetrics.Access","AccessMetrics.RealTimeMetrics.Access","AgentGrouping.View","AgentStates.View","AgentTimeCard.View","Analytics.PerformanceMetrics.Access","AudioDeviceSettings.Access","BasicAgentAccess","Cases.View","ChatTestMode","ContactAttributes.View","ContactLensPostContactSummary.View","ContactSearch.View","ContactSearchWithCharacteristics.View","ContactSearchWithKeywords.View","CustomViews.Access","CustomerProfiles.ProfileExplorer.View","CustomerProfiles.Segments.View","CustomerProfiles.View","GraphTrends.View","ListenCallRecordings","ManagerBargeIn","ManagerListenIn","MetricsReports.Create","MetricsReports.Delete","MetricsReports.Edit","MetricsReports.View","MyContacts.View","OutboundCallAccess","Queues.View","RealtimeContactLens.View","RestrictContactAccessByHierarchy.View","RoutingPolicies.View","ThemeDetection.View","Users.Edit","Users.View"],
      description: "STF_Supervisor_Default",
    });

    const FODSupervisorDefault = new connect.CfnSecurityProfile(this, 'FODSupervisorDefault', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      securityProfileName: "FOD_Supervisor_Default",
      permissions: ["AccessMetrics","AccessMetrics.AgentActivityAudit.Access","AccessMetrics.Dashboards.Access","AccessMetrics.DashboardsWithMyData.View","AccessMetrics.HistoricalMetrics.Access","AccessMetrics.RealTimeMetrics.Access","AgentGrouping.View","AgentStates.View","AgentTimeCard.View","Analytics.PerformanceMetrics.Access","AudioDeviceSettings.Access","BasicAgentAccess","ContactAttributes.View","ContactLensPostContactSummary.View","ContactSearch.View","ContactSearchWithCharacteristics.View","ContactSearchWithKeywords.View","CustomViews.Access","GraphTrends.View","HoursOfOperation.View","ListenCallRecordings","ManagerBargeIn","ManagerListenIn","MetricsReports.Create","MetricsReports.Delete","MetricsReports.Edit","MetricsReports.View","MyContacts.View","OutboundCallAccess","Queues.View","RoutingPolicies.View","TransferDestinations.View","Users.Edit","Users.View","Views.View","VoiceIdAttributesAndSearch.View"],
      description: "FOD_Supervisor_Default",
    });

    const FODSupervisorReports = new connect.CfnSecurityProfile(this, 'FODSupervisorReports', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      securityProfileName: "FOD_Supervisor_Reports",
      permissions: ["AccessMetrics","AccessMetrics.AgentActivityAudit.Access","AccessMetrics.Dashboards.Access","AccessMetrics.DashboardsWithMyData.View","AccessMetrics.HistoricalMetrics.Access","AccessMetrics.RealTimeMetrics.Access","AgentGrouping.View","AgentStates.View","AgentTimeCard.View","Analytics.PerformanceMetrics.Access","AudioDeviceSettings.Access","BasicAgentAccess","ContactAttributes.View","ContactLensCustomVocabulary.View","ContactLensPostContactSummary.View","ContactSearch.View","ContactSearchWithCharacteristics.View","ContactSearchWithKeywords.View","CustomViews.Access","GraphTrends.View","HoursOfOperation.View","ListenCallRecordings","ManagerBargeIn","ManagerListenIn","MetricsReports.Create","MetricsReports.Delete","MetricsReports.Edit","MetricsReports.Publish","MetricsReports.Schedule","MetricsReports.View","MyContacts.View","OutboundCallAccess","Queues.View","RealtimeContactLens.View","ReportSchedules.Create","ReportSchedules.Delete","ReportSchedules.Edit","ReportSchedules.View","RoutingPolicies.View","Rules.View","RulesGenerativeAI.View","ScreenRecording.Access","ThemeDetection.View","TransferDestinations.View","Users.Edit","Users.View","VoiceIdAttributesAndSearch.View"],
      description: "FOD Supervisor with report scheduling and publishing",
    });

    // Security profile 'CallCenterManager' is built into every Connect instance — skipping creation

    const QCSCEfileAssistance = new connect.CfnQueue(this, 'QCSCEfileAssistance', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "Q_CSC_Efile_Assistance",
      hoursOfOperationArn: arns.R3c97e7528f4a4e458f58301e51a14cb3,
      
    });

    const QCSCNCWCloseouts = new connect.CfnQueue(this, 'QCSCNCWCloseouts', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "Q_CSC_NCW_Closeouts",
      hoursOfOperationArn: arns.R3c97e7528f4a4e458f58301e51a14cb3,
      description: "CSC NCW Closeouts",
    });

    const QCSCCBEfileAssistance = new connect.CfnQueue(this, 'QCSCCBEfileAssistance', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "Q_CSC_CB_Efile_Assistance",
      hoursOfOperationArn: arns.R3c97e7528f4a4e458f58301e51a14cb3,
      
    });

    const QCSCCBCustomerServiceCenter = new connect.CfnQueue(this, 'QCSCCBCustomerServiceCenter', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "Q_CSC_CB_Customer_Service_Center",
      hoursOfOperationArn: arns.R3c97e7528f4a4e458f58301e51a14cb3,
      
    });

    const QCSCAgentAssist = new connect.CfnQueue(this, 'QCSCAgentAssist', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "Q_CSC_Agent_Assist",
      hoursOfOperationArn: arns.R3c80ede8D6f040a3B483190a7a8f9e2a,
      
    });

    const QCSCCustomerServiceCenter = new connect.CfnQueue(this, 'QCSCCustomerServiceCenter', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "Q_CSC_Customer_Service_Center",
      hoursOfOperationArn: arns.R3c97e7528f4a4e458f58301e51a14cb3,
      
    });

    const QCSCNCWReturnedMail = new connect.CfnQueue(this, 'QCSCNCWReturnedMail', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "Q_CSC_NCW_Returned_Mail",
      hoursOfOperationArn: arns.R3c97e7528f4a4e458f58301e51a14cb3,
      description: "Q_CSC_NCW_Returned_Mail",
    });

    const QCSCTraining = new connect.CfnQueue(this, 'QCSCTraining', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "Q_CSC_Training",
      hoursOfOperationArn: arns.R3d95f14c20a246b9B0fc1ff50f78dc12,
      
    });

    const QCSCCBTraining = new connect.CfnQueue(this, 'QCSCCBTraining', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "Q_CSC_CB_Training",
      hoursOfOperationArn: arns.R0a5dfac3Ac56478cAd6d7839d576c5e1,
      
    });

    const QFODCBCollections = new connect.CfnQueue(this, 'QFODCBCollections', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "Q_FOD_CB_Collections",
      hoursOfOperationArn: arns.R3c97e7528f4a4e458f58301e51a14cb3,
      
    });

    const QCUTSSpanish = new connect.CfnQueue(this, 'QCUTSSpanish', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "Q_CUTS_Spanish",
      hoursOfOperationArn: arns.R1515d787E3ab424bBf2b39634fc0217e,
      description: "Q_CUTS_Spanish",
    });

    const QFODCollections = new connect.CfnQueue(this, 'QFODCollections', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "Q_FOD_Collections",
      hoursOfOperationArn: arns.R3c97e7528f4a4e458f58301e51a14cb3,
      
    });

    const QCSCSpanish = new connect.CfnQueue(this, 'QCSCSpanish', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "Q_CSC_Spanish",
      hoursOfOperationArn: arns.R3c97e7528f4a4e458f58301e51a14cb3,
      
    });

    const QCUTSCBSpanish = new connect.CfnQueue(this, 'QCUTSCBSpanish', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "Q_CUTS_CB_Spanish",
      hoursOfOperationArn: arns.R1515d787E3ab424bBf2b39634fc0217e,
      description: "Q_CUTS_CB_Spanish",
    });

    const QCSCCBSpanish = new connect.CfnQueue(this, 'QCSCCBSpanish', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "Q_CSC_CB_Spanish",
      hoursOfOperationArn: arns.R3c97e7528f4a4e458f58301e51a14cb3,
      
    });

    const BasicQueue = new connect.CfnQueue(this, 'BasicQueue', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "BasicQueue",
      hoursOfOperationArn: arns.R0a5dfac3Ac56478cAd6d7839d576c5e1,
      description: "A simple, basic voice queue.",
    });

    const QCSCWebchatSpanish = new connect.CfnQueue(this, 'QCSCWebchatSpanish', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "Q_CSC_Webchat_Spanish",
      hoursOfOperationArn: arns.R3c97e7528f4a4e458f58301e51a14cb3,
      description: "Spanish agent webchat",
    });

    const QCSCWebchat = new connect.CfnQueue(this, 'QCSCWebchat', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "Q_CSC_Webchat",
      hoursOfOperationArn: arns.R3c97e7528f4a4e458f58301e51a14cb3,
      
    });

    const QMCOCBNewLicenseOrAcct = new connect.CfnQueue(this, 'QMCOCBNewLicenseOrAcct', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "Q_MCO_CB_New_License_or_Acct",
      hoursOfOperationArn: arns.R78f86704652149d0AdfcBc25bf47328b,
      
    });

    const QMCOCBBillingRefund = new connect.CfnQueue(this, 'QMCOCBBillingRefund', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "Q_MCO_CB_Billing_Refund",
      hoursOfOperationArn: arns.R3c97e7528f4a4e458f58301e51a14cb3,
      
    });

    const QSTFCBUsernamePassAsst = new connect.CfnQueue(this, 'QSTFCBUsernamePassAsst', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "Q_STF_CB_Username_Pass_Asst",
      hoursOfOperationArn: arns.R59f0ea9fBeb74cca82d2E28e2a0a9af1,
      
    });

    const QMCOLicenseIFTADecals = new connect.CfnQueue(this, 'QMCOLicenseIFTADecals', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "Q_MCO_License_IFTA_Decals",
      hoursOfOperationArn: arns.R78f86704652149d0AdfcBc25bf47328b,
      
    });

    const QMCOCBLicenseIFTADecals = new connect.CfnQueue(this, 'QMCOCBLicenseIFTADecals', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "Q_MCO_CB_License_IFTA_Decals",
      hoursOfOperationArn: arns.R78f86704652149d0AdfcBc25bf47328b,
      
    });

    const QSTFCBRetCigarette = new connect.CfnQueue(this, 'QSTFCBRetCigarette', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "Q_STF_CB_Ret_Cigarette",
      hoursOfOperationArn: arns.C5eeb29253644e02Ace96283bcf12297,
      
    });

    const QMCOBillingRefund = new connect.CfnQueue(this, 'QMCOBillingRefund', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "Q_MCO_Billing_Refund",
      hoursOfOperationArn: arns.R78f86704652149d0AdfcBc25bf47328b,
      
    });

    const QSTFRetCigarette = new connect.CfnQueue(this, 'QSTFRetCigarette', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "Q_STF_Ret_Cigarette",
      hoursOfOperationArn: arns.C5eeb29253644e02Ace96283bcf12297,
      
    });

    const QSTFUsernamePassAsst = new connect.CfnQueue(this, 'QSTFUsernamePassAsst', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "Q_STF_Username_Pass_Asst",
      hoursOfOperationArn: arns.R59f0ea9fBeb74cca82d2E28e2a0a9af1,
      
    });

    const QMCOCBRetnAsstAppear = new connect.CfnQueue(this, 'QMCOCBRetnAsstAppear', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "Q_MCO_CB_Retn_Asst_Appear",
      hoursOfOperationArn: arns.R78f86704652149d0AdfcBc25bf47328b,
      
    });

    const QSTFCBRetHazEnv = new connect.CfnQueue(this, 'QSTFCBRetHazEnv', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "Q_STF_CB_Ret_Haz_Env",
      hoursOfOperationArn: arns.C5eeb29253644e02Ace96283bcf12297,
      
    });

    const QSTFCBRetFuelUSTFCLPPF = new connect.CfnQueue(this, 'QSTFCBRetFuelUSTFCLPPF', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "Q_STF_CB_Ret_Fuel_USTF_CLPPF",
      hoursOfOperationArn: arns.C5eeb29253644e02Ace96283bcf12297,
      
    });

    const QMCOCBCollectRevo = new connect.CfnQueue(this, 'QMCOCBCollectRevo', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "Q_MCO_CB_Collect_Revo",
      hoursOfOperationArn: arns.R78f86704652149d0AdfcBc25bf47328b,
      
    });

    const QSTFCBColDelinquencies = new connect.CfnQueue(this, 'QSTFCBColDelinquencies', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "Q_STF_CB_Col_Delinquencies",
      hoursOfOperationArn: arns.R98ab2bf3A52849369e0d729d4265817e,
      
    });

    const QSTFCBColBillings = new connect.CfnQueue(this, 'QSTFCBColBillings', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "Q_STF_CB_Col_Billings",
      hoursOfOperationArn: arns.R98ab2bf3A52849369e0d729d4265817e,
      
    });

    const QMCONewLicenseOrAcct = new connect.CfnQueue(this, 'QMCONewLicenseOrAcct', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "Q_MCO_New_License_or_Acct",
      hoursOfOperationArn: arns.R78f86704652149d0AdfcBc25bf47328b,
      
    });

    const QMCOCollectRevo = new connect.CfnQueue(this, 'QMCOCollectRevo', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "Q_MCO_Collect_Revo",
      hoursOfOperationArn: arns.R78f86704652149d0AdfcBc25bf47328b,
      
    });

    const QMCORetnAsstAppear = new connect.CfnQueue(this, 'QMCORetnAsstAppear', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "Q_MCO_Retn_Asst_Appear",
      hoursOfOperationArn: arns.R78f86704652149d0AdfcBc25bf47328b,
      
    });

    const QSTFColBillings = new connect.CfnQueue(this, 'QSTFColBillings', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "Q_STF_Col_Billings",
      hoursOfOperationArn: arns.R98ab2bf3A52849369e0d729d4265817e,
      
    });

    const QSTFColDelinquencies = new connect.CfnQueue(this, 'QSTFColDelinquencies', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "Q_STF_Col_Delinquencies",
      hoursOfOperationArn: arns.R98ab2bf3A52849369e0d729d4265817e,
      
    });

    const QSTFRegTeleEnergyWater = new connect.CfnQueue(this, 'QSTFRegTeleEnergyWater', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "Q_STF_Reg_Tele_Energy_Water",
      hoursOfOperationArn: arns.Fbc17acf862a4dcd82c38dfb82013e0c,
      
    });

    const QSTFCBRetAlcoholicBev = new connect.CfnQueue(this, 'QSTFCBRetAlcoholicBev', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "Q_STF_CB_Ret_Alcoholic_Bev",
      hoursOfOperationArn: arns.C5eeb29253644e02Ace96283bcf12297,
      
    });

    const QSTFCBRetEwasteTireIWMF = new connect.CfnQueue(this, 'QSTFCBRetEwasteTireIWMF', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "Q_STF_CB_Ret_Ewaste_Tire_IWMF",
      hoursOfOperationArn: arns.C5eeb29253644e02Ace96283bcf12297,
      
    });

    const QSTFCBRegCigaretteTobacco = new connect.CfnQueue(this, 'QSTFCBRegCigaretteTobacco', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "Q_STF_CB_Reg_Cigarette_Tobacco",
      hoursOfOperationArn: arns.Fbc17acf862a4dcd82c38dfb82013e0c,
      
    });

    const QSTFRetCannabis = new connect.CfnQueue(this, 'QSTFRetCannabis', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "Q_STF_Ret_Cannabis",
      hoursOfOperationArn: arns.C5eeb29253644e02Ace96283bcf12297,
      
    });

    const QSTFRetEwasteTireIWMF = new connect.CfnQueue(this, 'QSTFRetEwasteTireIWMF', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "Q_STF_Ret_Ewaste_Tire_IWMF",
      hoursOfOperationArn: arns.C5eeb29253644e02Ace96283bcf12297,
      
    });

    const QSTFRegFuelUSTFCLPPF = new connect.CfnQueue(this, 'QSTFRegFuelUSTFCLPPF', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "Q_STF_Reg_Fuel_USTF_CLPPF",
      hoursOfOperationArn: arns.Fbc17acf862a4dcd82c38dfb82013e0c,
      
    });

    const QSTFRegCannabis = new connect.CfnQueue(this, 'QSTFRegCannabis', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "Q_STF_Reg_Cannabis",
      hoursOfOperationArn: arns.Fbc17acf862a4dcd82c38dfb82013e0c,
      
    });

    const QSTFRetAlcoholicBev = new connect.CfnQueue(this, 'QSTFRetAlcoholicBev', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "Q_STF_Ret_Alcoholic_Bev",
      hoursOfOperationArn: arns.C5eeb29253644e02Ace96283bcf12297,
      
    });

    const QSTFRetFuelUSTFCLPPF = new connect.CfnQueue(this, 'QSTFRetFuelUSTFCLPPF', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "Q_STF_Ret_Fuel_USTF_CLPPF",
      hoursOfOperationArn: arns.C5eeb29253644e02Ace96283bcf12297,
      
    });

    const QSTFCBRegCannabis = new connect.CfnQueue(this, 'QSTFCBRegCannabis', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "Q_STF_CB_Reg_Cannabis",
      hoursOfOperationArn: arns.Fbc17acf862a4dcd82c38dfb82013e0c,
      
    });

    const QSTFRegEwasteTireIWMF = new connect.CfnQueue(this, 'QSTFRegEwasteTireIWMF', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "Q_STF_Reg_Ewaste_Tire_IWMF",
      hoursOfOperationArn: arns.Fbc17acf862a4dcd82c38dfb82013e0c,
      
    });

    const QSTFCBRegTeleEnergyWater = new connect.CfnQueue(this, 'QSTFCBRegTeleEnergyWater', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "Q_STF_CB_Reg_Tele_Energy_Water",
      hoursOfOperationArn: arns.Fbc17acf862a4dcd82c38dfb82013e0c,
      
    });

    const QSTFRegCigaretteTobacco = new connect.CfnQueue(this, 'QSTFRegCigaretteTobacco', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "Q_STF_Reg_Cigarette_Tobacco",
      hoursOfOperationArn: arns.Fbc17acf862a4dcd82c38dfb82013e0c,
      
    });

    const QSTFCBRegEwasteTireIWMF = new connect.CfnQueue(this, 'QSTFCBRegEwasteTireIWMF', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "Q_STF_CB_Reg_Ewaste_Tire_IWMF",
      hoursOfOperationArn: arns.Fbc17acf862a4dcd82c38dfb82013e0c,
      
    });

    const QSTFCBRegAlcoholicBev = new connect.CfnQueue(this, 'QSTFCBRegAlcoholicBev', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "Q_STF_CB_Reg_Alcoholic_Bev",
      hoursOfOperationArn: arns.Fbc17acf862a4dcd82c38dfb82013e0c,
      
    });

    const QSTFCBRegFuelUSTFCLPPF = new connect.CfnQueue(this, 'QSTFCBRegFuelUSTFCLPPF', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "Q_STF_CB_Reg_Fuel_USTF_CLPPF",
      hoursOfOperationArn: arns.Fbc17acf862a4dcd82c38dfb82013e0c,
      
    });

    const QSTFRegAlcoholicBev = new connect.CfnQueue(this, 'QSTFRegAlcoholicBev', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "Q_STF_Reg_Alcoholic_Bev",
      hoursOfOperationArn: arns.Fbc17acf862a4dcd82c38dfb82013e0c,
      
    });

    const QMCOCBScaleNoPmt = new connect.CfnQueue(this, 'QMCOCBScaleNoPmt', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "Q_MCO_CB_Scale_NoPmt",
      hoursOfOperationArn: arns.R78f86704652149d0AdfcBc25bf47328b,
      
    });

    const QMCOAuditQuestions = new connect.CfnQueue(this, 'QMCOAuditQuestions', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "Q_MCO_Audit_Questions",
      hoursOfOperationArn: arns.R78f86704652149d0AdfcBc25bf47328b,
      
    });

    const QMCOCBSpanish = new connect.CfnQueue(this, 'QMCOCBSpanish', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "Q_MCO_CB_Spanish",
      hoursOfOperationArn: arns.R78f86704652149d0AdfcBc25bf47328b,
      
    });

    const QMCOPetitionRefunds = new connect.CfnQueue(this, 'QMCOPetitionRefunds', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "Q_MCO_Petition_Refunds",
      hoursOfOperationArn: arns.R78f86704652149d0AdfcBc25bf47328b,
      
    });

    const QMCOCBPetitionRefunds = new connect.CfnQueue(this, 'QMCOCBPetitionRefunds', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "Q_MCO_CB_Petition_Refunds",
      hoursOfOperationArn: arns.R78f86704652149d0AdfcBc25bf47328b,
      
    });

    const QCUTSClearance = new connect.CfnQueue(this, 'QCUTSClearance', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "Q_CUTS_Clearance",
      hoursOfOperationArn: arns.R1515d787E3ab424bBf2b39634fc0217e,
      
    });

    const QMCOSpanish = new connect.CfnQueue(this, 'QMCOSpanish', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "Q_MCO_Spanish",
      hoursOfOperationArn: arns.R78f86704652149d0AdfcBc25bf47328b,
      
    });

    const QMCOCBAuditQuestions = new connect.CfnQueue(this, 'QMCOCBAuditQuestions', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "Q_MCO_CB_Audit_Questions",
      hoursOfOperationArn: arns.R78f86704652149d0AdfcBc25bf47328b,
      
    });

    const QMCOScaleNoPmt = new connect.CfnQueue(this, 'QMCOScaleNoPmt', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "Q_MCO_Scale_NoPmt",
      hoursOfOperationArn: arns.R78f86704652149d0AdfcBc25bf47328b,
      
    });

    const QEFTCBAdvisory = new connect.CfnQueue(this, 'QEFTCBAdvisory', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "Q_EFT_CB_Advisory",
      hoursOfOperationArn: arns.R052fdd6534804d429fd23e1792e40a92,
      
    });

    const QCUTSAdvisory = new connect.CfnQueue(this, 'QCUTSAdvisory', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "Q_CUTS_Advisory",
      hoursOfOperationArn: arns.R1515d787E3ab424bBf2b39634fc0217e,
      
    });

    const QUSCustoms = new connect.CfnQueue(this, 'QUSCustoms', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "Q_US_Customs",
      hoursOfOperationArn: arns.R283cec7dDbfe4742A8679732203605b9,
      description: "Transfer Only Queue for US Customs",
    });

    const QCUTSCBClearance = new connect.CfnQueue(this, 'QCUTSCBClearance', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "Q_CUTS_CB_Clearance",
      hoursOfOperationArn: arns.R1515d787E3ab424bBf2b39634fc0217e,
      
    });

    const QCUTSCBAdvisory = new connect.CfnQueue(this, 'QCUTSCBAdvisory', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "Q_CUTS_CB_Advisory",
      hoursOfOperationArn: arns.R1515d787E3ab424bBf2b39634fc0217e,
      
    });

    const QEFTAdvisory = new connect.CfnQueue(this, 'QEFTAdvisory', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "Q_EFT_Advisory",
      hoursOfOperationArn: arns.R052fdd6534804d429fd23e1792e40a92,
      
    });

    const QTRA = new connect.CfnQueue(this, 'QTRA', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "Q_TRA",
      hoursOfOperationArn: arns.R7fdaa19eC1d043fdB4a8737356bfd2e1,
      
    });

    const QCBUSCustoms = new connect.CfnQueue(this, 'QCBUSCustoms', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "Q_CB_US_Customs",
      hoursOfOperationArn: arns.R283cec7dDbfe4742A8679732203605b9,
      description: "Callback queue for Q_US_Customs",
    });

    const QTSDCROS = new connect.CfnQueue(this, 'QTSDCROS', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "Q_TSD_CROS",
      hoursOfOperationArn: arns.R0a5dfac3Ac56478cAd6d7839d576c5e1,
      description: "TSD Test Queue",
    });

    const QTATaxAdvisors = new connect.CfnQueue(this, 'QTATaxAdvisors', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "Q_TA_Tax_Advisors",
      hoursOfOperationArn: arns.R5f586cdc6f7647ee96ceEd600c490256,
      
    });

    const QTACBTaxAdvisors = new connect.CfnQueue(this, 'QTACBTaxAdvisors', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "Q_TA_CB_Tax_Advisors",
      hoursOfOperationArn: arns.R5f586cdc6f7647ee96ceEd600c490256,
      
    });

    const QSTFRetEnvFees = new connect.CfnQueue(this, 'QSTFRetEnvFees', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "Q_STF_Ret_Env_Fees",
      hoursOfOperationArn: arns.C5eeb29253644e02Ace96283bcf12297,
      
    });

    const QTRACB = new connect.CfnQueue(this, 'QTRACB', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "Q_TRA_CB",
      hoursOfOperationArn: arns.R7fdaa19eC1d043fdB4a8737356bfd2e1,
      
    });

    const QSTFCBRetCannabis = new connect.CfnQueue(this, 'QSTFCBRetCannabis', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "Q_STF_CB_Ret_Cannabis",
      hoursOfOperationArn: arns.C5eeb29253644e02Ace96283bcf12297,
      
    });

    const QSTFCBPetitionRefund = new connect.CfnQueue(this, 'QSTFCBPetitionRefund', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "Q_STF_CB_Petition_Refund",
      hoursOfOperationArn: arns.R59f0ea9fBeb74cca82d2E28e2a0a9af1,
      
    });

    const QSTFCBAudit = new connect.CfnQueue(this, 'QSTFCBAudit', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "Q_STF_CB_Audit",
      hoursOfOperationArn: arns.R59f0ea9fBeb74cca82d2E28e2a0a9af1,
      
    });

    const QSTFCBRetEnvFees = new connect.CfnQueue(this, 'QSTFCBRetEnvFees', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "Q_STF_CB_Ret_Env_Fees",
      hoursOfOperationArn: arns.C5eeb29253644e02Ace96283bcf12297,
      
    });

    const CSCTaskAgentAssist = new connect.CfnQuickConnect(this, 'CSCTaskAgentAssist', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "CSC Task Agent Assist",
      quickConnectConfig: { quickConnectType: 'PHONE_NUMBER', phoneConfig: { phoneNumber: "+19169054894" } },
      
    });

    const CSCSpanish = new connect.CfnQuickConnect(this, 'CSCSpanish', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "CSC Spanish",
      quickConnectConfig: { quickConnectType: 'QUEUE', queueConfig: { queueArn: QCSCSpanish.attrQueueArn, contactFlowArn: "arn:aws:connect:us-west-2:797776209609:instance/bd754747-7bce-46be-890e-cd37bd7e0f17/contact-flow/316914ef-f3b6-49b8-bd48-5ac5fbbd27c2" } },
      
    });

    const CSCGeneralQuestions = new connect.CfnQuickConnect(this, 'CSCGeneralQuestions', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "CSC General Questions",
      quickConnectConfig: { quickConnectType: 'QUEUE', queueConfig: { queueArn: QCSCCustomerServiceCenter.attrQueueArn, contactFlowArn: "arn:aws:connect:us-west-2:797776209609:instance/bd754747-7bce-46be-890e-cd37bd7e0f17/contact-flow/c75ec395-a4b4-4c5c-b98e-3401bc1643c4" } },
      
    });

    const CSCEfileAssistance = new connect.CfnQuickConnect(this, 'CSCEfileAssistance', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "CSC Efile Assistance",
      quickConnectConfig: { quickConnectType: 'QUEUE', queueConfig: { queueArn: QCSCEfileAssistance.attrQueueArn, contactFlowArn: "arn:aws:connect:us-west-2:797776209609:instance/bd754747-7bce-46be-890e-cd37bd7e0f17/contact-flow/c75ec395-a4b4-4c5c-b98e-3401bc1643c4" } },
      
    });

    const BakersfieldFieldOffice = new connect.CfnQuickConnect(this, 'BakersfieldFieldOffice', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "Bakersfield Field Office",
      quickConnectConfig: { quickConnectType: 'PHONE_NUMBER', phoneConfig: { phoneNumber: "+16613952880" } },
      
    });

    const STFEnvironmentalFeeReg = new connect.CfnQuickConnect(this, 'STFEnvironmentalFeeReg', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "STF Environmental Fee Reg",
      quickConnectConfig: { quickConnectType: 'QUEUE', queueConfig: { queueArn: QSTFRegTeleEnergyWater.attrQueueArn, contactFlowArn: "arn:aws:connect:us-west-2:797776209609:instance/bd754747-7bce-46be-890e-cd37bd7e0f17/contact-flow/c75ec395-a4b4-4c5c-b98e-3401bc1643c4" } },
      
    });

    const TAGLindaJohnston = new connect.CfnQuickConnect(this, 'TAGLindaJohnston', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "TAG Linda Johnston",
      quickConnectConfig: { quickConnectType: 'PHONE_NUMBER', phoneConfig: { phoneNumber: "+12792052845" } },
      description: "TAG Direct Dial for Linda Johnston 12792052845",
    });

    const STFRETCigaretteTobacco = new connect.CfnQuickConnect(this, 'STFRETCigaretteTobacco', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "STF RET Cigarette Tobacco",
      quickConnectConfig: { quickConnectType: 'QUEUE', queueConfig: { queueArn: QSTFRetCigarette.attrQueueArn, contactFlowArn: "arn:aws:connect:us-west-2:797776209609:instance/bd754747-7bce-46be-890e-cd37bd7e0f17/contact-flow/c75ec395-a4b4-4c5c-b98e-3401bc1643c4" } },
      
    });

    const STFIntegratedWasteManagementReg = new connect.CfnQuickConnect(this, 'STFIntegratedWasteManagementReg', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "STF Integrated Waste Management Reg",
      quickConnectConfig: { quickConnectType: 'QUEUE', queueConfig: { queueArn: QSTFRegEwasteTireIWMF.attrQueueArn, contactFlowArn: "arn:aws:connect:us-west-2:797776209609:instance/bd754747-7bce-46be-890e-cd37bd7e0f17/contact-flow/c75ec395-a4b4-4c5c-b98e-3401bc1643c4" } },
      
    });

    const STFCigaretteTobaccoNewReg = new connect.CfnQuickConnect(this, 'STFCigaretteTobaccoNewReg', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "STF Cigarette Tobacco New Reg",
      quickConnectConfig: { quickConnectType: 'QUEUE', queueConfig: { queueArn: QSTFRegCigaretteTobacco.attrQueueArn, contactFlowArn: "arn:aws:connect:us-west-2:797776209609:instance/bd754747-7bce-46be-890e-cd37bd7e0f17/contact-flow/c75ec395-a4b4-4c5c-b98e-3401bc1643c4" } },
      
    });

    const STFCoveredBatteryEmbeddedWasteFeeRet = new connect.CfnQuickConnect(this, 'STFCoveredBatteryEmbeddedWasteFeeRet', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "STF-Covered Battery-Embedded Waste Fee Ret",
      quickConnectConfig: { quickConnectType: 'QUEUE', queueConfig: { queueArn: QSTFRetEwasteTireIWMF.attrQueueArn, contactFlowArn: "arn:aws:connect:us-west-2:797776209609:instance/bd754747-7bce-46be-890e-cd37bd7e0f17/contact-flow/c75ec395-a4b4-4c5c-b98e-3401bc1643c4" } },
      description: "STF Covered Battery-Embedded (CBE) Waste Recycling Fee Return Processing",
    });

    const TSDTest = new connect.CfnQuickConnect(this, 'TSDTest', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "TSD Test",
      quickConnectConfig: { quickConnectType: 'QUEUE', queueConfig: { queueArn: QTSDCROS.attrQueueArn, contactFlowArn: "arn:aws:connect:us-west-2:797776209609:instance/bd754747-7bce-46be-890e-cd37bd7e0f17/contact-flow/c75ec395-a4b4-4c5c-b98e-3401bc1643c4" } },
      description: "TSD Test Queue",
    });

    const STFUsernameRegistration = new connect.CfnQuickConnect(this, 'STFUsernameRegistration', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "STF Username Registration",
      quickConnectConfig: { quickConnectType: 'QUEUE', queueConfig: { queueArn: QSTFUsernamePassAsst.attrQueueArn, contactFlowArn: "arn:aws:connect:us-west-2:797776209609:instance/bd754747-7bce-46be-890e-cd37bd7e0f17/contact-flow/c75ec395-a4b4-4c5c-b98e-3401bc1643c4" } },
      
    });

    const STFCigaretteTobaccoRenewal = new connect.CfnQuickConnect(this, 'STFCigaretteTobaccoRenewal', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "STF Cigarette Tobacco Renewal",
      quickConnectConfig: { quickConnectType: 'QUEUE', queueConfig: { queueArn: QSTFRegCigaretteTobacco.attrQueueArn, contactFlowArn: "arn:aws:connect:us-west-2:797776209609:instance/bd754747-7bce-46be-890e-cd37bd7e0f17/contact-flow/c75ec395-a4b4-4c5c-b98e-3401bc1643c4" } },
      
    });

    const TAGErichWhisenhunt = new connect.CfnQuickConnect(this, 'TAGErichWhisenhunt', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "TAG Erich Whisenhunt",
      quickConnectConfig: { quickConnectType: 'PHONE_NUMBER', phoneConfig: { phoneNumber: "+19169198699" } },
      description: "TAG Direct Dial for Erich Whisenhunt 19169198699",
    });

    const STFElectricalEnergyReg = new connect.CfnQuickConnect(this, 'STFElectricalEnergyReg', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "STF Electrical Energy Reg",
      quickConnectConfig: { quickConnectType: 'QUEUE', queueConfig: { queueArn: QSTFRegTeleEnergyWater.attrQueueArn, contactFlowArn: "arn:aws:connect:us-west-2:797776209609:instance/bd754747-7bce-46be-890e-cd37bd7e0f17/contact-flow/c75ec395-a4b4-4c5c-b98e-3401bc1643c4" } },
      
    });

    const STFUndergroundStorageRet = new connect.CfnQuickConnect(this, 'STFUndergroundStorageRet', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "STF Underground Storage Ret",
      quickConnectConfig: { quickConnectType: 'QUEUE', queueConfig: { queueArn: QSTFRetFuelUSTFCLPPF.attrQueueArn, contactFlowArn: "arn:aws:connect:us-west-2:797776209609:instance/bd754747-7bce-46be-890e-cd37bd7e0f17/contact-flow/c75ec395-a4b4-4c5c-b98e-3401bc1643c4" } },
      
    });

    const MCOMotorCarrierSpanish = new connect.CfnQuickConnect(this, 'MCOMotorCarrierSpanish', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "MCO Motor Carrier Spanish",
      quickConnectConfig: { quickConnectType: 'QUEUE', queueConfig: { queueArn: QMCOSpanish.attrQueueArn, contactFlowArn: "arn:aws:connect:us-west-2:797776209609:instance/bd754747-7bce-46be-890e-cd37bd7e0f17/contact-flow/c75ec395-a4b4-4c5c-b98e-3401bc1643c4" } },
      
    });

    const QCSCNCWCloseoutsQuickConnect = new connect.CfnQuickConnect(this, 'QCSCNCWCloseoutsQuickConnect', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "Q_CSC_NCW_Closeouts",
      quickConnectConfig: { quickConnectType: 'QUEUE', queueConfig: { queueArn: QCSCNCWCloseouts.attrQueueArn, contactFlowArn: "arn:aws:connect:us-west-2:797776209609:instance/bd754747-7bce-46be-890e-cd37bd7e0f17/contact-flow/c75ec395-a4b4-4c5c-b98e-3401bc1643c4" } },
      
    });

    const RiversideFieldOffice = new connect.CfnQuickConnect(this, 'RiversideFieldOffice', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "Riverside Field Office",
      quickConnectConfig: { quickConnectType: 'PHONE_NUMBER', phoneConfig: { phoneNumber: "+19516806400" } },
      
    });

    const STFTimberTaxReturns = new connect.CfnQuickConnect(this, 'STFTimberTaxReturns', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "STF Timber Tax Returns",
      quickConnectConfig: { quickConnectType: 'QUEUE', queueConfig: { queueArn: QSTFRetAlcoholicBev.attrQueueArn, contactFlowArn: "arn:aws:connect:us-west-2:797776209609:instance/bd754747-7bce-46be-890e-cd37bd7e0f17/contact-flow/c75ec395-a4b4-4c5c-b98e-3401bc1643c4" } },
      description: "STF Timber Tax Returns",
    });

    const SantaAnaFieldOffice = new connect.CfnQuickConnect(this, 'SantaAnaFieldOffice', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "Santa Ana Field Office",
      quickConnectConfig: { quickConnectType: 'PHONE_NUMBER', phoneConfig: { phoneNumber: "+19494403473" } },
      
    });

    const TAGJulietNantege = new connect.CfnQuickConnect(this, 'TAGJulietNantege', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "TAG Juliet Nantege",
      quickConnectConfig: { quickConnectType: 'PHONE_NUMBER', phoneConfig: { phoneNumber: "+12792052837" } },
      description: "TAG Juliet Nantege",
    });

    const SanFranciscoFieldOffice = new connect.CfnQuickConnect(this, 'SanFranciscoFieldOffice', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "San Francisco Field Office",
      quickConnectConfig: { quickConnectType: 'PHONE_NUMBER', phoneConfig: { phoneNumber: "+14153566600" } },
      
    });

    const SanJoseFieldOffice = new connect.CfnQuickConnect(this, 'SanJoseFieldOffice', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "San Jose Field Office",
      quickConnectConfig: { quickConnectType: 'PHONE_NUMBER', phoneConfig: { phoneNumber: "+14082771231" } },
      
    });

    const STFNaturalGasReg = new connect.CfnQuickConnect(this, 'STFNaturalGasReg', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "STF Natural Gas Reg",
      quickConnectConfig: { quickConnectType: 'QUEUE', queueConfig: { queueArn: QSTFRegEwasteTireIWMF.attrQueueArn, contactFlowArn: "arn:aws:connect:us-west-2:797776209609:instance/bd754747-7bce-46be-890e-cd37bd7e0f17/contact-flow/c75ec395-a4b4-4c5c-b98e-3401bc1643c4" } },
      
    });

    const TAGJoeyZizileuskas = new connect.CfnQuickConnect(this, 'TAGJoeyZizileuskas', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "TAG Joey Zizileuskas",
      quickConnectConfig: { quickConnectType: 'PHONE_NUMBER', phoneConfig: { phoneNumber: "+12792052858" } },
      description: "TAG Joey Zizileuskas",
    });

    const TAGIrmaOrtiz = new connect.CfnQuickConnect(this, 'TAGIrmaOrtiz', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "TAG Irma Ortiz",
      quickConnectConfig: { quickConnectType: 'PHONE_NUMBER', phoneConfig: { phoneNumber: "+12792052856" } },
      description: "TAG Direct Dial for Irma Ortiz 12792052856",
    });

    const TAGKatherineGreen = new connect.CfnQuickConnect(this, 'TAGKatherineGreen', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "TAG Katherine Green",
      quickConnectConfig: { quickConnectType: 'PHONE_NUMBER', phoneConfig: { phoneNumber: "+19169198697" } },
      description: "TAG Direct Dial for Katherine Green 19169198697",
    });

    const MCOMotorCarrierNoFuelTripPenalty = new connect.CfnQuickConnect(this, 'MCOMotorCarrierNoFuelTripPenalty', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "MCO Motor Carrier No Fuel Trip Penalty",
      quickConnectConfig: { quickConnectType: 'QUEUE', queueConfig: { queueArn: QMCOScaleNoPmt.attrQueueArn, contactFlowArn: "arn:aws:connect:us-west-2:797776209609:instance/bd754747-7bce-46be-890e-cd37bd7e0f17/contact-flow/c75ec395-a4b4-4c5c-b98e-3401bc1643c4" } },
      
    });

    const STFRETEnergyAndNaturalGasSurcharge = new connect.CfnQuickConnect(this, 'STFRETEnergyAndNaturalGasSurcharge', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "STF RET Energy and Natural Gas Surcharge",
      quickConnectConfig: { quickConnectType: 'QUEUE', queueConfig: { queueArn: QSTFRetCannabis.attrQueueArn, contactFlowArn: "arn:aws:connect:us-west-2:797776209609:instance/bd754747-7bce-46be-890e-cd37bd7e0f17/contact-flow/c75ec395-a4b4-4c5c-b98e-3401bc1643c4" } },
      description: "STF Return Processing Entergy and Natural Gas Surcharge",
    });

    const STFRETEmergencyTelephonePrepaid911 = new connect.CfnQuickConnect(this, 'STFRETEmergencyTelephonePrepaid911', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "STF RET Emergency Telephone-Prepaid 911",
      quickConnectConfig: { quickConnectType: 'QUEUE', queueConfig: { queueArn: QSTFRetCannabis.attrQueueArn, contactFlowArn: "arn:aws:connect:us-west-2:797776209609:instance/bd754747-7bce-46be-890e-cd37bd7e0f17/contact-flow/c75ec395-a4b4-4c5c-b98e-3401bc1643c4" } },
      description: "STF Return Processing Emergency Telephone and Prepaid 911",
    });

    const CSCAgentAssistance = new connect.CfnQuickConnect(this, 'CSCAgentAssistance', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "CSC Agent Assistance",
      quickConnectConfig: { quickConnectType: 'QUEUE', queueConfig: { queueArn: QCSCAgentAssist.attrQueueArn, contactFlowArn: "arn:aws:connect:us-west-2:797776209609:instance/bd754747-7bce-46be-890e-cd37bd7e0f17/contact-flow/c75ec395-a4b4-4c5c-b98e-3401bc1643c4" } },
      
    });

    const TAGTaxAdvisorGroup = new connect.CfnQuickConnect(this, 'TAGTaxAdvisorGroup', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "TAG-Tax Advisor Group",
      quickConnectConfig: { quickConnectType: 'QUEUE', queueConfig: { queueArn: QTATaxAdvisors.attrQueueArn, contactFlowArn: "arn:aws:connect:us-west-2:797776209609:instance/bd754747-7bce-46be-890e-cd37bd7e0f17/contact-flow/c75ec395-a4b4-4c5c-b98e-3401bc1643c4" } },
      
    });

    const TAGTinotendaGwarada = new connect.CfnQuickConnect(this, 'TAGTinotendaGwarada', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "TAG Tinotenda Gwarada",
      quickConnectConfig: { quickConnectType: 'PHONE_NUMBER', phoneConfig: { phoneNumber: "+12792023531" } },
      description: "TAG Direct Dial for Tinotenda Gwarada 12792023531",
    });

    const STFCollectionsGeneral = new connect.CfnQuickConnect(this, 'STFCollectionsGeneral', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "STF Collections (General)",
      quickConnectConfig: { quickConnectType: 'QUEUE', queueConfig: { queueArn: QSTFColBillings.attrQueueArn, contactFlowArn: "arn:aws:connect:us-west-2:797776209609:instance/bd754747-7bce-46be-890e-cd37bd7e0f17/contact-flow/c75ec395-a4b4-4c5c-b98e-3401bc1643c4" } },
      
    });

    const GlendaleFieldOffice = new connect.CfnQuickConnect(this, 'GlendaleFieldOffice', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "Glendale Field Office",
      quickConnectConfig: { quickConnectType: 'PHONE_NUMBER', phoneConfig: { phoneNumber: "+18185434900" } },
      
    });

    const STFRETFirearmAndAmmunitionExciseTax = new connect.CfnQuickConnect(this, 'STFRETFirearmAndAmmunitionExciseTax', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "STF RET Firearm and Ammunition Excise Tax",
      quickConnectConfig: { quickConnectType: 'QUEUE', queueConfig: { queueArn: QSTFRetCigarette.attrQueueArn, contactFlowArn: "arn:aws:connect:us-west-2:797776209609:instance/bd754747-7bce-46be-890e-cd37bd7e0f17/contact-flow/c75ec395-a4b4-4c5c-b98e-3401bc1643c4" } },
      description: "STF RET Firearm and Ammunition Excise Tax",
    });

    const STFCannabisRegistration = new connect.CfnQuickConnect(this, 'STFCannabisRegistration', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "STF Cannabis Registration",
      quickConnectConfig: { quickConnectType: 'QUEUE', queueConfig: { queueArn: QSTFRegCannabis.attrQueueArn, contactFlowArn: "arn:aws:connect:us-west-2:797776209609:instance/bd754747-7bce-46be-890e-cd37bd7e0f17/contact-flow/c75ec395-a4b4-4c5c-b98e-3401bc1643c4" } },
      
    });

    const FresnoFieldOffice = new connect.CfnQuickConnect(this, 'FresnoFieldOffice', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "Fresno Field Office",
      quickConnectConfig: { quickConnectType: 'PHONE_NUMBER', phoneConfig: { phoneNumber: "+15594405330" } },
      
    });

    const STFCigaretteTobaccoGeneral = new connect.CfnQuickConnect(this, 'STFCigaretteTobaccoGeneral', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "STF Cigarette Tobacco General",
      quickConnectConfig: { quickConnectType: 'QUEUE', queueConfig: { queueArn: QSTFRegCigaretteTobacco.attrQueueArn, contactFlowArn: "arn:aws:connect:us-west-2:797776209609:instance/bd754747-7bce-46be-890e-cd37bd7e0f17/contact-flow/c75ec395-a4b4-4c5c-b98e-3401bc1643c4" } },
      
    });

    const STFRETIntegratedWasteManagement = new connect.CfnQuickConnect(this, 'STFRETIntegratedWasteManagement', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "STF RET Integrated Waste Management",
      quickConnectConfig: { quickConnectType: 'QUEUE', queueConfig: { queueArn: QSTFRetEnvFees.attrQueueArn, contactFlowArn: "arn:aws:connect:us-west-2:797776209609:instance/bd754747-7bce-46be-890e-cd37bd7e0f17/contact-flow/c75ec395-a4b4-4c5c-b98e-3401bc1643c4" } },
      description: "STF Return Processing Integrated Waste Management",
    });

    const SanDiegoFieldOffice = new connect.CfnQuickConnect(this, 'SanDiegoFieldOffice', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "San Diego Field Office",
      quickConnectConfig: { quickConnectType: 'PHONE_NUMBER', phoneConfig: { phoneNumber: "+18583854700" } },
      
    });

    const TRATaxpayersRightsAdvocate = new connect.CfnQuickConnect(this, 'TRATaxpayersRightsAdvocate', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "TRA Taxpayers Rights Advocate",
      quickConnectConfig: { quickConnectType: 'QUEUE', queueConfig: { queueArn: QTRA.attrQueueArn, contactFlowArn: "arn:aws:connect:us-west-2:797776209609:instance/bd754747-7bce-46be-890e-cd37bd7e0f17/contact-flow/c75ec395-a4b4-4c5c-b98e-3401bc1643c4" } },
      
    });

    const SalinasFieldOffice = new connect.CfnQuickConnect(this, 'SalinasFieldOffice', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "Salinas Field Office",
      quickConnectConfig: { quickConnectType: 'PHONE_NUMBER', phoneConfig: { phoneNumber: "+18317544500" } },
      
    });

    const STFDelinquency = new connect.CfnQuickConnect(this, 'STFDelinquency', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "STF Delinquency",
      quickConnectConfig: { quickConnectType: 'QUEUE', queueConfig: { queueArn: QSTFColDelinquencies.attrQueueArn, contactFlowArn: "arn:aws:connect:us-west-2:797776209609:instance/bd754747-7bce-46be-890e-cd37bd7e0f17/contact-flow/c75ec395-a4b4-4c5c-b98e-3401bc1643c4" } },
      
    });

    const STFRETLeadAcidBattery = new connect.CfnQuickConnect(this, 'STFRETLeadAcidBattery', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "STF RET Lead Acid Battery",
      quickConnectConfig: { quickConnectType: 'QUEUE', queueConfig: { queueArn: QSTFRetAlcoholicBev.attrQueueArn, contactFlowArn: "arn:aws:connect:us-west-2:797776209609:instance/bd754747-7bce-46be-890e-cd37bd7e0f17/contact-flow/c75ec395-a4b4-4c5c-b98e-3401bc1643c4" } },
      description: "STF Return Processing Lead Acid Battery",
    });

    const SacramentoFieldOffice = new connect.CfnQuickConnect(this, 'SacramentoFieldOffice', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "Sacramento Field Office",
      quickConnectConfig: { quickConnectType: 'PHONE_NUMBER', phoneConfig: { phoneNumber: "+19162276700" } },
      
    });

    const FTBFranchiseTaxBoard = new connect.CfnQuickConnect(this, 'FTBFranchiseTaxBoard', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "FTB Franchise Tax Board",
      quickConnectConfig: { quickConnectType: 'PHONE_NUMBER', phoneConfig: { phoneNumber: "+18008621703" } },
      
    });

    const UTCBReceptionFieldOffice = new connect.CfnQuickConnect(this, 'UTCBReceptionFieldOffice', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "UTCB Reception Field Office",
      quickConnectConfig: { quickConnectType: 'PHONE_NUMBER', phoneConfig: { phoneNumber: "+19163098150" } },
      
    });

    const STFRailroadResponseRet = new connect.CfnQuickConnect(this, 'STFRailroadResponseRet', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "STF Railroad Response Ret",
      quickConnectConfig: { quickConnectType: 'QUEUE', queueConfig: { queueArn: QSTFRetEnvFees.attrQueueArn, contactFlowArn: "arn:aws:connect:us-west-2:797776209609:instance/bd754747-7bce-46be-890e-cd37bd7e0f17/contact-flow/c75ec395-a4b4-4c5c-b98e-3401bc1643c4" } },
      
    });

    const STFAlcoholicBevTaxReg = new connect.CfnQuickConnect(this, 'STFAlcoholicBevTaxReg', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "STF Alcoholic Bev Tax Reg",
      quickConnectConfig: { quickConnectType: 'QUEUE', queueConfig: { queueArn: QSTFRegAlcoholicBev.attrQueueArn, contactFlowArn: "arn:aws:connect:us-west-2:797776209609:instance/bd754747-7bce-46be-890e-cd37bd7e0f17/contact-flow/c75ec395-a4b4-4c5c-b98e-3401bc1643c4" } },
      
    });

    const STFRETNaturalGasSurcharge = new connect.CfnQuickConnect(this, 'STFRETNaturalGasSurcharge', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "STF RET Natural Gas Surcharge",
      quickConnectConfig: { quickConnectType: 'QUEUE', queueConfig: { queueArn: QSTFRetCannabis.attrQueueArn, contactFlowArn: "arn:aws:connect:us-west-2:797776209609:instance/bd754747-7bce-46be-890e-cd37bd7e0f17/contact-flow/c75ec395-a4b4-4c5c-b98e-3401bc1643c4" } },
      description: "STF Return Processing Natural Gas Surcharge",
    });

    const STFRETCannabis = new connect.CfnQuickConnect(this, 'STFRETCannabis', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "STF RET Cannabis",
      quickConnectConfig: { quickConnectType: 'QUEUE', queueConfig: { queueArn: QSTFRetCannabis.attrQueueArn, contactFlowArn: "arn:aws:connect:us-west-2:797776209609:instance/bd754747-7bce-46be-890e-cd37bd7e0f17/contact-flow/c75ec395-a4b4-4c5c-b98e-3401bc1643c4" } },
      description: "STF Return Processing Cannabis",
    });

    const OaklandFieldOffice = new connect.CfnQuickConnect(this, 'OaklandFieldOffice', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "Oakland Field Office",
      quickConnectConfig: { quickConnectType: 'PHONE_NUMBER', phoneConfig: { phoneNumber: "+15106224100" } },
      
    });

    const TAGPraphanSonnySouvannarath = new connect.CfnQuickConnect(this, 'TAGPraphanSonnySouvannarath', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "TAG Praphan (Sonny) Souvannarath",
      quickConnectConfig: { quickConnectType: 'PHONE_NUMBER', phoneConfig: { phoneNumber: "+12792023539" } },
      description: "TAG Direct Dial for Praphan (Sonny) Souvannarath 12792023539",
    });

    const STFRETOccupationalLeadPoisoningPrevention = new connect.CfnQuickConnect(this, 'STFRETOccupationalLeadPoisoningPrevention', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "STF RET Occupational Lead Poisoning Prevention",
      quickConnectConfig: { quickConnectType: 'QUEUE', queueConfig: { queueArn: QSTFRetEnvFees.attrQueueArn, contactFlowArn: "arn:aws:connect:us-west-2:797776209609:instance/bd754747-7bce-46be-890e-cd37bd7e0f17/contact-flow/c75ec395-a4b4-4c5c-b98e-3401bc1643c4" } },
      description: "STF RET Occupational Lead Poisoning Prevention",
    });

    const TAGEricClingman = new connect.CfnQuickConnect(this, 'TAGEricClingman', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "TAG Eric Clingman",
      quickConnectConfig: { quickConnectType: 'PHONE_NUMBER', phoneConfig: { phoneNumber: "+19169198698" } },
      description: "TAG Direct Dial for Eric Clingman 19169198698",
    });

    const STFRETFuelTaxes = new connect.CfnQuickConnect(this, 'STFRETFuelTaxes', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "STF RET Fuel Taxes",
      quickConnectConfig: { quickConnectType: 'QUEUE', queueConfig: { queueArn: QSTFRetCannabis.attrQueueArn, contactFlowArn: "arn:aws:connect:us-west-2:797776209609:instance/bd754747-7bce-46be-890e-cd37bd7e0f17/contact-flow/c75ec395-a4b4-4c5c-b98e-3401bc1643c4" } },
      description: "STF Return Processing Fuel Taxes",
    });

    const STFHazardousWasteReg = new connect.CfnQuickConnect(this, 'STFHazardousWasteReg', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "STF Hazardous Waste Reg",
      quickConnectConfig: { quickConnectType: 'QUEUE', queueConfig: { queueArn: QSTFRegTeleEnergyWater.attrQueueArn, contactFlowArn: "arn:aws:connect:us-west-2:797776209609:instance/bd754747-7bce-46be-890e-cd37bd7e0f17/contact-flow/c75ec395-a4b4-4c5c-b98e-3401bc1643c4" } },
      
    });

    const STFEmergencyTelephoneReg = new connect.CfnQuickConnect(this, 'STFEmergencyTelephoneReg', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "STF Emergency Telephone Reg",
      quickConnectConfig: { quickConnectType: 'QUEUE', queueConfig: { queueArn: QSTFRegTeleEnergyWater.attrQueueArn, contactFlowArn: "arn:aws:connect:us-west-2:797776209609:instance/bd754747-7bce-46be-890e-cd37bd7e0f17/contact-flow/c75ec395-a4b4-4c5c-b98e-3401bc1643c4" } },
      
    });

    const TAGHeatherMcDonald = new connect.CfnQuickConnect(this, 'TAGHeatherMcDonald', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "TAG Heather McDonald",
      quickConnectConfig: { quickConnectType: 'PHONE_NUMBER', phoneConfig: { phoneNumber: "+12792023612" } },
      description: "TAG Direct Dial for Heather McDonald 12792023612",
    });

    const TAGJohnellWilson = new connect.CfnQuickConnect(this, 'TAGJohnellWilson', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "TAG Johnell Wilson",
      quickConnectConfig: { quickConnectType: 'PHONE_NUMBER', phoneConfig: { phoneNumber: "+12792052859" } },
      description: "TAG Direct Dial for Johnell Wilson 12792052859",
    });

    const MCOMotorCarrierIFTARegistration = new connect.CfnQuickConnect(this, 'MCOMotorCarrierIFTARegistration', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "MCO Motor Carrier - IFTA Registration",
      quickConnectConfig: { quickConnectType: 'QUEUE', queueConfig: { queueArn: QMCONewLicenseOrAcct.attrQueueArn, contactFlowArn: "arn:aws:connect:us-west-2:797776209609:instance/bd754747-7bce-46be-890e-cd37bd7e0f17/contact-flow/c75ec395-a4b4-4c5c-b98e-3401bc1643c4" } },
      
    });

    const TAGAnnaNava = new connect.CfnQuickConnect(this, 'TAGAnnaNava', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "TAG Anna Nava",
      quickConnectConfig: { quickConnectType: 'PHONE_NUMBER', phoneConfig: { phoneNumber: "+19169198696" } },
      description: "TAG Direct Dial for Anna Nava 19169198696",
    });

    const SantaRosaFieldOffice = new connect.CfnQuickConnect(this, 'SantaRosaFieldOffice', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "Santa Rosa Field Office",
      quickConnectConfig: { quickConnectType: 'PHONE_NUMBER', phoneConfig: { phoneNumber: "+17075762100" } },
      
    });

    const ReddingFieldOffice = new connect.CfnQuickConnect(this, 'ReddingFieldOffice', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "Redding Field Office",
      quickConnectConfig: { quickConnectType: 'PHONE_NUMBER', phoneConfig: { phoneNumber: "+15302244729" } },
      
    });

    const STFChildhoodLeadPoisonReg = new connect.CfnQuickConnect(this, 'STFChildhoodLeadPoisonReg', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "STF Childhood Lead Poison Reg",
      quickConnectConfig: { quickConnectType: 'QUEUE', queueConfig: { queueArn: QSTFRegFuelUSTFCLPPF.attrQueueArn, contactFlowArn: "arn:aws:connect:us-west-2:797776209609:instance/bd754747-7bce-46be-890e-cd37bd7e0f17/contact-flow/c75ec395-a4b4-4c5c-b98e-3401bc1643c4" } },
      
    });

    const STFEWasteReg = new connect.CfnQuickConnect(this, 'STFEWasteReg', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "STF eWaste Reg",
      quickConnectConfig: { quickConnectType: 'QUEUE', queueConfig: { queueArn: QSTFRegEwasteTireIWMF.attrQueueArn, contactFlowArn: "arn:aws:connect:us-west-2:797776209609:instance/bd754747-7bce-46be-890e-cd37bd7e0f17/contact-flow/c75ec395-a4b4-4c5c-b98e-3401bc1643c4" } },
      description: "STF eWaste Registration Assistance",
    });

    const STFWaterRightsReg = new connect.CfnQuickConnect(this, 'STFWaterRightsReg', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "STF Water Rights Reg",
      quickConnectConfig: { quickConnectType: 'QUEUE', queueConfig: { queueArn: QSTFRegFuelUSTFCLPPF.attrQueueArn, contactFlowArn: "arn:aws:connect:us-west-2:797776209609:instance/bd754747-7bce-46be-890e-cd37bd7e0f17/contact-flow/c75ec395-a4b4-4c5c-b98e-3401bc1643c4" } },
      
    });

    const STFLeadAcidBatteryReg = new connect.CfnQuickConnect(this, 'STFLeadAcidBatteryReg', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "STF Lead Acid Battery Reg",
      quickConnectConfig: { quickConnectType: 'QUEUE', queueConfig: { queueArn: QSTFRegEwasteTireIWMF.attrQueueArn, contactFlowArn: "arn:aws:connect:us-west-2:797776209609:instance/bd754747-7bce-46be-890e-cd37bd7e0f17/contact-flow/c75ec395-a4b4-4c5c-b98e-3401bc1643c4" } },
      
    });

    const STFRETEnvironmentalFees = new connect.CfnQuickConnect(this, 'STFRETEnvironmentalFees', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "STF RET Environmental Fees",
      quickConnectConfig: { quickConnectType: 'QUEUE', queueConfig: { queueArn: QSTFRetEnvFees.attrQueueArn, contactFlowArn: "arn:aws:connect:us-west-2:797776209609:instance/bd754747-7bce-46be-890e-cd37bd7e0f17/contact-flow/c75ec395-a4b4-4c5c-b98e-3401bc1643c4" } },
      description: "STF RET Environmental Fees",
    });

    const STFTireRecyclingReg = new connect.CfnQuickConnect(this, 'STFTireRecyclingReg', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "STF Tire Recycling Reg",
      quickConnectConfig: { quickConnectType: 'QUEUE', queueConfig: { queueArn: QSTFRegEwasteTireIWMF.attrQueueArn, contactFlowArn: "arn:aws:connect:us-west-2:797776209609:instance/bd754747-7bce-46be-890e-cd37bd7e0f17/contact-flow/c75ec395-a4b4-4c5c-b98e-3401bc1643c4" } },
      
    });

    const MCOMotorCarrierReturns = new connect.CfnQuickConnect(this, 'MCOMotorCarrierReturns', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "MCO Motor Carrier Returns",
      quickConnectConfig: { quickConnectType: 'QUEUE', queueConfig: { queueArn: QMCORetnAsstAppear.attrQueueArn, contactFlowArn: "arn:aws:connect:us-west-2:797776209609:instance/bd754747-7bce-46be-890e-cd37bd7e0f17/contact-flow/c75ec395-a4b4-4c5c-b98e-3401bc1643c4" } },
      
    });

    const STFBillings = new connect.CfnQuickConnect(this, 'STFBillings', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "STF Billings",
      quickConnectConfig: { quickConnectType: 'QUEUE', queueConfig: { queueArn: QSTFColBillings.attrQueueArn, contactFlowArn: "arn:aws:connect:us-west-2:797776209609:instance/bd754747-7bce-46be-890e-cd37bd7e0f17/contact-flow/c75ec395-a4b4-4c5c-b98e-3401bc1643c4" } },
      
    });

    const TAGJohnnyPuim = new connect.CfnQuickConnect(this, 'TAGJohnnyPuim', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "TAG Johnny Puim",
      quickConnectConfig: { quickConnectType: 'PHONE_NUMBER', phoneConfig: { phoneNumber: "+12792052843" } },
      description: "TAG Direct Dial for Johnny Puim 12792052843",
    });

    const MCOMotorCarrierBillingRefund = new connect.CfnQuickConnect(this, 'MCOMotorCarrierBillingRefund', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "MCO Motor Carrier Billing Refund",
      quickConnectConfig: { quickConnectType: 'QUEUE', queueConfig: { queueArn: QMCOPetitionRefunds.attrQueueArn, contactFlowArn: "arn:aws:connect:us-west-2:797776209609:instance/bd754747-7bce-46be-890e-cd37bd7e0f17/contact-flow/c75ec395-a4b4-4c5c-b98e-3401bc1643c4" } },
      
    });

    const STFMarineInvasiveReg = new connect.CfnQuickConnect(this, 'STFMarineInvasiveReg', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "STF Marine Invasive Reg",
      quickConnectConfig: { quickConnectType: 'QUEUE', queueConfig: { queueArn: QSTFRegFuelUSTFCLPPF.attrQueueArn, contactFlowArn: "arn:aws:connect:us-west-2:797776209609:instance/bd754747-7bce-46be-890e-cd37bd7e0f17/contact-flow/c75ec395-a4b4-4c5c-b98e-3401bc1643c4" } },
      
    });

    const TAGNickolasRoss = new connect.CfnQuickConnect(this, 'TAGNickolasRoss', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "TAG Nickolas Ross",
      quickConnectConfig: { quickConnectType: 'PHONE_NUMBER', phoneConfig: { phoneNumber: "+12792023597" } },
      description: "TAG Direct Dial for Nickolas Ross 12792023597",
    });

    const QCSCNCWReturnedMailQuickConnect = new connect.CfnQuickConnect(this, 'QCSCNCWReturnedMailQuickConnect', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "Q_CSC_NCW_Returned_Mail",
      quickConnectConfig: { quickConnectType: 'QUEUE', queueConfig: { queueArn: QCSCNCWReturnedMail.attrQueueArn, contactFlowArn: "arn:aws:connect:us-west-2:797776209609:instance/bd754747-7bce-46be-890e-cd37bd7e0f17/contact-flow/c75ec395-a4b4-4c5c-b98e-3401bc1643c4" } },
      description: "Q_CSC_NCW_Returned_Mail",
    });

    const STFRETMarineInvasiveSpecies = new connect.CfnQuickConnect(this, 'STFRETMarineInvasiveSpecies', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "STF RET Marine Invasive Species",
      quickConnectConfig: { quickConnectType: 'QUEUE', queueConfig: { queueArn: QSTFRetEnvFees.attrQueueArn, contactFlowArn: "arn:aws:connect:us-west-2:797776209609:instance/bd754747-7bce-46be-890e-cd37bd7e0f17/contact-flow/c75ec395-a4b4-4c5c-b98e-3401bc1643c4" } },
      description: "STF Return Processing Marine Invasive Species Fee",
    });

    const STFWaterRightsRet = new connect.CfnQuickConnect(this, 'STFWaterRightsRet', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "STF Water Rights Ret",
      quickConnectConfig: { quickConnectType: 'QUEUE', queueConfig: { queueArn: QSTFRetEnvFees.attrQueueArn, contactFlowArn: "arn:aws:connect:us-west-2:797776209609:instance/bd754747-7bce-46be-890e-cd37bd7e0f17/contact-flow/c75ec395-a4b4-4c5c-b98e-3401bc1643c4" } },
      
    });

    const STFFuelTaxesReg = new connect.CfnQuickConnect(this, 'STFFuelTaxesReg', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "STF Fuel Taxes Reg",
      quickConnectConfig: { quickConnectType: 'QUEUE', queueConfig: { queueArn: QSTFRegFuelUSTFCLPPF.attrQueueArn, contactFlowArn: "arn:aws:connect:us-west-2:797776209609:instance/bd754747-7bce-46be-890e-cd37bd7e0f17/contact-flow/c75ec395-a4b4-4c5c-b98e-3401bc1643c4" } },
      
    });

    const RAUEFTHelpline = new connect.CfnQuickConnect(this, 'RAUEFTHelpline', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "RAU EFT Helpline",
      quickConnectConfig: { quickConnectType: 'QUEUE', queueConfig: { queueArn: QEFTAdvisory.attrQueueArn, contactFlowArn: "arn:aws:connect:us-west-2:797776209609:instance/bd754747-7bce-46be-890e-cd37bd7e0f17/contact-flow/c75ec395-a4b4-4c5c-b98e-3401bc1643c4" } },
      
    });

    const STFEWasteRet = new connect.CfnQuickConnect(this, 'STFEWasteRet', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "STF eWaste Ret",
      quickConnectConfig: { quickConnectType: 'QUEUE', queueConfig: { queueArn: QSTFRetEwasteTireIWMF.attrQueueArn, contactFlowArn: "arn:aws:connect:us-west-2:797776209609:instance/bd754747-7bce-46be-890e-cd37bd7e0f17/contact-flow/c75ec395-a4b4-4c5c-b98e-3401bc1643c4" } },
      description: "STF eWaste Return Assistance",
    });

    const USCustoms = new connect.CfnQuickConnect(this, 'USCustoms', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "US Customs",
      quickConnectConfig: { quickConnectType: 'QUEUE', queueConfig: { queueArn: QUSCustoms.attrQueueArn, contactFlowArn: "arn:aws:connect:us-west-2:797776209609:instance/bd754747-7bce-46be-890e-cd37bd7e0f17/contact-flow/c75ec395-a4b4-4c5c-b98e-3401bc1643c4" } },
      description: "Quick Connect for US Customs",
    });

    const ElCentroFieldOffice = new connect.CfnQuickConnect(this, 'ElCentroFieldOffice', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "El Centro Field Office",
      quickConnectConfig: { quickConnectType: 'PHONE_NUMBER', phoneConfig: { phoneNumber: "+17603523431" } },
      
    });

    const STFRETOilSpillPreventionFee = new connect.CfnQuickConnect(this, 'STFRETOilSpillPreventionFee', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "STF RET Oil Spill Prevention Fee",
      quickConnectConfig: { quickConnectType: 'QUEUE', queueConfig: { queueArn: QSTFRetCannabis.attrQueueArn, contactFlowArn: "arn:aws:connect:us-west-2:797776209609:instance/bd754747-7bce-46be-890e-cd37bd7e0f17/contact-flow/c75ec395-a4b4-4c5c-b98e-3401bc1643c4" } },
      description: "STF Return Processing Oil Spill Prevention Fee",
    });

    const FiservCreditCardPayments = new connect.CfnQuickConnect(this, 'FiservCreditCardPayments', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "Fiserv Credit Card Payments",
      quickConnectConfig: { quickConnectType: 'PHONE_NUMBER', phoneConfig: { phoneNumber: "+18444458221" } },
      description: "Fiserv Inc Credit Card Payments Vendor",
    });

    const EDDEmploymentDevelopmentDept = new connect.CfnQuickConnect(this, 'EDDEmploymentDevelopmentDept', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "EDD - Employment Development Dept",
      quickConnectConfig: { quickConnectType: 'PHONE_NUMBER', phoneConfig: { phoneNumber: "+18887453886" } },
      
    });

    const STFOilSpillFeeReg = new connect.CfnQuickConnect(this, 'STFOilSpillFeeReg', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "STF Oil Spill Fee Reg",
      quickConnectConfig: { quickConnectType: 'QUEUE', queueConfig: { queueArn: QSTFRegFuelUSTFCLPPF.attrQueueArn, contactFlowArn: "arn:aws:connect:us-west-2:797776209609:instance/bd754747-7bce-46be-890e-cd37bd7e0f17/contact-flow/c75ec395-a4b4-4c5c-b98e-3401bc1643c4" } },
      
    });

    const STFRETChildhoodLeadPoisoningPrevention = new connect.CfnQuickConnect(this, 'STFRETChildhoodLeadPoisoningPrevention', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "STF RET Childhood Lead Poisoning Prevention",
      quickConnectConfig: { quickConnectType: 'QUEUE', queueConfig: { queueArn: QSTFRetCannabis.attrQueueArn, contactFlowArn: "arn:aws:connect:us-west-2:797776209609:instance/bd754747-7bce-46be-890e-cd37bd7e0f17/contact-flow/c75ec395-a4b4-4c5c-b98e-3401bc1643c4" } },
      description: "STF Return Processing Childhood Lead Poisoning Prevention",
    });

    const STFRETHazardousWaste = new connect.CfnQuickConnect(this, 'STFRETHazardousWaste', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "STF RET Hazardous Waste",
      quickConnectConfig: { quickConnectType: 'QUEUE', queueConfig: { queueArn: QSTFRetEnvFees.attrQueueArn, contactFlowArn: "arn:aws:connect:us-west-2:797776209609:instance/bd754747-7bce-46be-890e-cd37bd7e0f17/contact-flow/c75ec395-a4b4-4c5c-b98e-3401bc1643c4" } },
      description: "STF RET Hazardous Waste",
    });

    const STFFirearmsAndAmmunitionExciseTaxReg = new connect.CfnQuickConnect(this, 'STFFirearmsAndAmmunitionExciseTaxReg', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "STF Firearms and Ammunition Excise Tax Reg",
      quickConnectConfig: { quickConnectType: 'QUEUE', queueConfig: { queueArn: QSTFRegAlcoholicBev.attrQueueArn, contactFlowArn: "arn:aws:connect:us-west-2:797776209609:instance/bd754747-7bce-46be-890e-cd37bd7e0f17/contact-flow/c75ec395-a4b4-4c5c-b98e-3401bc1643c4" } },
      description: "STF Firearms and Ammunitions Excise Tax Registration Assistance",
    });

    const STFRETAlcoholicBeverage = new connect.CfnQuickConnect(this, 'STFRETAlcoholicBeverage', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "STF RET Alcoholic Beverage",
      quickConnectConfig: { quickConnectType: 'QUEUE', queueConfig: { queueArn: QSTFRetAlcoholicBev.attrQueueArn, contactFlowArn: "arn:aws:connect:us-west-2:797776209609:instance/bd754747-7bce-46be-890e-cd37bd7e0f17/contact-flow/c75ec395-a4b4-4c5c-b98e-3401bc1643c4" } },
      description: "STF Return Processing Alcoholic Beverage",
    });

    const CUTSClearance = new connect.CfnQuickConnect(this, 'CUTSClearance', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "CUTS Clearance",
      quickConnectConfig: { quickConnectType: 'QUEUE', queueConfig: { queueArn: QCUTSClearance.attrQueueArn, contactFlowArn: "arn:aws:connect:us-west-2:797776209609:instance/bd754747-7bce-46be-890e-cd37bd7e0f17/contact-flow/c75ec395-a4b4-4c5c-b98e-3401bc1643c4" } },
      
    });

    const MCOMotorCarrierPetitions = new connect.CfnQuickConnect(this, 'MCOMotorCarrierPetitions', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "MCO Motor Carrier Petitions",
      quickConnectConfig: { quickConnectType: 'QUEUE', queueConfig: { queueArn: QMCOPetitionRefunds.attrQueueArn, contactFlowArn: "arn:aws:connect:us-west-2:797776209609:instance/bd754747-7bce-46be-890e-cd37bd7e0f17/contact-flow/c75ec395-a4b4-4c5c-b98e-3401bc1643c4" } },
      
    });

    const TAGSarahCrite = new connect.CfnQuickConnect(this, 'TAGSarahCrite', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "TAG Sarah Crite",
      quickConnectConfig: { quickConnectType: 'PHONE_NUMBER', phoneConfig: { phoneNumber: "+12792052846" } },
      description: "TAG Direct Dial for Sarah Crite 12792052846",
    });

    const STFTireRecyclingRet = new connect.CfnQuickConnect(this, 'STFTireRecyclingRet', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "STF Tire Recycling Ret",
      quickConnectConfig: { quickConnectType: 'QUEUE', queueConfig: { queueArn: QSTFRetEwasteTireIWMF.attrQueueArn, contactFlowArn: "arn:aws:connect:us-west-2:797776209609:instance/bd754747-7bce-46be-890e-cd37bd7e0f17/contact-flow/c75ec395-a4b4-4c5c-b98e-3401bc1643c4" } },
      
    });

    const VenturaFieldOffice = new connect.CfnQuickConnect(this, 'VenturaFieldOffice', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "Ventura Field Office",
      quickConnectConfig: { quickConnectType: 'PHONE_NUMBER', phoneConfig: { phoneNumber: "+18056772700" } },
      
    });

    const CSCTrainingCloseoutsOnly = new connect.CfnRoutingProfile(this, 'CSCTrainingCloseoutsOnly', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "CSC Training Closeouts Only",
      defaultOutboundQueueArn: QCSCNCWCloseouts.attrQueueArn,
      mediaConcurrencies: [{ channel: "TASK", concurrency: 1 }],
      queueConfigs: [{ delay: 0, priority: 1, queueReference: { channel: "TASK", queueArn: QCSCNCWCloseouts.attrQueueArn } }],
      description: "CSC Training Closeouts Only",
    });

    const CSCTrainingAgentAssistance = new connect.CfnRoutingProfile(this, 'CSCTrainingAgentAssistance', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "CSC Training Agent Assistance",
      defaultOutboundQueueArn: QCSCAgentAssist.attrQueueArn,
      mediaConcurrencies: [{ channel: "VOICE", concurrency: 1 }],
      queueConfigs: [{ delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: QCSCAgentAssist.attrQueueArn } }],
      description: "CSC Training Agent Assistance",
    });

    const CSCAgentAssistOnly = new connect.CfnRoutingProfile(this, 'CSCAgentAssistOnly', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "CSC Agent Assist Only",
      defaultOutboundQueueArn: QCSCAgentAssist.attrQueueArn,
      mediaConcurrencies: [{ channel: "TASK", concurrency: 1 }, { channel: "VOICE", concurrency: 1 }],
      queueConfigs: [{ delay: 1, priority: 1, queueReference: { channel: "VOICE", queueArn: QCSCAgentAssist.attrQueueArn } }],
      description: "CSC Agent Assist Only",
    });

    const CSCTrainingEfileOnly = new connect.CfnRoutingProfile(this, 'CSCTrainingEfileOnly', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "CSC Training Efile Only",
      defaultOutboundQueueArn: QCSCCustomerServiceCenter.attrQueueArn,
      mediaConcurrencies: [{ channel: "VOICE", concurrency: 1 }],
      queueConfigs: [{ delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: QCSCCBEfileAssistance.attrQueueArn } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: QCSCEfileAssistance.attrQueueArn } }],
      description: "CSC Training Efile Only",
    });

    const CSCTrainingDefault = new connect.CfnRoutingProfile(this, 'CSCTrainingDefault', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "CSC Training Default",
      defaultOutboundQueueArn: QCSCCustomerServiceCenter.attrQueueArn,
      mediaConcurrencies: [{ channel: "VOICE", concurrency: 1 }],
      queueConfigs: [{ delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: QCSCCBEfileAssistance.attrQueueArn } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: QCSCEfileAssistance.attrQueueArn } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: QCSCCustomerServiceCenter.attrQueueArn } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: QCSCCBCustomerServiceCenter.attrQueueArn } }],
      description: "CSC Training Default",
    });

    const CSCTrainingMailOnly = new connect.CfnRoutingProfile(this, 'CSCTrainingMailOnly', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "CSC Training Mail Only",
      defaultOutboundQueueArn: QCSCNCWReturnedMail.attrQueueArn,
      mediaConcurrencies: [{ channel: "TASK", concurrency: 1 }],
      queueConfigs: [{ delay: 0, priority: 1, queueReference: { channel: "TASK", queueArn: QCSCNCWReturnedMail.attrQueueArn } }],
      description: "CSC Training Mail Only",
    });

    const CSCTrainingNoQueues = new connect.CfnRoutingProfile(this, 'CSCTrainingNoQueues', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "CSC Training No Queues",
      defaultOutboundQueueArn: QCSCTraining.attrQueueArn,
      mediaConcurrencies: [{ channel: "CHAT", concurrency: 1 }, { channel: "TASK", concurrency: 1 }, { channel: "VOICE", concurrency: 1 }],
      queueConfigs: [{ delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: QCSCTraining.attrQueueArn } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: QCSCCBTraining.attrQueueArn } }],
      description: "CSC Training No Queues",
    });

    const CSCRemoteAgentDefaultRoutingProfile = new connect.CfnRoutingProfile(this, 'CSCRemoteAgentDefaultRoutingProfile', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "CSC Remote Agent Default",
      defaultOutboundQueueArn: QFODCollections.attrQueueArn,
      mediaConcurrencies: [{ channel: "VOICE", concurrency: 1 }],
      queueConfigs: [{ delay: 2, priority: 1, queueReference: { channel: "VOICE", queueArn: QCSCCBEfileAssistance.attrQueueArn } }, { delay: 2, priority: 1, queueReference: { channel: "VOICE", queueArn: QFODCBCollections.attrQueueArn } }, { delay: 2, priority: 1, queueReference: { channel: "VOICE", queueArn: QCSCEfileAssistance.attrQueueArn } }, { delay: 2, priority: 1, queueReference: { channel: "VOICE", queueArn: QFODCollections.attrQueueArn } }],
      description: "CSC Remote Agent Default",
    });

    const CSCDefault = new connect.CfnRoutingProfile(this, 'CSCDefault', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "CSC Default",
      defaultOutboundQueueArn: QCSCCustomerServiceCenter.attrQueueArn,
      mediaConcurrencies: [{ channel: "TASK", concurrency: 1 }, { channel: "VOICE", concurrency: 1 }],
      queueConfigs: [{ delay: 2, priority: 1, queueReference: { channel: "VOICE", queueArn: QCSCCBEfileAssistance.attrQueueArn } }, { delay: 2, priority: 1, queueReference: { channel: "VOICE", queueArn: QFODCBCollections.attrQueueArn } }, { delay: 2, priority: 1, queueReference: { channel: "VOICE", queueArn: QCSCEfileAssistance.attrQueueArn } }, { delay: 2, priority: 1, queueReference: { channel: "VOICE", queueArn: QFODCollections.attrQueueArn } }, { delay: 2, priority: 1, queueReference: { channel: "VOICE", queueArn: QCSCCustomerServiceCenter.attrQueueArn } }, { delay: 2, priority: 1, queueReference: { channel: "VOICE", queueArn: QCSCCBCustomerServiceCenter.attrQueueArn } }],
      description: "CSC Default",
    });

    const CSCDefaultMail = new connect.CfnRoutingProfile(this, 'CSCDefaultMail', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "CSC Default + Mail",
      defaultOutboundQueueArn: QCSCNCWReturnedMail.attrQueueArn,
      mediaConcurrencies: [{ channel: "TASK", concurrency: 1 }, { channel: "VOICE", concurrency: 1 }],
      queueConfigs: [{ delay: 2, priority: 1, queueReference: { channel: "VOICE", queueArn: QCSCCBEfileAssistance.attrQueueArn } }, { delay: 2, priority: 1, queueReference: { channel: "VOICE", queueArn: QFODCBCollections.attrQueueArn } }, { delay: 2, priority: 1, queueReference: { channel: "VOICE", queueArn: QCSCEfileAssistance.attrQueueArn } }, { delay: 0, priority: 2, queueReference: { channel: "TASK", queueArn: QCSCNCWReturnedMail.attrQueueArn } }, { delay: 2, priority: 1, queueReference: { channel: "VOICE", queueArn: QFODCollections.attrQueueArn } }, { delay: 2, priority: 1, queueReference: { channel: "VOICE", queueArn: QCSCCustomerServiceCenter.attrQueueArn } }, { delay: 2, priority: 1, queueReference: { channel: "VOICE", queueArn: QCSCCBCustomerServiceCenter.attrQueueArn } }],
      description: "CSC Default + Mail",
    });

    const CSCDefaultAgentAssist = new connect.CfnRoutingProfile(this, 'CSCDefaultAgentAssist', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "CSC Default + Agent Assist",
      defaultOutboundQueueArn: QCSCCustomerServiceCenter.attrQueueArn,
      mediaConcurrencies: [{ channel: "TASK", concurrency: 1 }, { channel: "VOICE", concurrency: 1 }],
      queueConfigs: [{ delay: 2, priority: 2, queueReference: { channel: "VOICE", queueArn: QCSCCBEfileAssistance.attrQueueArn } }, { delay: 2, priority: 2, queueReference: { channel: "VOICE", queueArn: QFODCBCollections.attrQueueArn } }, { delay: 2, priority: 2, queueReference: { channel: "VOICE", queueArn: QCSCEfileAssistance.attrQueueArn } }, { delay: 2, priority: 2, queueReference: { channel: "VOICE", queueArn: QFODCollections.attrQueueArn } }, { delay: 2, priority: 2, queueReference: { channel: "VOICE", queueArn: QCSCCustomerServiceCenter.attrQueueArn } }, { delay: 2, priority: 1, queueReference: { channel: "VOICE", queueArn: QCSCAgentAssist.attrQueueArn } }, { delay: 2, priority: 2, queueReference: { channel: "VOICE", queueArn: QCSCCBCustomerServiceCenter.attrQueueArn } }],
      description: "CSC Default + Agent Assist",
    });

    const CSCDefaultCloseouts = new connect.CfnRoutingProfile(this, 'CSCDefaultCloseouts', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "CSC Default + Closeouts",
      defaultOutboundQueueArn: QCSCNCWCloseouts.attrQueueArn,
      mediaConcurrencies: [{ channel: "TASK", concurrency: 1 }, { channel: "VOICE", concurrency: 1 }],
      queueConfigs: [{ delay: 2, priority: 1, queueReference: { channel: "VOICE", queueArn: QCSCCBEfileAssistance.attrQueueArn } }, { delay: 2, priority: 1, queueReference: { channel: "VOICE", queueArn: QFODCBCollections.attrQueueArn } }, { delay: 2, priority: 1, queueReference: { channel: "VOICE", queueArn: QCSCEfileAssistance.attrQueueArn } }, { delay: 0, priority: 3, queueReference: { channel: "TASK", queueArn: QCSCNCWReturnedMail.attrQueueArn } }, { delay: 2, priority: 1, queueReference: { channel: "VOICE", queueArn: QFODCollections.attrQueueArn } }, { delay: 2, priority: 1, queueReference: { channel: "VOICE", queueArn: QCSCCustomerServiceCenter.attrQueueArn } }, { delay: 2, priority: 1, queueReference: { channel: "VOICE", queueArn: QCSCCBCustomerServiceCenter.attrQueueArn } }, { delay: 0, priority: 2, queueReference: { channel: "TASK", queueArn: QCSCNCWCloseouts.attrQueueArn } }],
      description: "CSC Default + Closeouts",
    });

    const FODTT3Collectors = new connect.CfnRoutingProfile(this, 'FODTT3Collectors', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "FOD TT3 Collectors",
      defaultOutboundQueueArn: QFODCollections.attrQueueArn,
      mediaConcurrencies: [{ channel: "VOICE", concurrency: 1 }],
      queueConfigs: [{ delay: 2, priority: 1, queueReference: { channel: "VOICE", queueArn: QCSCCBEfileAssistance.attrQueueArn } }, { delay: 2, priority: 1, queueReference: { channel: "VOICE", queueArn: QFODCBCollections.attrQueueArn } }, { delay: 2, priority: 1, queueReference: { channel: "VOICE", queueArn: QCSCEfileAssistance.attrQueueArn } }, { delay: 2, priority: 1, queueReference: { channel: "VOICE", queueArn: QFODCollections.attrQueueArn } }],
      description: "FOD TT3 Collectors",
    });

    const FODCollectionsOnly = new connect.CfnRoutingProfile(this, 'FODCollectionsOnly', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "FOD_Collections_Only",
      defaultOutboundQueueArn: QFODCollections.attrQueueArn,
      mediaConcurrencies: [{ channel: "VOICE", concurrency: 1 }],
      queueConfigs: [{ delay: 2, priority: 1, queueReference: { channel: "VOICE", queueArn: QFODCBCollections.attrQueueArn } }, { delay: 2, priority: 1, queueReference: { channel: "VOICE", queueArn: QFODCollections.attrQueueArn } }],
      description: "FOD Collections Line Only",
    });

    const CSCSpanishOnly = new connect.CfnRoutingProfile(this, 'CSCSpanishOnly', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "CSC Spanish Only",
      defaultOutboundQueueArn: QCSCSpanish.attrQueueArn,
      mediaConcurrencies: [{ channel: "VOICE", concurrency: 1 }],
      queueConfigs: [{ delay: 180, priority: 1, queueReference: { channel: "VOICE", queueArn: QCUTSCBSpanish.attrQueueArn } }, { delay: 2, priority: 1, queueReference: { channel: "VOICE", queueArn: QCSCSpanish.attrQueueArn } }, { delay: 2, priority: 1, queueReference: { channel: "VOICE", queueArn: QCSCCBSpanish.attrQueueArn } }, { delay: 180, priority: 1, queueReference: { channel: "VOICE", queueArn: QCUTSSpanish.attrQueueArn } }],
      description: "CSC Spanish Only",
    });

    const CSCRemoteAgentDefaultSpanish = new connect.CfnRoutingProfile(this, 'CSCRemoteAgentDefaultSpanish', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "CSC Remote Agent Default + Spanish",
      defaultOutboundQueueArn: QFODCollections.attrQueueArn,
      mediaConcurrencies: [{ channel: "VOICE", concurrency: 1 }],
      queueConfigs: [{ delay: 2, priority: 1, queueReference: { channel: "VOICE", queueArn: QCSCCBEfileAssistance.attrQueueArn } }, { delay: 2, priority: 1, queueReference: { channel: "VOICE", queueArn: QFODCBCollections.attrQueueArn } }, { delay: 180, priority: 1, queueReference: { channel: "VOICE", queueArn: QCSCSpanish.attrQueueArn } }, { delay: 2, priority: 1, queueReference: { channel: "VOICE", queueArn: QCSCEfileAssistance.attrQueueArn } }, { delay: 2, priority: 1, queueReference: { channel: "VOICE", queueArn: QFODCollections.attrQueueArn } }, { delay: 180, priority: 1, queueReference: { channel: "VOICE", queueArn: QCSCCBSpanish.attrQueueArn } }],
      description: "CSC Remote Agent Default + Spanish",
    });

    const CSCDefaultSpanishMail = new connect.CfnRoutingProfile(this, 'CSCDefaultSpanishMail', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "CSC Default + Spanish + Mail",
      defaultOutboundQueueArn: QCSCCustomerServiceCenter.attrQueueArn,
      mediaConcurrencies: [{ channel: "TASK", concurrency: 1 }, { channel: "VOICE", concurrency: 1 }],
      queueConfigs: [{ delay: 2, priority: 1, queueReference: { channel: "VOICE", queueArn: QCSCCBEfileAssistance.attrQueueArn } }, { delay: 2, priority: 1, queueReference: { channel: "VOICE", queueArn: QFODCBCollections.attrQueueArn } }, { delay: 2, priority: 1, queueReference: { channel: "VOICE", queueArn: QCSCSpanish.attrQueueArn } }, { delay: 2, priority: 1, queueReference: { channel: "VOICE", queueArn: QCSCEfileAssistance.attrQueueArn } }, { delay: 0, priority: 2, queueReference: { channel: "TASK", queueArn: QCSCNCWReturnedMail.attrQueueArn } }, { delay: 2, priority: 1, queueReference: { channel: "VOICE", queueArn: QFODCollections.attrQueueArn } }, { delay: 2, priority: 1, queueReference: { channel: "VOICE", queueArn: QCSCCBSpanish.attrQueueArn } }, { delay: 2, priority: 1, queueReference: { channel: "VOICE", queueArn: QCSCCustomerServiceCenter.attrQueueArn } }, { delay: 2, priority: 1, queueReference: { channel: "VOICE", queueArn: QCSCCBCustomerServiceCenter.attrQueueArn } }],
      description: "CSC Default + Spanish + Mail",
    });

    const CSCDefaultSpanishAgentAssist = new connect.CfnRoutingProfile(this, 'CSCDefaultSpanishAgentAssist', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "CSC Default + Spanish + Agent Assist",
      defaultOutboundQueueArn: QCSCCustomerServiceCenter.attrQueueArn,
      mediaConcurrencies: [{ channel: "VOICE", concurrency: 1 }],
      queueConfigs: [{ delay: 2, priority: 1, queueReference: { channel: "VOICE", queueArn: QCSCCBEfileAssistance.attrQueueArn } }, { delay: 2, priority: 1, queueReference: { channel: "VOICE", queueArn: QFODCBCollections.attrQueueArn } }, { delay: 180, priority: 1, queueReference: { channel: "VOICE", queueArn: QCUTSCBSpanish.attrQueueArn } }, { delay: 2, priority: 1, queueReference: { channel: "VOICE", queueArn: QCSCSpanish.attrQueueArn } }, { delay: 2, priority: 1, queueReference: { channel: "VOICE", queueArn: QCSCEfileAssistance.attrQueueArn } }, { delay: 2, priority: 1, queueReference: { channel: "VOICE", queueArn: QFODCollections.attrQueueArn } }, { delay: 2, priority: 1, queueReference: { channel: "VOICE", queueArn: QCSCCBSpanish.attrQueueArn } }, { delay: 2, priority: 1, queueReference: { channel: "VOICE", queueArn: QCSCCustomerServiceCenter.attrQueueArn } }, { delay: 180, priority: 1, queueReference: { channel: "VOICE", queueArn: QCUTSSpanish.attrQueueArn } }, { delay: 1, priority: 1, queueReference: { channel: "VOICE", queueArn: QCSCAgentAssist.attrQueueArn } }, { delay: 2, priority: 1, queueReference: { channel: "VOICE", queueArn: QCSCCBCustomerServiceCenter.attrQueueArn } }],
      description: "CSC Default + Spanish + Agent Assist",
    });

    const CSCDefaultSpanish = new connect.CfnRoutingProfile(this, 'CSCDefaultSpanish', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "CSC Default + Spanish",
      defaultOutboundQueueArn: QCSCSpanish.attrQueueArn,
      mediaConcurrencies: [{ channel: "TASK", concurrency: 1 }, { channel: "VOICE", concurrency: 1 }],
      queueConfigs: [{ delay: 2, priority: 1, queueReference: { channel: "VOICE", queueArn: QCSCCBEfileAssistance.attrQueueArn } }, { delay: 2, priority: 1, queueReference: { channel: "VOICE", queueArn: QFODCBCollections.attrQueueArn } }, { delay: 180, priority: 1, queueReference: { channel: "VOICE", queueArn: QCUTSCBSpanish.attrQueueArn } }, { delay: 2, priority: 1, queueReference: { channel: "VOICE", queueArn: QCSCSpanish.attrQueueArn } }, { delay: 2, priority: 1, queueReference: { channel: "VOICE", queueArn: QCSCEfileAssistance.attrQueueArn } }, { delay: 2, priority: 1, queueReference: { channel: "VOICE", queueArn: QFODCollections.attrQueueArn } }, { delay: 2, priority: 1, queueReference: { channel: "VOICE", queueArn: QCSCCBSpanish.attrQueueArn } }, { delay: 2, priority: 1, queueReference: { channel: "VOICE", queueArn: QCSCCustomerServiceCenter.attrQueueArn } }, { delay: 180, priority: 1, queueReference: { channel: "VOICE", queueArn: QCUTSSpanish.attrQueueArn } }, { delay: 2, priority: 1, queueReference: { channel: "VOICE", queueArn: QCSCCBCustomerServiceCenter.attrQueueArn } }],
      description: "CSC Default + Spanish",
    });

    const CSCDefaultSpanishCloseouts = new connect.CfnRoutingProfile(this, 'CSCDefaultSpanishCloseouts', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "CSC Default + Spanish + Closeouts",
      defaultOutboundQueueArn: QCSCCustomerServiceCenter.attrQueueArn,
      mediaConcurrencies: [{ channel: "TASK", concurrency: 1 }, { channel: "VOICE", concurrency: 1 }],
      queueConfigs: [{ delay: 2, priority: 1, queueReference: { channel: "VOICE", queueArn: QCSCCBEfileAssistance.attrQueueArn } }, { delay: 2, priority: 1, queueReference: { channel: "VOICE", queueArn: QFODCBCollections.attrQueueArn } }, { delay: 2, priority: 1, queueReference: { channel: "VOICE", queueArn: QCSCSpanish.attrQueueArn } }, { delay: 2, priority: 1, queueReference: { channel: "VOICE", queueArn: QCSCEfileAssistance.attrQueueArn } }, { delay: 0, priority: 3, queueReference: { channel: "TASK", queueArn: QCSCNCWReturnedMail.attrQueueArn } }, { delay: 2, priority: 1, queueReference: { channel: "VOICE", queueArn: QFODCollections.attrQueueArn } }, { delay: 2, priority: 1, queueReference: { channel: "VOICE", queueArn: QCSCCBSpanish.attrQueueArn } }, { delay: 2, priority: 1, queueReference: { channel: "VOICE", queueArn: QCSCCustomerServiceCenter.attrQueueArn } }, { delay: 2, priority: 1, queueReference: { channel: "VOICE", queueArn: QCSCCBCustomerServiceCenter.attrQueueArn } }, { delay: 0, priority: 2, queueReference: { channel: "TASK", queueArn: QCSCNCWCloseouts.attrQueueArn } }],
      description: "CSC Default + Spanish + Closeouts",
    });

    const FODTT3CollectorsSpanish = new connect.CfnRoutingProfile(this, 'FODTT3CollectorsSpanish', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "FOD TT3 Collectors + Spanish",
      defaultOutboundQueueArn: QFODCollections.attrQueueArn,
      mediaConcurrencies: [{ channel: "VOICE", concurrency: 1 }],
      queueConfigs: [{ delay: 2, priority: 1, queueReference: { channel: "VOICE", queueArn: QCSCCBEfileAssistance.attrQueueArn } }, { delay: 2, priority: 1, queueReference: { channel: "VOICE", queueArn: QFODCBCollections.attrQueueArn } }, { delay: 180, priority: 1, queueReference: { channel: "VOICE", queueArn: QCSCSpanish.attrQueueArn } }, { delay: 2, priority: 1, queueReference: { channel: "VOICE", queueArn: QCSCEfileAssistance.attrQueueArn } }, { delay: 2, priority: 1, queueReference: { channel: "VOICE", queueArn: QFODCollections.attrQueueArn } }, { delay: 180, priority: 1, queueReference: { channel: "VOICE", queueArn: QCSCCBSpanish.attrQueueArn } }],
      description: "FOD TT3 Collectors + Spanish",
    });

    const CSCTrainingSpanishOnly = new connect.CfnRoutingProfile(this, 'CSCTrainingSpanishOnly', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "CSC Training Spanish Only",
      defaultOutboundQueueArn: QCSCSpanish.attrQueueArn,
      mediaConcurrencies: [{ channel: "VOICE", concurrency: 1 }],
      queueConfigs: [{ delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: QCSCSpanish.attrQueueArn } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: QCSCCBSpanish.attrQueueArn } }],
      description: "CSC Training Spanish Only",
    });

    const CSCRemoteAgentEfileOnly = new connect.CfnRoutingProfile(this, 'CSCRemoteAgentEfileOnly', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "CSC Remote Agent Efile Only",
      defaultOutboundQueueArn: BasicQueue.attrQueueArn,
      mediaConcurrencies: [{ channel: "VOICE", concurrency: 1 }],
      queueConfigs: [{ delay: 2, priority: 1, queueReference: { channel: "VOICE", queueArn: QCSCCBEfileAssistance.attrQueueArn } }, { delay: 2, priority: 1, queueReference: { channel: "VOICE", queueArn: QCSCEfileAssistance.attrQueueArn } }],
      description: "CSC Remote Agent Efile Only",
    });

    const AgentOutbound = new connect.CfnRoutingProfile(this, 'AgentOutbound', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "Agent_outbound",
      defaultOutboundQueueArn: QCSCCustomerServiceCenter.attrQueueArn,
      mediaConcurrencies: [{ channel: "CHAT", concurrency: 1 }, { channel: "VOICE", concurrency: 1 }],
      queueConfigs: [{ delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: BasicQueue.attrQueueArn } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: QCSCCustomerServiceCenter.attrQueueArn } }],
      description: "Used to route outbound calls dynamically based on the agent DID",
    });

    const PreferredRoutingProfile = new connect.CfnRoutingProfile(this, 'PreferredRoutingProfile', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "Preferred Routing profile",
      defaultOutboundQueueArn: BasicQueue.attrQueueArn,
      mediaConcurrencies: [{ channel: "VOICE", concurrency: 1 }],
      queueConfigs: [{ delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: QCSCAgentAssist.attrQueueArn } }],
      description: "Preferred Queue",
    });

    const Inactive = new connect.CfnRoutingProfile(this, 'Inactive', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "Inactive",
      defaultOutboundQueueArn: BasicQueue.attrQueueArn,
      mediaConcurrencies: [{ channel: "VOICE", concurrency: 1 }],
      description: "Routing Profile for inactive agents",
    });

    const CSCDefaultSpanishSpanishChat = new connect.CfnRoutingProfile(this, 'CSCDefaultSpanishSpanishChat', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "CSC Default + Spanish + Spanish Chat",
      defaultOutboundQueueArn: QCSCSpanish.attrQueueArn,
      mediaConcurrencies: [{ channel: "CHAT", concurrency: 1 }, { channel: "TASK", concurrency: 1 }, { channel: "VOICE", concurrency: 1 }],
      queueConfigs: [{ delay: 2, priority: 2, queueReference: { channel: "VOICE", queueArn: QCSCCBEfileAssistance.attrQueueArn } }, { delay: 2, priority: 1, queueReference: { channel: "CHAT", queueArn: QCSCWebchatSpanish.attrQueueArn } }, { delay: 2, priority: 2, queueReference: { channel: "VOICE", queueArn: QFODCBCollections.attrQueueArn } }, { delay: 180, priority: 2, queueReference: { channel: "VOICE", queueArn: QCUTSCBSpanish.attrQueueArn } }, { delay: 2, priority: 2, queueReference: { channel: "VOICE", queueArn: QCSCSpanish.attrQueueArn } }, { delay: 2, priority: 2, queueReference: { channel: "VOICE", queueArn: QCSCEfileAssistance.attrQueueArn } }, { delay: 2, priority: 2, queueReference: { channel: "VOICE", queueArn: QFODCollections.attrQueueArn } }, { delay: 2, priority: 2, queueReference: { channel: "VOICE", queueArn: QCSCCBSpanish.attrQueueArn } }, { delay: 2, priority: 2, queueReference: { channel: "VOICE", queueArn: QCSCCustomerServiceCenter.attrQueueArn } }, { delay: 180, priority: 2, queueReference: { channel: "VOICE", queueArn: QCUTSSpanish.attrQueueArn } }, { delay: 2, priority: 2, queueReference: { channel: "VOICE", queueArn: QCSCCBCustomerServiceCenter.attrQueueArn } }],
      description: "CSC Default + Spanish + Spanish Chat",
    });

    const CSCChatOnly = new connect.CfnRoutingProfile(this, 'CSCChatOnly', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "CSC Chat Only",
      defaultOutboundQueueArn: QCSCCustomerServiceCenter.attrQueueArn,
      mediaConcurrencies: [{ channel: "CHAT", concurrency: 4 }, { channel: "TASK", concurrency: 1 }, { channel: "VOICE", concurrency: 1 }],
      queueConfigs: [{ delay: 0, priority: 1, queueReference: { channel: "CHAT", queueArn: QCSCWebchat.attrQueueArn } }],
      description: "CSC Chat Only",
    });

    const CSCChatSpanishChat = new connect.CfnRoutingProfile(this, 'CSCChatSpanishChat', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "CSC Chat + Spanish Chat",
      defaultOutboundQueueArn: QCSCCustomerServiceCenter.attrQueueArn,
      mediaConcurrencies: [{ channel: "CHAT", concurrency: 4 }],
      queueConfigs: [{ delay: 0, priority: 1, queueReference: { channel: "CHAT", queueArn: QCSCWebchatSpanish.attrQueueArn } }, { delay: 0, priority: 2, queueReference: { channel: "CHAT", queueArn: QCSCWebchat.attrQueueArn } }],
      description: "Spanish Webchat agent with Webchat with English as secondary",
    });

    const CSCAgentAssistChat = new connect.CfnRoutingProfile(this, 'CSCAgentAssistChat', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "CSC Agent Assist + Chat",
      defaultOutboundQueueArn: QCSCCustomerServiceCenter.attrQueueArn,
      mediaConcurrencies: [{ channel: "CHAT", concurrency: 4 }, { channel: "TASK", concurrency: 1 }, { channel: "VOICE", concurrency: 1 }],
      queueConfigs: [{ delay: 1, priority: 2, queueReference: { channel: "CHAT", queueArn: QCSCWebchat.attrQueueArn } }, { delay: 1, priority: 1, queueReference: { channel: "VOICE", queueArn: QCSCAgentAssist.attrQueueArn } }],
      description: "CSC Agent Assist + Chat",
    });

    const CSCAgentAssistChatSpanishChat = new connect.CfnRoutingProfile(this, 'CSCAgentAssistChatSpanishChat', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "CSC Agent Assist + Chat + Spanish Chat",
      defaultOutboundQueueArn: QCSCCustomerServiceCenter.attrQueueArn,
      mediaConcurrencies: [{ channel: "CHAT", concurrency: 4 }, { channel: "TASK", concurrency: 1 }, { channel: "VOICE", concurrency: 1 }],
      queueConfigs: [{ delay: 1, priority: 2, queueReference: { channel: "CHAT", queueArn: QCSCWebchatSpanish.attrQueueArn } }, { delay: 1, priority: 3, queueReference: { channel: "CHAT", queueArn: QCSCWebchat.attrQueueArn } }, { delay: 1, priority: 1, queueReference: { channel: "VOICE", queueArn: QCSCAgentAssist.attrQueueArn } }],
      description: "CSC Webchat in Spanish & English and Agent Assist Line",
    });

    const STFRetAgentTeam2TT = new connect.CfnRoutingProfile(this, 'STFRetAgentTeam2TT', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "STF Ret Agent Team 2 TT",
      defaultOutboundQueueArn: QSTFRetCigarette.attrQueueArn,
      mediaConcurrencies: [{ channel: "VOICE", concurrency: 1 }],
      queueConfigs: [{ delay: 15, priority: 4, queueReference: { channel: "VOICE", queueArn: QSTFCBRetCigarette.attrQueueArn } }, { delay: 10, priority: 3, queueReference: { channel: "VOICE", queueArn: QSTFCBUsernamePassAsst.attrQueueArn } }, { delay: 15, priority: 4, queueReference: { channel: "VOICE", queueArn: QSTFRetCigarette.attrQueueArn } }, { delay: 10, priority: 3, queueReference: { channel: "VOICE", queueArn: QSTFUsernamePassAsst.attrQueueArn } }],
      description: "STF Ret Agent Team 2 TT",
    });

    const STFRetAgentTeam4TT = new connect.CfnRoutingProfile(this, 'STFRetAgentTeam4TT', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "STF Ret Agent Team 4 TT",
      defaultOutboundQueueArn: QSTFUsernamePassAsst.attrQueueArn,
      mediaConcurrencies: [{ channel: "VOICE", concurrency: 1 }],
      queueConfigs: [{ delay: 10, priority: 3, queueReference: { channel: "VOICE", queueArn: QSTFCBUsernamePassAsst.attrQueueArn } }, { delay: 10, priority: 3, queueReference: { channel: "VOICE", queueArn: QSTFUsernamePassAsst.attrQueueArn } }],
      description: "STF Ret Agent Team 4 TT",
    });

    const STFAEBAgentDefaultUsernamePassword = new connect.CfnRoutingProfile(this, 'STFAEBAgentDefaultUsernamePassword', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "STF_AEB_Agent_Default_Username_Password",
      defaultOutboundQueueArn: BasicQueue.attrQueueArn,
      mediaConcurrencies: [{ channel: "VOICE", concurrency: 1 }],
      queueConfigs: [{ delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: QSTFCBUsernamePassAsst.attrQueueArn } }, { delay: 0, priority: 2, queueReference: { channel: "VOICE", queueArn: QSTFUsernamePassAsst.attrQueueArn } }],
      description: "STF AEB Team A - Username/Password Reset Default Profile",
    });

    const MCORevoCollectionsProfile2 = new connect.CfnRoutingProfile(this, 'MCORevoCollectionsProfile2', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "MCO Revo_Collections Profile 2",
      defaultOutboundQueueArn: BasicQueue.attrQueueArn,
      mediaConcurrencies: [{ channel: "VOICE", concurrency: 1 }],
      queueConfigs: [{ delay: 0, priority: 2, queueReference: { channel: "VOICE", queueArn: QMCONewLicenseOrAcct.attrQueueArn } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: QMCOCBCollectRevo.attrQueueArn } }, { delay: 0, priority: 2, queueReference: { channel: "VOICE", queueArn: QMCOLicenseIFTADecals.attrQueueArn } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: QMCOCBLicenseIFTADecals.attrQueueArn } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: QMCOCBNewLicenseOrAcct.attrQueueArn } }, { delay: 30, priority: 3, queueReference: { channel: "VOICE", queueArn: QMCOCollectRevo.attrQueueArn } }],
      description: "MCO Revo_Collections Profile 2",
    });

    const MCOReturnReview2 = new connect.CfnRoutingProfile(this, 'MCOReturnReview2', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "MCO_Return_Review 2",
      defaultOutboundQueueArn: BasicQueue.attrQueueArn,
      mediaConcurrencies: [{ channel: "VOICE", concurrency: 1 }],
      queueConfigs: [{ delay: 0, priority: 2, queueReference: { channel: "VOICE", queueArn: QMCORetnAsstAppear.attrQueueArn } }, { delay: 0, priority: 2, queueReference: { channel: "VOICE", queueArn: QMCONewLicenseOrAcct.attrQueueArn } }, { delay: 0, priority: 2, queueReference: { channel: "VOICE", queueArn: QMCOLicenseIFTADecals.attrQueueArn } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: QMCOCBRetnAsstAppear.attrQueueArn } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: QMCOCBLicenseIFTADecals.attrQueueArn } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: QMCOCBNewLicenseOrAcct.attrQueueArn } }, { delay: 0, priority: 2, queueReference: { channel: "VOICE", queueArn: QMCOBillingRefund.attrQueueArn } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: QMCOCBBillingRefund.attrQueueArn } }],
      description: "MCO Return Review Profile 2",
    });

    const MCORevoCollectionsProfile1RoutingProfile = new connect.CfnRoutingProfile(this, 'MCORevoCollectionsProfile1RoutingProfile', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "MCO Revo_Collections Profile 1",
      defaultOutboundQueueArn: BasicQueue.attrQueueArn,
      mediaConcurrencies: [{ channel: "VOICE", concurrency: 1 }],
      queueConfigs: [{ delay: 0, priority: 2, queueReference: { channel: "VOICE", queueArn: QMCORetnAsstAppear.attrQueueArn } }, { delay: 30, priority: 3, queueReference: { channel: "VOICE", queueArn: QMCONewLicenseOrAcct.attrQueueArn } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: QMCOCBCollectRevo.attrQueueArn } }, { delay: 30, priority: 3, queueReference: { channel: "VOICE", queueArn: QMCOLicenseIFTADecals.attrQueueArn } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: QMCOCBRetnAsstAppear.attrQueueArn } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: QMCOCBLicenseIFTADecals.attrQueueArn } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: QMCOCBNewLicenseOrAcct.attrQueueArn } }, { delay: 60, priority: 4, queueReference: { channel: "VOICE", queueArn: QMCOCollectRevo.attrQueueArn } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: QMCOBillingRefund.attrQueueArn } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: QMCOCBBillingRefund.attrQueueArn } }],
      description: "MCO Revo_Collections Profile 1",
    });

    const MCOReturnReview1 = new connect.CfnRoutingProfile(this, 'MCOReturnReview1', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "MCO_Return_Review 1",
      defaultOutboundQueueArn: QMCORetnAsstAppear.attrQueueArn,
      mediaConcurrencies: [{ channel: "VOICE", concurrency: 1 }],
      queueConfigs: [{ delay: 0, priority: 2, queueReference: { channel: "VOICE", queueArn: QMCORetnAsstAppear.attrQueueArn } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: QMCONewLicenseOrAcct.attrQueueArn } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: QMCOCBCollectRevo.attrQueueArn } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: QMCOLicenseIFTADecals.attrQueueArn } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: QMCOCBRetnAsstAppear.attrQueueArn } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: QMCOCBLicenseIFTADecals.attrQueueArn } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: QMCOCBNewLicenseOrAcct.attrQueueArn } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: QMCOCollectRevo.attrQueueArn } }, { delay: 0, priority: 2, queueReference: { channel: "VOICE", queueArn: QMCOBillingRefund.attrQueueArn } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: QMCOCBBillingRefund.attrQueueArn } }],
      description: "MCO Return Review Team Profile 1",
    });

    const MCORevoCollectionsProfile1RoutingProfile2 = new connect.CfnRoutingProfile(this, 'MCORevoCollectionsProfile1RoutingProfile2', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "MCO_Revo_Collections Profile 1",
      defaultOutboundQueueArn: QMCONewLicenseOrAcct.attrQueueArn,
      mediaConcurrencies: [{ channel: "VOICE", concurrency: 1 }],
      queueConfigs: [{ delay: 0, priority: 2, queueReference: { channel: "VOICE", queueArn: QMCORetnAsstAppear.attrQueueArn } }, { delay: 0, priority: 2, queueReference: { channel: "VOICE", queueArn: QMCONewLicenseOrAcct.attrQueueArn } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: QMCOCBCollectRevo.attrQueueArn } }, { delay: 0, priority: 2, queueReference: { channel: "VOICE", queueArn: QMCOLicenseIFTADecals.attrQueueArn } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: QMCOCBRetnAsstAppear.attrQueueArn } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: QMCOCBLicenseIFTADecals.attrQueueArn } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: QMCOCBNewLicenseOrAcct.attrQueueArn } }, { delay: 0, priority: 2, queueReference: { channel: "VOICE", queueArn: QMCOCollectRevo.attrQueueArn } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: QMCOBillingRefund.attrQueueArn } }],
      description: "MCO_Revo_Collections Profile 1",
    });

    const STFCollectionsTeamBBTR = new connect.CfnRoutingProfile(this, 'STFCollectionsTeamBBTR', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "STF Collections Team B BTR",
      defaultOutboundQueueArn: QSTFColBillings.attrQueueArn,
      mediaConcurrencies: [{ channel: "VOICE", concurrency: 1 }],
      queueConfigs: [{ delay: 0, priority: 2, queueReference: { channel: "VOICE", queueArn: QSTFColDelinquencies.attrQueueArn } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: QSTFCBColBillings.attrQueueArn } }, { delay: 0, priority: 2, queueReference: { channel: "VOICE", queueArn: QSTFCBColDelinquencies.attrQueueArn } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: QSTFColBillings.attrQueueArn } }],
      description: "STF Collections Team B BTR",
    });

    const STFCollectionsTeamEBTCS = new connect.CfnRoutingProfile(this, 'STFCollectionsTeamEBTCS', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "STF Collections Team E BTCS",
      defaultOutboundQueueArn: QSTFColBillings.attrQueueArn,
      mediaConcurrencies: [{ channel: "VOICE", concurrency: 1 }],
      queueConfigs: [{ delay: 0, priority: 3, queueReference: { channel: "VOICE", queueArn: QSTFColDelinquencies.attrQueueArn } }, { delay: 0, priority: 3, queueReference: { channel: "VOICE", queueArn: QSTFCBColBillings.attrQueueArn } }, { delay: 0, priority: 3, queueReference: { channel: "VOICE", queueArn: QSTFCBColDelinquencies.attrQueueArn } }, { delay: 0, priority: 3, queueReference: { channel: "VOICE", queueArn: QSTFColBillings.attrQueueArn } }],
      description: "STF Collections Team E BTCS",
    });

    const STFCollectionsTeamBTT = new connect.CfnRoutingProfile(this, 'STFCollectionsTeamBTT', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "STF Collections Team B TT",
      defaultOutboundQueueArn: QSTFColDelinquencies.attrQueueArn,
      mediaConcurrencies: [{ channel: "VOICE", concurrency: 1 }],
      queueConfigs: [{ delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: QSTFColDelinquencies.attrQueueArn } }, { delay: 0, priority: 2, queueReference: { channel: "VOICE", queueArn: QSTFCBColBillings.attrQueueArn } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: QSTFCBColDelinquencies.attrQueueArn } }, { delay: 0, priority: 2, queueReference: { channel: "VOICE", queueArn: QSTFColBillings.attrQueueArn } }],
      description: "STF Collections Team B TT",
    });

    const STFCollectionsTeamATT = new connect.CfnRoutingProfile(this, 'STFCollectionsTeamATT', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "STF Collections Team A TT",
      defaultOutboundQueueArn: QSTFColDelinquencies.attrQueueArn,
      mediaConcurrencies: [{ channel: "VOICE", concurrency: 1 }],
      queueConfigs: [{ delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: QSTFColDelinquencies.attrQueueArn } }, { delay: 0, priority: 2, queueReference: { channel: "VOICE", queueArn: QSTFCBColBillings.attrQueueArn } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: QSTFCBColDelinquencies.attrQueueArn } }, { delay: 0, priority: 2, queueReference: { channel: "VOICE", queueArn: QSTFColBillings.attrQueueArn } }],
      description: "STF Collections Team A TT",
    });

    const STFCollectionsTeamABTCS = new connect.CfnRoutingProfile(this, 'STFCollectionsTeamABTCS', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "STF Collections Team A BTCS",
      defaultOutboundQueueArn: QSTFColDelinquencies.attrQueueArn,
      mediaConcurrencies: [{ channel: "VOICE", concurrency: 1 }],
      queueConfigs: [{ delay: 0, priority: 3, queueReference: { channel: "VOICE", queueArn: QSTFColDelinquencies.attrQueueArn } }, { delay: 0, priority: 3, queueReference: { channel: "VOICE", queueArn: QSTFCBColBillings.attrQueueArn } }, { delay: 0, priority: 3, queueReference: { channel: "VOICE", queueArn: QSTFCBColDelinquencies.attrQueueArn } }, { delay: 0, priority: 3, queueReference: { channel: "VOICE", queueArn: QSTFColBillings.attrQueueArn } }],
      description: "STF Collections Team A BTCS",
    });

    const STFCollectionsTeamABTR = new connect.CfnRoutingProfile(this, 'STFCollectionsTeamABTR', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "STF Collections Team A BTR",
      defaultOutboundQueueArn: QSTFColBillings.attrQueueArn,
      mediaConcurrencies: [{ channel: "VOICE", concurrency: 1 }],
      queueConfigs: [{ delay: 0, priority: 2, queueReference: { channel: "VOICE", queueArn: QSTFColDelinquencies.attrQueueArn } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: QSTFCBColBillings.attrQueueArn } }, { delay: 0, priority: 2, queueReference: { channel: "VOICE", queueArn: QSTFCBColDelinquencies.attrQueueArn } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: QSTFColBillings.attrQueueArn } }],
      description: "STF Collections Team A BTR",
    });

    const STFCollectionsTeamDTT = new connect.CfnRoutingProfile(this, 'STFCollectionsTeamDTT', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "STF Collections Team D TT",
      defaultOutboundQueueArn: QSTFColDelinquencies.attrQueueArn,
      mediaConcurrencies: [{ channel: "VOICE", concurrency: 1 }],
      queueConfigs: [{ delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: QSTFColDelinquencies.attrQueueArn } }, { delay: 0, priority: 2, queueReference: { channel: "VOICE", queueArn: QSTFCBColBillings.attrQueueArn } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: QSTFCBColDelinquencies.attrQueueArn } }, { delay: 0, priority: 2, queueReference: { channel: "VOICE", queueArn: QSTFColBillings.attrQueueArn } }],
      description: "STF Collections Team D TT",
    });

    const STFCollectionsTeamCTT = new connect.CfnRoutingProfile(this, 'STFCollectionsTeamCTT', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "STF Collections Team C TT",
      defaultOutboundQueueArn: QSTFColDelinquencies.attrQueueArn,
      mediaConcurrencies: [{ channel: "VOICE", concurrency: 1 }],
      queueConfigs: [{ delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: QSTFColDelinquencies.attrQueueArn } }, { delay: 0, priority: 2, queueReference: { channel: "VOICE", queueArn: QSTFCBColBillings.attrQueueArn } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: QSTFCBColDelinquencies.attrQueueArn } }, { delay: 0, priority: 2, queueReference: { channel: "VOICE", queueArn: QSTFColBillings.attrQueueArn } }],
      description: "STF Collections Team C TT",
    });

    const STFCollectionsTeamEBTR = new connect.CfnRoutingProfile(this, 'STFCollectionsTeamEBTR', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "STF Collections Team E BTR",
      defaultOutboundQueueArn: QSTFColBillings.attrQueueArn,
      mediaConcurrencies: [{ channel: "VOICE", concurrency: 1 }],
      queueConfigs: [{ delay: 0, priority: 2, queueReference: { channel: "VOICE", queueArn: QSTFColDelinquencies.attrQueueArn } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: QSTFCBColBillings.attrQueueArn } }, { delay: 0, priority: 2, queueReference: { channel: "VOICE", queueArn: QSTFCBColDelinquencies.attrQueueArn } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: QSTFColBillings.attrQueueArn } }],
      description: "STF Collections Team E BTR",
    });

    const STFCollectionsTeamDBTR = new connect.CfnRoutingProfile(this, 'STFCollectionsTeamDBTR', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "STF Collections Team D BTR",
      defaultOutboundQueueArn: QSTFColBillings.attrQueueArn,
      mediaConcurrencies: [{ channel: "VOICE", concurrency: 1 }],
      queueConfigs: [{ delay: 0, priority: 2, queueReference: { channel: "VOICE", queueArn: QSTFColDelinquencies.attrQueueArn } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: QSTFCBColBillings.attrQueueArn } }, { delay: 0, priority: 2, queueReference: { channel: "VOICE", queueArn: QSTFCBColDelinquencies.attrQueueArn } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: QSTFColBillings.attrQueueArn } }],
      description: "STF Collections Team D BTR",
    });

    const STFCollectionsTeamCBTR = new connect.CfnRoutingProfile(this, 'STFCollectionsTeamCBTR', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "STF Collections Team C BTR",
      defaultOutboundQueueArn: QSTFColBillings.attrQueueArn,
      mediaConcurrencies: [{ channel: "VOICE", concurrency: 1 }],
      queueConfigs: [{ delay: 0, priority: 2, queueReference: { channel: "VOICE", queueArn: QSTFColDelinquencies.attrQueueArn } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: QSTFCBColBillings.attrQueueArn } }, { delay: 0, priority: 2, queueReference: { channel: "VOICE", queueArn: QSTFCBColDelinquencies.attrQueueArn } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: QSTFColBillings.attrQueueArn } }],
      description: "STF Collections Team C BTR",
    });

    const STFCollectionsTeamETT = new connect.CfnRoutingProfile(this, 'STFCollectionsTeamETT', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "STF Collections Team E TT",
      defaultOutboundQueueArn: QSTFColDelinquencies.attrQueueArn,
      mediaConcurrencies: [{ channel: "VOICE", concurrency: 1 }],
      queueConfigs: [{ delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: QSTFColDelinquencies.attrQueueArn } }, { delay: 0, priority: 2, queueReference: { channel: "VOICE", queueArn: QSTFCBColBillings.attrQueueArn } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: QSTFCBColDelinquencies.attrQueueArn } }, { delay: 0, priority: 2, queueReference: { channel: "VOICE", queueArn: QSTFColBillings.attrQueueArn } }],
      description: "STF Collections Team E TT",
    });

    const STFCollectionsTeamBBTCS = new connect.CfnRoutingProfile(this, 'STFCollectionsTeamBBTCS', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "STF Collections Team B BTCS",
      defaultOutboundQueueArn: QSTFColBillings.attrQueueArn,
      mediaConcurrencies: [{ channel: "VOICE", concurrency: 1 }],
      queueConfigs: [{ delay: 0, priority: 3, queueReference: { channel: "VOICE", queueArn: QSTFColDelinquencies.attrQueueArn } }, { delay: 0, priority: 3, queueReference: { channel: "VOICE", queueArn: QSTFCBColBillings.attrQueueArn } }, { delay: 0, priority: 3, queueReference: { channel: "VOICE", queueArn: QSTFCBColDelinquencies.attrQueueArn } }, { delay: 0, priority: 3, queueReference: { channel: "VOICE", queueArn: QSTFColBillings.attrQueueArn } }],
      description: "STF Collections Team B BTCS",
    });

    const STFCollectionsTeamDBTCS = new connect.CfnRoutingProfile(this, 'STFCollectionsTeamDBTCS', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "STF Collections Team D BTCS",
      defaultOutboundQueueArn: QSTFColBillings.attrQueueArn,
      mediaConcurrencies: [{ channel: "VOICE", concurrency: 1 }],
      queueConfigs: [{ delay: 0, priority: 3, queueReference: { channel: "VOICE", queueArn: QSTFColDelinquencies.attrQueueArn } }, { delay: 0, priority: 3, queueReference: { channel: "VOICE", queueArn: QSTFCBColBillings.attrQueueArn } }, { delay: 0, priority: 3, queueReference: { channel: "VOICE", queueArn: QSTFCBColDelinquencies.attrQueueArn } }, { delay: 0, priority: 3, queueReference: { channel: "VOICE", queueArn: QSTFColBillings.attrQueueArn } }],
      description: "STF Collections Team D BTCS",
    });

    const STFColAgentDefault = new connect.CfnRoutingProfile(this, 'STFColAgentDefault', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "STF_Col_Agent_Default",
      defaultOutboundQueueArn: BasicQueue.attrQueueArn,
      mediaConcurrencies: [{ channel: "VOICE", concurrency: 1 }],
      queueConfigs: [{ delay: 0, priority: 2, queueReference: { channel: "VOICE", queueArn: QSTFColDelinquencies.attrQueueArn } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: QSTFCBColBillings.attrQueueArn } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: QSTFCBColDelinquencies.attrQueueArn } }, { delay: 0, priority: 2, queueReference: { channel: "VOICE", queueArn: QSTFColBillings.attrQueueArn } }],
      description: "Default Agent profile for STF Collections",
    });

    const STFCollectionsTeamCBTCS = new connect.CfnRoutingProfile(this, 'STFCollectionsTeamCBTCS', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "STF Collections Team C BTCS",
      defaultOutboundQueueArn: QSTFColBillings.attrQueueArn,
      mediaConcurrencies: [{ channel: "VOICE", concurrency: 1 }],
      queueConfigs: [{ delay: 0, priority: 3, queueReference: { channel: "VOICE", queueArn: QSTFColDelinquencies.attrQueueArn } }, { delay: 0, priority: 3, queueReference: { channel: "VOICE", queueArn: QSTFCBColBillings.attrQueueArn } }, { delay: 0, priority: 3, queueReference: { channel: "VOICE", queueArn: QSTFCBColDelinquencies.attrQueueArn } }, { delay: 0, priority: 3, queueReference: { channel: "VOICE", queueArn: QSTFColBillings.attrQueueArn } }],
      description: "STF Collections Team C BTCS",
    });

    const STFRetAgentTeam5TT = new connect.CfnRoutingProfile(this, 'STFRetAgentTeam5TT', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "STF Ret Agent Team 5 TT",
      defaultOutboundQueueArn: QSTFCBRetEwasteTireIWMF.attrQueueArn,
      mediaConcurrencies: [{ channel: "VOICE", concurrency: 1 }],
      queueConfigs: [{ delay: 15, priority: 4, queueReference: { channel: "VOICE", queueArn: QSTFRetEwasteTireIWMF.attrQueueArn } }, { delay: 10, priority: 3, queueReference: { channel: "VOICE", queueArn: QSTFCBUsernamePassAsst.attrQueueArn } }, { delay: 15, priority: 4, queueReference: { channel: "VOICE", queueArn: QSTFCBRetEwasteTireIWMF.attrQueueArn } }, { delay: 10, priority: 3, queueReference: { channel: "VOICE", queueArn: QSTFUsernamePassAsst.attrQueueArn } }],
      description: "STF Return Agent Team 5 Tax Tech",
    });

    const STFRetAgentTeam3TT = new connect.CfnRoutingProfile(this, 'STFRetAgentTeam3TT', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "STF Ret Agent Team 3 TT",
      defaultOutboundQueueArn: QSTFRetAlcoholicBev.attrQueueArn,
      mediaConcurrencies: [{ channel: "VOICE", concurrency: 1 }],
      queueConfigs: [{ delay: 10, priority: 3, queueReference: { channel: "VOICE", queueArn: QSTFCBUsernamePassAsst.attrQueueArn } }, { delay: 15, priority: 4, queueReference: { channel: "VOICE", queueArn: QSTFCBRetAlcoholicBev.attrQueueArn } }, { delay: 15, priority: 4, queueReference: { channel: "VOICE", queueArn: QSTFRetAlcoholicBev.attrQueueArn } }, { delay: 10, priority: 3, queueReference: { channel: "VOICE", queueArn: QSTFUsernamePassAsst.attrQueueArn } }],
      description: "STF Ret Agent Team 3 TT",
    });

    const STFRetAgentsBTCS = new connect.CfnRoutingProfile(this, 'STFRetAgentsBTCS', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "STF Ret Agents BTCS",
      defaultOutboundQueueArn: QSTFRetAlcoholicBev.attrQueueArn,
      mediaConcurrencies: [{ channel: "VOICE", concurrency: 1 }],
      description: "STF Ret Agents BTCS",
    });

    const STFRetAgentDefaultTeam4 = new connect.CfnRoutingProfile(this, 'STFRetAgentDefaultTeam4', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "STF_Ret_Agent_Default Team 4",
      defaultOutboundQueueArn: QSTFCBRetAlcoholicBev.attrQueueArn,
      mediaConcurrencies: [{ channel: "VOICE", concurrency: 1 }],
      queueConfigs: [{ delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: QSTFRetCannabis.attrQueueArn } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: QSTFCBRetCigarette.attrQueueArn } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: QSTFRetEwasteTireIWMF.attrQueueArn } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: QSTFCBUsernamePassAsst.attrQueueArn } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: QSTFRetCigarette.attrQueueArn } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: QSTFRetFuelUSTFCLPPF.attrQueueArn } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: QSTFRetAlcoholicBev.attrQueueArn } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: QSTFCBRetEwasteTireIWMF.attrQueueArn } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: QSTFCBRetFuelUSTFCLPPF.attrQueueArn } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: QSTFCBRetHazEnv.attrQueueArn } }],
      description: "STF_Ret_Agent_Default Team 4",
    });

    const STFRetAgentDefaultTeam1 = new connect.CfnRoutingProfile(this, 'STFRetAgentDefaultTeam1', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "STF_Ret_Agent_Default Team 1",
      defaultOutboundQueueArn: BasicQueue.attrQueueArn,
      mediaConcurrencies: [{ channel: "VOICE", concurrency: 1 }],
      queueConfigs: [{ delay: 0, priority: 2, queueReference: { channel: "VOICE", queueArn: QSTFRetCannabis.attrQueueArn } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: QSTFCBRetCigarette.attrQueueArn } }, { delay: 0, priority: 2, queueReference: { channel: "VOICE", queueArn: QSTFRetEwasteTireIWMF.attrQueueArn } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: QSTFCBUsernamePassAsst.attrQueueArn } }, { delay: 0, priority: 2, queueReference: { channel: "VOICE", queueArn: QSTFRetCigarette.attrQueueArn } }, { delay: 0, priority: 2, queueReference: { channel: "VOICE", queueArn: QSTFRetFuelUSTFCLPPF.attrQueueArn } }, { delay: 0, priority: 2, queueReference: { channel: "VOICE", queueArn: QSTFRetAlcoholicBev.attrQueueArn } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: QSTFCBRetEwasteTireIWMF.attrQueueArn } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: QSTFCBRetFuelUSTFCLPPF.attrQueueArn } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: QSTFCBRetHazEnv.attrQueueArn } }],
      description: "STF_Ret_Agent_Default Team 1",
    });

    const STFRetAgentTeam5BTR = new connect.CfnRoutingProfile(this, 'STFRetAgentTeam5BTR', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "STF Ret Agent Team 5 BTR",
      defaultOutboundQueueArn: QSTFRetEwasteTireIWMF.attrQueueArn,
      mediaConcurrencies: [{ channel: "VOICE", concurrency: 1 }],
      queueConfigs: [{ delay: 5, priority: 2, queueReference: { channel: "VOICE", queueArn: QSTFRetCannabis.attrQueueArn } }, { delay: 10, priority: 3, queueReference: { channel: "VOICE", queueArn: QSTFCBRetCigarette.attrQueueArn } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: QSTFRetEwasteTireIWMF.attrQueueArn } }, { delay: 15, priority: 4, queueReference: { channel: "VOICE", queueArn: QSTFCBUsernamePassAsst.attrQueueArn } }, { delay: 5, priority: 2, queueReference: { channel: "VOICE", queueArn: QSTFRetCigarette.attrQueueArn } }, { delay: 5, priority: 2, queueReference: { channel: "VOICE", queueArn: QSTFRetFuelUSTFCLPPF.attrQueueArn } }, { delay: 5, priority: 2, queueReference: { channel: "VOICE", queueArn: QSTFRetAlcoholicBev.attrQueueArn } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: QSTFCBRetEwasteTireIWMF.attrQueueArn } }, { delay: 10, priority: 3, queueReference: { channel: "VOICE", queueArn: QSTFCBRetFuelUSTFCLPPF.attrQueueArn } }, { delay: 10, priority: 3, queueReference: { channel: "VOICE", queueArn: QSTFCBRetHazEnv.attrQueueArn } }],
      description: "STF Return Agent Team 5 BTR",
    });

    const STFRetAgentDefaultTeam6 = new connect.CfnRoutingProfile(this, 'STFRetAgentDefaultTeam6', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "STF_Ret_Agent_Default Team 6",
      defaultOutboundQueueArn: QSTFRetAlcoholicBev.attrQueueArn,
      mediaConcurrencies: [{ channel: "VOICE", concurrency: 1 }],
      queueConfigs: [{ delay: 0, priority: 2, queueReference: { channel: "VOICE", queueArn: QSTFRetCannabis.attrQueueArn } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: QSTFCBRetCigarette.attrQueueArn } }, { delay: 0, priority: 2, queueReference: { channel: "VOICE", queueArn: QSTFRetEwasteTireIWMF.attrQueueArn } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: QSTFCBUsernamePassAsst.attrQueueArn } }, { delay: 0, priority: 2, queueReference: { channel: "VOICE", queueArn: QSTFRetCigarette.attrQueueArn } }, { delay: 0, priority: 2, queueReference: { channel: "VOICE", queueArn: QSTFRetFuelUSTFCLPPF.attrQueueArn } }, { delay: 0, priority: 2, queueReference: { channel: "VOICE", queueArn: QSTFRetAlcoholicBev.attrQueueArn } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: QSTFCBRetEwasteTireIWMF.attrQueueArn } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: QSTFCBRetFuelUSTFCLPPF.attrQueueArn } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: QSTFCBRetHazEnv.attrQueueArn } }],
      description: "STF_Ret_Agent_Default Team 6",
    });

    const STFRetAgentTeam1BTR = new connect.CfnRoutingProfile(this, 'STFRetAgentTeam1BTR', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "STF Ret Agent Team 1 BTR",
      defaultOutboundQueueArn: QSTFRetFuelUSTFCLPPF.attrQueueArn,
      mediaConcurrencies: [{ channel: "VOICE", concurrency: 1 }],
      queueConfigs: [{ delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: QSTFRetCannabis.attrQueueArn } }, { delay: 10, priority: 3, queueReference: { channel: "VOICE", queueArn: QSTFCBRetCigarette.attrQueueArn } }, { delay: 5, priority: 2, queueReference: { channel: "VOICE", queueArn: QSTFRetEwasteTireIWMF.attrQueueArn } }, { delay: 15, priority: 4, queueReference: { channel: "VOICE", queueArn: QSTFCBUsernamePassAsst.attrQueueArn } }, { delay: 5, priority: 2, queueReference: { channel: "VOICE", queueArn: QSTFRetCigarette.attrQueueArn } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: QSTFRetFuelUSTFCLPPF.attrQueueArn } }, { delay: 5, priority: 2, queueReference: { channel: "VOICE", queueArn: QSTFRetAlcoholicBev.attrQueueArn } }, { delay: 10, priority: 3, queueReference: { channel: "VOICE", queueArn: QSTFCBRetEwasteTireIWMF.attrQueueArn } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: QSTFCBRetFuelUSTFCLPPF.attrQueueArn } }, { delay: 10, priority: 3, queueReference: { channel: "VOICE", queueArn: QSTFCBRetHazEnv.attrQueueArn } }],
      description: "STF Ret Agent Team 1 BTR",
    });

    const STFRetAgentDefaultTeam2 = new connect.CfnRoutingProfile(this, 'STFRetAgentDefaultTeam2', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "STF_Ret_Agent_Default Team 2",
      defaultOutboundQueueArn: BasicQueue.attrQueueArn,
      mediaConcurrencies: [{ channel: "VOICE", concurrency: 1 }],
      queueConfigs: [{ delay: 0, priority: 2, queueReference: { channel: "VOICE", queueArn: QSTFRetCannabis.attrQueueArn } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: QSTFCBRetCigarette.attrQueueArn } }, { delay: 0, priority: 2, queueReference: { channel: "VOICE", queueArn: QSTFRetEwasteTireIWMF.attrQueueArn } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: QSTFCBUsernamePassAsst.attrQueueArn } }, { delay: 0, priority: 2, queueReference: { channel: "VOICE", queueArn: QSTFRetCigarette.attrQueueArn } }, { delay: 0, priority: 2, queueReference: { channel: "VOICE", queueArn: QSTFRetFuelUSTFCLPPF.attrQueueArn } }, { delay: 0, priority: 2, queueReference: { channel: "VOICE", queueArn: QSTFRetAlcoholicBev.attrQueueArn } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: QSTFCBRetEwasteTireIWMF.attrQueueArn } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: QSTFCBRetFuelUSTFCLPPF.attrQueueArn } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: QSTFCBRetHazEnv.attrQueueArn } }],
      description: "STF_Ret_Agent_Default Team 2",
    });

    const STFRetAgentDefaultTeam3 = new connect.CfnRoutingProfile(this, 'STFRetAgentDefaultTeam3', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "STF_Ret_Agent_Default Team 3",
      defaultOutboundQueueArn: QSTFCBRetAlcoholicBev.attrQueueArn,
      mediaConcurrencies: [{ channel: "VOICE", concurrency: 1 }],
      queueConfigs: [{ delay: 0, priority: 2, queueReference: { channel: "VOICE", queueArn: QSTFRetCannabis.attrQueueArn } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: QSTFCBRetCigarette.attrQueueArn } }, { delay: 0, priority: 2, queueReference: { channel: "VOICE", queueArn: QSTFRetEwasteTireIWMF.attrQueueArn } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: QSTFCBUsernamePassAsst.attrQueueArn } }, { delay: 0, priority: 2, queueReference: { channel: "VOICE", queueArn: QSTFRetCigarette.attrQueueArn } }, { delay: 0, priority: 2, queueReference: { channel: "VOICE", queueArn: QSTFRetFuelUSTFCLPPF.attrQueueArn } }, { delay: 0, priority: 2, queueReference: { channel: "VOICE", queueArn: QSTFRetAlcoholicBev.attrQueueArn } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: QSTFCBRetEwasteTireIWMF.attrQueueArn } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: QSTFCBRetFuelUSTFCLPPF.attrQueueArn } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: QSTFCBRetHazEnv.attrQueueArn } }],
      description: "STF_Ret_Agent_Default Team 3",
    });

    const STFRetAgentDefaultTeam5 = new connect.CfnRoutingProfile(this, 'STFRetAgentDefaultTeam5', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "STF_Ret_Agent_Default Team 5",
      defaultOutboundQueueArn: QSTFRetAlcoholicBev.attrQueueArn,
      mediaConcurrencies: [{ channel: "VOICE", concurrency: 1 }],
      queueConfigs: [{ delay: 0, priority: 2, queueReference: { channel: "VOICE", queueArn: QSTFRetCannabis.attrQueueArn } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: QSTFCBRetCigarette.attrQueueArn } }, { delay: 0, priority: 2, queueReference: { channel: "VOICE", queueArn: QSTFRetEwasteTireIWMF.attrQueueArn } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: QSTFCBUsernamePassAsst.attrQueueArn } }, { delay: 0, priority: 2, queueReference: { channel: "VOICE", queueArn: QSTFRetCigarette.attrQueueArn } }, { delay: 0, priority: 2, queueReference: { channel: "VOICE", queueArn: QSTFRetFuelUSTFCLPPF.attrQueueArn } }, { delay: 0, priority: 2, queueReference: { channel: "VOICE", queueArn: QSTFRetAlcoholicBev.attrQueueArn } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: QSTFCBRetEwasteTireIWMF.attrQueueArn } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: QSTFCBRetFuelUSTFCLPPF.attrQueueArn } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: QSTFCBRetHazEnv.attrQueueArn } }],
      description: "STF_Ret_Agent_Default Team 5",
    });

    const STFRetAgentTeam3BTR = new connect.CfnRoutingProfile(this, 'STFRetAgentTeam3BTR', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "STF Ret Agent Team 3 BTR",
      defaultOutboundQueueArn: QSTFRetAlcoholicBev.attrQueueArn,
      mediaConcurrencies: [{ channel: "VOICE", concurrency: 1 }],
      queueConfigs: [{ delay: 5, priority: 2, queueReference: { channel: "VOICE", queueArn: QSTFRetCannabis.attrQueueArn } }, { delay: 10, priority: 3, queueReference: { channel: "VOICE", queueArn: QSTFCBRetCigarette.attrQueueArn } }, { delay: 5, priority: 2, queueReference: { channel: "VOICE", queueArn: QSTFRetEwasteTireIWMF.attrQueueArn } }, { delay: 15, priority: 4, queueReference: { channel: "VOICE", queueArn: QSTFCBUsernamePassAsst.attrQueueArn } }, { delay: 5, priority: 2, queueReference: { channel: "VOICE", queueArn: QSTFRetCigarette.attrQueueArn } }, { delay: 5, priority: 2, queueReference: { channel: "VOICE", queueArn: QSTFRetFuelUSTFCLPPF.attrQueueArn } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: QSTFRetAlcoholicBev.attrQueueArn } }, { delay: 10, priority: 3, queueReference: { channel: "VOICE", queueArn: QSTFCBRetEwasteTireIWMF.attrQueueArn } }, { delay: 10, priority: 3, queueReference: { channel: "VOICE", queueArn: QSTFCBRetFuelUSTFCLPPF.attrQueueArn } }, { delay: 10, priority: 3, queueReference: { channel: "VOICE", queueArn: QSTFCBRetHazEnv.attrQueueArn } }],
      description: "STF Ret Agent Team 3 BTR",
    });

    const STFRetAgentTeam2BTR = new connect.CfnRoutingProfile(this, 'STFRetAgentTeam2BTR', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "STF Ret Agent Team 2 BTR",
      defaultOutboundQueueArn: QSTFRetCigarette.attrQueueArn,
      mediaConcurrencies: [{ channel: "VOICE", concurrency: 1 }],
      queueConfigs: [{ delay: 5, priority: 2, queueReference: { channel: "VOICE", queueArn: QSTFRetCannabis.attrQueueArn } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: QSTFCBRetCigarette.attrQueueArn } }, { delay: 5, priority: 2, queueReference: { channel: "VOICE", queueArn: QSTFRetEwasteTireIWMF.attrQueueArn } }, { delay: 15, priority: 4, queueReference: { channel: "VOICE", queueArn: QSTFCBUsernamePassAsst.attrQueueArn } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: QSTFRetCigarette.attrQueueArn } }, { delay: 5, priority: 2, queueReference: { channel: "VOICE", queueArn: QSTFRetFuelUSTFCLPPF.attrQueueArn } }, { delay: 5, priority: 2, queueReference: { channel: "VOICE", queueArn: QSTFRetAlcoholicBev.attrQueueArn } }, { delay: 10, priority: 3, queueReference: { channel: "VOICE", queueArn: QSTFCBRetEwasteTireIWMF.attrQueueArn } }, { delay: 10, priority: 3, queueReference: { channel: "VOICE", queueArn: QSTFCBRetFuelUSTFCLPPF.attrQueueArn } }, { delay: 10, priority: 3, queueReference: { channel: "VOICE", queueArn: QSTFCBRetHazEnv.attrQueueArn } }],
      description: "STF Ret Agent Team 2 BTR",
    });

    const STFRegAgentDefaultTeam2 = new connect.CfnRoutingProfile(this, 'STFRegAgentDefaultTeam2', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "STF_Reg_Agent_Default Team 2",
      defaultOutboundQueueArn: BasicQueue.attrQueueArn,
      mediaConcurrencies: [{ channel: "VOICE", concurrency: 1 }],
      queueConfigs: [{ delay: 0, priority: 2, queueReference: { channel: "VOICE", queueArn: QSTFRegCigaretteTobacco.attrQueueArn } }, { delay: 0, priority: 2, queueReference: { channel: "VOICE", queueArn: QSTFRegAlcoholicBev.attrQueueArn } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: QSTFCBRegAlcoholicBev.attrQueueArn } }, { delay: 0, priority: 2, queueReference: { channel: "VOICE", queueArn: QSTFRegEwasteTireIWMF.attrQueueArn } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: QSTFCBRegEwasteTireIWMF.attrQueueArn } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: QSTFCBRegFuelUSTFCLPPF.attrQueueArn } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: QSTFCBUsernamePassAsst.attrQueueArn } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: QSTFCBRegTeleEnergyWater.attrQueueArn } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: QSTFCBRegCannabis.attrQueueArn } }, { delay: 0, priority: 2, queueReference: { channel: "VOICE", queueArn: QSTFRegTeleEnergyWater.attrQueueArn } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: QSTFCBRegCigaretteTobacco.attrQueueArn } }, { delay: 0, priority: 2, queueReference: { channel: "VOICE", queueArn: QSTFRegFuelUSTFCLPPF.attrQueueArn } }, { delay: 0, priority: 2, queueReference: { channel: "VOICE", queueArn: QSTFRegCannabis.attrQueueArn } }, { delay: 0, priority: 2, queueReference: { channel: "VOICE", queueArn: QSTFUsernamePassAsst.attrQueueArn } }],
      description: "STF_Reg_Agent_Default Team 2",
    });

    const STFRegAgentDefaultTeam1 = new connect.CfnRoutingProfile(this, 'STFRegAgentDefaultTeam1', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "STF_Reg_Agent_Default Team 1",
      defaultOutboundQueueArn: QSTFRegFuelUSTFCLPPF.attrQueueArn,
      mediaConcurrencies: [{ channel: "VOICE", concurrency: 1 }],
      queueConfigs: [{ delay: 0, priority: 2, queueReference: { channel: "VOICE", queueArn: QSTFRegCigaretteTobacco.attrQueueArn } }, { delay: 0, priority: 2, queueReference: { channel: "VOICE", queueArn: QSTFRegAlcoholicBev.attrQueueArn } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: QSTFCBRegAlcoholicBev.attrQueueArn } }, { delay: 0, priority: 2, queueReference: { channel: "VOICE", queueArn: QSTFRegEwasteTireIWMF.attrQueueArn } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: QSTFCBRegEwasteTireIWMF.attrQueueArn } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: QSTFCBRegFuelUSTFCLPPF.attrQueueArn } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: QSTFCBRegTeleEnergyWater.attrQueueArn } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: QSTFCBRegCannabis.attrQueueArn } }, { delay: 0, priority: 2, queueReference: { channel: "VOICE", queueArn: QSTFRegTeleEnergyWater.attrQueueArn } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: QSTFCBRegCigaretteTobacco.attrQueueArn } }, { delay: 0, priority: 2, queueReference: { channel: "VOICE", queueArn: QSTFRegFuelUSTFCLPPF.attrQueueArn } }, { delay: 0, priority: 2, queueReference: { channel: "VOICE", queueArn: QSTFRegCannabis.attrQueueArn } }],
      description: "STF_Reg_Agent_Default Team 1",
    });

    const STFRegAgentDefaultTeam4 = new connect.CfnRoutingProfile(this, 'STFRegAgentDefaultTeam4', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "STF_Reg_Agent_Default Team 4",
      defaultOutboundQueueArn: QSTFCBRegAlcoholicBev.attrQueueArn,
      mediaConcurrencies: [{ channel: "VOICE", concurrency: 1 }],
      queueConfigs: [{ delay: 0, priority: 2, queueReference: { channel: "VOICE", queueArn: QSTFRegCigaretteTobacco.attrQueueArn } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: QSTFRegAlcoholicBev.attrQueueArn } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: QSTFCBRegAlcoholicBev.attrQueueArn } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: QSTFRegEwasteTireIWMF.attrQueueArn } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: QSTFCBRegEwasteTireIWMF.attrQueueArn } }, { delay: 0, priority: 3, queueReference: { channel: "VOICE", queueArn: QSTFCBRegFuelUSTFCLPPF.attrQueueArn } }, { delay: 0, priority: 3, queueReference: { channel: "VOICE", queueArn: QSTFCBUsernamePassAsst.attrQueueArn } }, { delay: 0, priority: 3, queueReference: { channel: "VOICE", queueArn: QSTFCBRegTeleEnergyWater.attrQueueArn } }, { delay: 0, priority: 3, queueReference: { channel: "VOICE", queueArn: QSTFCBRegCannabis.attrQueueArn } }, { delay: 0, priority: 2, queueReference: { channel: "VOICE", queueArn: QSTFRegTeleEnergyWater.attrQueueArn } }, { delay: 0, priority: 3, queueReference: { channel: "VOICE", queueArn: QSTFCBRegCigaretteTobacco.attrQueueArn } }, { delay: 0, priority: 2, queueReference: { channel: "VOICE", queueArn: QSTFRegFuelUSTFCLPPF.attrQueueArn } }, { delay: 0, priority: 2, queueReference: { channel: "VOICE", queueArn: QSTFRegCannabis.attrQueueArn } }, { delay: 0, priority: 3, queueReference: { channel: "VOICE", queueArn: QSTFUsernamePassAsst.attrQueueArn } }],
      description: "STF_Reg_Agent_Default Team 4",
    });

    const STFRegAgentTeam1 = new connect.CfnRoutingProfile(this, 'STFRegAgentTeam1', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "STF Reg Agent Team 1",
      defaultOutboundQueueArn: QSTFRegFuelUSTFCLPPF.attrQueueArn,
      mediaConcurrencies: [{ channel: "VOICE", concurrency: 1 }],
      queueConfigs: [{ delay: 5, priority: 2, queueReference: { channel: "VOICE", queueArn: QSTFRegCigaretteTobacco.attrQueueArn } }, { delay: 5, priority: 2, queueReference: { channel: "VOICE", queueArn: QSTFRegAlcoholicBev.attrQueueArn } }, { delay: 10, priority: 3, queueReference: { channel: "VOICE", queueArn: QSTFCBRegAlcoholicBev.attrQueueArn } }, { delay: 5, priority: 2, queueReference: { channel: "VOICE", queueArn: QSTFRegEwasteTireIWMF.attrQueueArn } }, { delay: 10, priority: 3, queueReference: { channel: "VOICE", queueArn: QSTFCBRegEwasteTireIWMF.attrQueueArn } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: QSTFCBRegFuelUSTFCLPPF.attrQueueArn } }, { delay: 10, priority: 3, queueReference: { channel: "VOICE", queueArn: QSTFCBUsernamePassAsst.attrQueueArn } }, { delay: 10, priority: 3, queueReference: { channel: "VOICE", queueArn: QSTFCBRegTeleEnergyWater.attrQueueArn } }, { delay: 10, priority: 3, queueReference: { channel: "VOICE", queueArn: QSTFCBRegCannabis.attrQueueArn } }, { delay: 5, priority: 2, queueReference: { channel: "VOICE", queueArn: QSTFRegTeleEnergyWater.attrQueueArn } }, { delay: 10, priority: 3, queueReference: { channel: "VOICE", queueArn: QSTFCBRegCigaretteTobacco.attrQueueArn } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: QSTFRegFuelUSTFCLPPF.attrQueueArn } }, { delay: 5, priority: 2, queueReference: { channel: "VOICE", queueArn: QSTFRegCannabis.attrQueueArn } }, { delay: 10, priority: 3, queueReference: { channel: "VOICE", queueArn: QSTFUsernamePassAsst.attrQueueArn } }],
      description: "STF Reg Agent Team 1",
    });

    const STFRegAgentTeam2 = new connect.CfnRoutingProfile(this, 'STFRegAgentTeam2', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "STF Reg Agent Team 2",
      defaultOutboundQueueArn: QSTFRegCigaretteTobacco.attrQueueArn,
      mediaConcurrencies: [{ channel: "VOICE", concurrency: 1 }],
      queueConfigs: [{ delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: QSTFRegCigaretteTobacco.attrQueueArn } }, { delay: 5, priority: 2, queueReference: { channel: "VOICE", queueArn: QSTFRegAlcoholicBev.attrQueueArn } }, { delay: 5, priority: 2, queueReference: { channel: "VOICE", queueArn: QSTFCBRegAlcoholicBev.attrQueueArn } }, { delay: 5, priority: 2, queueReference: { channel: "VOICE", queueArn: QSTFRegEwasteTireIWMF.attrQueueArn } }, { delay: 10, priority: 3, queueReference: { channel: "VOICE", queueArn: QSTFCBRegEwasteTireIWMF.attrQueueArn } }, { delay: 10, priority: 3, queueReference: { channel: "VOICE", queueArn: QSTFCBRegFuelUSTFCLPPF.attrQueueArn } }, { delay: 10, priority: 3, queueReference: { channel: "VOICE", queueArn: QSTFCBUsernamePassAsst.attrQueueArn } }, { delay: 10, priority: 3, queueReference: { channel: "VOICE", queueArn: QSTFCBRegTeleEnergyWater.attrQueueArn } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: QSTFCBRegCannabis.attrQueueArn } }, { delay: 5, priority: 2, queueReference: { channel: "VOICE", queueArn: QSTFRegTeleEnergyWater.attrQueueArn } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: QSTFCBRegCigaretteTobacco.attrQueueArn } }, { delay: 5, priority: 2, queueReference: { channel: "VOICE", queueArn: QSTFRegFuelUSTFCLPPF.attrQueueArn } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: QSTFRegCannabis.attrQueueArn } }, { delay: 10, priority: 3, queueReference: { channel: "VOICE", queueArn: QSTFUsernamePassAsst.attrQueueArn } }],
      description: "STF Reg Agent Team 2",
    });

    const STFRegAgentTeam3 = new connect.CfnRoutingProfile(this, 'STFRegAgentTeam3', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "STF Reg Agent Team 3",
      defaultOutboundQueueArn: QSTFRegTeleEnergyWater.attrQueueArn,
      mediaConcurrencies: [{ channel: "VOICE", concurrency: 1 }],
      queueConfigs: [{ delay: 5, priority: 2, queueReference: { channel: "VOICE", queueArn: QSTFRegCigaretteTobacco.attrQueueArn } }, { delay: 5, priority: 2, queueReference: { channel: "VOICE", queueArn: QSTFRegAlcoholicBev.attrQueueArn } }, { delay: 5, priority: 2, queueReference: { channel: "VOICE", queueArn: QSTFCBRegAlcoholicBev.attrQueueArn } }, { delay: 5, priority: 2, queueReference: { channel: "VOICE", queueArn: QSTFRegEwasteTireIWMF.attrQueueArn } }, { delay: 5, priority: 2, queueReference: { channel: "VOICE", queueArn: QSTFCBRegEwasteTireIWMF.attrQueueArn } }, { delay: 5, priority: 2, queueReference: { channel: "VOICE", queueArn: QSTFCBRegFuelUSTFCLPPF.attrQueueArn } }, { delay: 10, priority: 3, queueReference: { channel: "VOICE", queueArn: QSTFCBUsernamePassAsst.attrQueueArn } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: QSTFCBRegTeleEnergyWater.attrQueueArn } }, { delay: 5, priority: 2, queueReference: { channel: "VOICE", queueArn: QSTFCBRegCannabis.attrQueueArn } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: QSTFRegTeleEnergyWater.attrQueueArn } }, { delay: 5, priority: 2, queueReference: { channel: "VOICE", queueArn: QSTFCBRegCigaretteTobacco.attrQueueArn } }, { delay: 5, priority: 2, queueReference: { channel: "VOICE", queueArn: QSTFRegFuelUSTFCLPPF.attrQueueArn } }, { delay: 5, priority: 2, queueReference: { channel: "VOICE", queueArn: QSTFRegCannabis.attrQueueArn } }, { delay: 10, priority: 3, queueReference: { channel: "VOICE", queueArn: QSTFUsernamePassAsst.attrQueueArn } }],
      description: "STF Reg Agent Team 3",
    });

    const STFRegAgentTeam4 = new connect.CfnRoutingProfile(this, 'STFRegAgentTeam4', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "STF Reg Agent Team 4",
      defaultOutboundQueueArn: QSTFRegAlcoholicBev.attrQueueArn,
      mediaConcurrencies: [{ channel: "VOICE", concurrency: 1 }],
      queueConfigs: [{ delay: 5, priority: 2, queueReference: { channel: "VOICE", queueArn: QSTFRegCigaretteTobacco.attrQueueArn } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: QSTFRegAlcoholicBev.attrQueueArn } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: QSTFCBRegAlcoholicBev.attrQueueArn } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: QSTFRegEwasteTireIWMF.attrQueueArn } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: QSTFCBRegEwasteTireIWMF.attrQueueArn } }, { delay: 10, priority: 3, queueReference: { channel: "VOICE", queueArn: QSTFCBRegFuelUSTFCLPPF.attrQueueArn } }, { delay: 10, priority: 3, queueReference: { channel: "VOICE", queueArn: QSTFCBUsernamePassAsst.attrQueueArn } }, { delay: 10, priority: 3, queueReference: { channel: "VOICE", queueArn: QSTFCBRegTeleEnergyWater.attrQueueArn } }, { delay: 10, priority: 3, queueReference: { channel: "VOICE", queueArn: QSTFCBRegCannabis.attrQueueArn } }, { delay: 5, priority: 2, queueReference: { channel: "VOICE", queueArn: QSTFRegTeleEnergyWater.attrQueueArn } }, { delay: 10, priority: 3, queueReference: { channel: "VOICE", queueArn: QSTFCBRegCigaretteTobacco.attrQueueArn } }, { delay: 5, priority: 2, queueReference: { channel: "VOICE", queueArn: QSTFRegFuelUSTFCLPPF.attrQueueArn } }, { delay: 5, priority: 2, queueReference: { channel: "VOICE", queueArn: QSTFRegCannabis.attrQueueArn } }, { delay: 10, priority: 3, queueReference: { channel: "VOICE", queueArn: QSTFUsernamePassAsst.attrQueueArn } }],
      description: "STF Reg Agent Team 4",
    });

    const STFRegAgentDefaultTeam3 = new connect.CfnRoutingProfile(this, 'STFRegAgentDefaultTeam3', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "STF_Reg_Agent_Default Team 3",
      defaultOutboundQueueArn: BasicQueue.attrQueueArn,
      mediaConcurrencies: [{ channel: "VOICE", concurrency: 1 }],
      queueConfigs: [{ delay: 0, priority: 2, queueReference: { channel: "VOICE", queueArn: QSTFRegCigaretteTobacco.attrQueueArn } }, { delay: 0, priority: 2, queueReference: { channel: "VOICE", queueArn: QSTFRegAlcoholicBev.attrQueueArn } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: QSTFCBRegAlcoholicBev.attrQueueArn } }, { delay: 0, priority: 2, queueReference: { channel: "VOICE", queueArn: QSTFRegEwasteTireIWMF.attrQueueArn } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: QSTFCBRegEwasteTireIWMF.attrQueueArn } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: QSTFCBRegFuelUSTFCLPPF.attrQueueArn } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: QSTFCBUsernamePassAsst.attrQueueArn } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: QSTFCBRegTeleEnergyWater.attrQueueArn } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: QSTFCBRegCannabis.attrQueueArn } }, { delay: 0, priority: 2, queueReference: { channel: "VOICE", queueArn: QSTFRegTeleEnergyWater.attrQueueArn } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: QSTFCBRegCigaretteTobacco.attrQueueArn } }, { delay: 0, priority: 2, queueReference: { channel: "VOICE", queueArn: QSTFRegFuelUSTFCLPPF.attrQueueArn } }, { delay: 0, priority: 2, queueReference: { channel: "VOICE", queueArn: QSTFRegCannabis.attrQueueArn } }, { delay: 0, priority: 2, queueReference: { channel: "VOICE", queueArn: QSTFUsernamePassAsst.attrQueueArn } }],
      description: "STF_Reg_Agent_Default Team 3",
    });

    const MCORegistrationRefundsProfile2 = new connect.CfnRoutingProfile(this, 'MCORegistrationRefundsProfile2', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "MCO_Registration_Refunds Profile 2",
      defaultOutboundQueueArn: BasicQueue.attrQueueArn,
      mediaConcurrencies: [{ channel: "VOICE", concurrency: 1 }],
      queueConfigs: [{ delay: 0, priority: 2, queueReference: { channel: "VOICE", queueArn: QMCOSpanish.attrQueueArn } }, { delay: 0, priority: 2, queueReference: { channel: "VOICE", queueArn: QMCONewLicenseOrAcct.attrQueueArn } }, { delay: 0, priority: 2, queueReference: { channel: "VOICE", queueArn: QMCOLicenseIFTADecals.attrQueueArn } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: QMCOCBSpanish.attrQueueArn } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: QMCOCBLicenseIFTADecals.attrQueueArn } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: QMCOCBNewLicenseOrAcct.attrQueueArn } }],
      description: "MCO_Registration_Refunds Profile 2 License New & Renew Only",
    });

    const MCORevoCollectionsProfile1WithSpanishRoutingProfile = new connect.CfnRoutingProfile(this, 'MCORevoCollectionsProfile1WithSpanishRoutingProfile', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "MCO_Revo_Collections Profile 1 with Spanish",
      defaultOutboundQueueArn: BasicQueue.attrQueueArn,
      mediaConcurrencies: [{ channel: "VOICE", concurrency: 1 }],
      queueConfigs: [{ delay: 0, priority: 2, queueReference: { channel: "VOICE", queueArn: QMCORetnAsstAppear.attrQueueArn } }, { delay: 0, priority: 2, queueReference: { channel: "VOICE", queueArn: QMCOSpanish.attrQueueArn } }, { delay: 0, priority: 2, queueReference: { channel: "VOICE", queueArn: QMCONewLicenseOrAcct.attrQueueArn } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: QMCOCBCollectRevo.attrQueueArn } }, { delay: 0, priority: 2, queueReference: { channel: "VOICE", queueArn: QMCOLicenseIFTADecals.attrQueueArn } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: QMCOCBRetnAsstAppear.attrQueueArn } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: QMCOCBSpanish.attrQueueArn } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: QMCOCBLicenseIFTADecals.attrQueueArn } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: QMCOCBNewLicenseOrAcct.attrQueueArn } }, { delay: 0, priority: 2, queueReference: { channel: "VOICE", queueArn: QMCOCollectRevo.attrQueueArn } }, { delay: 0, priority: 2, queueReference: { channel: "VOICE", queueArn: QMCOBillingRefund.attrQueueArn } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: QMCOCBBillingRefund.attrQueueArn } }],
      description: "MCO_Revo_Collections Profile 1 with Spanish",
    });

    const MCORevoCollectionsProfile1WithSpanishRoutingProfile2 = new connect.CfnRoutingProfile(this, 'MCORevoCollectionsProfile1WithSpanishRoutingProfile2', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "MCO Revo_Collections Profile 1 with Spanish",
      defaultOutboundQueueArn: BasicQueue.attrQueueArn,
      mediaConcurrencies: [{ channel: "VOICE", concurrency: 1 }],
      queueConfigs: [{ delay: 0, priority: 2, queueReference: { channel: "VOICE", queueArn: QMCORetnAsstAppear.attrQueueArn } }, { delay: 30, priority: 3, queueReference: { channel: "VOICE", queueArn: QMCOSpanish.attrQueueArn } }, { delay: 30, priority: 3, queueReference: { channel: "VOICE", queueArn: QMCONewLicenseOrAcct.attrQueueArn } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: QMCOCBCollectRevo.attrQueueArn } }, { delay: 30, priority: 3, queueReference: { channel: "VOICE", queueArn: QMCOLicenseIFTADecals.attrQueueArn } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: QMCOCBRetnAsstAppear.attrQueueArn } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: QMCOCBSpanish.attrQueueArn } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: QMCOCBLicenseIFTADecals.attrQueueArn } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: QMCOCBNewLicenseOrAcct.attrQueueArn } }, { delay: 30, priority: 4, queueReference: { channel: "VOICE", queueArn: QMCOCollectRevo.attrQueueArn } }, { delay: 0, priority: 2, queueReference: { channel: "VOICE", queueArn: QMCOBillingRefund.attrQueueArn } }, { delay: 0, priority: 2, queueReference: { channel: "VOICE", queueArn: QMCOCBBillingRefund.attrQueueArn } }],
      description: "MCO Revocation/Collections Profile 1 with Spanish",
    });

    const MCORegistrationRefundsProfile1 = new connect.CfnRoutingProfile(this, 'MCORegistrationRefundsProfile1', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "MCO_Registration_Refunds Profile 1",
      defaultOutboundQueueArn: QMCORetnAsstAppear.attrQueueArn,
      mediaConcurrencies: [{ channel: "VOICE", concurrency: 1 }],
      queueConfigs: [{ delay: 0, priority: 2, queueReference: { channel: "VOICE", queueArn: QMCORetnAsstAppear.attrQueueArn } }, { delay: 0, priority: 2, queueReference: { channel: "VOICE", queueArn: QMCOSpanish.attrQueueArn } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: QMCOCBAuditQuestions.attrQueueArn } }, { delay: 60, priority: 3, queueReference: { channel: "VOICE", queueArn: QMCONewLicenseOrAcct.attrQueueArn } }, { delay: 0, priority: 2, queueReference: { channel: "VOICE", queueArn: QMCOPetitionRefunds.attrQueueArn } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: QMCOCBCollectRevo.attrQueueArn } }, { delay: 60, priority: 3, queueReference: { channel: "VOICE", queueArn: QMCOLicenseIFTADecals.attrQueueArn } }, { delay: 0, priority: 2, queueReference: { channel: "VOICE", queueArn: QMCOScaleNoPmt.attrQueueArn } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: QMCOCBRetnAsstAppear.attrQueueArn } }, { delay: 0, priority: 2, queueReference: { channel: "VOICE", queueArn: QMCOAuditQuestions.attrQueueArn } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: QMCOCBSpanish.attrQueueArn } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: QMCOCBLicenseIFTADecals.attrQueueArn } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: QMCOCBScaleNoPmt.attrQueueArn } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: QMCOCBNewLicenseOrAcct.attrQueueArn } }, { delay: 0, priority: 2, queueReference: { channel: "VOICE", queueArn: QMCOCollectRevo.attrQueueArn } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: QMCOCBPetitionRefunds.attrQueueArn } }, { delay: 0, priority: 2, queueReference: { channel: "VOICE", queueArn: QMCOBillingRefund.attrQueueArn } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: QMCOCBBillingRefund.attrQueueArn } }],
      description: "MCO_Registration_Refunds Profile 1",
    });

    const MCORegistrationRefundsSpanishEnglish = new connect.CfnRoutingProfile(this, 'MCORegistrationRefundsSpanishEnglish', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "MCO_Registration_Refunds Spanish_English",
      defaultOutboundQueueArn: BasicQueue.attrQueueArn,
      mediaConcurrencies: [{ channel: "VOICE", concurrency: 1 }],
      queueConfigs: [{ delay: 0, priority: 2, queueReference: { channel: "VOICE", queueArn: QMCORetnAsstAppear.attrQueueArn } }, { delay: 0, priority: 2, queueReference: { channel: "VOICE", queueArn: QMCOSpanish.attrQueueArn } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: QMCOCBAuditQuestions.attrQueueArn } }, { delay: 0, priority: 3, queueReference: { channel: "VOICE", queueArn: QMCONewLicenseOrAcct.attrQueueArn } }, { delay: 0, priority: 2, queueReference: { channel: "VOICE", queueArn: QMCOPetitionRefunds.attrQueueArn } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: QMCOCBCollectRevo.attrQueueArn } }, { delay: 0, priority: 3, queueReference: { channel: "VOICE", queueArn: QMCOLicenseIFTADecals.attrQueueArn } }, { delay: 0, priority: 2, queueReference: { channel: "VOICE", queueArn: QMCOScaleNoPmt.attrQueueArn } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: QMCOCBRetnAsstAppear.attrQueueArn } }, { delay: 0, priority: 2, queueReference: { channel: "VOICE", queueArn: QMCOAuditQuestions.attrQueueArn } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: QMCOCBSpanish.attrQueueArn } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: QMCOCBLicenseIFTADecals.attrQueueArn } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: QMCOCBScaleNoPmt.attrQueueArn } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: QMCOCBNewLicenseOrAcct.attrQueueArn } }, { delay: 0, priority: 2, queueReference: { channel: "VOICE", queueArn: QMCOCollectRevo.attrQueueArn } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: QMCOCBPetitionRefunds.attrQueueArn } }, { delay: 0, priority: 2, queueReference: { channel: "VOICE", queueArn: QMCOBillingRefund.attrQueueArn } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: QMCOCBBillingRefund.attrQueueArn } }],
      description: "MCO_Registration_Refunds Profile with English and Spanish Queues",
    });

    const MCOAllQueues = new connect.CfnRoutingProfile(this, 'MCOAllQueues', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "MCO All Queues",
      defaultOutboundQueueArn: QMCOAuditQuestions.attrQueueArn,
      mediaConcurrencies: [{ channel: "VOICE", concurrency: 1 }],
      queueConfigs: [{ delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: QMCORetnAsstAppear.attrQueueArn } }, { delay: 0, priority: 2, queueReference: { channel: "VOICE", queueArn: QMCOSpanish.attrQueueArn } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: QMCOCBAuditQuestions.attrQueueArn } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: QMCONewLicenseOrAcct.attrQueueArn } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: QMCOPetitionRefunds.attrQueueArn } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: QMCOCBCollectRevo.attrQueueArn } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: QMCOLicenseIFTADecals.attrQueueArn } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: QMCOScaleNoPmt.attrQueueArn } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: QMCOCBRetnAsstAppear.attrQueueArn } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: QMCOAuditQuestions.attrQueueArn } }, { delay: 0, priority: 2, queueReference: { channel: "VOICE", queueArn: QMCOCBSpanish.attrQueueArn } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: QMCOCBLicenseIFTADecals.attrQueueArn } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: QMCOCBScaleNoPmt.attrQueueArn } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: QMCOCBNewLicenseOrAcct.attrQueueArn } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: QMCOCollectRevo.attrQueueArn } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: QMCOCBPetitionRefunds.attrQueueArn } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: QMCOBillingRefund.attrQueueArn } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: QMCOCBBillingRefund.attrQueueArn } }],
      description: "MCO All Queues level 1, Spanish level 2",
    });

    const MCOAllQueuesSpanish = new connect.CfnRoutingProfile(this, 'MCOAllQueuesSpanish', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "MCO All Queues Spanish",
      defaultOutboundQueueArn: QMCOSpanish.attrQueueArn,
      mediaConcurrencies: [{ channel: "VOICE", concurrency: 1 }],
      queueConfigs: [{ delay: 0, priority: 2, queueReference: { channel: "VOICE", queueArn: QMCORetnAsstAppear.attrQueueArn } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: QMCOSpanish.attrQueueArn } }, { delay: 0, priority: 2, queueReference: { channel: "VOICE", queueArn: QMCOCBAuditQuestions.attrQueueArn } }, { delay: 0, priority: 2, queueReference: { channel: "VOICE", queueArn: QMCONewLicenseOrAcct.attrQueueArn } }, { delay: 0, priority: 2, queueReference: { channel: "VOICE", queueArn: QMCOPetitionRefunds.attrQueueArn } }, { delay: 0, priority: 2, queueReference: { channel: "VOICE", queueArn: QMCOCBCollectRevo.attrQueueArn } }, { delay: 0, priority: 2, queueReference: { channel: "VOICE", queueArn: QMCOLicenseIFTADecals.attrQueueArn } }, { delay: 0, priority: 2, queueReference: { channel: "VOICE", queueArn: QMCOScaleNoPmt.attrQueueArn } }, { delay: 0, priority: 2, queueReference: { channel: "VOICE", queueArn: QMCOCBRetnAsstAppear.attrQueueArn } }, { delay: 0, priority: 2, queueReference: { channel: "VOICE", queueArn: QMCOAuditQuestions.attrQueueArn } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: QMCOCBSpanish.attrQueueArn } }, { delay: 0, priority: 2, queueReference: { channel: "VOICE", queueArn: QMCOCBLicenseIFTADecals.attrQueueArn } }, { delay: 0, priority: 2, queueReference: { channel: "VOICE", queueArn: QMCOCBScaleNoPmt.attrQueueArn } }, { delay: 0, priority: 2, queueReference: { channel: "VOICE", queueArn: QMCOCBNewLicenseOrAcct.attrQueueArn } }, { delay: 0, priority: 2, queueReference: { channel: "VOICE", queueArn: QMCOCollectRevo.attrQueueArn } }, { delay: 0, priority: 2, queueReference: { channel: "VOICE", queueArn: QMCOCBPetitionRefunds.attrQueueArn } }, { delay: 0, priority: 2, queueReference: { channel: "VOICE", queueArn: QMCOBillingRefund.attrQueueArn } }, { delay: 0, priority: 2, queueReference: { channel: "VOICE", queueArn: QMCOCBBillingRefund.attrQueueArn } }],
      description: "MCO Spanish",
    });

    const CUTSAgentDefaultReserve = new connect.CfnRoutingProfile(this, 'CUTSAgentDefaultReserve', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "CUTS_Agent_Default - Reserve",
      defaultOutboundQueueArn: QCUTSAdvisory.attrQueueArn,
      mediaConcurrencies: [{ channel: "VOICE", concurrency: 1 }],
      queueConfigs: [{ delay: 180, priority: 1, queueReference: { channel: "VOICE", queueArn: QCUTSCBAdvisory.attrQueueArn } }, { delay: 300, priority: 2, queueReference: { channel: "VOICE", queueArn: QCUTSAdvisory.attrQueueArn } }, { delay: 300, priority: 2, queueReference: { channel: "VOICE", queueArn: QCUTSClearance.attrQueueArn } }, { delay: 180, priority: 1, queueReference: { channel: "VOICE", queueArn: QCUTSCBClearance.attrQueueArn } }],
      description: "CUTS_Agent_Default - Reserve",
    });

    const CUTSAgentSpanishReserve = new connect.CfnRoutingProfile(this, 'CUTSAgentSpanishReserve', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "CUTS_Agent_Spanish_Reserve",
      defaultOutboundQueueArn: QCUTSAdvisory.attrQueueArn,
      mediaConcurrencies: [{ channel: "VOICE", concurrency: 1 }],
      queueConfigs: [{ delay: 600, priority: 1, queueReference: { channel: "VOICE", queueArn: QCUTSCBAdvisory.attrQueueArn } }, { delay: 600, priority: 2, queueReference: { channel: "VOICE", queueArn: QCUTSAdvisory.attrQueueArn } }, { delay: 600, priority: 2, queueReference: { channel: "VOICE", queueArn: QCUTSClearance.attrQueueArn } }, { delay: 600, priority: 1, queueReference: { channel: "VOICE", queueArn: QCUTSCBClearance.attrQueueArn } }],
      description: "CUTS Spanish Reserve Agent",
    });

    const CUTSAgentSpanishPriority = new connect.CfnRoutingProfile(this, 'CUTSAgentSpanishPriority', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "CUTS_Agent_Spanish_Priority",
      defaultOutboundQueueArn: QCUTSAdvisory.attrQueueArn,
      mediaConcurrencies: [{ channel: "VOICE", concurrency: 1 }],
      queueConfigs: [{ delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: QCUTSCBSpanish.attrQueueArn } }, { delay: 180, priority: 2, queueReference: { channel: "VOICE", queueArn: QCUTSCBAdvisory.attrQueueArn } }, { delay: 600, priority: 2, queueReference: { channel: "VOICE", queueArn: QCUTSAdvisory.attrQueueArn } }, { delay: 600, priority: 2, queueReference: { channel: "VOICE", queueArn: QCUTSClearance.attrQueueArn } }, { delay: 180, priority: 2, queueReference: { channel: "VOICE", queueArn: QCUTSCBClearance.attrQueueArn } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: QCUTSSpanish.attrQueueArn } }],
      description: "CUTS Spanish Priority",
    });

    const CUTSAgentPriority = new connect.CfnRoutingProfile(this, 'CUTSAgentPriority', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "CUTS_Agent_Priority",
      defaultOutboundQueueArn: QCUTSAdvisory.attrQueueArn,
      mediaConcurrencies: [{ channel: "VOICE", concurrency: 1 }],
      queueConfigs: [{ delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: QCUTSCBAdvisory.attrQueueArn } }, { delay: 0, priority: 2, queueReference: { channel: "VOICE", queueArn: QCUTSAdvisory.attrQueueArn } }, { delay: 0, priority: 2, queueReference: { channel: "VOICE", queueArn: QCUTSClearance.attrQueueArn } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: QCUTSCBClearance.attrQueueArn } }],
      description: "CUTS Agent Priority",
    });

    const EFTAdvisoryPriority = new connect.CfnRoutingProfile(this, 'EFTAdvisoryPriority', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "EFT_Advisory Priority",
      defaultOutboundQueueArn: QEFTAdvisory.attrQueueArn,
      mediaConcurrencies: [{ channel: "VOICE", concurrency: 1 }],
      queueConfigs: [{ delay: 0, priority: 2, queueReference: { channel: "VOICE", queueArn: QEFTAdvisory.attrQueueArn } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: QEFTCBAdvisory.attrQueueArn } }],
      description: "EFT Advisory Group Priority Routing profile",
    });

    const EFTAdvisoryReserve = new connect.CfnRoutingProfile(this, 'EFTAdvisoryReserve', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "EFT_Advisory_Reserve",
      defaultOutboundQueueArn: QEFTAdvisory.attrQueueArn,
      mediaConcurrencies: [{ channel: "VOICE", concurrency: 1 }],
      queueConfigs: [{ delay: 300, priority: 2, queueReference: { channel: "VOICE", queueArn: QEFTAdvisory.attrQueueArn } }, { delay: 180, priority: 1, queueReference: { channel: "VOICE", queueArn: QEFTCBAdvisory.attrQueueArn } }],
      description: "EFT Reserve profile",
    });

    const BasicRoutingProfile = new connect.CfnRoutingProfile(this, 'BasicRoutingProfile', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "Basic Routing Profile",
      defaultOutboundQueueArn: QCSCCustomerServiceCenter.attrQueueArn,
      mediaConcurrencies: [{ channel: "CHAT", concurrency: 2 }, { channel: "TASK", concurrency: 1 }, { channel: "VOICE", concurrency: 1 }],
      queueConfigs: [{ delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: QCSCCBEfileAssistance.attrQueueArn } }, { delay: 0, priority: 1, queueReference: { channel: "CHAT", queueArn: QCSCWebchatSpanish.attrQueueArn } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: QCSCWebchatSpanish.attrQueueArn } }, { delay: 0, priority: 1, queueReference: { channel: "CHAT", queueArn: QCSCWebchat.attrQueueArn } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: QCSCWebchat.attrQueueArn } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: QEFTAdvisory.attrQueueArn } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: QCSCSpanish.attrQueueArn } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: QCSCEfileAssistance.attrQueueArn } }, { delay: 0, priority: 1, queueReference: { channel: "CHAT", queueArn: BasicQueue.attrQueueArn } }, { delay: 0, priority: 1, queueReference: { channel: "TASK", queueArn: BasicQueue.attrQueueArn } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: BasicQueue.attrQueueArn } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: QCUTSCBAdvisory.attrQueueArn } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: QCSCTraining.attrQueueArn } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: QCUTSAdvisory.attrQueueArn } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: QFODCollections.attrQueueArn } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: QCSCCBSpanish.attrQueueArn } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: QTRA.attrQueueArn } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: QCUTSClearance.attrQueueArn } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: QCSCCBTraining.attrQueueArn } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: QCSCCustomerServiceCenter.attrQueueArn } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: QSTFCBColDelinquencies.attrQueueArn } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: QEFTCBAdvisory.attrQueueArn } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: QCUTSSpanish.attrQueueArn } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: QCSCAgentAssist.attrQueueArn } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: QSTFColBillings.attrQueueArn } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: QCSCCBCustomerServiceCenter.attrQueueArn } }],
      description: "A simple routing profile.",
    });

    const USCustomsRoutingProfile = new connect.CfnRoutingProfile(this, 'USCustomsRoutingProfile', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "US Customs",
      defaultOutboundQueueArn: QUSCustoms.attrQueueArn,
      mediaConcurrencies: [{ channel: "VOICE", concurrency: 1 }],
      queueConfigs: [{ delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: QUSCustoms.attrQueueArn } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: QCBUSCustoms.attrQueueArn } }],
      description: "US Customs",
    });

    const TSDCallCenterAdmin = new connect.CfnRoutingProfile(this, 'TSDCallCenterAdmin', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "TSD Call Center Admin",
      defaultOutboundQueueArn: QCSCCustomerServiceCenter.attrQueueArn,
      mediaConcurrencies: [{ channel: "CHAT", concurrency: 1 }, { channel: "EMAIL", concurrency: 1 }, { channel: "TASK", concurrency: 1 }, { channel: "VOICE", concurrency: 1 }],
      queueConfigs: [{ delay: 0, priority: 1, queueReference: { channel: "CHAT", queueArn: QTSDCROS.attrQueueArn } }, { delay: 0, priority: 1, queueReference: { channel: "EMAIL", queueArn: QTSDCROS.attrQueueArn } }, { delay: 0, priority: 1, queueReference: { channel: "TASK", queueArn: QTSDCROS.attrQueueArn } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: QTSDCROS.attrQueueArn } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: BasicQueue.attrQueueArn } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: QCSCTraining.attrQueueArn } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: QCSCCBTraining.attrQueueArn } }],
      description: "TSD Call Center Admin",
    });

    const TAAgentDefault = new connect.CfnRoutingProfile(this, 'TAAgentDefault', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "TA_Agent_Default",
      defaultOutboundQueueArn: QTATaxAdvisors.attrQueueArn,
      mediaConcurrencies: [{ channel: "VOICE", concurrency: 1 }],
      queueConfigs: [{ delay: 2, priority: 2, queueReference: { channel: "VOICE", queueArn: QTATaxAdvisors.attrQueueArn } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: QTACBTaxAdvisors.attrQueueArn } }],
      description: "Agent Default profile for Tax Advisors (IAU)",
    });

    const TASupAgentDefault = new connect.CfnRoutingProfile(this, 'TASupAgentDefault', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "TA_Sup_Agent_Default",
      defaultOutboundQueueArn: QTATaxAdvisors.attrQueueArn,
      mediaConcurrencies: [{ channel: "VOICE", concurrency: 1 }],
      queueConfigs: [{ delay: 180, priority: 2, queueReference: { channel: "VOICE", queueArn: QTATaxAdvisors.attrQueueArn } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: QTACBTaxAdvisors.attrQueueArn } }],
      description: "TA_Sup_Agent_Default",
    });

    const STFRetAgentTeam4BTR = new connect.CfnRoutingProfile(this, 'STFRetAgentTeam4BTR', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "STF Ret Agent Team 4 BTR",
      defaultOutboundQueueArn: QSTFRetEnvFees.attrQueueArn,
      mediaConcurrencies: [{ channel: "VOICE", concurrency: 1 }],
      queueConfigs: [{ delay: 5, priority: 2, queueReference: { channel: "VOICE", queueArn: QSTFRetCannabis.attrQueueArn } }, { delay: 10, priority: 3, queueReference: { channel: "VOICE", queueArn: QSTFCBRetCigarette.attrQueueArn } }, { delay: 5, priority: 2, queueReference: { channel: "VOICE", queueArn: QSTFRetEwasteTireIWMF.attrQueueArn } }, { delay: 15, priority: 4, queueReference: { channel: "VOICE", queueArn: QSTFCBUsernamePassAsst.attrQueueArn } }, { delay: 5, priority: 2, queueReference: { channel: "VOICE", queueArn: QSTFRetCigarette.attrQueueArn } }, { delay: 5, priority: 2, queueReference: { channel: "VOICE", queueArn: QSTFRetFuelUSTFCLPPF.attrQueueArn } }, { delay: 5, priority: 2, queueReference: { channel: "VOICE", queueArn: QSTFRetAlcoholicBev.attrQueueArn } }, { delay: 10, priority: 3, queueReference: { channel: "VOICE", queueArn: QSTFCBRetEwasteTireIWMF.attrQueueArn } }, { delay: 10, priority: 3, queueReference: { channel: "VOICE", queueArn: QSTFCBRetFuelUSTFCLPPF.attrQueueArn } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: QSTFCBRetHazEnv.attrQueueArn } }],
      description: "STF Ret Agent Team 4 BTR",
    });

    const TRATaxpayersRightsAdvocateDefault = new connect.CfnRoutingProfile(this, 'TRATaxpayersRightsAdvocateDefault', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "TRA_Taxpayers Rights Advocate Default",
      defaultOutboundQueueArn: QTRA.attrQueueArn,
      mediaConcurrencies: [{ channel: "CHAT", concurrency: 1 }, { channel: "TASK", concurrency: 1 }, { channel: "VOICE", concurrency: 1 }],
      queueConfigs: [{ delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: QTRACB.attrQueueArn } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: QTRA.attrQueueArn } }],
      description: "TRA_Taxpayers Rights Advocate Default",
    });

    const STFRetAgentTeam1TT = new connect.CfnRoutingProfile(this, 'STFRetAgentTeam1TT', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "STF Ret Agent Team 1 TT",
      defaultOutboundQueueArn: QSTFRetFuelUSTFCLPPF.attrQueueArn,
      mediaConcurrencies: [{ channel: "VOICE", concurrency: 1 }],
      queueConfigs: [{ delay: 15, priority: 4, queueReference: { channel: "VOICE", queueArn: QSTFRetCannabis.attrQueueArn } }, { delay: 15, priority: 4, queueReference: { channel: "VOICE", queueArn: QSTFCBRetCannabis.attrQueueArn } }, { delay: 10, priority: 3, queueReference: { channel: "VOICE", queueArn: QSTFCBUsernamePassAsst.attrQueueArn } }, { delay: 15, priority: 4, queueReference: { channel: "VOICE", queueArn: QSTFRetFuelUSTFCLPPF.attrQueueArn } }, { delay: 15, priority: 4, queueReference: { channel: "VOICE", queueArn: QSTFCBRetFuelUSTFCLPPF.attrQueueArn } }, { delay: 10, priority: 3, queueReference: { channel: "VOICE", queueArn: QSTFUsernamePassAsst.attrQueueArn } }],
      description: "STF Ret Agent Team 1 TT",
    });

    const AutomatedCSREvaluation = new connect.CfnEvaluationForm(this, 'AutomatedCSREvaluation', ({
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      title: "Automated CSR Evaluation",
      status: "DRAFT",
      items: [{"section":{"title":"Greeting","refId":"s851d79f7","items":[{"question":{"title":"Did the agent use the correct greeting ","refId":"q88c0fb23","questionType":"SINGLESELECT","instructions":"This should be scored as \"Meets\" when one of the following greetings is used: Thank you for calling the Customer Service Center, this is (name), may I have your account number?” or \"Thank you for calling the Customer Service Center, this is (name), I see you provided account number xxx-xxxxxx/I’m showing the account number entered as XXX-XXXXXX, is that correct?.”  or \"Hello, this is (name), with the California Department of Tax and Fee Administration, returning your call. Do you have an account number I can assist you with today?”. Either greeting can be similar to the greetings listed.  If the agent does not use one of the listed greetings or something similar, this would be scored as \"Does not Meet\".","notApplicableEnabled":false,"questionTypeProperties":{"singleSelect":{"options":[{"refId":"o20e5b4f2","text":"Meets","score":10,"automaticFail":false},{"refId":"oe9e87621","text":"Does not Meet","score":0,"automaticFail":false}],"displayAs":"RADIO","automation":{"answerSource":{"sourceType":"GEN_AI"}}}},"weight":10}},{"question":{"title":"Was the caller present at the time of the agent answering the call?","refId":"qe62e0d41","questionType":"SINGLESELECT","instructions":"If the agent does not get an initial response from the caller when they answer the call, the agent must ask \"Hello caller, can you hear me?\" if there is still no response from the caller, the agent must ask “Hello, caller can you hear me? I unfortunately cannot hear you, if you can hear me, please give us a call back at 1-800-\n400-7115.” and disconnects the call. If the agent goes through this procedure and immediately disconnects the call, then the answer to this question must be \"No\". If the agent does not go through this procedure and the call goes on as a conversation between the agent and the caller, then the answer to this question must be \"Yes\". ","notApplicableEnabled":false,"questionTypeProperties":{"singleSelect":{"options":[{"refId":"o04e47680","text":"Yes","score":10,"automaticFail":false},{"refId":"oddcd4331","text":"No","score":10,"automaticFail":false}],"displayAs":"RADIO","automation":{"answerSource":{"sourceType":"GEN_AI"}}}},"weight":1}}],"instructions":""}},{"section":{"title":"Verification Procedures","refId":"s51d1fbb3","items":[{"question":{"title":"Did the caller state that they do not have an account or account number or have a general question?","refId":"q735745ec","questionType":"SINGLESELECT","instructions":"Did the caller state that they do not have an account number OR they have a question that does not require an account number? If yes, then the answer to this question must be \"Yes\". If the caller provides an account number or the agent successfully looks up their account number, then the answer to this question must be \"No\".","notApplicableEnabled":false,"questionTypeProperties":{"singleSelect":{"options":[{"refId":"o8804d27b","text":"Yes","score":10,"automaticFail":false},{"refId":"o9a6d65e8","text":"No","score":10,"automaticFail":false}],"displayAs":"RADIO","automation":{"answerSource":{"sourceType":"GEN_AI"}}}},"weight":5}},{"question":{"title":"Did the agent attempt to verify the identity of the caller?","refId":"q5f1ea4f6","questionType":"SINGLESELECT","instructions":"The answer must be rated as \"Meets\" if:\n1. The agent asks for the account number AND; \n2. The name of the customer AND;\n3. The caller's relationship to the account (owner, all access with a username, employee, third party, anything else the customer identifies their role as would be considered third party) AND;\n4. The agent verifies them by a piece of information such as a driver's license, Social Security Number, ITIN, FEIN, Federal Employer Identification number, Non-US identification, or passports. \n\nIf the caller asks an account specific question that requires the account number and any portion of the 4 verification questions listed above are not asked by the agent and replied to by the caller, this must result in an answer of \"Does not Meet\".\nIf the caller is silent and appears to have left the call before answering the verification questions, the answer to this question MUST be \"Not Applicable\"","notApplicableEnabled":true,"questionTypeProperties":{"singleSelect":{"options":[{"refId":"o833325ef","text":"Meets","score":10,"automaticFail":false},{"refId":"o641d5b83","text":"Does not Meet","score":0,"automaticFail":false}],"displayAs":"RADIO","automation":{"answerSource":{"sourceType":"GEN_AI"}}}},"enablement":{"condition":{"operands":[{"expression":{"source":{"type":"QUESTION_REF_ID","refId":"q735745ec"},"values":[{"type":"OPTION_REF_ID","refId":"o8804d27b"}],"comparator":"IN"}}]},"action":"DISABLE"},"weight":25}},{"question":{"title":"Did the agent review account contact information?","refId":"qce4f0188","questionType":"SINGLESELECT","instructions":"Answer must be rated as \"Not Applicable\" if the customer is not identified as the owner or someone with all access to the account. \nAnswer must be rated as \"Meets\" if: \n1. The customer has been identified as the owner or verified with all access to the account AND; \n2. The agent verified the driver's license, SSN or ITIN) AND;\n3. The agent confirmed the customer's mailing address AND (books and records address) AND the phone number AND; \n4. The agent verified the email address on file. \nThe answer must be rated as \"Does not Meet\" if any of the 4 criteria listed above is missing OR the customer states they are the owner and the agent does not verify the callers: mailing address AND (books and records address) AND phone number AND email address. \nThe answer MUST be rated as \"Does not Meet\" if all instructions above aren't followed and listed contact information is not reviewed or updated. ","notApplicableEnabled":true,"questionTypeProperties":{"singleSelect":{"options":[{"refId":"ofee1d230","text":"Meets","score":10,"automaticFail":false},{"refId":"obf7635a4","text":"Does not Meet","score":0,"automaticFail":false}],"displayAs":"RADIO","automation":{"answerSource":{"sourceType":"GEN_AI"}}}},"enablement":{"condition":{"operands":[{"expression":{"source":{"type":"QUESTION_REF_ID","refId":"qe62e0d41"},"values":[{"type":"OPTION_REF_ID","refId":"oddcd4331"}],"comparator":"IN"}}]},"action":"DISABLE"},"weight":10}}],"instructions":""}},{"section":{"title":"Professionalism","refId":"sb6c9ec50","items":[{"question":{"title":"Did the agent handle the call in a professional manner? ","refId":"q5a8065c6","questionType":"SINGLESELECT","instructions":"Should be rated as \"Meets\" if the agent responds to the caller in a professional manner.  Should be rated as \"Does not Meet\" if the agent acts in a manner that is not professional.","notApplicableEnabled":true,"questionTypeProperties":{"singleSelect":{"options":[{"refId":"oc48c781b","text":"Meets ","score":10,"automaticFail":false},{"refId":"oa5f19682","text":"Does not Meet","score":0,"automaticFail":false}],"displayAs":"RADIO","automation":{"answerSource":{"sourceType":"GEN_AI"}}}},"enablement":{"condition":{"operands":[{"expression":{"source":{"type":"QUESTION_REF_ID","refId":"qe62e0d41"},"values":[{"type":"OPTION_REF_ID","refId":"oddcd4331"}],"comparator":"IN"}}]},"action":"DISABLE"}}}],"instructions":""}},{"section":{"title":"Effectiveness","refId":"s86eda734","items":[{"question":{"title":"Does the agent promptly answer the customers questions?","refId":"q4adc089f","questionType":"SINGLESELECT","instructions":"Should be rated as \"Meets\" when the agent understands the customer's questions and asks questions to clarify the customer's question when needed. Should be rated as \"Does not Meet\" when the agent does not ask questions to clarify when needed and misunderstands what the caller is asking for.","notApplicableEnabled":true,"questionTypeProperties":{"singleSelect":{"options":[{"refId":"o39db05e9","text":"Meets","score":10,"automaticFail":false},{"refId":"o7a87b694","text":"Does not Meet","score":0,"automaticFail":false}],"displayAs":"RADIO","automation":{"answerSource":{"sourceType":"GEN_AI"}}}},"enablement":{"condition":{"operands":[{"expression":{"source":{"type":"QUESTION_REF_ID","refId":"qe62e0d41"},"values":[{"type":"OPTION_REF_ID","refId":"oddcd4331"}],"comparator":"IN"}}]},"action":"DISABLE"}}}],"instructions":""}},{"section":{"title":"Closing","refId":"s44124fe0","items":[{"question":{"title":"Was the customer transferred?","refId":"qf334dafd","questionType":"SINGLESELECT","instructions":"This should be marked as \"Yes\" if the agent transfers the customer to a different section or department. This should be marked as \"No\" if the agent does not transfer the customer to a different section or department.","notApplicableEnabled":false,"questionTypeProperties":{"singleSelect":{"options":[{"refId":"o9be41955","text":"Yes","score":10,"automaticFail":false},{"refId":"o518f7a77","text":"No","score":10,"automaticFail":false}],"displayAs":"RADIO","automation":{"answerSource":{"sourceType":"GEN_AI"}}}},"weight":5}},{"question":{"title":"Did the agent ask the courtesy question before transferring? ","refId":"q14efb590","questionType":"SINGLESELECT","instructions":"Should be rated as \"Yes\" If the agent asks the caller if there is anything else that they can help them with or if they have any other questions before transferring. Should be rated as \"No\" if the agent does not ask the caller if there is anything else that they can help them with or if they have any other questions before transferring.","notApplicableEnabled":true,"questionTypeProperties":{"singleSelect":{"options":[{"refId":"o02e67adf","text":"Yes","score":10,"automaticFail":false},{"refId":"ofe4a2d1d","text":"No","score":5,"automaticFail":false}],"displayAs":"RADIO","automation":{"answerSource":{"sourceType":"GEN_AI"}}}},"enablement":{"condition":{"operands":[{"expression":{"source":{"type":"QUESTION_REF_ID","refId":"qf334dafd"},"values":[{"type":"OPTION_REF_ID","refId":"o9be41955"}],"comparator":"IN"}}]},"action":"ENABLE"},"weight":5}},{"question":{"title":"Did the agent ask if there were any other questions?","refId":"q9b206a09","questionType":"SINGLESELECT","instructions":"Should be rated as \"Yes\" If the agent asks the caller if there is anything else that they can help them with or if they have any other questions AND the agent wraps up the call with “If you would like to participate in our survey, please stay on the line. Thank you and have a nice day.”\nIf the customer thanks the CSR and states they have no further questions, the CSR should acknowledge this and state\nthe survey prompt. For example: \n“Since you have no further questions today, please stay on the line if you would like to participate in our \nsurvey.” or “Glad I could help resolve all your questions, please stay on the line if you would like to participate in our \nsurvey.”\nShould be rated as \"No\" if agent doesn't follow the instructions above. ","notApplicableEnabled":true,"questionTypeProperties":{"singleSelect":{"options":[{"refId":"oefceb706","text":"Yes","score":10,"automaticFail":false},{"refId":"o029dafbe","text":"No","score":0,"automaticFail":false}],"displayAs":"RADIO","automation":{"answerSource":{"sourceType":"GEN_AI"}}}},"enablement":{"condition":{"operands":[{"expression":{"source":{"type":"QUESTION_REF_ID","refId":"qf334dafd"},"values":[{"type":"OPTION_REF_ID","refId":"o9be41955"}],"comparator":"IN"}}]},"action":"DISABLE"},"weight":5}}],"instructions":""}}],
      
      scoringStrategy: {"mode":"QUESTION_ONLY","status":"ENABLED"},
    }) as any);

    const AutomatedEvaluationCallbacks = new connect.CfnEvaluationForm(this, 'AutomatedEvaluationCallbacks', ({
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      title: "Automated Evaluation - Callbacks ",
      status: "DRAFT",
      items: [{"section":{"title":"Greeting","refId":"s851d79f7","items":[{"question":{"title":"Did the agent use the correct greeting ","refId":"q88c0fb23","questionType":"SINGLESELECT","instructions":"This should be scored as \"meets\" when the following greetings is used: \"Hello, this is (name), with the California Department of Tax and Fee Administration, returning your call. Do you have an account number I can assist you with today?”  The rating should be \"Meets Voicemail\" if the following greeting is used: \"This is the California Department of Tax and Fee Administration returning your call. We are sorry we could not reach you. If you still need assistance, please call us at 1-800-400-7115.”  If the agent does not use one of the listed greetings, this would be marked as \"Does not meet\".","notApplicableEnabled":false,"questionTypeProperties":{"singleSelect":{"options":[{"refId":"o20e5b4f2","text":"Meets","score":10,"automaticFail":false},{"refId":"oe9e87621","text":"Does not Meet","score":0,"automaticFail":false},{"refId":"o665c165f","text":"Meets Voicemail ","score":10,"automaticFail":false}],"displayAs":"RADIO","automation":{"answerSource":{"sourceType":"GEN_AI"}}}},"weight":10}},{"question":{"title":"Was the caller present at the time of the agent answering the call? ","refId":"qcf7138e5","questionType":"SINGLESELECT","instructions":"If the agent does not get an initial response from the caller when they answer the call, the agent must ask \"Hello caller, can you hear me?\" if there is still no response from the caller, the agent must ask “Hello, caller can you hear me? I unfortunately cannot hear you, if you can hear me, please give us a call back at 1-800-400-7115.” and disconnects the call. If the agent goes through this procedure and immediately disconnects the call, then the answer to this question must be \"No\". If the agent reaches the customers voice mail this should be marked as \"No\". If the agent does not go through this procedure and the call goes on as a conversation between the agent and the caller, then the answer to this question must be \"Yes\". \n","notApplicableEnabled":false,"questionTypeProperties":{"singleSelect":{"options":[{"refId":"o170e8f9b","text":"Yes","score":10,"automaticFail":false},{"refId":"o5bbb3e8f","text":"No","score":0,"automaticFail":false}],"displayAs":"RADIO","automation":{"answerSource":{"sourceType":"GEN_AI"}}}},"weight":1.5}}],"instructions":""}},{"section":{"title":"Verification Procedures","refId":"s51d1fbb3","items":[{"question":{"title":"Did the caller state that they do not have an account or account number or have a general question?","refId":"qd9ca4e07","questionType":"SINGLESELECT","instructions":"Did the caller state that they do not have an account number OR they have a question that does not require an account number? If yes, then the answer to this question must be \"Yes\". If the caller provides an account number or the agent successfully looks up their account number, then the answer to this question must be \"No\".","notApplicableEnabled":false,"questionTypeProperties":{"singleSelect":{"options":[{"refId":"ob94258a5","text":"Yes","score":10,"automaticFail":false},{"refId":"oca95b02e","text":"No","score":0,"automaticFail":false}],"displayAs":"RADIO","automation":{"answerSource":{"sourceType":"GEN_AI"}}}},"weight":5}},{"question":{"title":"Did the agent attempt to verify the caller? ","refId":"q5f1ea4f6","questionType":"SINGLESELECT","instructions":"The answer must be rated as \"Meets\" if:\n1. The agent asks for the account number AND; \n2. The name of the customer AND;\n3. The caller's relationship to the account (owner, all access with a username, employee, third party, anything else the customer identifies their role as would be considered third party) AND;\n4. The agent verifies them by a piece of information such as a driver's license, Social Security Number, ITIN, FEIN, Federal Employer Identification number, Non-US identification, or passports. \n\nIf the caller asks an account specific question that requires the account number and any portion of the 4 verification questions listed above are not asked by the agent and replied to by the caller, this must result in an answer of \"Does not Meet\".\nIf the caller is silent and appears to have left the call before answering the verification questions, the answer to this question MUST be \"Not Applicable\"","notApplicableEnabled":true,"questionTypeProperties":{"singleSelect":{"options":[{"refId":"o833325ef","text":"Meets","score":10,"automaticFail":false},{"refId":"o641d5b83","text":"Does not Meet","score":0,"automaticFail":false}],"displayAs":"RADIO","automation":{"answerSource":{"sourceType":"GEN_AI"}}}},"enablement":{"condition":{"operands":[{"expression":{"source":{"type":"QUESTION_REF_ID","refId":"qd9ca4e07"},"values":[{"type":"OPTION_REF_ID","refId":"ob94258a5"}],"comparator":"IN"}}]},"action":"DISABLE"},"weight":25}},{"question":{"title":"Did the agent review account contact information?","refId":"qce4f0188","questionType":"SINGLESELECT","instructions":"Answer must be rated as \"Not Applicable\" if the customer is not identified as the owner or someone with all access to the account. \nAnswer must be rated as \"Meets\" if: \n1. The customer has been identified as the owner or verified with all access to the account AND; \n2. The agent verified the driver's license, SSN or ITIN) AND;\n3. The agent confirmed the customer's mailing address AND (books and records address) AND the phone number AND; \n4. The agent verified the email address on file. \nThe answer must be rated as \"Does not Meet\" if any of the 4 criteria listed above is missing OR the customer states they are the owner and the agent does not verify the callers: mailing address AND (books and records address) AND phone number AND email address. \nThe answer MUST be rated as \"Does not Meet\" if all instructions above aren't followed and listed contact information is not reviewed or updated. ","notApplicableEnabled":true,"questionTypeProperties":{"singleSelect":{"options":[{"refId":"ofee1d230","text":"Meets","score":10,"automaticFail":false},{"refId":"obf7635a4","text":"Does not Meet","score":0,"automaticFail":false}],"displayAs":"RADIO","automation":{"answerSource":{"sourceType":"GEN_AI"}}}},"enablement":{"condition":{"operands":[{"expression":{"source":{"type":"QUESTION_REF_ID","refId":"qcf7138e5"},"values":[{"type":"OPTION_REF_ID","refId":"o5bbb3e8f"}],"comparator":"IN"}}]},"action":"DISABLE"},"weight":10}}],"instructions":""}},{"section":{"title":"Professionalism","refId":"sb6c9ec50","items":[{"question":{"title":"Was the agent professional? ","refId":"q5a8065c6","questionType":"SINGLESELECT","instructions":"Should be rated as \"Meets\" if the agent responds to the caller in a professional manner.  Should be rated as \"Does not Meet\" if the agent acts in a manner that is not professional.","notApplicableEnabled":true,"questionTypeProperties":{"singleSelect":{"options":[{"refId":"oc48c781b","text":"Meets ","score":10,"automaticFail":false},{"refId":"oa5f19682","text":"Does not Meet","score":0,"automaticFail":false}],"displayAs":"RADIO","automation":{"answerSource":{"sourceType":"GEN_AI"}}}},"enablement":{"condition":{"operands":[{"expression":{"source":{"type":"QUESTION_REF_ID","refId":"q88c0fb23"},"values":[{"type":"OPTION_REF_ID","refId":"o665c165f"}],"comparator":"IN"}}]},"action":"DISABLE"}}}],"instructions":""}},{"section":{"title":"Effectiveness","refId":"s86eda734","items":[{"question":{"title":"Does the agent promptly answer the customers questions?","refId":"q4adc089f","questionType":"SINGLESELECT","instructions":"Should be rated as \"Meets\" when the agent understands the customer's questions and asks questions to clarify the customer's question when needed. Should be rated as \"Does not Meet\" when the agent does not ask questions to clarify when needed and misunderstands what the caller is asking for.","notApplicableEnabled":true,"questionTypeProperties":{"singleSelect":{"options":[{"refId":"o39db05e9","text":"Meets","score":10,"automaticFail":false},{"refId":"o7a87b694","text":"Does not Meet","score":0,"automaticFail":false}],"displayAs":"RADIO","automation":{"answerSource":{"sourceType":"GEN_AI"}}}},"enablement":{"condition":{"operands":[{"expression":{"source":{"type":"QUESTION_REF_ID","refId":"q88c0fb23"},"values":[{"type":"OPTION_REF_ID","refId":"o665c165f"}],"comparator":"IN"}}]},"action":"DISABLE"}}}],"instructions":""}},{"section":{"title":"Closing","refId":"s44124fe0","items":[{"question":{"title":"Did the agent ask if there were any other questions?","refId":"q9b206a09","questionType":"SINGLESELECT","instructions":"Should be rated as \"Yes\" If the agent asks the caller if there is anything else that they can help them with or if they have any other questions AND the agent wraps up the call with “If you would like to participate in our survey, please stay on the line. Thank you and have a nice day.”\nIf the customer thanks the CSR and states they have no further questions, the CSR should acknowledge this and state\nthe survey prompt. For example: \n“Since you have no further questions today, please stay on the line if you would like to participate in our \nsurvey.” or “Glad I could help resolve all your questions, please stay on the line if you would like to participate in our \nsurvey.”\nShould be rated as \"No\" if agent doesn't follow the instructions above. ","notApplicableEnabled":true,"questionTypeProperties":{"singleSelect":{"options":[{"refId":"oefceb706","text":"Meets","score":10,"automaticFail":false},{"refId":"o029dafbe","text":"Does not Meet","score":0,"automaticFail":false}],"displayAs":"RADIO","automation":{"answerSource":{"sourceType":"GEN_AI"}}}},"enablement":{"condition":{"operands":[{"expression":{"source":{"type":"QUESTION_REF_ID","refId":"q88c0fb23"},"values":[{"type":"OPTION_REF_ID","refId":"o665c165f"}],"comparator":"IN"}}]},"action":"DISABLE"},"weight":10}}],"instructions":""}}],
      
      scoringStrategy: {"mode":"QUESTION_ONLY","status":"ENABLED"},
    }) as any);

    const GenAIPilotAccuracy = new connect.CfnEvaluationForm(this, 'GenAIPilotAccuracy', ({
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      title: "GenAI Pilot Accuracy",
      status: "DRAFT",
      items: [{"section":{"title":"CSR Response","refId":"s85b927c3","items":[{"question":{"title":"Was the CSR answer accurate? ","refId":"q46b768b3","questionType":"SINGLESELECT","instructions":"","notApplicableEnabled":false,"questionTypeProperties":{"singleSelect":{"options":[{"refId":"o5a6557c1","text":"3 - Comprehensively Accurate: CSR was factually sound, complete, and consistent, provided all CDTFA reference material/resources","score":10,"automaticFail":false},{"refId":"ob90501aa","text":"2 - Accurate: CSR provided an accurate response but did not provide CDTFA reference material/resources","score":6,"automaticFail":false},{"refId":"o23cbd62e","text":"1 - Partially Accurate:  Answer contains some accurate information, but also includes omissions or misleading statements.","score":3,"automaticFail":false},{"refId":"ocf6af1c2","text":"0 - Not Accurate: Factual errors, fabrications or inconsistencies. ","score":0,"automaticFail":false}],"displayAs":"RADIO"}}}}],"instructions":""}}],
      
      scoringStrategy: {"mode":"SECTION_ONLY","status":"ENABLED"},
    }) as any);

    const CSREvaluationFormManual1225 = new connect.CfnEvaluationForm(this, 'CSREvaluationFormManual1225', ({
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      title: "CSR Evaluation Form – Manual 1/2/25",
      status: "DRAFT",
      items: [{"section":{"title":"General","refId":"s122be682","items":[{"question":{"title":"Were verification and confidentially procedures followed?","refId":"q301e8e41","questionType":"SINGLESELECT","instructions":"","notApplicableEnabled":true,"questionTypeProperties":{"singleSelect":{"options":[{"refId":"o00f107d4","text":"Meets","score":10,"automaticFail":false},{"refId":"o9b12aba2","text":"Does Not Meet","score":0,"automaticFail":false}],"displayAs":"RADIO"}},"weight":17.5}},{"question":{"title":"CV Procedures","refId":"q24b4050f","questionType":"SINGLESELECT","instructions":"","notApplicableEnabled":true,"questionTypeProperties":{"singleSelect":{"options":[{"refId":"o269cef67","text":"Meets","score":10,"automaticFail":false},{"refId":"oa1b35489","text":"Does Not Meet","score":0,"automaticFail":false}],"displayAs":"RADIO"}},"weight":10}},{"question":{"title":"Was the proper greeting used?","refId":"q1fc11d0e","questionType":"SINGLESELECT","instructions":"","notApplicableEnabled":true,"questionTypeProperties":{"singleSelect":{"options":[{"refId":"oacb67549","text":"Meets","score":10,"automaticFail":false},{"refId":"o10559b22","text":"Does Not Meet","score":0,"automaticFail":false}],"displayAs":"RADIO"}},"weight":5}},{"question":{"title":"Was the courtesy question asked and the survey prompt mentioned?","refId":"q44cf28b9","questionType":"SINGLESELECT","instructions":"","notApplicableEnabled":true,"questionTypeProperties":{"singleSelect":{"options":[{"refId":"oe6c23793","text":"Meets","score":10,"automaticFail":false},{"refId":"o12bd203a","text":"Does Not Meet","score":0,"automaticFail":false}],"displayAs":"RADIO"}},"weight":5}},{"question":{"title":"Professionalism","refId":"q103913b9","questionType":"SINGLESELECT","instructions":"(e.g Brevity, Clarity, Efficiency, Etiquette)","notApplicableEnabled":true,"questionTypeProperties":{"singleSelect":{"options":[{"refId":"o1d4889c3","text":"Meets","score":10,"automaticFail":false},{"refId":"od85c871b","text":"Does Not Meet","score":0,"automaticFail":false}],"displayAs":"RADIO"}},"weight":15}},{"question":{"title":"Effectiveness","refId":"q639d6077","questionType":"SINGLESELECT","instructions":"","notApplicableEnabled":true,"questionTypeProperties":{"singleSelect":{"options":[{"refId":"ofde04b7b","text":"Meets","score":10,"automaticFail":false},{"refId":"o00623898","text":"Does Not Meet","score":0,"automaticFail":false}],"displayAs":"RADIO"}},"weight":10}},{"question":{"title":"Appropriate resources provided to the caller?","refId":"q4c0cb120","questionType":"SINGLESELECT","instructions":"(Pubs, transfer #s, etc)","notApplicableEnabled":true,"questionTypeProperties":{"singleSelect":{"options":[{"refId":"o7933e3ed","text":"Meets","score":10,"automaticFail":false},{"refId":"o4e98a94a","text":"Does Not Meet","score":0,"automaticFail":false}],"displayAs":"RADIO"}},"weight":5}},{"question":{"title":"CSR followed all other CDTFA policies and procedures and used appropriate resources","refId":"q0ea5d1c0","questionType":"SINGLESELECT","instructions":"","notApplicableEnabled":true,"questionTypeProperties":{"singleSelect":{"options":[{"refId":"o75f7038d","text":"Meets","score":10,"automaticFail":false},{"refId":"oaa1782f0","text":"Does Not Meet","score":0,"automaticFail":false}],"displayAs":"RADIO"}},"weight":10}},{"question":{"title":"Accuracy and comprehensiveness of the answers provided","refId":"q94526204","questionType":"SINGLESELECT","instructions":"","notApplicableEnabled":true,"questionTypeProperties":{"singleSelect":{"options":[{"refId":"o639f1558","text":"Meets","score":10,"automaticFail":false},{"refId":"o8c0c3cfe","text":"Does Not Meet","score":0,"automaticFail":false}],"displayAs":"RADIO"}},"weight":17.5}},{"question":{"title":"Was the call transferred correctly?","refId":"q9144f5c4","questionType":"SINGLESELECT","instructions":"","notApplicableEnabled":true,"questionTypeProperties":{"singleSelect":{"options":[{"refId":"o8bdf0160","text":"Yes","score":10,"automaticFail":false},{"refId":"o19e7e2f5","text":"No","score":0,"automaticFail":false}],"displayAs":"RADIO"}},"weight":5}},{"question":{"title":"Did the employee exceed expectations on this call?","refId":"q576edec9","questionType":"SINGLESELECT","instructions":"","notApplicableEnabled":false,"questionTypeProperties":{"singleSelect":{"options":[{"refId":"od30577a0","text":"Yes","score":0,"automaticFail":false},{"refId":"oab8392c5","text":"No","score":0,"automaticFail":false}],"displayAs":"RADIO"}},"weight":0}}],"instructions":""}}],
      
      scoringStrategy: {"mode":"QUESTION_ONLY","status":"ENABLED"},
    }) as any);

    const InitialAgentEvaluationChat = new connect.CfnEvaluationForm(this, 'InitialAgentEvaluationChat', ({
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      title: "Initial Agent Evaluation - Chat",
      status: "DRAFT",
      items: [{"section":{"title":"Greeting","refId":"sdf688d91","items":[{"question":{"title":"Did the agent greet the customer properly?","refId":"q2add2e5e","questionType":"SINGLESELECT","instructions":"","notApplicableEnabled":false,"questionTypeProperties":{"singleSelect":{"options":[{"refId":"o8b70f347","text":"Yes","score":10,"automaticFail":false},{"refId":"ofeefeab0","text":"No","score":0,"automaticFail":false}],"displayAs":"RADIO","automation":{"options":[{"ruleCategory":{"category":"AccountNumberEnteredSpanishChat","condition":"PRESENT","optionRefId":"o8b70f347"}},{"ruleCategory":{"category":"AccountNumberNotEnteredChat","condition":"PRESENT","optionRefId":"o8b70f347"}},{"ruleCategory":{"category":"NoAccountNumberSpanishChat","condition":"PRESENT","optionRefId":"o8b70f347"}},{"ruleCategory":{"category":"AccountNumberEnteredChat","condition":"PRESENT","optionRefId":"o8b70f347"}}],"defaultOptionRefId":"ofeefeab0","answerSource":{"sourceType":"CONTACT_LENS_DATA"}}}}}}],"instructions":""}},{"section":{"title":"Closing","refId":"s00a657c5","items":[{"question":{"title":"Did the agent ask if the customer had any other questions or concerns?","refId":"qd3613d9e","questionType":"SINGLESELECT","instructions":"","notApplicableEnabled":false,"questionTypeProperties":{"singleSelect":{"options":[{"refId":"o3913cb4d","text":"Yes","score":10,"automaticFail":false},{"refId":"o4003ccfd","text":"No","score":0,"automaticFail":false}],"displayAs":"RADIO","automation":{"options":[{"ruleCategory":{"category":"ClosingOtherQuestionsChat","condition":"PRESENT","optionRefId":"o3913cb4d"}},{"ruleCategory":{"category":"ClosingOtherQuestionsSpanishChat","condition":"PRESENT","optionRefId":"o3913cb4d"}},{"ruleCategory":{"category":"NoFurtherQuestionsChat","condition":"PRESENT","optionRefId":"o3913cb4d"}},{"ruleCategory":{"category":"NoFurtherQuestionsSpanishChat","condition":"PRESENT","optionRefId":"o3913cb4d"}}],"defaultOptionRefId":"o4003ccfd","answerSource":{"sourceType":"CONTACT_LENS_DATA"}}}}}},{"question":{"title":"Did the agent say that they were happy to help?","refId":"q9b5c10d0","questionType":"SINGLESELECT","instructions":"","notApplicableEnabled":false,"questionTypeProperties":{"singleSelect":{"options":[{"refId":"o6f55c94a","text":"Yes","score":10,"automaticFail":false},{"refId":"o4da4f586","text":"No","score":0,"automaticFail":false}],"displayAs":"RADIO","automation":{"options":[{"ruleCategory":{"category":"HappyToHelpChat","condition":"PRESENT","optionRefId":"o6f55c94a"}},{"ruleCategory":{"category":"HappyToHelpSpanishChat","condition":"PRESENT","optionRefId":"o6f55c94a"}}],"defaultOptionRefId":"o4da4f586","answerSource":{"sourceType":"CONTACT_LENS_DATA"}}}}}}],"instructions":""}},{"section":{"title":"Other topics","refId":"s529866a3","items":[{"question":{"title":"Did the agent use profanity?","refId":"qba0e6cfb","questionType":"SINGLESELECT","instructions":"","notApplicableEnabled":false,"questionTypeProperties":{"singleSelect":{"options":[{"refId":"oc6bb9f08","text":"Yes","score":10,"automaticFail":false},{"refId":"off260fad","text":"No","score":0,"automaticFail":false}],"displayAs":"RADIO","automation":{"options":[{"ruleCategory":{"category":"ChatProfanity","condition":"PRESENT","optionRefId":"oc6bb9f08"}}],"defaultOptionRefId":"off260fad","answerSource":{"sourceType":"CONTACT_LENS_DATA"}}}}}}],"instructions":""}}],
      
      scoringStrategy: {"mode":"SECTION_ONLY","status":"ENABLED"},
    }) as any);

    const BlogTestingEvaluationFormAutoEvalEVLFRMELD0RDIT4EJJ = new connect.CfnEvaluationForm(this, 'BlogTestingEvaluationFormAutoEvalEVLFRMELD0RDIT4EJJ', ({
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      title: "Blog - Testing Evaluation Form - auto-eval-EVLFRM-ELD0RDIT4EJJ",
      status: "DRAFT",
      items: [{"section":{"title":"Agent Performance","refId":"agent_performance_title","items":[{"question":{"title":"Customer response from the survey","refId":"customer_survey_response","questionType":"NUMERIC","instructions":"","notApplicableEnabled":false,"questionTypeProperties":{"numeric":{"minValue":1,"maxValue":5,"options":[{"minValue":1,"maxValue":2,"score":2,"automaticFail":false},{"minValue":2,"maxValue":3,"score":5,"automaticFail":false},{"minValue":3,"maxValue":4,"score":7,"automaticFail":false},{"minValue":4,"maxValue":5,"score":10,"automaticFail":false}]}}}},{"question":{"title":"Overall sentiment of the customer","refId":"agent_greet_the_customer","questionType":"NUMERIC","instructions":"","notApplicableEnabled":false,"questionTypeProperties":{"numeric":{"minValue":-5,"maxValue":5,"options":[{"minValue":-5,"maxValue":3,"score":5,"automaticFail":false},{"minValue":3,"maxValue":5,"score":10,"automaticFail":false}]}}}}],"instructions":""}}],
      description: "Blog - Testing Evaluation Form",
      scoringStrategy: {"mode":"SECTION_ONLY","status":"ENABLED"},
    }) as any);

    const CSCChatEvaluation = new connect.CfnEvaluationForm(this, 'CSCChatEvaluation', ({
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      title: "CSC Chat Evaluation",
      status: "DRAFT",
      items: [{"section":{"title":"CSC Chat Evaluation","refId":"sf5276f0f","items":[{"question":{"title":"Did the agent provide accurate information?","refId":"q462d94a1","questionType":"SINGLESELECT","instructions":"","notApplicableEnabled":true,"questionTypeProperties":{"singleSelect":{"options":[{"refId":"o666fca86","text":"Meets","score":10,"automaticFail":false},{"refId":"o1ea29015","text":"Does Not Meet","score":0,"automaticFail":false}],"displayAs":"RADIO"}}}},{"question":{"title":"Were the appropriate quick responses used? ","refId":"q6bf9cf0b","questionType":"SINGLESELECT","instructions":"","notApplicableEnabled":true,"questionTypeProperties":{"singleSelect":{"options":[{"refId":"oc7f6d1ce","text":"Meets ","score":10,"automaticFail":false},{"refId":"o1f9fa759","text":"Does Not Meet","score":0,"automaticFail":false}],"displayAs":"RADIO"}}}},{"question":{"title":"Were the appropriate resources provided to the customer? ","refId":"q1c09e1b9","questionType":"SINGLESELECT","instructions":"","notApplicableEnabled":true,"questionTypeProperties":{"singleSelect":{"options":[{"refId":"ofeba108c","text":"Meets","score":10,"automaticFail":false},{"refId":"oa66a9aae","text":"Does Not Meet","score":0,"automaticFail":false}],"displayAs":"RADIO"}}}},{"question":{"title":"Did the agent use correct grammar and write in a professional manner? ","refId":"q0fe0c36d","questionType":"SINGLESELECT","instructions":"","notApplicableEnabled":true,"questionTypeProperties":{"singleSelect":{"options":[{"refId":"o6f183acf","text":"Meets","score":10,"automaticFail":false},{"refId":"od7563ecf","text":"Does Not Meet","score":0,"automaticFail":false}],"displayAs":"RADIO"}}}},{"question":{"title":"Did the agent follow the CSC chat procedures?","refId":"q2677b77e","questionType":"SINGLESELECT","instructions":"","notApplicableEnabled":true,"questionTypeProperties":{"singleSelect":{"options":[{"refId":"ob2977f2f","text":"Meets","score":10,"automaticFail":false},{"refId":"o28c02315","text":"Does Not Meet","score":0,"automaticFail":false}],"displayAs":"RADIO"}}}}],"instructions":""}}],
      
      scoringStrategy: {"mode":"SECTION_ONLY","status":"ENABLED"},
    }) as any);

    const CallEvaluationCalibrationForm = new connect.CfnEvaluationForm(this, 'CallEvaluationCalibrationForm', ({
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      title: "Call Evaluation Calibration Form",
      status: "DRAFT",
      items: [{"section":{"title":"Call Evaluation Calibration","refId":"s0f1bbcc5","items":[{"question":{"title":"Was the evaluation completed correctly?","refId":"q923ed758","questionType":"SINGLESELECT","instructions":"","notApplicableEnabled":false,"questionTypeProperties":{"singleSelect":{"options":[{"refId":"o971d62c2","text":"Yes","score":10,"automaticFail":false},{"refId":"of2f5f466","text":"No","score":7,"automaticFail":false}],"displayAs":"RADIO"}}}}],"instructions":""}}],
      
      scoringStrategy: {"mode":"SECTION_ONLY","status":"ENABLED"},
    }) as any);

    const CloseoutReview = new connect.CfnEvaluationForm(this, 'CloseoutReview', ({
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      title: "Closeout Review",
      status: "DRAFT",
      items: [{"section":{"title":"Closeout Review","refId":"s95cbe8d5","items":[{"question":{"title":"Enter the account number","refId":"q392ae952","questionType":"TEXT","instructions":"","notApplicableEnabled":false}},{"question":{"title":"Closeout Review","refId":"q95729464","questionType":"SINGLESELECT","instructions":"","notApplicableEnabled":false,"questionTypeProperties":{"singleSelect":{"options":[{"refId":"oe96780cb","text":"Closeout and all necessary account maintenance completed correctly.","score":10,"automaticFail":false},{"refId":"odfca5cad","text":"Account maintenance or account review was not completed correctly. ","score":5,"automaticFail":false},{"refId":"o2e2265dc","text":"Account was not closed correctly. ","score":0,"automaticFail":false}],"displayAs":"RADIO"}}}}],"instructions":""}}],
      
      scoringStrategy: {"mode":"QUESTION_ONLY","status":"ENABLED"},
    }) as any);

    const MCOEvaluationForm = new connect.CfnEvaluationForm(this, 'MCOEvaluationForm', ({
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      title: "MCO Evaluation Form",
      status: "DRAFT",
      items: [{"section":{"title":"General","refId":"s122be682","items":[{"question":{"title":"Were verification and confidentially procedures followed?","refId":"q301e8e41","questionType":"SINGLESELECT","instructions":"","notApplicableEnabled":true,"questionTypeProperties":{"singleSelect":{"options":[{"refId":"o00f107d4","text":"Meets","score":10,"automaticFail":false},{"refId":"o9b12aba2","text":"Does Not Meet","score":0,"automaticFail":false}],"displayAs":"RADIO"}},"weight":17.5}},{"question":{"title":"Account Maintenance Performed?","refId":"q24b4050f","questionType":"SINGLESELECT","instructions":"","notApplicableEnabled":true,"questionTypeProperties":{"singleSelect":{"options":[{"refId":"o269cef67","text":"Meets","score":10,"automaticFail":false},{"refId":"oa1b35489","text":"Does Not Meet","score":0,"automaticFail":false}],"displayAs":"RADIO"}},"weight":15}},{"question":{"title":"Professionalism","refId":"q103913b9","questionType":"SINGLESELECT","instructions":"(e.g Brevity, Clarity, Efficiency, Etiquette)","notApplicableEnabled":true,"questionTypeProperties":{"singleSelect":{"options":[{"refId":"o1d4889c3","text":"Meets","score":10,"automaticFail":false},{"refId":"od85c871b","text":"Does Not Meet","score":0,"automaticFail":false}],"displayAs":"RADIO"}},"weight":15}},{"question":{"title":"Assisted with customers concerns? ","refId":"q639d6077","questionType":"SINGLESELECT","instructions":"","notApplicableEnabled":true,"questionTypeProperties":{"singleSelect":{"options":[{"refId":"ofde04b7b","text":"Meets","score":10,"automaticFail":false},{"refId":"o00623898","text":"Does Not Meet","score":0,"automaticFail":false}],"displayAs":"RADIO"}},"weight":15}},{"question":{"title":"Appropriate resources provided to the customer?","refId":"q4c0cb120","questionType":"SINGLESELECT","instructions":"(Pubs, transfer #s, etc)","notApplicableEnabled":true,"questionTypeProperties":{"singleSelect":{"options":[{"refId":"o7933e3ed","text":"Meets","score":10,"automaticFail":false},{"refId":"o4e98a94a","text":"Does Not Meet","score":0,"automaticFail":false}],"displayAs":"RADIO"}},"weight":5}},{"question":{"title":"Team member followed all other CDTFA policies and procedures and used appropriate resources","refId":"q0ea5d1c0","questionType":"SINGLESELECT","instructions":"","notApplicableEnabled":true,"questionTypeProperties":{"singleSelect":{"options":[{"refId":"o75f7038d","text":"Meets","score":10,"automaticFail":false},{"refId":"oaa1782f0","text":"Does Not Meet","score":0,"automaticFail":false}],"displayAs":"RADIO"}},"weight":10}},{"question":{"title":"Accuracy and comprehensiveness of the answers provided","refId":"q94526204","questionType":"SINGLESELECT","instructions":"","notApplicableEnabled":true,"questionTypeProperties":{"singleSelect":{"options":[{"refId":"o639f1558","text":"Meets","score":10,"automaticFail":false},{"refId":"o8c0c3cfe","text":"Does Not Meet","score":0,"automaticFail":false}],"displayAs":"RADIO"}},"weight":17.5}},{"question":{"title":"Was the call transferred correctly?","refId":"q9144f5c4","questionType":"SINGLESELECT","instructions":"","notApplicableEnabled":true,"questionTypeProperties":{"singleSelect":{"options":[{"refId":"o8bdf0160","text":"Yes","score":10,"automaticFail":false},{"refId":"o19e7e2f5","text":"No","score":0,"automaticFail":false}],"displayAs":"RADIO"}},"weight":5}},{"question":{"title":"Did the employee exceed expectations on this call?","refId":"q576edec9","questionType":"SINGLESELECT","instructions":"","notApplicableEnabled":false,"questionTypeProperties":{"singleSelect":{"options":[{"refId":"od30577a0","text":"Yes","score":0,"automaticFail":false},{"refId":"oab8392c5","text":"No","score":0,"automaticFail":false}],"displayAs":"RADIO"}},"weight":0}}],"instructions":""}}],
      
      scoringStrategy: {"mode":"QUESTION_ONLY","status":"ENABLED"},
    }) as any);

    const ReturnedMailEvaluationForm = new connect.CfnEvaluationForm(this, 'ReturnedMailEvaluationForm', ({
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      title: "Returned Mail Evaluation Form",
      status: "DRAFT",
      items: [{"section":{"title":"Returned Mail Evaluation","refId":"s5cf0e2a2","items":[{"question":{"title":"Please enter the letter ID","refId":"qd893515f","questionType":"TEXT","instructions":"","notApplicableEnabled":false}},{"question":{"title":"Was the Returned Mail Task completed correctly? ","refId":"q1822db98","questionType":"SINGLESELECT","instructions":"Evaluators: Please write out any errors in the same format, directing the CSR to make the requested updates. Include the section in the procedures for the CSRs reference. ","notApplicableEnabled":false,"questionTypeProperties":{"singleSelect":{"options":[{"refId":"o2edc2fa6","text":"Yes","score":10,"automaticFail":false},{"refId":"o180e80e1","text":"No","score":5,"automaticFail":false}],"displayAs":"RADIO"}}}}],"instructions":""}}],
      
      scoringStrategy: {"mode":"SECTION_ONLY","status":"ENABLED"},
    }) as any);

    const SoftSkillCallEvaluation = new connect.CfnEvaluationForm(this, 'SoftSkillCallEvaluation', ({
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      title: "Soft Skill Call Evaluation",
      status: "DRAFT",
      items: [{"section":{"title":"Soft Skill Call Evaluation","refId":"s628a82e8","items":[{"question":{"title":"Did the agent demonstrate professionalism? ","refId":"qdab77575","questionType":"SINGLESELECT","instructions":"Maintaining a polite and respectful demeanor throughout the call. ","notApplicableEnabled":true,"questionTypeProperties":{"singleSelect":{"options":[{"refId":"ob0ea6ef9","text":"Meets","score":10,"automaticFail":false},{"refId":"o0b5dbd13","text":"Does Not Meet","score":0,"automaticFail":false}],"displayAs":"RADIO"}}}},{"question":{"title":"Did the agent demonstrate empathy?","refId":"qef562bc6","questionType":"SINGLESELECT","instructions":"Demonstrating understanding and concern for the customer's situation.","notApplicableEnabled":true,"questionTypeProperties":{"singleSelect":{"options":[{"refId":"o751070b1","text":"Meets","score":10,"automaticFail":false},{"refId":"obcac40f6","text":"Does Not Meet","score":0,"automaticFail":false}],"displayAs":"RADIO"}}}},{"question":{"title":"Did the agent communicate clearly? ","refId":"q4a20ac9e","questionType":"SINGLESELECT","instructions":"Speaking clearly, concisely, and using language easily understood by the customer.","notApplicableEnabled":true,"questionTypeProperties":{"singleSelect":{"options":[{"refId":"o24146a09","text":"Meets","score":10,"automaticFail":false},{"refId":"o164defeb","text":"Does Not Meet","score":0,"automaticFail":false}],"displayAs":"RADIO"}}}},{"question":{"title":"Did the agent demonstrate active listening?","refId":"q80d9eac9","questionType":"SINGLESELECT","instructions":"Ability to attentively listen to customer concerns and fully understand their needs before responding.","notApplicableEnabled":true,"questionTypeProperties":{"singleSelect":{"options":[{"refId":"oc6278088","text":"Meets","score":10,"automaticFail":false},{"refId":"o90a88aee","text":"Does Not Meet","score":0,"automaticFail":false}],"displayAs":"RADIO"}}}},{"question":{"title":"Did the agent demonstrate appropriate call control techniques?","refId":"q66f8daa0","questionType":"SINGLESELECT","instructions":"De-escalating tense situations, displaying patience, and conflict resolution when applicable.","notApplicableEnabled":true,"questionTypeProperties":{"singleSelect":{"options":[{"refId":"o64f859b7","text":"Meets","score":10,"automaticFail":false},{"refId":"oc496cb1b","text":"Does Not Meet","score":0,"automaticFail":false}],"displayAs":"RADIO"}}}},{"question":{"title":"Did the agent demonstrate proactive customer service when appropriate?","refId":"q1c59d712","questionType":"SINGLESELECT","instructions":"","notApplicableEnabled":true,"questionTypeProperties":{"singleSelect":{"options":[{"refId":"oa6c1c933","text":"Meets","score":10,"automaticFail":false},{"refId":"ocaf4a3b2","text":"Does Not Meet","score":0,"automaticFail":false}],"displayAs":"RADIO"}}}}],"instructions":""}}],
      
      scoringStrategy: {"mode":"SECTION_ONLY","status":"ENABLED"},
    }) as any);

    const AgentAssistanceFormManual = new connect.CfnEvaluationForm(this, 'AgentAssistanceFormManual', ({
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      title: "Agent Assistance Form- Manual",
      status: "DRAFT",
      items: [{"section":{"title":"General","refId":"s9f6e2bab","items":[{"question":{"title":"Did the lead answer the team members questions correctly?","refId":"q21344392","questionType":"SINGLESELECT","instructions":"","notApplicableEnabled":true,"questionTypeProperties":{"singleSelect":{"options":[{"refId":"ocbf8e861","text":"Yes","score":10,"automaticFail":false},{"refId":"o02284a3f","text":"No","score":0,"automaticFail":false}],"displayAs":"RADIO"}}}},{"question":{"title":"Did the lead follow current CSC policies and procedures?","refId":"qbf77fa05","questionType":"SINGLESELECT","instructions":"","notApplicableEnabled":true,"questionTypeProperties":{"singleSelect":{"options":[{"refId":"o77950d32","text":"Yes","score":10,"automaticFail":false},{"refId":"o35f69885","text":"No","score":0,"automaticFail":false}],"displayAs":"RADIO"}}}},{"question":{"title":"Did the lead ask appropriate clarifying questions?","refId":"qc82941cd","questionType":"SINGLESELECT","instructions":"","notApplicableEnabled":true,"questionTypeProperties":{"singleSelect":{"options":[{"refId":"o48656298","text":"Yes","score":10,"automaticFail":false},{"refId":"o3f0b6c2c","text":"No","score":0,"automaticFail":false}],"displayAs":"RADIO"}}}},{"question":{"title":"Was lead professional and courteous?","refId":"qc12a75bd","questionType":"SINGLESELECT","instructions":"","notApplicableEnabled":true,"questionTypeProperties":{"singleSelect":{"options":[{"refId":"o6fc04ac1","text":"Yes","score":10,"automaticFail":false},{"refId":"o13cafe5a","text":"No","score":0,"automaticFail":false}],"displayAs":"RADIO"}}}},{"question":{"title":"Did the lead confirm who the team member is speaking with and what was verified?","refId":"q8ca8ddb4","questionType":"SINGLESELECT","instructions":"","notApplicableEnabled":true,"questionTypeProperties":{"singleSelect":{"options":[{"refId":"o7b1fdc3d","text":"Yes","score":10,"automaticFail":false},{"refId":"od5fdb784","text":"No","score":0,"automaticFail":false}],"displayAs":"RADIO"}}}},{"question":{"title":"Did the lead provide resources and/or offer assistance with understanding procedures?","refId":"q44d254d4","questionType":"SINGLESELECT","instructions":"","notApplicableEnabled":true,"questionTypeProperties":{"singleSelect":{"options":[{"refId":"ocdd2b371","text":"Yes","score":10,"automaticFail":false},{"refId":"o80d9d78c","text":"No","score":0,"automaticFail":false}],"displayAs":"RADIO"}}}}],"instructions":""}}],
      
      scoringStrategy: {"mode":"SECTION_ONLY","status":"ENABLED"},
    }) as any);

    const AxyomAssistChatAccess = new connect.CfnRule(this, 'AxyomAssistChatAccess', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "axyom-assist-chat-access",
      triggerEventSource: { eventSourceName: "OnRealTimeChatAnalysisAvailable" },
      function: "{\"Version\":\"2022-11-25\",\"RuleFunction\":{\"Operator\":\"AND\",\"Operands\":[{\"Operator\":\"EQUALS\",\"Operands\":[\"true\"],\"ComparisonValue\":\"$.ContactLens.RealTimeChat.ContactAttribute.axyom-assist-access\",\"Negate\":false}]}}",
      actions: {
        assignContactCategoryActions: [{}],
      },
      publishStatus: "PUBLISHED",
    });

    const AxyomAssistPhoneAccess = new connect.CfnRule(this, 'AxyomAssistPhoneAccess', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "axyom-assist-phone-access",
      triggerEventSource: { eventSourceName: "OnRealTimeCallAnalysisAvailable" },
      function: "{\"Version\":\"2022-11-25\",\"RuleFunction\":{\"Operator\":\"AND\",\"Operands\":[{\"Operator\":\"EQUALS\",\"Operands\":[\"true\"],\"ComparisonValue\":\"$.ContactLens.RealTimeCall.ContactAttribute.axyom-assist-access\",\"Negate\":false}]}}",
      actions: {
        assignContactCategoryActions: [{}],
      },
      publishStatus: "PUBLISHED",
    });

    const AccountNumberEnteredChat = new connect.CfnRule(this, 'AccountNumberEnteredChat', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "AccountNumberEnteredChat",
      triggerEventSource: { eventSourceName: "OnPostChatAnalysisAvailable" },
      function: "{\"Version\":\"2022-11-25\",\"RuleFunction\":{\"Operator\":\"OR\",\"Operands\":[{\"Operator\":\"CONTAINS_ANY\",\"Operands\":[\"I see you provided account number\",\"I see you have provided your account number\",\"I saw you provided your account number as\",\"I'm showing the account number as\"],\"ComparisonValue\":\"$.ContactLens.PostChat.SemanticMatch.Transcript\",\"FilterClause\":{\"LogicOperator\":\"AND\",\"Filters\":[{\"Type\":\"ParticipantRole\",\"Data\":\"AGENT\"}]},\"Negate\":false}]}}",
      actions: {
        assignContactCategoryActions: [{}],
      },
      publishStatus: "PUBLISHED",
    });

    const AgentInterruptsCustomerX3 = new connect.CfnRule(this, 'AgentInterruptsCustomerX3', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "Agent_Interrupts_CustomerX3",
      triggerEventSource: { eventSourceName: "OnPostCallAnalysisAvailable" },
      function: "{\"Version\":\"2022-11-25\",\"RuleFunction\":{\"Operator\":\"AND\",\"Operands\":[{\"Operator\":\"NumberGreaterOrEqualTo\",\"Operands\":[3],\"ComparisonValue\":\"$.ContactLens.PostCall.Interruptions.Instances\",\"Negate\":false,\"FilterClause\":{\"LogicOperator\":\"AND\",\"Filters\":[{\"Type\":\"Interaction\",\"Data\":\"AGENT_INTERACTION\"}]}}]}}",
      actions: {
        assignContactCategoryActions: [{}],
      },
      publishStatus: "PUBLISHED",
    });

    const AccountNumberEnteredSpanishChat = new connect.CfnRule(this, 'AccountNumberEnteredSpanishChat', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "AccountNumberEnteredSpanishChat",
      triggerEventSource: { eventSourceName: "OnPostChatAnalysisAvailable" },
      function: "{\"Version\":\"2022-11-25\",\"RuleFunction\":{\"Operator\":\"OR\",\"Operands\":[{\"Operator\":\"CONTAINS_ANY\",\"Operands\":[[{\"Type\":\"PLAIN\",\"Value\":\"Mostrar el número de cuenta\"}],[{\"Type\":\"PLAIN\",\"Value\":\"veo que a ingresado el número de cuenta\"}]],\"ComparisonValue\":\"$.ContactLens.PostChat.PatternMatch.Transcript\",\"FilterClause\":{\"LogicOperator\":\"AND\",\"Filters\":[{\"Type\":\"ParticipantRole\",\"Data\":\"AGENT\"},{\"Type\":\"PatternMatchLanguageFilter\",\"Data\":\"ES\"}]},\"Negate\":false}]}}",
      actions: {
        assignContactCategoryActions: [{}],
      },
      publishStatus: "PUBLISHED",
    });

    const AccountNumberNotEnteredChat = new connect.CfnRule(this, 'AccountNumberNotEnteredChat', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "AccountNumberNotEnteredChat",
      triggerEventSource: { eventSourceName: "OnPostChatAnalysisAvailable" },
      function: "{\"Version\":\"2022-11-25\",\"RuleFunction\":{\"Operator\":\"OR\",\"Operands\":[{\"Operator\":\"CONTAINS_ANY\",\"Operands\":[\"may I have your account number?\",\"may I have your account number please?\",\"may I please have your account number?\",\"see you provided account number\"],\"ComparisonValue\":\"$.ContactLens.PostChat.SemanticMatch.Transcript\",\"FilterClause\":{\"LogicOperator\":\"AND\",\"Filters\":[{\"Type\":\"ParticipantRole\",\"Data\":\"AGENT\"}]},\"Negate\":false}]}}",
      actions: {
        assignContactCategoryActions: [{}],
      },
      publishStatus: "PUBLISHED",
    });

    const HappyToHelpSpanishChat = new connect.CfnRule(this, 'HappyToHelpSpanishChat', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "HappyToHelpSpanishChat",
      triggerEventSource: { eventSourceName: "OnPostChatAnalysisAvailable" },
      function: "{\"Version\":\"2022-11-25\",\"RuleFunction\":{\"Operator\":\"OR\",\"Operands\":[{\"Operator\":\"CONTAINS_ANY\",\"Operands\":[[{\"Type\":\"PLAIN\",\"Value\":\"Me allegro podido ayudarle resolver todas sus preguntas\"}],[{\"Type\":\"PLAIN\",\"Value\":\"Estoy feliz de haber podido ayudar\"}],[{\"Type\":\"PLAIN\",\"Value\":\"Me alegro de haber podido ayudar\"}],[{\"Type\":\"PLAIN\",\"Value\":\"Feliz de poder ayudar a resolver todas sus preguntas\"}]],\"ComparisonValue\":\"$.ContactLens.PostChat.PatternMatch.Transcript\",\"FilterClause\":{\"LogicOperator\":\"AND\",\"Filters\":[{\"Type\":\"ParticipantRole\",\"Data\":\"AGENT\"},{\"Type\":\"PatternMatchLanguageFilter\",\"Data\":\"ES\"}]},\"Negate\":false}]}}",
      actions: {
        assignContactCategoryActions: [{}],
      },
      publishStatus: "PUBLISHED",
    });

    const NoFurtherQuestionsChat = new connect.CfnRule(this, 'NoFurtherQuestionsChat', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "NoFurtherQuestionsChat",
      triggerEventSource: { eventSourceName: "OnPostChatAnalysisAvailable" },
      function: "{\"Version\":\"2022-11-25\",\"RuleFunction\":{\"Operator\":\"OR\",\"Operands\":[{\"Operator\":\"CONTAINS_ANY\",\"Operands\":[\"Since you have no further questions\",\"if there are no further questions\",\"as you have no further questions\",\"Since there are no further questions\"],\"ComparisonValue\":\"$.ContactLens.PostChat.SemanticMatch.Transcript\",\"FilterClause\":{\"LogicOperator\":\"AND\",\"Filters\":[{\"Type\":\"ParticipantRole\",\"Data\":\"AGENT\"}]},\"Negate\":false}]}}",
      actions: {
        assignContactCategoryActions: [{}],
      },
      publishStatus: "PUBLISHED",
    });

    const LAFireReliefChat = new connect.CfnRule(this, 'LAFireReliefChat', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "LA_Fire_Relief_Chat",
      triggerEventSource: { eventSourceName: "OnPostChatAnalysisAvailable" },
      function: "{\"Version\":\"2022-11-25\",\"RuleFunction\":{\"Operator\":\"AND\",\"Operands\":[{\"Operator\":\"EQUALS\",\"Operands\":[\"the customer mentioned relief requests due to fires\"],\"ComparisonValue\":\"$.ContactLens.PostChat.SemanticMatch.Phrase\",\"Negate\":false}]}}",
      actions: {
        assignContactCategoryActions: [{}],
      },
      publishStatus: "PUBLISHED",
    });

    const ClosingOtherQuestionsChat = new connect.CfnRule(this, 'ClosingOtherQuestionsChat', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "ClosingOtherQuestionsChat",
      triggerEventSource: { eventSourceName: "OnPostChatAnalysisAvailable" },
      function: "{\"Version\":\"2022-11-25\",\"RuleFunction\":{\"Operator\":\"OR\",\"Operands\":[{\"Operator\":\"CONTAINS_ANY\",\"Operands\":[\"Is there anything else I can help you with?\",\"Do you have any other questions?\",\"can I help with you anything else?\"],\"ComparisonValue\":\"$.ContactLens.PostChat.SemanticMatch.Transcript\",\"FilterClause\":{\"LogicOperator\":\"AND\",\"Filters\":[{\"Type\":\"ParticipantRole\",\"Data\":\"AGENT\"}]},\"Negate\":false}]}}",
      actions: {
        assignContactCategoryActions: [{}],
      },
      publishStatus: "PUBLISHED",
    });

    const NoAccountNumberSpanishChat = new connect.CfnRule(this, 'NoAccountNumberSpanishChat', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "NoAccountNumberSpanishChat",
      triggerEventSource: { eventSourceName: "OnPostChatAnalysisAvailable" },
      function: "{\"Version\":\"2022-11-25\",\"RuleFunction\":{\"Operator\":\"OR\",\"Operands\":[{\"Operator\":\"CONTAINS_ANY\",\"Operands\":[[{\"Type\":\"PLAIN\",\"Value\":\"puede darme su número de cuenta\"}],[{\"Type\":\"PLAIN\",\"Value\":\"Puedo tener su número de cuenta\"}],[{\"Type\":\"PLAIN\",\"Value\":\"Me puede dar su número de cuenta por favor\"}]],\"ComparisonValue\":\"$.ContactLens.PostChat.PatternMatch.Transcript\",\"FilterClause\":{\"LogicOperator\":\"AND\",\"Filters\":[{\"Type\":\"ParticipantRole\",\"Data\":\"AGENT\"},{\"Type\":\"PatternMatchLanguageFilter\",\"Data\":\"ES\"}]},\"Negate\":false}]}}",
      actions: {
        assignContactCategoryActions: [{}],
      },
      publishStatus: "PUBLISHED",
    });

    const HappyToHelpSpanish = new connect.CfnRule(this, 'HappyToHelpSpanish', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "HappyToHelpSpanish",
      triggerEventSource: { eventSourceName: "OnPostCallAnalysisAvailable" },
      function: "{\"Version\":\"2022-11-25\",\"RuleFunction\":{\"Operator\":\"OR\",\"Operands\":[{\"Operator\":\"CONTAINS_ANY\",\"Operands\":[\"Me allegro podido ayudarle resolver todas sus preguntas\",\"Estoy feliz de haber podido ayudar\",\"Me alegro de haber podido ayudar\",\"Feliz de poder ayudar a resolver todas sus preguntas\"],\"ComparisonValue\":\"$.ContactLens.PostCall.ExactMatch.Transcript\",\"FilterClause\":{\"LogicOperator\":\"AND\",\"Filters\":[{\"Type\":\"ParticipantRole\",\"Data\":\"AGENT\"}]},\"Negate\":false},{\"Operator\":\"CONTAINS_ANY\",\"Operands\":[[{\"Type\":\"PLAIN\",\"Value\":\"Me allegro podido ayudarle resolver todas sus preguntas\"}],[{\"Type\":\"PLAIN\",\"Value\":\"Estoy feliz de haber podido ayudar\"}],[{\"Type\":\"PLAIN\",\"Value\":\"Me alegro de haber podido ayudar\"}],[{\"Type\":\"PLAIN\",\"Value\":\"Feliz de poder ayudar a resolver todas sus preguntas\"}]],\"ComparisonValue\":\"$.ContactLens.PostCall.PatternMatch.Transcript\",\"FilterClause\":{\"LogicOperator\":\"AND\",\"Filters\":[{\"Type\":\"ParticipantRole\",\"Data\":\"AGENT\"},{\"Type\":\"PatternMatchLanguageFilter\",\"Data\":\"ES\"}]},\"Negate\":false}]}}",
      actions: {
        assignContactCategoryActions: [{}],
      },
      publishStatus: "PUBLISHED",
    });

    const HappyToHelpChat = new connect.CfnRule(this, 'HappyToHelpChat', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "HappyToHelpChat",
      triggerEventSource: { eventSourceName: "OnPostChatAnalysisAvailable" },
      function: "{\"Version\":\"2022-11-25\",\"RuleFunction\":{\"Operator\":\"OR\",\"Operands\":[{\"Operator\":\"CONTAINS_ANY\",\"Operands\":[\"Glad I could help resolve all your questions\",\"Happy I could help resolve all your questions\",\"I am glad I was able to help\",\"I am happy I could help\"],\"ComparisonValue\":\"$.ContactLens.PostChat.ExactMatch.Transcript\",\"FilterClause\":{\"LogicOperator\":\"AND\",\"Filters\":[{\"Type\":\"ParticipantRole\",\"Data\":\"AGENT\"}]},\"Negate\":false}]}}",
      actions: {
        assignContactCategoryActions: [{}],
      },
      publishStatus: "PUBLISHED",
    });

    const HappyToHelp = new connect.CfnRule(this, 'HappyToHelp', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "HappyToHelp",
      triggerEventSource: { eventSourceName: "OnPostCallAnalysisAvailable" },
      function: "{\"Version\":\"2022-11-25\",\"RuleFunction\":{\"Operator\":\"OR\",\"Operands\":[{\"Operator\":\"CONTAINS_ANY\",\"Operands\":[\"Glad I could help resolve all your questions\",\"Happy I could help resolve all your questions\",\"I am glad I was able to help\",\"I am happy I could help\"],\"ComparisonValue\":\"$.ContactLens.PostCall.ExactMatch.Transcript\",\"FilterClause\":{\"LogicOperator\":\"AND\",\"Filters\":[{\"Type\":\"ParticipantRole\",\"Data\":\"AGENT\"}]},\"Negate\":false},{\"Operator\":\"CONTAINS_ANY\",\"Operands\":[\"Glad I could help resolve all your questions\",\"Happy I could help resolve all your questions\",\"I am glad I was able to help\",\"I am happy I could help\"],\"ComparisonValue\":\"$.ContactLens.PostCall.SemanticMatch.Transcript\",\"FilterClause\":{\"LogicOperator\":\"AND\",\"Filters\":[{\"Type\":\"ParticipantRole\",\"Data\":\"AGENT\"}]},\"Negate\":false}]}}",
      actions: {
        assignContactCategoryActions: [{}],
      },
      publishStatus: "PUBLISHED",
    });

    const NoResponseFromCustomerChat = new connect.CfnRule(this, 'NoResponseFromCustomerChat', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "NoResponseFromCustomerChat",
      triggerEventSource: { eventSourceName: "OnPostChatAnalysisAvailable" },
      function: "{\"Version\":\"2022-11-25\",\"RuleFunction\":{\"Operator\":\"OR\",\"Operands\":[{\"Operator\":\"CONTAINS_ANY\",\"Operands\":[\"are you there\",\"can you hear me\",\"I unfortunately cannot hear you\"],\"ComparisonValue\":\"$.ContactLens.PostChat.SemanticMatch.Transcript\",\"FilterClause\":{\"LogicOperator\":\"AND\",\"Filters\":[{\"Type\":\"ParticipantRole\",\"Data\":\"AGENT\"}]},\"Negate\":false}]}}",
      actions: {
        assignContactCategoryActions: [{}],
      },
      publishStatus: "PUBLISHED",
    });

    const HoldMetricsThresholdRule = new connect.CfnRule(this, 'HoldMetricsThresholdRule', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "Hold_Metrics_Threshold_Rule",
      triggerEventSource: { eventSourceName: "OnPostCallAnalysisAvailable" },
      function: "{\"Version\":\"2022-11-25\",\"RuleFunction\":{\"Operator\":\"OR\",\"Operands\":[{\"Operator\":\"NumberGreaterOrEqualTo\",\"Operands\":[3],\"ComparisonValue\":\"$.ContactLens.PostCall.Agent.NumberOfHolds\",\"Negate\":false},{\"Operator\":\"NumberGreaterOrEqualTo\",\"Operands\":[120],\"ComparisonValue\":\"$.ContactLens.PostCall.Agent.LongestHoldDurationSecs\",\"Negate\":false},{\"Operator\":\"NumberGreaterOrEqualTo\",\"Operands\":[240],\"ComparisonValue\":\"$.ContactLens.PostCall.Agent.CustomerHoldDurationSecs\",\"Negate\":false}]}}",
      actions: {
        assignContactCategoryActions: [{}],
      },
      publishStatus: "PUBLISHED",
    });

    const NoFurtherQuestionsSpanish = new connect.CfnRule(this, 'NoFurtherQuestionsSpanish', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "NoFurtherQuestionsSpanish",
      triggerEventSource: { eventSourceName: "OnPostCallAnalysisAvailable" },
      function: "{\"Version\":\"2022-11-25\",\"RuleFunction\":{\"Operator\":\"OR\",\"Operands\":[{\"Operator\":\"CONTAINS_ANY\",\"Operands\":[\"Ya que no tiene más preguntas hoy\",\"Si no hay más preguntas\",\"ya que no tienes más preguntas\"],\"ComparisonValue\":\"$.ContactLens.PostCall.ExactMatch.Transcript\",\"FilterClause\":{\"LogicOperator\":\"AND\",\"Filters\":[{\"Type\":\"ParticipantRole\",\"Data\":\"AGENT\"}]},\"Negate\":false},{\"Operator\":\"CONTAINS_ANY\",\"Operands\":[[{\"Type\":\"PLAIN\",\"Value\":\"Ya que no tiene más preguntas hoy\"}],[{\"Type\":\"PLAIN\",\"Value\":\"Si no hay más preguntas\"}],[{\"Type\":\"PLAIN\",\"Value\":\"ya que no tienes más preguntas\"}]],\"ComparisonValue\":\"$.ContactLens.PostCall.PatternMatch.Transcript\",\"FilterClause\":{\"LogicOperator\":\"AND\",\"Filters\":[{\"Type\":\"ParticipantRole\",\"Data\":\"AGENT\"},{\"Type\":\"PatternMatchLanguageFilter\",\"Data\":\"ES\"}]},\"Negate\":false}]}}",
      actions: {
        assignContactCategoryActions: [{}],
      },
      publishStatus: "PUBLISHED",
    });

    const ClosingOtherQuestionsSpanishChat = new connect.CfnRule(this, 'ClosingOtherQuestionsSpanishChat', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "ClosingOtherQuestionsSpanishChat",
      triggerEventSource: { eventSourceName: "OnPostChatAnalysisAvailable" },
      function: "{\"Version\":\"2022-11-25\",\"RuleFunction\":{\"Operator\":\"OR\",\"Operands\":[{\"Operator\":\"CONTAINS_ANY\",\"Operands\":[[{\"Type\":\"PLAIN\",\"Value\":\"Tiene alguna otra pregunta el día de hoy?\"}],[{\"Type\":\"PLAIN\",\"Value\":\"Hay algo más en lo que pueda ayudarle?\"}],[{\"Type\":\"PLAIN\",\"Value\":\"Puedo ayudarte con algo más?\"}]],\"ComparisonValue\":\"$.ContactLens.PostChat.PatternMatch.Transcript\",\"FilterClause\":{\"LogicOperator\":\"AND\",\"Filters\":[{\"Type\":\"ParticipantRole\",\"Data\":\"AGENT\"},{\"Type\":\"PatternMatchLanguageFilter\",\"Data\":\"ES\"}]},\"Negate\":false}]}}",
      actions: {
        assignContactCategoryActions: [{}],
      },
      publishStatus: "PUBLISHED",
    });

    const CSCAgentAssistanceCalled = new connect.CfnRule(this, 'CSCAgentAssistanceCalled', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "CSC_Agent_Assistance_Called",
      triggerEventSource: { eventSourceName: "OnPostCallAnalysisAvailable" },
      function: "{\"Version\":\"2022-11-25\",\"RuleFunction\":{\"Operator\":\"OR\",\"Operands\":[{\"Operator\":\"CONTAINS_ANY\",\"Operands\":[\"agent assistance\",\"agent assist\",\"Genesis\"],\"ComparisonValue\":\"$.ContactLens.PostCall.ExactMatch.Transcript\",\"FilterClause\":{\"LogicOperator\":\"AND\",\"Filters\":[{\"Type\":\"ParticipantRole\",\"Data\":\"ANY\"}]},\"Negate\":false}]}}",
      actions: {
        assignContactCategoryActions: [{}],
      },
      publishStatus: "PUBLISHED",
    });

    const NoFurtherQuestionsSpanishChat = new connect.CfnRule(this, 'NoFurtherQuestionsSpanishChat', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "NoFurtherQuestionsSpanishChat",
      triggerEventSource: { eventSourceName: "OnPostChatAnalysisAvailable" },
      function: "{\"Version\":\"2022-11-25\",\"RuleFunction\":{\"Operator\":\"OR\",\"Operands\":[{\"Operator\":\"CONTAINS_ANY\",\"Operands\":[[{\"Type\":\"PLAIN\",\"Value\":\"Ya que no tiene más preguntas hoy\"}],[{\"Type\":\"PLAIN\",\"Value\":\"Si no hay más preguntas\"}],[{\"Type\":\"PLAIN\",\"Value\":\"ya que no tienes más preguntas\"}]],\"ComparisonValue\":\"$.ContactLens.PostChat.PatternMatch.Transcript\",\"FilterClause\":{\"LogicOperator\":\"AND\",\"Filters\":[{\"Type\":\"ParticipantRole\",\"Data\":\"AGENT\"},{\"Type\":\"PatternMatchLanguageFilter\",\"Data\":\"ES\"}]},\"Negate\":false}]}}",
      actions: {
        assignContactCategoryActions: [{}],
      },
      publishStatus: "PUBLISHED",
    });

    const NoResponseFromCaller = new connect.CfnRule(this, 'NoResponseFromCaller', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "NoResponseFromCaller",
      triggerEventSource: { eventSourceName: "OnPostCallAnalysisAvailable" },
      function: "{\"Version\":\"2022-11-25\",\"RuleFunction\":{\"Operator\":\"OR\",\"Operands\":[{\"Operator\":\"CONTAINS_ANY\",\"Operands\":[\"are you there?\",\"can you hear me?\",\"I unfortunately cannot hear you\"],\"ComparisonValue\":\"$.ContactLens.PostCall.ExactMatch.Transcript\",\"FilterClause\":{\"LogicOperator\":\"AND\",\"Filters\":[{\"Type\":\"PostCallContactPeriodSeconds\",\"Data\":{\"First\":60}},{\"Type\":\"ParticipantRole\",\"Data\":\"AGENT\"}]},\"Negate\":false},{\"Operator\":\"CONTAINS_ANY\",\"Operands\":[\"are you there?\",\"can you hear me?\",\"I unfortunately cannot hear you\"],\"ComparisonValue\":\"$.ContactLens.PostCall.SemanticMatch.Transcript\",\"FilterClause\":{\"LogicOperator\":\"AND\",\"Filters\":[{\"Type\":\"ParticipantRole\",\"Data\":\"AGENT\"}]},\"Negate\":false}]}}",
      actions: {
        assignContactCategoryActions: [{}],
      },
      publishStatus: "PUBLISHED",
    });

    const PasswordAssistance = new connect.CfnRule(this, 'PasswordAssistance', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "Password_Assistance",
      triggerEventSource: { eventSourceName: "OnPostCallAnalysisAvailable" },
      function: "{\"Version\":\"2022-11-25\",\"RuleFunction\":{\"Operator\":\"AND\",\"Operands\":[{\"Operator\":\"EQUALS\",\"Operands\":[\"The customer needed assistance with a password.\"],\"ComparisonValue\":\"$.ContactLens.PostCall.SemanticMatch.Phrase\",\"Negate\":false}]}}",
      actions: {
        assignContactCategoryActions: [{}],
      },
      publishStatus: "PUBLISHED",
    });

    const HazardousWaste = new connect.CfnRule(this, 'HazardousWaste', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "Hazardous_Waste",
      triggerEventSource: { eventSourceName: "OnPostCallAnalysisAvailable" },
      function: "{\"Version\":\"2022-11-25\",\"RuleFunction\":{\"Operator\":\"OR\",\"Operands\":[{\"Operator\":\"EQUALS\",\"Operands\":[\"The customer had questions regarding hazardous waste\"],\"ComparisonValue\":\"$.ContactLens.PostCall.SemanticMatch.Phrase\",\"Negate\":false}]}}",
      actions: {
        assignContactCategoryActions: [{}],
      },
      publishStatus: "PUBLISHED",
    });

    const NoAccountNumberSpanish = new connect.CfnRule(this, 'NoAccountNumberSpanish', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "NoAccountNumberSpanish",
      triggerEventSource: { eventSourceName: "OnPostCallAnalysisAvailable" },
      function: "{\"Version\":\"2022-11-25\",\"RuleFunction\":{\"Operator\":\"OR\",\"Operands\":[{\"Operator\":\"CONTAINS_ANY\",\"Operands\":[\"puede darme su número de cuenta?\",\"Puedo tener su número de cuenta?\",\"Me puede dar su número de cuenta por favor?\"],\"ComparisonValue\":\"$.ContactLens.PostCall.ExactMatch.Transcript\",\"FilterClause\":{\"LogicOperator\":\"AND\",\"Filters\":[{\"Type\":\"PostCallContactPeriodSeconds\",\"Data\":{\"First\":30}},{\"Type\":\"ParticipantRole\",\"Data\":\"AGENT\"}]},\"Negate\":false},{\"Operator\":\"CONTAINS_ANY\",\"Operands\":[[{\"Type\":\"PLAIN\",\"Value\":\"puede darme su número de cuenta?\"}],[{\"Type\":\"PLAIN\",\"Value\":\"Puedo tener su número de cuenta?\"}],[{\"Type\":\"PLAIN\",\"Value\":\"Me puede dar su número de cuenta por favor?\"}]],\"ComparisonValue\":\"$.ContactLens.PostCall.PatternMatch.Transcript\",\"FilterClause\":{\"LogicOperator\":\"AND\",\"Filters\":[{\"Type\":\"PostCallContactPeriodSeconds\",\"Data\":{\"First\":30}},{\"Type\":\"ParticipantRole\",\"Data\":\"AGENT\"},{\"Type\":\"PatternMatchLanguageFilter\",\"Data\":\"ES\"}]},\"Negate\":false}]}}",
      actions: {
        assignContactCategoryActions: [{}],
      },
      publishStatus: "PUBLISHED",
    });

    const NoFurtherQuestions = new connect.CfnRule(this, 'NoFurtherQuestions', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "NoFurtherQuestions",
      triggerEventSource: { eventSourceName: "OnPostCallAnalysisAvailable" },
      function: "{\"Version\":\"2022-11-25\",\"RuleFunction\":{\"Operator\":\"OR\",\"Operands\":[{\"Operator\":\"CONTAINS_ANY\",\"Operands\":[\"Since you have no further questions\",\"if there are no further questions\",\"as you have no further questions\",\"Since there are no further questions\"],\"ComparisonValue\":\"$.ContactLens.PostCall.ExactMatch.Transcript\",\"FilterClause\":{\"LogicOperator\":\"AND\",\"Filters\":[{\"Type\":\"ParticipantRole\",\"Data\":\"AGENT\"}]},\"Negate\":false},{\"Operator\":\"CONTAINS_ANY\",\"Operands\":[\"Since you have no further questions\",\"if there are no further questions\",\"as you have no further questions\",\"Since there are no further questions\"],\"ComparisonValue\":\"$.ContactLens.PostCall.SemanticMatch.Transcript\",\"FilterClause\":{\"LogicOperator\":\"AND\",\"Filters\":[{\"Type\":\"ParticipantRole\",\"Data\":\"AGENT\"}]},\"Negate\":false}]}}",
      actions: {
        assignContactCategoryActions: [{}],
      },
      publishStatus: "PUBLISHED",
    });

    const ClosingOtherQuestions = new connect.CfnRule(this, 'ClosingOtherQuestions', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "ClosingOtherQuestions",
      triggerEventSource: { eventSourceName: "OnPostCallAnalysisAvailable" },
      function: "{\"Version\":\"2022-11-25\",\"RuleFunction\":{\"Operator\":\"OR\",\"Operands\":[{\"Operator\":\"CONTAINS_ANY\",\"Operands\":[\"Is there anything else I can help you with?\",\"Do you have any other questions?\",\"can I help with you anything else?\"],\"ComparisonValue\":\"$.ContactLens.PostCall.ExactMatch.Transcript\",\"FilterClause\":{\"LogicOperator\":\"AND\",\"Filters\":[{\"Type\":\"PostCallContactPeriodSeconds\",\"Data\":{\"Last\":90}},{\"Type\":\"ParticipantRole\",\"Data\":\"AGENT\"}]},\"Negate\":false},{\"Operator\":\"CONTAINS_ANY\",\"Operands\":[\"Is there anything else I can help you with?\",\"Do you have any other questions?\",\"can I help with you anything else?\"],\"ComparisonValue\":\"$.ContactLens.PostCall.SemanticMatch.Transcript\",\"FilterClause\":{\"LogicOperator\":\"AND\",\"Filters\":[{\"Type\":\"ParticipantRole\",\"Data\":\"AGENT\"}]},\"Negate\":false}]}}",
      actions: {
        assignContactCategoryActions: [{}],
      },
      publishStatus: "PUBLISHED",
    });

    const Wildfires = new connect.CfnRule(this, 'Wildfires', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "Wildfires",
      triggerEventSource: { eventSourceName: "OnPostCallAnalysisAvailable" },
      function: "{\"Version\":\"2022-11-25\",\"RuleFunction\":{\"Operator\":\"AND\",\"Operands\":[{\"Operator\":\"EQUALS\",\"Operands\":[\"The customer stated they were impacted by wildfires\"],\"ComparisonValue\":\"$.ContactLens.PostCall.SemanticMatch.Phrase\",\"Negate\":false}]}}",
      actions: {
        assignContactCategoryActions: [{}],
      },
      publishStatus: "PUBLISHED",
    });

    const ClosingOtherQuestionsSpanish = new connect.CfnRule(this, 'ClosingOtherQuestionsSpanish', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "ClosingOtherQuestionsSpanish",
      triggerEventSource: { eventSourceName: "OnPostCallAnalysisAvailable" },
      function: "{\"Version\":\"2022-11-25\",\"RuleFunction\":{\"Operator\":\"OR\",\"Operands\":[{\"Operator\":\"CONTAINS_ANY\",\"Operands\":[\"Tiene alguna otra pregunta el día de hoy?\",\"Hay algo más en lo que pueda ayudarle?\",\"Puedo ayudarte con algo más?\"],\"ComparisonValue\":\"$.ContactLens.PostCall.ExactMatch.Transcript\",\"FilterClause\":{\"LogicOperator\":\"AND\",\"Filters\":[{\"Type\":\"ParticipantRole\",\"Data\":\"AGENT\"}]},\"Negate\":false},{\"Operator\":\"CONTAINS_ANY\",\"Operands\":[[{\"Type\":\"PLAIN\",\"Value\":\"Tiene alguna otra pregunta el día de hoy?\"}],[{\"Type\":\"PLAIN\",\"Value\":\"Hay algo más en lo que pueda ayudarle?\"}],[{\"Type\":\"PLAIN\",\"Value\":\"Puedo ayudarte con algo más?\"}]],\"ComparisonValue\":\"$.ContactLens.PostCall.PatternMatch.Transcript\",\"FilterClause\":{\"LogicOperator\":\"AND\",\"Filters\":[{\"Type\":\"ParticipantRole\",\"Data\":\"AGENT\"},{\"Type\":\"PatternMatchLanguageFilter\",\"Data\":\"ES\"}]},\"Negate\":false}]}}",
      actions: {
        assignContactCategoryActions: [{}],
      },
      publishStatus: "PUBLISHED",
    });

    const CoveredBatteryEmbeddedWasteRecycling = new connect.CfnRule(this, 'CoveredBatteryEmbeddedWasteRecycling', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "Covered_Battery-Embedded_Waste_Recycling",
      triggerEventSource: { eventSourceName: "OnPostCallAnalysisAvailable" },
      function: "{\"Version\":\"2022-11-25\",\"RuleFunction\":{\"Operator\":\"OR\",\"Operands\":[{\"Operator\":\"EQUALS\",\"Operands\":[\"The customer had questions about covered battery-embedded waste recycling fee accounts.\"],\"ComparisonValue\":\"$.ContactLens.PostCall.SemanticMatch.Phrase\",\"Negate\":false},{\"Operator\":\"CONTAINS_ANY\",\"Operands\":[\"covered battery\",\"covered battery-embedded\",\"CBE\"],\"ComparisonValue\":\"$.ContactLens.PostCall.SemanticMatch.Transcript\",\"FilterClause\":{\"LogicOperator\":\"AND\",\"Filters\":[{\"Type\":\"ParticipantRole\",\"Data\":\"ANY\"}]},\"Negate\":false}]}}",
      actions: {
        assignContactCategoryActions: [{}],
      },
      publishStatus: "PUBLISHED",
    });

    const TestGeneralTask = new connect.CfnTaskTemplate(this, 'TestGeneralTask', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "Test General Task",
      status: "ACTIVE",
      description: "Test Task",
      fields: [
      { id: { name: "Task name" }, type: "NAME", description: "The name of the task" },
      { id: { name: "Description" }, type: "DESCRIPTION", description: "The description of the task" },
      { id: { name: "Test Task Date" }, type: "DATE_TIME" },
      { id: { name: "Test Task email" }, type: "EMAIL" },
      { id: { name: "Test Task URL" }, type: "URL" },
      { id: { name: "Assign to" }, type: "QUICK_CONNECT", description: "The queue to assign the task to" },
      { id: { name: "Schedule" }, type: "SCHEDULED_TIME", description: "The scheduled time to complete the task" },
      ],
      constraints: {
      RequiredFields: [{ Id: { Name: "Task name" } }],
      },
      defaults: [
      { id: { name: "Task name" }, defaultValue: "Test Task Name" },
      { id: { name: "Description" }, defaultValue: "Test Task Description" },
      { id: { name: "Test Task URL" }, defaultValue: "https://cdtfa.sharepoint.com/sites/myCDTFA/" },
      ],
    });

    const SampleTaskTemplate = new connect.CfnTaskTemplate(this, 'SampleTaskTemplate', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "Sample Task Template",
      status: "INACTIVE",
      description: "Sample template to create task. Allows Agent to set name, description, URL references and optionally Schedule the task",
      fields: [
      { id: { name: "Task name" }, type: "NAME", description: "The name of the task" },
      { id: { name: "Description" }, type: "DESCRIPTION", description: "The description of the task" },
      { id: { name: "Reference 1" }, type: "URL", description: "This field will allow Agents to optionally add URLs which will get added as References" },
      { id: { name: "Reference 2" }, type: "URL", description: "This field will allow Agents to optionally add URLs which will get added as References" },
      { id: { name: "Reference 3" }, type: "URL", description: "This field will allow Agents to optionally add URLs which will get added as References" },
      { id: { name: "Reference 4" }, type: "URL", description: "This field will allow Agents to optionally add URLs which will get added as References" },
      { id: { name: "Reference 5" }, type: "URL", description: "This field will allow Agents to optionally add URLs which will get added as References" },
      { id: { name: "Reference 6" }, type: "URL", description: "This field will allow Agents to optionally add URLs which will get added as References" },
      { id: { name: "Reference 7" }, type: "URL", description: "This field will allow Agents to optionally add URLs which will get added as References" },
      { id: { name: "Reference 8" }, type: "URL", description: "This field will allow Agents to optionally add URLs which will get added as References" },
      { id: { name: "Reference 9" }, type: "URL", description: "This field will allow Agents to optionally add URLs which will get added as References" },
      { id: { name: "Reference 10" }, type: "URL", description: "This field will allow Agents to optionally add URLs which will get added as References" },
      { id: { name: "Assign to" }, type: "QUICK_CONNECT", description: "The queue to assign the task to" },
      { id: { name: "Schedule" }, type: "SCHEDULED_TIME", description: "The scheduled time to complete the task" },
      ],
      constraints: {
      RequiredFields: [{ Id: { Name: "Task name" } }],
      },
    });

    const VoicemailTemplate = new connect.CfnTaskTemplate(this, 'VoicemailTemplate', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "Voicemail Template",
      status: "ACTIVE",
      contactFlowArn: "arn:aws:connect:us-west-2:797776209609:instance/bd754747-7bce-46be-890e-cd37bd7e0f17/contact-flow/682fa177-f386-4cd1-a45d-ab8a205d41f8",
      fields: [
      { id: { name: "Task name" }, type: "NAME", description: "The name of the task" },
      { id: { name: "Description" }, type: "DESCRIPTION", description: "The description of the task" },
      { id: { name: "Schedule" }, type: "SCHEDULED_TIME", description: "The scheduled time to complete the task" },
      ],
      constraints: {
      RequiredFields: [{ Id: { Name: "Task name" } }],
      },
    });

    const JazzTrim1 = new connect.CfnPrompt(this, 'JazzTrim1', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "Jazz Trim 1",
      // s3Uri: 'REPLACE_WITH_S3_URI', // Upload prompt audio file to S3 and set this URI
      description: "Jazz Trim 1",
    });

    const JazzTrim3 = new connect.CfnPrompt(this, 'JazzTrim3', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "Jazz Trim 3",
      // s3Uri: 'REPLACE_WITH_S3_URI', // Upload prompt audio file to S3 and set this URI
      description: "Jazz Trim 3",
    });

    const MusicJazzMyTimetoFlyInstwav = new connect.CfnPrompt(this, 'MusicJazzMyTimetoFlyInstwav', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "Music_Jazz_MyTimetoFly_Inst.wav",
      // s3Uri: 'REPLACE_WITH_S3_URI', // Upload prompt audio file to S3 and set this URI
      
    });

    const CombinedLanguageSelection = new connect.CfnPrompt(this, 'CombinedLanguageSelection', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "combined_language_selection",
      // s3Uri: 'REPLACE_WITH_S3_URI', // Upload prompt audio file to S3 and set this URI
      description: "For English, please press one. Para Espanol, por favor presione dos.",
    });

    const Beepwav = new connect.CfnPrompt(this, 'Beepwav', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "Beep.wav",
      // s3Uri: 'REPLACE_WITH_S3_URI', // Upload prompt audio file to S3 and set this URI
      
    });

    const CustomerQueuewav = new connect.CfnPrompt(this, 'CustomerQueuewav', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "CustomerQueue.wav",
      // s3Uri: 'REPLACE_WITH_S3_URI', // Upload prompt audio file to S3 and set this URI
      
    });

    const MusicRockEverywhereTheSunShinesInstwav = new connect.CfnPrompt(this, 'MusicRockEverywhereTheSunShinesInstwav', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "Music_Rock_EverywhereTheSunShines_Inst.wav",
      // s3Uri: 'REPLACE_WITH_S3_URI', // Upload prompt audio file to S3 and set this URI
      
    });

    const CustomerHoldwav = new connect.CfnPrompt(this, 'CustomerHoldwav', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "CustomerHold.wav",
      // s3Uri: 'REPLACE_WITH_S3_URI', // Upload prompt audio file to S3 and set this URI
      
    });

    const MusicPopThisAndThatIsLifeInstwav = new connect.CfnPrompt(this, 'MusicPopThisAndThatIsLifeInstwav', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "Music_Pop_ThisAndThatIsLife_Inst.wav",
      // s3Uri: 'REPLACE_WITH_S3_URI', // Upload prompt audio file to S3 and set this URI
      
    });

    const JazzTrim2 = new connect.CfnPrompt(this, 'JazzTrim2', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "Jazz Trim 2",
      // s3Uri: 'REPLACE_WITH_S3_URI', // Upload prompt audio file to S3 and set this URI
      description: "Jazz Trim 2",
    });

    const MusicPopThrowYourselfInFrontOfItInstwav = new connect.CfnPrompt(this, 'MusicPopThrowYourselfInFrontOfItInstwav', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "Music_Pop_ThrowYourselfInFrontOfIt_Inst.wav",
      // s3Uri: 'REPLACE_WITH_S3_URI', // Upload prompt audio file to S3 and set this URI
      
    });

    const AxyomAssistTestV2 = new connect.CfnView(this, 'AxyomAssistTestV2', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "Axyom Assist Test v2",
      template: {"Body":[{"Type":"Application","_id":"Application_1765996076302","Configuration":{"Style":{"--application-height":"90dvh"}},"Props":{"Path":"$.Application_1765996076302.Path","AppIdentifier":"Axyom Assist Test"},"Content":[]},{"Type":"ExpandableSection","_id":"ExpandableSection_1765996333320","Props":{"variant":"default","header":"Customer Information"},"Content":[{"Type":"AttributeBar","_id":"AttributeBar_1765996401712","Props":{"Attributes":"$.AttributeBar_1765996401712.Attributes"},"Content":[]}]}],"Head":{"Configuration":{"Layout":{"Columns":["12"]}},"Title":"Axyom Assist Test v2","Integrations":[]}},
      actions: [],
      
    });

    const AxyomAssist = new connect.CfnView(this, 'AxyomAssist', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "Axyom Assist",
      template: {"Body":[{"Type":"Container","_id":"Container_1755648379619","Configuration":{"Layout":{"Columns":"12","Align":"center"},"Style":{"--container-footer-divider-width":"0px","--container-border-width":"0px","--container-border-radius":"0px"}},"Props":{"HideBorder":"false"},"Content":[{"Type":"Application","_id":"Application_1755648544176","Configuration":{"Style":{"--application-height":"94vH"}},"Props":{"Path":"$.Application_1755648544176.Path","AppIdentifier":"Axyom Assist"},"Content":[]}]}],"Head":{"Configuration":{"Layout":{"Columns":["12"]}},"Title":"Axyom Assist"}},
      actions: [],
      
    });

    const AxyomAssistTest = new connect.CfnView(this, 'AxyomAssistTest', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "Axyom Assist Test",
      template: {"Body":[{"Type":"Container","_id":"Container_1747154573772","Configuration":{"Layout":{"Columns":"12","Align":"center"},"Style":{"--container-footer-divider-width":"0px","--container-border-width":"0px","--container-border-radius":"0px"}},"Props":{"HideBorder":"false"},"Content":[{"Type":"Application","_id":"Application_1747154680668","Configuration":{"Style":{"--application-height":"94vh"}},"Props":{"Path":"$.Application_1747154680668.Path","AppIdentifier":"Axyom Assist Test"},"Content":[]}]}],"Head":{"Configuration":{"Layout":{"Columns":["12"]}},"Title":"Axyom Assist Test"}},
      actions: [],
      
    });

    const AxyomAssistV2 = new connect.CfnView(this, 'AxyomAssistV2', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "Axyom Assist v2",
      template: {"Body":[{"Type":"Application","_id":"Application_1766093711875","Configuration":{"Style":{"--application-height":"90dvh"}},"Props":{"Path":"$.Application_1766093711875.Path","AppIdentifier":"Axyom Assist"},"Content":[]},{"Type":"ExpandableSection","_id":"ExpandableSection_1766093750317","Props":{"variant":"default","header":"Customer Information"},"Content":[{"Type":"AttributeBar","_id":"AttributeBar_1766093779032","Props":{"Attributes":"$.AttributeBar_1766093779032.Attributes"},"Content":[]}]}],"Head":{"Configuration":{"Layout":{"Columns":["12"]}},"Title":"Axyom Assist v2","Integrations":[]}},
      actions: [],
      
    });

    const GeneralReferral = new connect.CfnView(this, 'GeneralReferral', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "General Referral",
      template: {"Body":[{"Type":"Header","_id":"Header_1","Props":{"variant":"h1","description":"Use this form for general referrals to other sections"},"Content":["General Referral"]},{"Type":"Section","_id":"Section_1","Configuration":{"Layout":{"Columns":["6","6"]}},"Props":{"Heading":""},"Content":[{"Type":"FormInput","_id":"FormInput_1","Props":{"Label":"Account Number","DefaultValue":"xxx-xxxxxx","HelperText":"Callers Account or Permit Number","InputType":"text","Required":"false","Name":"input-1"},"Content":[]},{"Type":"Dropdown","_id":"Dropdown_1730413113338","Props":{"Clearable":"false","DefaultValue":[""],"Options":[{"Label":"SSN/ITIN","Value":"SSN"},{"Label":"Drivers License / State ID","Value":"Drivers License State ID"},{"Label":"FEIN","Value":"FEIN"},{"Label":"Non-U.S. DL, ID or Passport","Value":"Non-U.S. DL, ID or Passport"},{"Label":"Confirmation Number","Value":"Confirmation Number"},{"Label":"Previous Return/Payment Info","Value":"Previous Return/Payment Info"},{"Label":"Other (Specify Below)","Value":"Other"}],"MultiSelect":"false","Required":"false","Label":"Verified","Name":"cdtfa-referral-verified_dropdown"},"Content":[]},{"Type":"FormInput","_id":"FormInput_1730412015166","Props":{"Label":"Taxpayer's Name","DefaultValue":"First Name Last Name","HelperText":"Taxpayer's Name format First Name Last Name or Company Name","InputType":"text","Required":"false","Name":"cdtfa-referral-tp_name"},"Content":[]},{"Type":"FormInput","_id":"FormInput_1730415460388","Props":{"Label":"Verified Other (Specify)","DefaultValue":"","HelperText":"Use this field if you checked \"Other\" in the Verified field","InputType":"$.FormInput_1730415460388.InputType","Required":"false","Name":"Other_Specify"},"Content":[]},{"Type":"FormInput","_id":"FormInput_1730412239542","Props":{"Label":"Caller's Name","DefaultValue":"First Name Last Name","HelperText":"Caller Name format First Name Last Name","InputType":"text","Required":"true","Name":"cdtfa-referral-caller_name"},"Content":[]},{"Type":"Dropdown","_id":"Dropdown_1730412689726","Props":{"Clearable":"true","DefaultValue":[""],"Options":[{"Label":"Owner","Value":"Owner"},{"Label":"Officer","Value":"Officer"},{"Label":"Partner","Value":"Partner"},{"Label":"Member (LLC)","Value":"Member_LLC"},{"Label":"Employee","Value":"Employee"},{"Label":"3rd Party (Verified)","Value":"3rd_Party"}],"MultiSelect":"false","Required":"true","Label":"Caller's Title","Name":"cdtfa-referral-Caller_Title_Dropdown"},"Content":[]},{"Type":"FormInput","_id":"FormInput_2","Props":{"Label":"Caller's Telephone Number","DefaultValue":"xxx-xxx-xxxx","HelperText":"Callers Phone Number Format 800-400-7115","InputType":"tel","Required":"true","Name":"input-1"},"Content":[]},{"Type":"FormInput","_id":"FormInput_1730413738893","Props":{"Label":"Foreign Language","DefaultValue":"","HelperText":"If the caller requested a call back in a different language, enter it here.","InputType":"text","Required":"false","Name":"cdtfa-referral-foreign_language"},"Content":[]},{"Type":"TextArea","_id":"TextArea_1737075666296","Props":{"Label":"Comments","DefaultValue":"","HelperText":"Enter the details of this General Referral","Required":"true","MaxLength":"2000","Name":"Comments"},"Content":[]},{"Type":"SubmitButton","_id":"SubmitButton_1730415449185","Props":{"Label":"Submit General Referral","Action":"ActionSelected","IconAlign":"left","IconName":"check"},"Content":[]}]}],"Head":{"Configuration":{"Layout":{"Columns":["12"]}},"Title":"General Referral"}},
      actions: ["ActionSelected"],
      
    });

    const WebcallFormView = new connect.CfnView(this, 'WebcallFormView', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "webcall-form-view",
      template: {"Body":[{"Type":"Header","_id":"Header_1756935541871","Props":{"variant":"h2","description":"Before you are connected to the CDTFA Customer Service Center at 1-800-400-7115, please provide us with your name and phone number."},"Content":["Call Us"]},{"Type":"FormInput","_id":"FormInput_1756935946254","Props":{"DefaultValue":"","HelperText":"Please enter your first name (required)","InputType":"text","Required":"true","Label":"First Name","ValidationPattern":"","Name":"First-Name"},"Content":[]},{"Type":"FormInput","_id":"FormInput_1756936036581","Props":{"DefaultValue":"","HelperText":"Please enter your last name (required)","InputType":"text","Required":"true","Label":"Last Name","ValidationPattern":"","Name":"Last-Name-webcall"},"Content":[]},{"Type":"FormInput","_id":"FormInput_1756936175242","Props":{"DefaultValue":"000-000-0000","HelperText":"Area Code & Phone Number (required)","InputType":"tel","Required":"true","Label":"Phone Number","ValidationPattern":"$.FormInput_1756936175242.ValidationPattern","Name":"Phone-Number-Webcall"},"Content":[]},{"Type":"SubmitButton","_id":"SubmitButton_1756936792278","Props":{"Label":"Call","Action":"ActionSelected","IconAlign":"left"},"Content":["Submit Button"]}],"Head":{"Configuration":{"Layout":{"Columns":["12"]}},"Title":"webcall-form-view"}},
      actions: ["ActionSelected"],
      
    });

    const Testviewtodelete = new connect.CfnView(this, 'Testviewtodelete', {
      instanceArn: Mycdtfa2DevArnParam.valueAsString,
      name: "testviewtodelete",
      template: {"Body":[{"Type":"AttributeSection","_id":"AttributeSection_1766014236130","Configuration":{"Layout":{"Columns":"3"}},"Props":{"Columns":"","Items":[{"Label":"Default Label 1","Value":"Default Value 1"},{"Label":"Default Label 2","Value":"Default Value 2"},{"Label":"Default Label 3","Value":"Default Value 3"},{"Label":"Default Label 4","Value":"Default Value 4"}]},"Content":[]},{"Type":"Button","_id":"Button_1766014839235","Props":{"Variant":"normal","Action":"ActionSelected","IconAlign":"left","Disabled":"false","IconName":""},"Content":["Button"]}],"Head":{"Configuration":{"Layout":{"Columns":["12"]}},"Title":"testviewtodelete","Integrations":[]}},
      actions: ["ActionSelected"],
      
    });

    // CloudFormation stack 'AwsyncStackCluster1' — child resources are declared as individual constructs above

    // TODO: wisdom/knowledge-base — cdtfa-connect-assistant-s3-integration
    // cfnType: AWS::QConnect::KnowledgeBase

    // TODO: wisdom/knowledge-base — amazon-connect-quick-responses-23b22172-4c3d-52b3-9516-25159489df43
    // cfnType: AWS::QConnect::KnowledgeBase

    // TODO: wisdom/knowledge-base — cdtfa-website-crawler
    // cfnType: AWS::QConnect::KnowledgeBase

    // TODO: wisdom/knowledge-base — amazon-connect-mycdtfa2
    // cfnType: AWS::QConnect::KnowledgeBase

    // TODO: wisdom/knowledge-base — amazon-connect-mycdtfa2-dev
    // cfnType: AWS::QConnect::KnowledgeBase
  }
}
