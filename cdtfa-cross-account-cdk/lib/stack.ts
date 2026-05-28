import * as cdk from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as connect from 'aws-cdk-lib/aws-connect';
import * as wisdom from 'aws-cdk-lib/aws-wisdom';
import * as path from 'path';
import { Construct } from 'constructs';
import { ARN_MAP } from './arns';
import { ENV_OVERRIDES } from './overrides';

export class AwsyncStackStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
    const account = this.node.tryGetContext('account') as string ?? Object.keys(ARN_MAP)[0] ?? 'default';
    const arns = ARN_MAP[account] ?? {};
    const envOverrides = ENV_OVERRIDES[account] ?? {};

    // ── Referenced resources (already exist in target account) ──────────────
    const R1Arn = arns.R1; // connect/agent-group-level

    const R2Arn = arns.R2; // connect/agent-group-level

    const R3Arn = arns.R3; // connect/agent-group-level

    const R4Arn = arns.R4; // connect/agent-group-level

    const R5Arn = arns.R5; // connect/agent-group-level

    const CloseoutReviewArn = arns.CloseoutReview; // connect/evaluation-form

    const InitialAgentEvaluationChatArn = arns.InitialAgentEvaluationChat; // connect/evaluation-form

    const CSCChatEvaluationArn = arns.CSCChatEvaluation; // connect/evaluation-form

    const CSREvaluationFormManual1225Arn = arns.CSREvaluationFormManual1225; // connect/evaluation-form

    const MCOEvaluationFormArn = arns.MCOEvaluationForm; // connect/evaluation-form

    const BlogTestingEvaluationFormAutoEvalEVLFRMELD0RDIT4EJJArn = arns.BlogTestingEvaluationFormAutoEvalEVLFRMELD0RDIT4EJJ; // connect/evaluation-form

    const CallEvaluationCalibrationFormArn = arns.CallEvaluationCalibrationForm; // connect/evaluation-form

    const GenAIPilotAccuracyArn = arns.GenAIPilotAccuracy; // connect/evaluation-form

    const AgentAssistanceFormManualArn = arns.AgentAssistanceFormManual; // connect/evaluation-form

    const ReturnedMailEvaluationFormArn = arns.ReturnedMailEvaluationForm; // connect/evaluation-form

    const AutomatedCSREvaluationArn = arns.AutomatedCSREvaluation; // connect/evaluation-form

    const SoftSkillCallEvaluationArn = arns.SoftSkillCallEvaluation; // connect/evaluation-form

    const AutomatedEvaluationCallbacksArn = arns.AutomatedEvaluationCallbacks; // connect/evaluation-form

    const NoResponseFromCustomerChatArn = arns.NoResponseFromCustomerChat; // connect/rule

    const Afee8a3d4c12404b8720Fa2927f29aedArn = arns.Afee8a3d4c12404b8720Fa2927f29aed; // connect/rule

    const R6d084652Ea7848279be24d40c7af38c9Arn = arns.R6d084652Ea7848279be24d40c7af38c9; // connect/rule

    const R502f2302287c4f8fBa5eF8ae3fe29f8cArn = arns.R502f2302287c4f8fBa5eF8ae3fe29f8c; // connect/rule

    const R96ccea9cB68b4f8e89d2D387ee85efa9Arn = arns.R96ccea9cB68b4f8e89d2D387ee85efa9; // connect/rule

    const F459505a9d4a4fabAf65D9d2f9618c44Arn = arns.F459505a9d4a4fabAf65D9d2f9618c44; // connect/rule

    const R2f7d8760409c40c080ebBf1ce9e652b2Arn = arns.R2f7d8760409c40c080ebBf1ce9e652b2; // connect/rule

    const NoAccountNumberSpanishArn = arns.NoAccountNumberSpanish; // connect/rule

    const CSCAgentAssistanceCalledArn = arns.CSCAgentAssistanceCalled; // connect/rule

    const R19163242926Arn = arns.R19163242926; // connect/phone-number

    const R19164456362Arn = arns.R19164456362; // connect/phone-number

    const R19163733030Arn = arns.R19163733030; // connect/phone-number

    const R18883879134Arn = arns.R18883879134; // connect/phone-number

    const R19894690198Arn = arns.R19894690198; // connect/phone-number

    const E9d856989ad54414A01f24a7b8dd7733Arn = arns.E9d856989ad54414A01f24a7b8dd7733; // connect/rule

    const R91cf7a83485142f7Ab90Bf409fa32e52Arn = arns.R91cf7a83485142f7Ab90Bf409fa32e52; // connect/rule

    const C86dd7f6E3394e6f93a247538f75b815Arn = arns.C86dd7f6E3394e6f93a247538f75b815; // connect/rule

    const R068f9691483a4ff4A0dfC3ce3fa31595Arn = arns.R068f9691483a4ff4A0dfC3ce3fa31595; // connect/rule

    const R5d07531fA1cf4a76A404F0767b249958Arn = arns.R5d07531fA1cf4a76A404F0767b249958; // connect/rule

    const R19169198642Arn = arns.R19169198642; // connect/phone-number

    const R18004007115Arn = arns.R18004007115; // connect/phone-number

    const R18889223300Arn = arns.R18889223300; // connect/phone-number

    const R19169198663Arn = arns.R19169198663; // connect/phone-number

    const R19169198654Arn = arns.R19169198654; // connect/phone-number

    const R0f18ac97Dbc941acA95f24592728c943Arn = arns.R0f18ac97Dbc941acA95f24592728c943; // connect/agent

    const R0f0480cc64a449bcA432B22f23509b33Arn = arns.R0f0480cc64a449bcA432B22f23509b33; // connect/agent

    const R0ed426235dfc477aB78cFf46bd0174f4Arn = arns.R0ed426235dfc477aB78cFf46bd0174f4; // connect/agent

    const R0eaa124aDc5d44859e92D0c9dcf6e74dArn = arns.R0eaa124aDc5d44859e92D0c9dcf6e74d; // connect/agent

    const R0e5c7cc1D12e431cA6d93cabc531f347Arn = arns.R0e5c7cc1D12e431cA6d93cabc531f347; // connect/agent

    const R0e171ded9af14bc69d6e8d8b0ece692aArn = arns.R0e171ded9af14bc69d6e8d8b0ece692a; // connect/agent

    const R0e12ede6Bac7472f9670D297f45061cdArn = arns.R0e12ede6Bac7472f9670D297f45061cd; // connect/agent

    const R0e060da17ea04eb5B10523557741208eArn = arns.R0e060da17ea04eb5B10523557741208e; // connect/agent

    const R0dfc240216c5497e97611fa9d54fc4cfArn = arns.R0dfc240216c5497e97611fa9d54fc4cf; // connect/agent

    const R0dfa7746Edae4bcd93131d4758efbd71Arn = arns.R0dfa7746Edae4bcd93131d4758efbd71; // connect/agent

    const R0d78750122924a098a91Aef756121dc4Arn = arns.R0d78750122924a098a91Aef756121dc4; // connect/agent

    const R0d1e2b4fA48f49d982d980dd3e1a8121Arn = arns.R0d1e2b4fA48f49d982d980dd3e1a8121; // connect/agent

    const R0cfaac91Af984de59df393740d94d2b0Arn = arns.R0cfaac91Af984de59df393740d94d2b0; // connect/agent

    const R0cd263006e09467eB015B28032798b83Arn = arns.R0cd263006e09467eB015B28032798b83; // connect/agent

    const R0cbb3bac8cae427586267a3f51cfc128Arn = arns.R0cbb3bac8cae427586267a3f51cfc128; // connect/agent

    const R0cba70c9Af394fffB105474ac00d391cArn = arns.R0cba70c9Af394fffB105474ac00d391c; // connect/agent

    const R0ca8a68c2c1448e9B33001c62fdb60efArn = arns.R0ca8a68c2c1448e9B33001c62fdb60ef; // connect/agent

    const R0ca8a108120f4cdaA870B986619333b7Arn = arns.R0ca8a108120f4cdaA870B986619333b7; // connect/agent

    const R0c8c799a32db44679681D84f3b9700a3Arn = arns.R0c8c799a32db44679681D84f3b9700a3; // connect/agent

    const R0c7957e1E49b4a999886F05104864e01Arn = arns.R0c7957e1E49b4a999886F05104864e01; // connect/agent

    const R0c7011581f3a4b6e9e5635316ed06addArn = arns.R0c7011581f3a4b6e9e5635316ed06add; // connect/agent

    const R0c6171f1E2114483890f6e2772f36fdcArn = arns.R0c6171f1E2114483890f6e2772f36fdc; // connect/agent

    const R0c5ffa38Aa6e4310B63aDfbeed0b6262Arn = arns.R0c5ffa38Aa6e4310B63aDfbeed0b6262; // connect/agent

    const R0b33c8bfB0ab42ec9fcd3e2f333fa115Arn = arns.R0b33c8bfB0ab42ec9fcd3e2f333fa115; // connect/agent

    const R0b270516E9c04b6588fc217db5d44d4dArn = arns.R0b270516E9c04b6588fc217db5d44d4d; // connect/agent

    const R0b10188d552b43ceA6a356bcbf98aebfArn = arns.R0b10188d552b43ceA6a356bcbf98aebf; // connect/agent

    const R0adb3160B2a74885B69eBd4ae7bb5f81Arn = arns.R0adb3160B2a74885B69eBd4ae7bb5f81; // connect/agent

    const R0ad5421391664f80980fEe4b0ee8f31eArn = arns.R0ad5421391664f80980fEe4b0ee8f31e; // connect/agent

    const R0a911c5481da419181f515a36d417262Arn = arns.R0a911c5481da419181f515a36d417262; // connect/agent

    const R0a65c07cD37d40019b6d908cc607886eArn = arns.R0a65c07cD37d40019b6d908cc607886e; // connect/agent

    const R0a4f55c63f6a42c1840e101b92bf1d0aArn = arns.R0a4f55c63f6a42c1840e101b92bf1d0a; // connect/agent

    const R0a36a42f81e74454Af1dB9e27988ebbeArn = arns.R0a36a42f81e74454Af1dB9e27988ebbe; // connect/agent

    const R0a1d33acCb7f4a6a8452929065df5ad3Arn = arns.R0a1d33acCb7f4a6a8452929065df5ad3; // connect/agent

    const R0a125238E7054b678272C47780324894Arn = arns.R0a125238E7054b678272C47780324894; // connect/agent

    const R09dc2c36A2e9421eAbf936a9b85736d8Arn = arns.R09dc2c36A2e9421eAbf936a9b85736d8; // connect/agent

    const R097dcf6bF939407d99d956568b2d2fd4Arn = arns.R097dcf6bF939407d99d956568b2d2fd4; // connect/agent

    const R096ea9881fed4cd79279B936973ea683Arn = arns.R096ea9881fed4cd79279B936973ea683; // connect/agent

    const R09654853370244ccAd97C7af970316daArn = arns.R09654853370244ccAd97C7af970316da; // connect/agent

    const R095050899bdf4721A2394250362675b6Arn = arns.R095050899bdf4721A2394250362675b6; // connect/agent

    const R091f0cd637a0458188781349ac679f0fArn = arns.R091f0cd637a0458188781349ac679f0f; // connect/agent

    const R08bfaa24Cd7945caB6e7F360ea6b8c7dArn = arns.R08bfaa24Cd7945caB6e7F360ea6b8c7d; // connect/agent

    const R0884bd70Af034802B0eb05c3609c384fArn = arns.R0884bd70Af034802B0eb05c3609c384f; // connect/agent

    const R0850632e471247a5Ab2f8c186381d033Arn = arns.R0850632e471247a5Ab2f8c186381d033; // connect/agent

    const R0834f542Df154997A1f815acb5ecb0dcArn = arns.R0834f542Df154997A1f815acb5ecb0dc; // connect/agent

    const R08052db9Ccfc4c9fBde18b7f780dbd51Arn = arns.R08052db9Ccfc4c9fBde18b7f780dbd51; // connect/agent

    const R07f603c1C307436a88ce0a3cc96ae691Arn = arns.R07f603c1C307436a88ce0a3cc96ae691; // connect/agent

    const R07da137fA4ac4775Bad9001563383a04Arn = arns.R07da137fA4ac4775Bad9001563383a04; // connect/agent

    const R07c4229e14684d4dA7f272d3fbcb25c6Arn = arns.R07c4229e14684d4dA7f272d3fbcb25c6; // connect/agent

    const R07899809F966481882e74b5700386921Arn = arns.R07899809F966481882e74b5700386921; // connect/agent

    const R07178e13B2524413905390cbd1eae172Arn = arns.R07178e13B2524413905390cbd1eae172; // connect/agent

    const R06b7905dE398492cA0897ded441d92edArn = arns.R06b7905dE398492cA0897ded441d92ed; // connect/agent

    const R06add765706048eb90e52db1d231b1cdArn = arns.R06add765706048eb90e52db1d231b1cd; // connect/agent

    const R06822cd3691247f5Bbdd87523e36e41aArn = arns.R06822cd3691247f5Bbdd87523e36e41a; // connect/agent

    const R066c2c86C98b4d6aA1e3B150b2e53279Arn = arns.R066c2c86C98b4d6aA1e3B150b2e53279; // connect/agent

    const R0632922e4dde48c48c007deede9b464cArn = arns.R0632922e4dde48c48c007deede9b464c; // connect/agent

    const R062a10ab78d34ef4B4e07b17c94425cfArn = arns.R062a10ab78d34ef4B4e07b17c94425cf; // connect/agent

    const R05f19804F4e0435fB0e313b3a3c8abbaArn = arns.R05f19804F4e0435fB0e313b3a3c8abba; // connect/agent

    const R05c0576762b64490B537E8ae2b337e18Arn = arns.R05c0576762b64490B537E8ae2b337e18; // connect/agent

    const R05b5af8eBc1e4143A3025bc75295774dArn = arns.R05b5af8eBc1e4143A3025bc75295774d; // connect/agent

    const R05a57c209fce4f939d21Ea5987270387Arn = arns.R05a57c209fce4f939d21Ea5987270387; // connect/agent

    const R0593a204295647d8A80cF29e031b4e4bArn = arns.R0593a204295647d8A80cF29e031b4e4b; // connect/agent

    const R0590dd065f774859Bb57Be1f4f1221c7Arn = arns.R0590dd065f774859Bb57Be1f4f1221c7; // connect/agent

    const R055ff74331a54762A2cf64bdf810f4e5Arn = arns.R055ff74331a54762A2cf64bdf810f4e5; // connect/agent

    const R04eed23a715342adA1850d096e11cfbfArn = arns.R04eed23a715342adA1850d096e11cfbf; // connect/agent

    const R04bcddd2034442acBae4322dd1eebc3dArn = arns.R04bcddd2034442acBae4322dd1eebc3d; // connect/agent

    const R04a515c0Ef6c4cd1B74fD93832c859d1Arn = arns.R04a515c0Ef6c4cd1B74fD93832c859d1; // connect/agent

    const R049db6f93dab4b1a9157189cec2ff2beArn = arns.R049db6f93dab4b1a9157189cec2ff2be; // connect/agent

    const R04949ae67ed24e24A7d314cecae54085Arn = arns.R04949ae67ed24e24A7d314cecae54085; // connect/agent

    const R0417692bE70345faB121992b20d02fcdArn = arns.R0417692bE70345faB121992b20d02fcd; // connect/agent

    const R040d7bbdBed54346Bdee54b08f06e957Arn = arns.R040d7bbdBed54346Bdee54b08f06e957; // connect/agent

    const R03fceea8E15f44cd9ada998aabf5af92Arn = arns.R03fceea8E15f44cd9ada998aabf5af92; // connect/agent

    const R03e40f7cB812415d975b91a484e90042Arn = arns.R03e40f7cB812415d975b91a484e90042; // connect/agent

    const R03c6d2e886144795B64168c0f4d6aa58Arn = arns.R03c6d2e886144795B64168c0f4d6aa58; // connect/agent

    const R03c6bce42df949beA7c61f2a3046e3ebArn = arns.R03c6bce42df949beA7c61f2a3046e3eb; // connect/agent

    const R03b9b19dE34447ceA0e9Dd8e703db338Arn = arns.R03b9b19dE34447ceA0e9Dd8e703db338; // connect/agent

    const R02f5d3c6D5114d199d9c1c32ea8ed478Arn = arns.R02f5d3c6D5114d199d9c1c32ea8ed478; // connect/agent

    const R02d92536E2ad44bdBfdcBd5b001d9b23Arn = arns.R02d92536E2ad44bdBfdcBd5b001d9b23; // connect/agent

    const R02c9b02b24dd432d84f8F4e2b21d274fArn = arns.R02c9b02b24dd432d84f8F4e2b21d274f; // connect/agent

    const R02a06becEb904da39f286a637f5e7462Arn = arns.R02a06becEb904da39f286a637f5e7462; // connect/agent

    const R027688b045a9431a9524Ddf2073b6c42Arn = arns.R027688b045a9431a9524Ddf2073b6c42; // connect/agent

    const R0219768c2f4940ceA0d978102c85c6ebArn = arns.R0219768c2f4940ceA0d978102c85c6eb; // connect/agent

    const R021761949f8d434a9cf8Fa457973563cArn = arns.R021761949f8d434a9cf8Fa457973563c; // connect/agent

    const R02136eae65244608Bf4aF9454b405d64Arn = arns.R02136eae65244608Bf4aF9454b405d64; // connect/agent

    const R0212cf2cC8034c2bB14fC9021c2e92aeArn = arns.R0212cf2cC8034c2bB14fC9021c2e92ae; // connect/agent

    const R01d8a6b75f594a5bBa13116776b7cea1Arn = arns.R01d8a6b75f594a5bBa13116776b7cea1; // connect/agent

    const R01b805a0Cbcf48808cdf33421050babeArn = arns.R01b805a0Cbcf48808cdf33421050babe; // connect/agent

    const R01920ea001284cff83c24a1e5c21ce52Arn = arns.R01920ea001284cff83c24a1e5c21ce52; // connect/agent

    const R018c338b976e4811982394040900c1c0Arn = arns.R018c338b976e4811982394040900c1c0; // connect/agent

    const R0164f8453d974c65A70455f18c10aee9Arn = arns.R0164f8453d974c65A70455f18c10aee9; // connect/agent

    const R0160f56dDeb94bd0A1e9C2cb5787d058Arn = arns.R0160f56dDeb94bd0A1e9C2cb5787d058; // connect/agent

    const R01462b214b3a43ff8b4fBa916aa062fbArn = arns.R01462b214b3a43ff8b4fBa916aa062fb; // connect/agent

    const R01210ae64ac845cbB7668623c3192657Arn = arns.R01210ae64ac845cbB7668623c3192657; // connect/agent

    const R00def492Cd524e8aB2060b22cb1f652bArn = arns.R00def492Cd524e8aB2060b22cb1f652b; // connect/agent

    const R00cca8a20f7e48fbA1e9A0eaf2c977beArn = arns.R00cca8a20f7e48fbA1e9A0eaf2c977be; // connect/agent

    const R00b5bfb4De644371BbbcF302868ee1ceArn = arns.R00b5bfb4De644371BbbcF302868ee1ce; // connect/agent

    const R00a35b293f684cacA45801908c5c0cdeArn = arns.R00a35b293f684cacA45801908c5c0cde; // connect/agent

    const R0072de8110ce4ea7Baf331cc4ef6fe4bArn = arns.R0072de8110ce4ea7Baf331cc4ef6fe4b; // connect/agent

    const R00684b71Dbe54a26Bbf96c0e557689c1Arn = arns.R00684b71Dbe54a26Bbf96c0e557689c1; // connect/agent

    const R004a2aa6Fc14414995c12c1ce29ac947Arn = arns.R004a2aa6Fc14414995c12c1ce29ac947; // connect/agent

    const R003ed863D232445893650f72b64bc7a7Arn = arns.R003ed863D232445893650f72b64bc7a7; // connect/agent

    const STFRetAgentDefaultTeam6Arn = arns.STFRetAgentDefaultTeam6; // connect/routing-profile

    const BasicRoutingProfileArn = arns.BasicRoutingProfile; // connect/routing-profile

    const STFRetAgentDefaultTeam5Arn = arns.STFRetAgentDefaultTeam5; // connect/routing-profile

    const QSTFCBRetEnvFeesArn = arns.QSTFCBRetEnvFees; // connect/queue

    const QMCONewLicenseOrAcctArn = arns.QMCONewLicenseOrAcct; // connect/queue

    const QMCOLicenseIFTADecalsArn = arns.QMCOLicenseIFTADecals; // connect/queue

    const QSTFCBRetCannabisArn = arns.QSTFCBRetCannabis; // connect/queue

    const QMCOCBLicenseIFTADecalsArn = arns.QMCOCBLicenseIFTADecals; // connect/queue

    const BasicQueueArn = arns.BasicQueue; // connect/queue

    const QMCOCBSpanishArn = arns.QMCOCBSpanish; // connect/queue

    const QSTFUsernamePassAsstArn = arns.QSTFUsernamePassAsst; // connect/queue

    const QMCOCBNewLicenseOrAcctArn = arns.QMCOCBNewLicenseOrAcct; // connect/queue

    const QMCOSpanishArn = arns.QMCOSpanish; // connect/queue

    const QSTFRetEnvFeesArn = arns.QSTFRetEnvFees; // connect/queue

    const QSTFRetCannabisArn = arns.QSTFRetCannabis; // connect/queue

    const QSTFCBRetCigaretteArn = arns.QSTFCBRetCigarette; // connect/queue

    const QSTFRetFuelUSTFCLPPFArn = arns.QSTFRetFuelUSTFCLPPF; // connect/queue

    const QSTFCBUsernamePassAsstArn = arns.QSTFCBUsernamePassAsst; // connect/queue

    const QSTFRetHazEnvArn = arns.QSTFRetHazEnv; // connect/queue

    const QSTFCBRetAlcoholicBevArn = arns.QSTFCBRetAlcoholicBev; // connect/queue

    const QSTFRetAlcoholicBevArn = arns.QSTFRetAlcoholicBev; // connect/queue

    const QSTFCBRetEwasteTireIWMFArn = arns.QSTFCBRetEwasteTireIWMF; // connect/queue

    const QSTFRetCigaretteArn = arns.QSTFRetCigarette; // connect/queue

    const QSTFRetEwasteTireIWMFArn = arns.QSTFRetEwasteTireIWMF; // connect/queue

    const STFRetAgentDefaultTeam2Arn = arns.STFRetAgentDefaultTeam2; // connect/routing-profile

    const QSTFCBRetFuelUSTFCLPPFArn = arns.QSTFCBRetFuelUSTFCLPPF; // connect/queue

    const QCSCWebchatSpanishArn = arns.QCSCWebchatSpanish; // connect/queue

    const QSTFCBRegFuelUSTFCLPPFArn = arns.QSTFCBRegFuelUSTFCLPPF; // connect/queue

    const QSTFCBRegAlcoholicBevArn = arns.QSTFCBRegAlcoholicBev; // connect/queue

    const QCSCWebchatArn = arns.QCSCWebchat; // connect/queue

    const QCSCCBSpanishArn = arns.QCSCCBSpanish; // connect/queue

    const QCSCSpanishArn = arns.QCSCSpanish; // connect/queue

    const QMCOCBCollectRevoArn = arns.QMCOCBCollectRevo; // connect/queue

    const QCSCAgentAssistArn = arns.QCSCAgentAssist; // connect/queue

    const QMCOCollectRevoArn = arns.QMCOCollectRevo; // connect/queue

    const QCSCCustomerServiceCenterArn = arns.QCSCCustomerServiceCenter; // connect/queue

    const QSTFRegCigaretteTobaccoArn = arns.QSTFRegCigaretteTobacco; // connect/queue

    const QSTFCBRegEwasteTireIWMFArn = arns.QSTFCBRegEwasteTireIWMF; // connect/queue

    const QSTFRegTeleEnergyWaterArn = arns.QSTFRegTeleEnergyWater; // connect/queue

    const QSTFRegFuelUSTFCLPPFArn = arns.QSTFRegFuelUSTFCLPPF; // connect/queue

    const QSTFRegEwasteTireIWMFArn = arns.QSTFRegEwasteTireIWMF; // connect/queue

    const QSTFCBRegTeleEnergyWaterArn = arns.QSTFCBRegTeleEnergyWater; // connect/queue

    const QSTFRegAlcoholicBevArn = arns.QSTFRegAlcoholicBev; // connect/queue

    const QSTFCBRegCigaretteTobaccoArn = arns.QSTFCBRegCigaretteTobacco; // connect/queue

    const QSTFCBRegCannabisArn = arns.QSTFCBRegCannabis; // connect/queue

    const QSTFRegCannabisArn = arns.QSTFRegCannabis; // connect/queue

    const STFRetAgentDefaultTeam3Arn = arns.STFRetAgentDefaultTeam3; // connect/routing-profile

    const QMCOCBRetnAsstAppearArn = arns.QMCOCBRetnAsstAppear; // connect/queue

    const QMCOBillingRefundArn = arns.QMCOBillingRefund; // connect/queue

    const QMCOCBBillingRefundArn = arns.QMCOCBBillingRefund; // connect/queue

    const QMCOAuditQuestionsArn = arns.QMCOAuditQuestions; // connect/queue

    const QMCOScaleNoPmtArn = arns.QMCOScaleNoPmt; // connect/queue

    const QMCOCBScaleNoPmtArn = arns.QMCOCBScaleNoPmt; // connect/queue

    const QMCORetnAsstAppearArn = arns.QMCORetnAsstAppear; // connect/queue

    const QMCOCBAuditQuestionsArn = arns.QMCOCBAuditQuestions; // connect/queue

    const QCSCCBCustomerServiceCenterArn = arns.QCSCCBCustomerServiceCenter; // connect/queue

    const QSTFCBColDelinquenciesArn = arns.QSTFCBColDelinquencies; // connect/queue

    const QFODCBCollectionsArn = arns.QFODCBCollections; // connect/queue

    const QSTFCBColBillingsArn = arns.QSTFCBColBillings; // connect/queue

    const QSTFColDelinquenciesArn = arns.QSTFColDelinquencies; // connect/queue

    const QCSCCBEfileAssistanceArn = arns.QCSCCBEfileAssistance; // connect/queue

    const QCSCEfileAssistanceArn = arns.QCSCEfileAssistance; // connect/queue

    const QFODCollectionsArn = arns.QFODCollections; // connect/queue

    const QTRACBArn = arns.QTRACB; // connect/queue

    const QCSCNCWReturnedMailArn = arns.QCSCNCWReturnedMail; // connect/queue

    const QTRAQueueArn = arns.QTRAQueue; // connect/queue

    const STFRetAgentTeam3BTRArn = arns.STFRetAgentTeam3BTR; // connect/routing-profile

    const QTACBTaxAdvisorsArn = arns.QTACBTaxAdvisors; // connect/queue

    const QTATaxAdvisorsArn = arns.QTATaxAdvisors; // connect/queue

    const STFRetAgentTeam4BTRArn = arns.STFRetAgentTeam4BTR; // connect/routing-profile

    const QCUTSCBClearanceArn = arns.QCUTSCBClearance; // connect/queue

    const QCUTSCBAdvisoryArn = arns.QCUTSCBAdvisory; // connect/queue

    const QCUTSCBSpanishArn = arns.QCUTSCBSpanish; // connect/queue

    const QCUTSSpanishArn = arns.QCUTSSpanish; // connect/queue

    const QCUTSClearanceArn = arns.QCUTSClearance; // connect/queue

    const QCUTSAdvisoryArn = arns.QCUTSAdvisory; // connect/queue

    const STFRetAgentDefaultTeam1Arn = arns.STFRetAgentDefaultTeam1; // connect/routing-profile

    const STFRetAgentTeam1BTRArn = arns.STFRetAgentTeam1BTR; // connect/routing-profile

    const STFRetAgentDefaultTeam4Arn = arns.STFRetAgentDefaultTeam4; // connect/routing-profile

    const R634f5e69C8aa4f51B814C80959e885b7Arn = arns.R634f5e69C8aa4f51B814C80959e885b7; // connect/routing-profile

    const R5f60d558663748d0Ad9226fde7ab425bArn = arns.R5f60d558663748d0Ad9226fde7ab425b; // connect/routing-profile

    const R5cbd58aaA6c142edBb2bA8ad3d2aadbbArn = arns.R5cbd58aaA6c142edBb2bA8ad3d2aadbb; // connect/routing-profile

    const R5df28728F4514266A338Fe9dadeaccc7Arn = arns.R5df28728F4514266A338Fe9dadeaccc7; // connect/routing-profile

    const R525e2bb32a164326Bcc438ba11007cf0Arn = arns.R525e2bb32a164326Bcc438ba11007cf0; // connect/routing-profile

    const R5add775915e14ce6A06eE7a7ad5fa013Arn = arns.R5add775915e14ce6A06eE7a7ad5fa013; // connect/routing-profile

    const R598760670c6a4ac8810c96cc4c5dd2a2Arn = arns.R598760670c6a4ac8810c96cc4c5dd2a2; // connect/routing-profile

    const R5391027c68c84d0dBa9e8bf7be039676Arn = arns.R5391027c68c84d0dBa9e8bf7be039676; // connect/routing-profile

    const QSTFNoCallsArn = arns.QSTFNoCalls; // connect/queue

    const STFRetAgentTeam5BTRArn = arns.STFRetAgentTeam5BTR; // connect/routing-profile

    const QCSCTrainingArn = arns.QCSCTraining; // connect/queue

    const QCSCCBTrainingArn = arns.QCSCCBTraining; // connect/queue

    const QCSCNCW345Arn = arns.QCSCNCW345; // connect/queue

    const QOutboundCROSArn = arns.QOutboundCROS; // connect/queue

    const STFRetAgentTeam2BTRArn = arns.STFRetAgentTeam2BTR; // connect/routing-profile

    const QOutboundToAgentArn = arns.QOutboundToAgent; // connect/queue

    const QEFTCBAdvisoryArn = arns.QEFTCBAdvisory; // connect/queue

    const QEFTAdvisoryArn = arns.QEFTAdvisory; // connect/queue

    const AxyomAssistTestQueueArn = arns.AxyomAssistTestQueue; // connect/queue

    const QCSCNCWReturnedMailQuickConnectArn = arns.QCSCNCWReturnedMailQuickConnect; // connect/quick-connect

    const CSCAgentAssistanceArn = arns.CSCAgentAssistance; // connect/quick-connect

    const ZzzTestSMStoAgentArn = arns.ZzzTestSMStoAgent; // connect/contact-flow

    const CdtfaMcoReceptionLineArn = arns.CdtfaMcoReceptionLine; // connect/contact-flow

    const CdtfaQueueQuickConnectSpanishArn = arns.CdtfaQueueQuickConnectSpanish; // connect/contact-flow

    const EmergencyAndDisasterAssistanceHotlineQueueArn = arns.EmergencyAndDisasterAssistanceHotlineQueue; // connect/contact-flow

    const DefaultOutboundArn = arns.DefaultOutbound; // connect/contact-flow

    const CdtfaCustomerWhisperArn = arns.CdtfaCustomerWhisper; // connect/contact-flow

    const CdtfaVmAgentArn = arns.CdtfaVmAgent; // connect/contact-flow

    const DefaultCustomerQueueArn = arns.DefaultCustomerQueue; // connect/contact-flow

    const CdtfaCustomerQueueArn = arns.CdtfaCustomerQueue; // connect/contact-flow

    const VMAgentArn = arns.VMAgent; // connect/contact-flow

    const CdtfaOutboundSelectableArn = arns.CdtfaOutboundSelectable; // connect/contact-flow

    const DefaultCustomerHoldArn = arns.DefaultCustomerHold; // connect/contact-flow

    const ZzzEmailFlowArn = arns.ZzzEmailFlow; // connect/contact-flow

    const AgentWorkspacesDemoArn = arns.AgentWorkspacesDemo; // connect/contact-flow

    const CdtfaCutsVerifyUseTaxPaidMenuArn = arns.CdtfaCutsVerifyUseTaxPaidMenu; // connect/contact-flow

    const CdtfaCrosHotlineArn = arns.CdtfaCrosHotline; // connect/contact-flow

    const Dbfa43731aba42199a02E0b8871b02b3Arn = arns.Dbfa43731aba42199a02E0b8871b02b3; // connect/contact-flow

    const Bfd4b9507be34ca19c380a25773ecce1Arn = arns.Bfd4b9507be34ca19c380a25773ecce1; // connect/contact-flow

    const B14fc3342a454bb7A111678ebc855958Arn = arns.B14fc3342a454bb7A111678ebc855958; // connect/contact-flow

    const Afc8a36dEfb444cfB11eCac989dc5f0fArn = arns.Afc8a36dEfb444cfB11eCac989dc5f0f; // connect/contact-flow

    const R1b5814aaD4724f1aAed70769e26fa805Arn = arns.R1b5814aaD4724f1aAed70769e26fa805; // connect/contact-flow

    const ZzzCiscoTransferArn = arns.ZzzCiscoTransfer; // connect/contact-flow

    const CdtfaSutMenuArn = arns.CdtfaSutMenu; // connect/contact-flow

    const CdtfaStfRegistrationLicenseMenuArn = arns.CdtfaStfRegistrationLicenseMenu; // connect/contact-flow

    const CdtfaDisconnectFlowArn = arns.CdtfaDisconnectFlow; // connect/contact-flow

    const CdtfaEftMainMenuArn = arns.CdtfaEftMainMenu; // connect/contact-flow

    const CdtfaDispositionCodesArn = arns.CdtfaDispositionCodes; // connect/contact-flow

    const CdtfaHotmenuStfArn = arns.CdtfaHotmenuStf; // connect/contact-flow

    const AxyomAssistTestLiveAgentTransferArn = arns.AxyomAssistTestLiveAgentTransfer; // connect/contact-flow

    const CdtfaDisconnectSurveyArn = arns.CdtfaDisconnectSurvey; // connect/contact-flow

    const CdtfaChatDisconnectSurveyArn = arns.CdtfaChatDisconnectSurvey; // connect/contact-flow

    const CdtfaStfMenuArn = arns.CdtfaStfMenu; // connect/contact-flow

    const AxyomAssistMainMenuArn = arns.AxyomAssistMainMenu; // connect/contact-flow

    const CdtfaStfUsernameMenuArn = arns.CdtfaStfUsernameMenu; // connect/contact-flow

    const CdtfaLiveAgentTransferArn = arns.CdtfaLiveAgentTransfer; // connect/contact-flow

    const CdtfaEftFormsSubmenuArn = arns.CdtfaEftFormsSubmenu; // connect/contact-flow

    const CdtfaCallFrontEndWebcallArn = arns.CdtfaCallFrontEndWebcall; // connect/contact-flow

    const CdtfaCallbackArn = arns.CdtfaCallback; // connect/contact-flow

    const AxyomAssistQueueTransferArn = arns.AxyomAssistQueueTransfer; // connect/contact-flow

    const B86da98315ff402fBe449073a8edb23eArn = arns.B86da98315ff402fBe449073a8edb23e; // connect/contact-flow

    const R54e60b6071c04dc799d25aed77f7da89Arn = arns.R54e60b6071c04dc799d25aed77f7da89; // connect/contact-flow

    const R03fc568774a84a1a9be3B5f763ddc80aArn = arns.R03fc568774a84a1a9be3B5f763ddc80a; // connect/contact-flow

    const R84a3bca5A90f4031B7e38abd8ae8a359Arn = arns.R84a3bca5A90f4031B7e38abd8ae8a359; // connect/contact-flow

    const R1bec1ef46df947da80816e47bf5912b3Arn = arns.R1bec1ef46df947da80816e47bf5912b3; // connect/contact-flow

    const F0e6a7893d314bb192709d8fd612dcc7Arn = arns.F0e6a7893d314bb192709d8fd612dcc7; // connect/contact-flow

    const D0518895083b4f7dB20e9f5b9824b3b1Arn = arns.D0518895083b4f7dB20e9f5b9824b3b1; // connect/contact-flow

    const A9cedcf8899743a6A259F2842a2b15a0Arn = arns.A9cedcf8899743a6A259F2842a2b15a0; // connect/contact-flow

    const R6e18f4e97942435e9d42B01066c3ebddArn = arns.R6e18f4e97942435e9d42B01066c3ebdd; // connect/contact-flow

    const R42db741c894c4ed8B8d7E22b5536251eArn = arns.R42db741c894c4ed8B8d7E22b5536251e; // connect/contact-flow

    const TaskQueueToCSCNCW345Arn = arns.TaskQueueToCSCNCW345; // connect/contact-flow

    const AxyomAssistShowViewArn = arns.AxyomAssistShowView; // connect/contact-flow

    const ZzzAndrewTestArn = arns.ZzzAndrewTest; // connect/contact-flow

    const CdtfaOutboundRobodialerArn = arns.CdtfaOutboundRobodialer; // connect/contact-flow

    const CdtfaOutboundRobodialToAgentArn = arns.CdtfaOutboundRobodialToAgent; // connect/contact-flow

    const TestingFlowDeleteAfter1030Arn = arns.TestingFlowDeleteAfter1030; // connect/contact-flow

    const TestQueueToTaskWithAssistanceArn = arns.TestQueueToTaskWithAssistance; // connect/contact-flow

    const CdtfaEftDebitCreditSubmenuArn = arns.CdtfaEftDebitCreditSubmenu; // connect/contact-flow

    const CdtfaCutsMenuArn = arns.CdtfaCutsMenu; // connect/contact-flow

    const CdtfaCutsClearanceRequestSubmenuArn = arns.CdtfaCutsClearanceRequestSubmenu; // connect/contact-flow

    const CdtfaSpareArn = arns.CdtfaSpare; // connect/contact-flow

    const TaskQueueToCSCReturnedMailArn = arns.TaskQueueToCSCReturnedMail; // connect/contact-flow

    const CdtfaTraMenuArn = arns.CdtfaTraMenu; // connect/contact-flow

    const CdtfaEftTransToCscMenuArn = arns.CdtfaEftTransToCscMenu; // connect/contact-flow

    const AutoEvalACCFs1N766E7Y9Y9QSSurveyArn = arns.AutoEvalACCFs1N766E7Y9Y9QSSurvey; // connect/contact-flow

    const CdtfaTaxRatesIvrArn = arns.CdtfaTaxRatesIvr; // connect/contact-flow

    const CdtfaCutsVerifyClearanceMenuArn = arns.CdtfaCutsVerifyClearanceMenu; // connect/contact-flow

    const AxyomAssistShowViewTestArn = arns.AxyomAssistShowViewTest; // connect/contact-flow

    const CdtfaHotmenu1Arn = arns.CdtfaHotmenu1; // connect/contact-flow

    const CdtfaEftAchCreditSubmenuArn = arns.CdtfaEftAchCreditSubmenu; // connect/contact-flow

    const R0308f24575f248669d802118039c5a48Arn = arns.R0308f24575f248669d802118039c5a48; // connect/contact-flow

    const R02ae6280Fb0e434681495719f4e7b909Arn = arns.R02ae6280Fb0e434681495719f4e7b909; // connect/contact-flow

    const R25c345601b41400fAd9c34f593616e23Arn = arns.R25c345601b41400fAd9c34f593616e23; // connect/contact-flow

    const R9c0ab1d7Bdf94dc488beCbee539229f2Arn = arns.R9c0ab1d7Bdf94dc488beCbee539229f2; // connect/contact-flow

    const R65c57ebe21424186A729B3807b03ac13Arn = arns.R65c57ebe21424186A729B3807b03ac13; // connect/contact-flow

    const A121ec469b9644ea8fc287dca53dbc41Arn = arns.A121ec469b9644ea8fc287dca53dbc41; // connect/contact-flow

    const R7e6f4a9b6af24122B9280dbac2585c04Arn = arns.R7e6f4a9b6af24122B9280dbac2585c04; // connect/contact-flow

    const Cb59555e85e54b88B6c966efef913f0bArn = arns.Cb59555e85e54b88B6c966efef913f0b; // connect/contact-flow

    const Fe3f80ac12944496Bd30B96826aa1254Arn = arns.Fe3f80ac12944496Bd30B96826aa1254; // connect/contact-flow

    const C8532f6dA87744a1A5d77b4015e21c85Arn = arns.C8532f6dA87744a1A5d77b4015e21c85; // connect/contact-flow

    const FlowTest1Uatq5r75tvArn = arns.FlowTest1Uatq5r75tv; // connect/contact-flow

    const AxyomAssistAgentWhisperArn = arns.AxyomAssistAgentWhisper; // connect/contact-flow

    const AxyomAssistAgentWhisperTestArn = arns.AxyomAssistAgentWhisperTest; // connect/contact-flow

    const DefaultAgentHoldArn = arns.DefaultAgentHold; // connect/contact-flow

    const FlowTestSMS6Hqlxe12259Arn = arns.FlowTestSMS6Hqlxe12259; // connect/contact-flow

    const CdtfaAgentQuickConnectArn = arns.CdtfaAgentQuickConnect; // connect/contact-flow

    const CdtfaDirectDialWhisperArn = arns.CdtfaDirectDialWhisper; // connect/contact-flow

    const R0ca8a108120f4cdaA870B986619333b7QueueArn = arns.R0ca8a108120f4cdaA870B986619333b7Queue; // connect/queue

    const R0cfaac91Af984de59df393740d94d2b0QueueArn = arns.R0cfaac91Af984de59df393740d94d2b0Queue; // connect/queue

    const R0c8c799a32db44679681D84f3b9700a3QueueArn = arns.R0c8c799a32db44679681D84f3b9700a3Queue; // connect/queue

    const R0dfa7746Edae4bcd93131d4758efbd71QueueArn = arns.R0dfa7746Edae4bcd93131d4758efbd71Queue; // connect/queue

    const R0cd263006e09467eB015B28032798b83QueueArn = arns.R0cd263006e09467eB015B28032798b83Queue; // connect/queue

    const R0d78750122924a098a91Aef756121dc4QueueArn = arns.R0d78750122924a098a91Aef756121dc4Queue; // connect/queue

    const R0ca8a68c2c1448e9B33001c62fdb60efQueueArn = arns.R0ca8a68c2c1448e9B33001c62fdb60efQueue; // connect/queue

    const R0cba70c9Af394fffB105474ac00d391cQueueArn = arns.R0cba70c9Af394fffB105474ac00d391cQueue; // connect/queue

    const R0cbb3bac8cae427586267a3f51cfc128QueueArn = arns.R0cbb3bac8cae427586267a3f51cfc128Queue; // connect/queue

    const R0d1e2b4fA48f49d982d980dd3e1a8121QueueArn = arns.R0d1e2b4fA48f49d982d980dd3e1a8121Queue; // connect/queue

    const R0c5ffa38Aa6e4310B63aDfbeed0b6262QueueArn = arns.R0c5ffa38Aa6e4310B63aDfbeed0b6262Queue; // connect/queue

    const R0c7957e1E49b4a999886F05104864e01QueueArn = arns.R0c7957e1E49b4a999886F05104864e01Queue; // connect/queue

    const R0b270516E9c04b6588fc217db5d44d4dQueueArn = arns.R0b270516E9c04b6588fc217db5d44d4dQueue; // connect/queue

    const R0ad5421391664f80980fEe4b0ee8f31eQueueArn = arns.R0ad5421391664f80980fEe4b0ee8f31eQueue; // connect/queue

    const R0c6171f1E2114483890f6e2772f36fdcQueueArn = arns.R0c6171f1E2114483890f6e2772f36fdcQueue; // connect/queue

    const R0b33c8bfB0ab42ec9fcd3e2f333fa115QueueArn = arns.R0b33c8bfB0ab42ec9fcd3e2f333fa115Queue; // connect/queue

    const R0adb3160B2a74885B69eBd4ae7bb5f81QueueArn = arns.R0adb3160B2a74885B69eBd4ae7bb5f81Queue; // connect/queue

    const R0b10188d552b43ceA6a356bcbf98aebfQueueArn = arns.R0b10188d552b43ceA6a356bcbf98aebfQueue; // connect/queue

    const R0c7011581f3a4b6e9e5635316ed06addQueueArn = arns.R0c7011581f3a4b6e9e5635316ed06addQueue; // connect/queue

    const R0a911c5481da419181f515a36d417262QueueArn = arns.R0a911c5481da419181f515a36d417262Queue; // connect/queue

    const R097dcf6bF939407d99d956568b2d2fd4QueueArn = arns.R097dcf6bF939407d99d956568b2d2fd4Queue; // connect/queue

    const R096ea9881fed4cd79279B936973ea683QueueArn = arns.R096ea9881fed4cd79279B936973ea683Queue; // connect/queue

    const R09654853370244ccAd97C7af970316daQueueArn = arns.R09654853370244ccAd97C7af970316daQueue; // connect/queue

    const R09dc2c36A2e9421eAbf936a9b85736d8QueueArn = arns.R09dc2c36A2e9421eAbf936a9b85736d8Queue; // connect/queue

    const R0a65c07cD37d40019b6d908cc607886eQueueArn = arns.R0a65c07cD37d40019b6d908cc607886eQueue; // connect/queue

    const R0a36a42f81e74454Af1dB9e27988ebbeQueueArn = arns.R0a36a42f81e74454Af1dB9e27988ebbeQueue; // connect/queue

    const R0a1d33acCb7f4a6a8452929065df5ad3QueueArn = arns.R0a1d33acCb7f4a6a8452929065df5ad3Queue; // connect/queue

    const R0a125238E7054b678272C47780324894QueueArn = arns.R0a125238E7054b678272C47780324894Queue; // connect/queue

    const R0a4f55c63f6a42c1840e101b92bf1d0aQueueArn = arns.R0a4f55c63f6a42c1840e101b92bf1d0aQueue; // connect/queue

    const QEFTTransferToCSCArn = arns.QEFTTransferToCSC; // connect/queue

    const R095050899bdf4721A2394250362675b6QueueArn = arns.R095050899bdf4721A2394250362675b6Queue; // connect/queue

    const R0850632e471247a5Ab2f8c186381d033QueueArn = arns.R0850632e471247a5Ab2f8c186381d033Queue; // connect/queue

    const R08052db9Ccfc4c9fBde18b7f780dbd51QueueArn = arns.R08052db9Ccfc4c9fBde18b7f780dbd51Queue; // connect/queue

    const R0884bd70Af034802B0eb05c3609c384fQueueArn = arns.R0884bd70Af034802B0eb05c3609c384fQueue; // connect/queue

    const R07da137fA4ac4775Bad9001563383a04QueueArn = arns.R07da137fA4ac4775Bad9001563383a04Queue; // connect/queue

    const R091f0cd637a0458188781349ac679f0fQueueArn = arns.R091f0cd637a0458188781349ac679f0fQueue; // connect/queue

    const R08bfaa24Cd7945caB6e7F360ea6b8c7dQueueArn = arns.R08bfaa24Cd7945caB6e7F360ea6b8c7dQueue; // connect/queue

    const R0834f542Df154997A1f815acb5ecb0dcQueueArn = arns.R0834f542Df154997A1f815acb5ecb0dcQueue; // connect/queue

    const R07f603c1C307436a88ce0a3cc96ae691QueueArn = arns.R07f603c1C307436a88ce0a3cc96ae691Queue; // connect/queue

    const R07c4229e14684d4dA7f272d3fbcb25c6QueueArn = arns.R07c4229e14684d4dA7f272d3fbcb25c6Queue; // connect/queue

    const R07899809F966481882e74b5700386921QueueArn = arns.R07899809F966481882e74b5700386921Queue; // connect/queue

    const R066c2c86C98b4d6aA1e3B150b2e53279QueueArn = arns.R066c2c86C98b4d6aA1e3B150b2e53279Queue; // connect/queue

    const R06add765706048eb90e52db1d231b1cdQueueArn = arns.R06add765706048eb90e52db1d231b1cdQueue; // connect/queue

    const R07178e13B2524413905390cbd1eae172QueueArn = arns.R07178e13B2524413905390cbd1eae172Queue; // connect/queue

    const R062a10ab78d34ef4B4e07b17c94425cfQueueArn = arns.R062a10ab78d34ef4B4e07b17c94425cfQueue; // connect/queue

    const R0632922e4dde48c48c007deede9b464cQueueArn = arns.R0632922e4dde48c48c007deede9b464cQueue; // connect/queue

    const R06b7905dE398492cA0897ded441d92edQueueArn = arns.R06b7905dE398492cA0897ded441d92edQueue; // connect/queue

    const R05f19804F4e0435fB0e313b3a3c8abbaQueueArn = arns.R05f19804F4e0435fB0e313b3a3c8abbaQueue; // connect/queue

    const R06822cd3691247f5Bbdd87523e36e41aQueueArn = arns.R06822cd3691247f5Bbdd87523e36e41aQueue; // connect/queue

    const R05c0576762b64490B537E8ae2b337e18QueueArn = arns.R05c0576762b64490B537E8ae2b337e18Queue; // connect/queue

    const R055ff74331a54762A2cf64bdf810f4e5QueueArn = arns.R055ff74331a54762A2cf64bdf810f4e5Queue; // connect/queue

    const R04bcddd2034442acBae4322dd1eebc3dQueueArn = arns.R04bcddd2034442acBae4322dd1eebc3dQueue; // connect/queue

    const R05b5af8eBc1e4143A3025bc75295774dQueueArn = arns.R05b5af8eBc1e4143A3025bc75295774dQueue; // connect/queue

    const R049db6f93dab4b1a9157189cec2ff2beQueueArn = arns.R049db6f93dab4b1a9157189cec2ff2beQueue; // connect/queue

    const R0590dd065f774859Bb57Be1f4f1221c7QueueArn = arns.R0590dd065f774859Bb57Be1f4f1221c7Queue; // connect/queue

    const R04949ae67ed24e24A7d314cecae54085QueueArn = arns.R04949ae67ed24e24A7d314cecae54085Queue; // connect/queue

    const R0593a204295647d8A80cF29e031b4e4bQueueArn = arns.R0593a204295647d8A80cF29e031b4e4bQueue; // connect/queue

    const R04a515c0Ef6c4cd1B74fD93832c859d1QueueArn = arns.R04a515c0Ef6c4cd1B74fD93832c859d1Queue; // connect/queue

    const R05a57c209fce4f939d21Ea5987270387QueueArn = arns.R05a57c209fce4f939d21Ea5987270387Queue; // connect/queue

    const R04eed23a715342adA1850d096e11cfbfQueueArn = arns.R04eed23a715342adA1850d096e11cfbfQueue; // connect/queue

    const R02d92536E2ad44bdBfdcBd5b001d9b23QueueArn = arns.R02d92536E2ad44bdBfdcBd5b001d9b23Queue; // connect/queue

    const R02f5d3c6D5114d199d9c1c32ea8ed478QueueArn = arns.R02f5d3c6D5114d199d9c1c32ea8ed478Queue; // connect/queue

    const R0417692bE70345faB121992b20d02fcdQueueArn = arns.R0417692bE70345faB121992b20d02fcdQueue; // connect/queue

    const R03c6d2e886144795B64168c0f4d6aa58QueueArn = arns.R03c6d2e886144795B64168c0f4d6aa58Queue; // connect/queue

    const R040d7bbdBed54346Bdee54b08f06e957QueueArn = arns.R040d7bbdBed54346Bdee54b08f06e957Queue; // connect/queue

    const R03e40f7cB812415d975b91a484e90042QueueArn = arns.R03e40f7cB812415d975b91a484e90042Queue; // connect/queue

    const R02c9b02b24dd432d84f8F4e2b21d274fQueueArn = arns.R02c9b02b24dd432d84f8F4e2b21d274fQueue; // connect/queue

    const R03c6bce42df949beA7c61f2a3046e3ebQueueArn = arns.R03c6bce42df949beA7c61f2a3046e3ebQueue; // connect/queue

    const R03b9b19dE34447ceA0e9Dd8e703db338QueueArn = arns.R03b9b19dE34447ceA0e9Dd8e703db338Queue; // connect/queue

    const R03fceea8E15f44cd9ada998aabf5af92QueueArn = arns.R03fceea8E15f44cd9ada998aabf5af92Queue; // connect/queue

    const R01d8a6b75f594a5bBa13116776b7cea1QueueArn = arns.R01d8a6b75f594a5bBa13116776b7cea1Queue; // connect/queue

    const R01b805a0Cbcf48808cdf33421050babeQueueArn = arns.R01b805a0Cbcf48808cdf33421050babeQueue; // connect/queue

    const R027688b045a9431a9524Ddf2073b6c42QueueArn = arns.R027688b045a9431a9524Ddf2073b6c42Queue; // connect/queue

    const R0219768c2f4940ceA0d978102c85c6ebQueueArn = arns.R0219768c2f4940ceA0d978102c85c6ebQueue; // connect/queue

    const R01920ea001284cff83c24a1e5c21ce52QueueArn = arns.R01920ea001284cff83c24a1e5c21ce52Queue; // connect/queue

    const R0212cf2cC8034c2bB14fC9021c2e92aeQueueArn = arns.R0212cf2cC8034c2bB14fC9021c2e92aeQueue; // connect/queue

    const R018c338b976e4811982394040900c1c0QueueArn = arns.R018c338b976e4811982394040900c1c0Queue; // connect/queue

    const R02a06becEb904da39f286a637f5e7462QueueArn = arns.R02a06becEb904da39f286a637f5e7462Queue; // connect/queue

    const R021761949f8d434a9cf8Fa457973563cQueueArn = arns.R021761949f8d434a9cf8Fa457973563cQueue; // connect/queue

    const R02136eae65244608Bf4aF9454b405d64QueueArn = arns.R02136eae65244608Bf4aF9454b405d64Queue; // connect/queue

    const R01462b214b3a43ff8b4fBa916aa062fbQueueArn = arns.R01462b214b3a43ff8b4fBa916aa062fbQueue; // connect/queue

    const R00cca8a20f7e48fbA1e9A0eaf2c977beQueueArn = arns.R00cca8a20f7e48fbA1e9A0eaf2c977beQueue; // connect/queue

    const R0164f8453d974c65A70455f18c10aee9QueueArn = arns.R0164f8453d974c65A70455f18c10aee9Queue; // connect/queue

    const R0072de8110ce4ea7Baf331cc4ef6fe4bQueueArn = arns.R0072de8110ce4ea7Baf331cc4ef6fe4bQueue; // connect/queue

    const R00def492Cd524e8aB2060b22cb1f652bQueueArn = arns.R00def492Cd524e8aB2060b22cb1f652bQueue; // connect/queue

    const R00b5bfb4De644371BbbcF302868ee1ceQueueArn = arns.R00b5bfb4De644371BbbcF302868ee1ceQueue; // connect/queue

    const R00684b71Dbe54a26Bbf96c0e557689c1QueueArn = arns.R00684b71Dbe54a26Bbf96c0e557689c1Queue; // connect/queue

    const R0160f56dDeb94bd0A1e9C2cb5787d058QueueArn = arns.R0160f56dDeb94bd0A1e9C2cb5787d058Queue; // connect/queue

    const R00a35b293f684cacA45801908c5c0cdeQueueArn = arns.R00a35b293f684cacA45801908c5c0cdeQueue; // connect/queue

    const R01210ae64ac845cbB7668623c3192657QueueArn = arns.R01210ae64ac845cbB7668623c3192657Queue; // connect/queue

    const R003ed863D232445893650f72b64bc7a7QueueArn = arns.R003ed863D232445893650f72b64bc7a7Queue; // connect/queue

    const R004a2aa6Fc14414995c12c1ce29ac947QueueArn = arns.R004a2aa6Fc14414995c12c1ce29ac947Queue; // connect/queue

    const AdminArn = arns.Admin; // connect/security-profile

    const AgentArn = arns.Agent; // connect/security-profile

    const R6b570b7e541744f6A3e15e58a1064095Arn = arns.R6b570b7e541744f6A3e15e58a1064095; // connect/security-profile

    const R067c5c50B8d34e65B029D7b0a88fabfcArn = arns.R067c5c50B8d34e65B029D7b0a88fabfc; // connect/security-profile

    const R506d9d3566ae422eA377199d827fb7d2Arn = arns.R506d9d3566ae422eA377199d827fb7d2; // connect/security-profile

    const R1c1ec8aaCe914cfc921b7ab3afb5865eArn = arns.R1c1ec8aaCe914cfc921b7ab3afb5865e; // connect/security-profile

    const R856105fa235a45278b7e8dea98e01f4bArn = arns.R856105fa235a45278b7e8dea98e01f4b; // connect/security-profile

    const A4cf6d7cF4744cffA5811e208f778132Arn = arns.A4cf6d7cF4744cffA5811e208f778132; // connect/security-profile

    const R27ba8c5cB96649a789f7727624ef716eArn = arns.R27ba8c5cB96649a789f7727624ef716e; // connect/security-profile

    const Bd7f790293f248cc90c4624052ce68e2Arn = arns.Bd7f790293f248cc90c4624052ce68e2; // connect/security-profile

    const B2055938F91d4b69B04a3b4005613291Arn = arns.B2055938F91d4b69B04a3b4005613291; // connect/security-profile

    const Ae90fb6458ca48fcA3eb0e0946e43033Arn = arns.Ae90fb6458ca48fcA3eb0e0946e43033; // connect/security-profile

    const CustomerQueuewavArn = arns.CustomerQueuewav; // connect/prompt

    const CustomerHoldwavArn = arns.CustomerHoldwav; // connect/prompt

    const BeepwavArn = arns.Beepwav; // connect/prompt

    const PhoneDisconnectedToneArn = arns.PhoneDisconnectedTone; // connect/prompt

    const MusicRockEverywhereTheSunShinesInstwavArn = arns.MusicRockEverywhereTheSunShinesInstwav; // connect/prompt

    const MusicJazzMyTimetoFlyInstwavArn = arns.MusicJazzMyTimetoFlyInstwav; // connect/prompt

    const CombinedLanguageSelectionArn = arns.CombinedLanguageSelection; // connect/prompt

    const NewRatesApril20251Arn = arns.NewRatesApril20251; // connect/prompt

    const JazzTrim4Arn = arns.JazzTrim4; // connect/prompt

    const MusicPopThrowYourselfInFrontOfItInstwavArn = arns.MusicPopThrowYourselfInFrontOfItInstwav; // connect/prompt

    const SilenceArn = arns.Silence; // connect/prompt

    const JazzTrim2Arn = arns.JazzTrim2; // connect/prompt

    const NewRatesApril20252Arn = arns.NewRatesApril20252; // connect/prompt

    const JazzTrim1Arn = arns.JazzTrim1; // connect/prompt

    const ScreenShareDetailsArn = arns.ScreenShareDetails; // connect/predefined-attribute

    const ValidationTestTypeArn = arns.ValidationTestType; // connect/predefined-attribute

    const TrafficTypeArn = arns.TrafficType; // connect/predefined-attribute

    const XSESSPAMVERDICTArn = arns.XSESSPAMVERDICT; // connect/predefined-attribute

    const ScreenSharingDetailsArn = arns.ScreenSharingDetails; // connect/predefined-attribute

    const SubtypeArn = arns.Subtype; // connect/predefined-attribute

    const XSESVIRUSVERDICTArn = arns.XSESVIRUSVERDICT; // connect/predefined-attribute

    const MusicPopThisAndThatIsLifeInstwavArn = arns.MusicPopThisAndThatIsLifeInstwav; // connect/prompt

    const JazzTrim3Arn = arns.JazzTrim3; // connect/prompt

    const BrandingArn = arns.Branding; // connect/prompt

    const EmailSubjectArn = arns.EmailSubject; // connect/predefined-attribute

    const LanguageArn = arns.Language; // connect/predefined-attribute

    const ContactExpiryArn = arns.ContactExpiry; // connect/predefined-attribute

    const AssignmentTypeArn = arns.AssignmentType; // connect/predefined-attribute

    const CreatedByUserArn = arns.CreatedByUser; // connect/predefined-attribute

    const CustomerAuthenticationArn = arns.CustomerAuthentication; // connect/predefined-attribute

    const DirectionArn = arns.Direction; // connect/predefined-attribute

    const RedactedEmailSubjectArn = arns.RedactedEmailSubject; // connect/predefined-attribute

    const R28d9bc16A2644e39B06980a83586de12Arn = arns.R28d9bc16A2644e39B06980a83586de12; // connect/flow-module

    const R236afb9bFcf145ddB986Fc54e0c86309Arn = arns.R236afb9bFcf145ddB986Fc54e0c86309; // connect/flow-module

    const R41b65fa096b14d80Ad73E1f9e06a0725Arn = arns.R41b65fa096b14d80Ad73E1f9e06a0725; // connect/flow-module

    const R13d6792b561f4b259cdaB186d297d975Arn = arns.R13d6792b561f4b259cdaB186d297d975; // connect/flow-module

    const A694c2baA59940e7Ac51B6200b453aceArn = arns.A694c2baA59940e7Ac51B6200b453ace; // connect/flow-module

    const R24426289823b404d860aEf40b4a3fb8dArn = arns.R24426289823b404d860aEf40b4a3fb8d; // connect/routing-profile

    const R7e48e8fa8fab476aA4a7647dd38fbb4dArn = arns.R7e48e8fa8fab476aA4a7647dd38fbb4d; // connect/flow-module

    const STFMainArn = arns.STFMain; // connect/operating-hours

    const STFReturnArn = arns.STFReturn; // connect/operating-hours

    const WebChatArn = arns.WebChat; // connect/operating-hours

    const CSCAgentAssistArn = arns.CSCAgentAssist; // connect/operating-hours

    const BasicHoursArn = arns.BasicHours; // connect/operating-hours

    const CDTFAMainMenuArn = arns.CDTFAMainMenu; // connect/operating-hours

    const TSDCROSArn = arns.TSDCROS; // connect/operating-hours

    const TATaxAdvisorsArn = arns.TATaxAdvisors; // connect/operating-hours

    const CUTSMenuArn = arns.CUTSMenu; // connect/operating-hours

    const EFTAdvisoryArn = arns.EFTAdvisory; // connect/operating-hours

    const STFRegistrationOperatingHoursArn = arns.STFRegistrationOperatingHours; // connect/operating-hours

    const OfflineArn = arns.Offline; // connect/agent-state

    const R5MinuteBreakArn = arns.R5MinuteBreak; // connect/agent-state

    const NameArn = arns.Name; // connect/agent-state

    const CallEvaluationsArn = arns.CallEvaluations; // connect/agent-state

    const R15MinuteBreakArn = arns.R15MinuteBreak; // connect/agent-state

    const AdministrativeArn = arns.Administrative; // connect/agent-state

    const MCOMainMenuArn = arns.MCOMainMenu; // connect/operating-hours

    const STFCollectionsOperatingHoursArn = arns.STFCollectionsOperatingHours; // connect/operating-hours

    const USCustomsOperatingHoursArn = arns.USCustomsOperatingHours; // connect/operating-hours

    const TRAArn = arns.TRA; // connect/operating-hours

    const NCWCloseoutsArn = arns.NCWCloseouts; // connect/agent-state

    const NotReady0Arn = arns.NotReady0; // connect/agent-state

    const LunchArn = arns.Lunch; // connect/agent-state

    const LiveChatArn = arns.LiveChat; // connect/agent-state

    const NCWReturnedMailArn = arns.NCWReturnedMail; // connect/agent-state

    const NCWOtherArn = arns.NCWOther; // connect/agent-state

    const NotScheduledArn = arns.NotScheduled; // connect/agent-state

    const MeetingArn = arns.Meeting; // connect/agent-state

    const TrainerDutiesArn = arns.TrainerDuties; // connect/agent-state

    const ExtendedACWArn = arns.ExtendedACW; // connect/agent-state

    const Ba7fa70016cb4b21A23c533e4e17b5b3Arn = arns.Ba7fa70016cb4b21A23c533e4e17b5b3; // connect/view

    const ReferralsArn = arns.Referrals; // connect/agent-state

    const ReceptionArn = arns.Reception; // connect/agent-state

    const TrainingArn = arns.Training; // connect/agent-state

    const PersonalArn = arns.Personal; // connect/agent-state

    const TechnicalArn = arns.Technical; // connect/agent-state

    const AvailableArn = arns.Available; // connect/agent-state

    const ListArn = arns.List; // connect/unknown

    const FormArn = arns.Form; // connect/unknown

    const DetailArn = arns.Detail; // connect/unknown

    const LATESTArn = arns.LATEST; // connect/view

    const ConfirmationArn = arns.Confirmation; // connect/unknown

    const CardsArn = arns.Cards; // connect/unknown

    const AfterContactWorkArn = arns.AfterContactWork; // connect/unknown

    const AWSServiceRoleForAmazonConnectRuG9VdlH2DkpwKrScAXX = iam.Role.fromRoleArn(this, 'AWSServiceRoleForAmazonConnectRuG9VdlH2DkpwKrScAXX', arns.AWSServiceRoleForAmazonConnectRuG9VdlH2DkpwKrScAXX);

    const AmazonConnectServiceLinkedRolePolicy = iam.ManagedPolicy.fromManagedPolicyArn(this, 'AmazonConnectServiceLinkedRolePolicy', arns.AmazonConnectServiceLinkedRolePolicy);

    const R19168442116Arn = arns.R19168442116; // connect/phone-number

    const R12792023718Arn = arns.R12792023718; // connect/phone-number

    const R19166335587Arn = arns.R19166335587; // connect/phone-number

    const R19169055280Arn = arns.R19169055280; // connect/phone-number

    const R19166335523Arn = arns.R19166335523; // connect/phone-number

    const R19169055284Arn = arns.R19169055284; // connect/phone-number

    const R12792023676Arn = arns.R12792023676; // connect/phone-number

    const R0ae506d227744686A12364477f9b36f9Arn = arns.R0ae506d227744686A12364477f9b36f9; // connect/flow-module

    const Fa86c8f1554243b29859Db3ba55cc3c1Arn = arns.Fa86c8f1554243b29859Db3ba55cc3c1; // connect/flow-module

    const R7addeec8752440659e30E23db280b47fArn = arns.R7addeec8752440659e30E23db280b47f; // connect/flow-module

    const ClosingOtherQuestionsArn = arns.ClosingOtherQuestions; // connect/rule

    const R14046719864Arn = arns.R14046719864; // connect/phone-number

    const R12138773853Arn = arns.R12138773853; // connect/phone-number

    const R19166335118Arn = arns.R19166335118; // connect/phone-number

    const Fc0ec9c65a65407dB8342f15e4c2fc70Arn = arns.Fc0ec9c65a65407dB8342f15e4c2fc70; // connect/flow-module

    const Bd89f737F10445dcB81c23096bff37ddArn = arns.Bd89f737F10445dcB81c23096bff37dd; // connect/flow-module

    const R84831b48A75b4d189e6f403409e694d3Arn = arns.R84831b48A75b4d189e6f403409e694d3; // connect/flow-module

    const CSCTransferEntryArn = arns.CSCTransferEntry; // connect/contact-flow

    const AgentAssistEntryArn = arns.AgentAssistEntry; // connect/contact-flow

    const DirectDialInboundArn = arns.DirectDialInbound; // connect/contact-flow

    const DirectDialCustomerQueueArn = arns.DirectDialCustomerQueue; // connect/contact-flow

    const TaxEvasionEntryArn = arns.TaxEvasionEntry; // connect/contact-flow

    const TaxPractitionerEntryArn = arns.TaxPractitionerEntry; // connect/contact-flow

    const CUTSEntryArn = arns.CUTSEntry; // connect/contact-flow

    const NCWCloseoutsEntryArn = arns.NCWCloseoutsEntry; // connect/contact-flow

    const WebChatToAgentTransferArn = arns.WebChatToAgentTransfer; // connect/contact-flow

    const CDTFAEntryArn = arns.CDTFAEntry; // connect/contact-flow

    const R02b6855285984adbAa3a8152aa2ac153Arn = arns.R02b6855285984adbAa3a8152aa2ac153; // connect/contact-flow

    const CROSACDEntryArn = arns.CROSACDEntry; // connect/contact-flow

    const EFTClosedOutsideHoursArn = arns.EFTClosedOutsideHours; // connect/contact-flow

    const EFTEntryArn = arns.EFTEntry; // connect/contact-flow

    const TaxAdvisorsEntryArn = arns.TaxAdvisorsEntry; // connect/contact-flow

    const ZMigrationFlowArn = arns.ZMigrationFlow; // connect/contact-flow

    const EFTAuthorizationAgreementMenuArn = arns.EFTAuthorizationAgreementMenu; // connect/contact-flow

    const TRAEntryArn = arns.TRAEntry; // connect/contact-flow

    const CSCDirectEntryArn = arns.CSCDirectEntry; // connect/contact-flow

    const SurveyTestFlowArn = arns.SurveyTestFlow; // connect/contact-flow

    const UtilityRouteTaskToAgentArn = arns.UtilityRouteTaskToAgent; // connect/contact-flow

    const EFTACHDebitSubmenuArn = arns.EFTACHDebitSubmenu; // connect/contact-flow

    const CollectionsMenuArn = arns.CollectionsMenu; // connect/contact-flow

    const SpanishEntryArn = arns.SpanishEntry; // connect/contact-flow

    const TrainingEntryArn = arns.TrainingEntry; // connect/contact-flow

    const STFCollectionsMenuArn = arns.STFCollectionsMenu; // connect/contact-flow

    const R7bab2d576ad349ef8b59Aca3af014622Arn = arns.R7bab2d576ad349ef8b59Aca3af014622; // connect/contact-flow

    const E3f0286e9f544bd6Af18B179718b1647Arn = arns.E3f0286e9f544bd6Af18B179718b1647; // connect/contact-flow

    const D03a70cc1f0f4eb4930e51c45a429db8Arn = arns.D03a70cc1f0f4eb4930e51c45a429db8; // connect/contact-flow

    const R45095ff73b18482bAa2149c734491c7aArn = arns.R45095ff73b18482bAa2149c734491c7a; // connect/contact-flow

    const R93d2f7faFaf14b51B6b425af7c02c113Arn = arns.R93d2f7faFaf14b51B6b425af7c02c113; // connect/contact-flow

    const QualityAnalystArn = arns.QualityAnalyst; // connect/security-profile

    const CallCenterManagerArn = arns.CallCenterManager; // connect/security-profile

    const CerritosFieldOfficeArn = arns.CerritosFieldOffice; // connect/quick-connect

    const TAGMounLouieArn = arns.TAGMounLouie; // connect/quick-connect

    const STFTimberTaxReturnsArn = arns.STFTimberTaxReturns; // connect/quick-connect

    const TAGJoeyZizileuskasArn = arns.TAGJoeyZizileuskas; // connect/quick-connect

    const STFRETFirearmAndAmmunitionExciseTaxArn = arns.STFRETFirearmAndAmmunitionExciseTax; // connect/quick-connect

    const TAGJulietNantegeArn = arns.TAGJulietNantege; // connect/quick-connect

    const DiamondBarFieldOfficeArn = arns.DiamondBarFieldOffice; // connect/quick-connect

    const STFIntegratedWasteManagementRegArn = arns.STFIntegratedWasteManagementReg; // connect/quick-connect

    const GlendaleFieldOfficeArn = arns.GlendaleFieldOffice; // connect/quick-connect

    const TestCSCAgentAssistArn = arns.TestCSCAgentAssist; // connect/quick-connect

    const STFRETCigaretteTobaccoArn = arns.STFRETCigaretteTobacco; // connect/quick-connect

    const VoicemailTemplateArn = arns.VoicemailTemplate; // connect/task-template

    const SampleTaskTemplateArn = arns.SampleTaskTemplate; // connect/task-template

    const STFRETHazardousWasteArn = arns.STFRETHazardousWaste; // connect/quick-connect

    const STFRETOccupationalLeadPoisoningPreventionArn = arns.STFRETOccupationalLeadPoisoningPrevention; // connect/quick-connect

    const STFRETEnvironmentalFeesArn = arns.STFRETEnvironmentalFees; // connect/quick-connect

    const QUSCustomsArn = arns.QUSCustoms; // connect/queue

    const E80c7db27f914b4287c72772347d4997Arn = arns.E80c7db27f914b4287c72772347d4997; // connect/queue

    const QCBUSCustomsArn = arns.QCBUSCustoms; // connect/queue

    const QSTFCBPetitionRefundArn = arns.QSTFCBPetitionRefund; // connect/queue

    const E0a96b609a55450bBa8aAb9fb5b8e371Arn = arns.E0a96b609a55450bBa8aAb9fb5b8e371; // connect/queue

    const D3c0c1fc6d9246208d57Df28618ca1d6Arn = arns.D3c0c1fc6d9246208d57Df28618ca1d6; // connect/queue

    const C95fd44e7647404bA502C88e154dd777Arn = arns.C95fd44e7647404bA502C88e154dd777; // connect/queue

    const C7d9e97915dd4eb5Ae12C063ed73b78dArn = arns.C7d9e97915dd4eb5Ae12C063ed73b78d; // connect/queue

    const B7f9e2dd96ee49369b30Cf328ce94fc4Arn = arns.B7f9e2dd96ee49369b30Cf328ce94fc4; // connect/queue

    const QSTFCBAuditArn = arns.QSTFCBAudit; // connect/queue

    const R863ce8136913471fAca8A1ccdd2dfe41Arn = arns.R863ce8136913471fAca8A1ccdd2dfe41; // connect/queue

    const R62031feeB9064c80Af7b7337fbba8607Arn = arns.R62031feeB9064c80Af7b7337fbba8607; // connect/queue

    const R6b09d5d52dc440b6B79e858a68e79443Arn = arns.R6b09d5d52dc440b6B79e858a68e79443; // connect/queue

    const R7548570dFc0d4aed8d37Bc48fa3b8487Arn = arns.R7548570dFc0d4aed8d37Bc48fa3b8487; // connect/queue

    const R474a796c3b6e43308879714ec804e172Arn = arns.R474a796c3b6e43308879714ec804e172; // connect/queue

    const R5a14b476Bf394a40964eE48d2c16419bArn = arns.R5a14b476Bf394a40964eE48d2c16419b; // connect/queue

    const R5435a51c7a0344fa913982eaf6865059Arn = arns.R5435a51c7a0344fa913982eaf6865059; // connect/queue

    const R5720c3293d3947b3Bd528243e5476d36Arn = arns.R5720c3293d3947b3Bd528243e5476d36; // connect/queue

    const R4652016635fb48cdA2aeD9c103b28da9Arn = arns.R4652016635fb48cdA2aeD9c103b28da9; // connect/queue

    const R34c2a4f2Cace47a3A30c8c8d2c066c42Arn = arns.R34c2a4f2Cace47a3A30c8c8d2c066c42; // connect/queue

    const R3bf16bc9129b4110835f6e5464c798bfArn = arns.R3bf16bc9129b4110835f6e5464c798bf; // connect/queue

    const R44e371458b974a99Aa67Ce067703aeccArn = arns.R44e371458b974a99Aa67Ce067703aecc; // connect/queue

    const R0e2ee1a7F46147a1A6ceF7449370ab20Arn = arns.R0e2ee1a7F46147a1A6ceF7449370ab20; // connect/queue

    const R1a8bd8d97472492cB13b892949112793Arn = arns.R1a8bd8d97472492cB13b892949112793; // connect/queue

    const R0ce6319063424f4e8510B4388a9b615dArn = arns.R0ce6319063424f4e8510B4388a9b615d; // connect/queue

    const E80c7db27f914b4287c72772347d4997AgentArn = arns.E80c7db27f914b4287c72772347d4997Agent; // connect/agent

    const E0a96b609a55450bBa8aAb9fb5b8e371AgentArn = arns.E0a96b609a55450bBa8aAb9fb5b8e371Agent; // connect/agent

    const D3c0c1fc6d9246208d57Df28618ca1d6AgentArn = arns.D3c0c1fc6d9246208d57Df28618ca1d6Agent; // connect/agent

    const C95fd44e7647404bA502C88e154dd777AgentArn = arns.C95fd44e7647404bA502C88e154dd777Agent; // connect/agent

    const C7d9e97915dd4eb5Ae12C063ed73b78dAgentArn = arns.C7d9e97915dd4eb5Ae12C063ed73b78dAgent; // connect/agent

    const B7f9e2dd96ee49369b30Cf328ce94fc4AgentArn = arns.B7f9e2dd96ee49369b30Cf328ce94fc4Agent; // connect/agent

    const R863ce8136913471fAca8A1ccdd2dfe41AgentArn = arns.R863ce8136913471fAca8A1ccdd2dfe41Agent; // connect/agent

    const R7548570dFc0d4aed8d37Bc48fa3b8487AgentArn = arns.R7548570dFc0d4aed8d37Bc48fa3b8487Agent; // connect/agent

    const R6b09d5d52dc440b6B79e858a68e79443AgentArn = arns.R6b09d5d52dc440b6B79e858a68e79443Agent; // connect/agent

    const R62031feeB9064c80Af7b7337fbba8607AgentArn = arns.R62031feeB9064c80Af7b7337fbba8607Agent; // connect/agent

    const R5a14b476Bf394a40964eE48d2c16419bAgentArn = arns.R5a14b476Bf394a40964eE48d2c16419bAgent; // connect/agent

    const R5720c3293d3947b3Bd528243e5476d36AgentArn = arns.R5720c3293d3947b3Bd528243e5476d36Agent; // connect/agent

    const R5435a51c7a0344fa913982eaf6865059AgentArn = arns.R5435a51c7a0344fa913982eaf6865059Agent; // connect/agent

    const R474a796c3b6e43308879714ec804e172AgentArn = arns.R474a796c3b6e43308879714ec804e172Agent; // connect/agent

    const R4652016635fb48cdA2aeD9c103b28da9AgentArn = arns.R4652016635fb48cdA2aeD9c103b28da9Agent; // connect/agent

    const R44e371458b974a99Aa67Ce067703aeccAgentArn = arns.R44e371458b974a99Aa67Ce067703aeccAgent; // connect/agent

    const R3bf16bc9129b4110835f6e5464c798bfAgentArn = arns.R3bf16bc9129b4110835f6e5464c798bfAgent; // connect/agent

    const R34c2a4f2Cace47a3A30c8c8d2c066c42AgentArn = arns.R34c2a4f2Cace47a3A30c8c8d2c066c42Agent; // connect/agent

    const R1a8bd8d97472492cB13b892949112793AgentArn = arns.R1a8bd8d97472492cB13b892949112793Agent; // connect/agent

    const R0e2ee1a7F46147a1A6ceF7449370ab20AgentArn = arns.R0e2ee1a7F46147a1A6ceF7449370ab20Agent; // connect/agent

    const R0ce6319063424f4e8510B4388a9b615dAgentArn = arns.R0ce6319063424f4e8510B4388a9b615dAgent; // connect/agent

    const CdtfaConnectAssistantS3IntegrationArn = arns.CdtfaConnectAssistantS3Integration; // wisdom/knowledge-base

    const AmazonConnectQuickResponses23b221724c3d52b3951625159489df43Arn = arns.AmazonConnectQuickResponses23b221724c3d52b3951625159489df43; // wisdom/knowledge-base

    const CdtfaWebsiteCrawlerArn = arns.CdtfaWebsiteCrawler; // wisdom/knowledge-base

    const AmazonConnectMycdtfa2Arn = arns.AmazonConnectMycdtfa2; // wisdom/knowledge-base

    const AmazonConnectMycdtfa2DevArn = arns.AmazonConnectMycdtfa2Dev; // wisdom/knowledge-base

    const AWSServiceRoleForAmazonConnectA13fftWbrUn1aNBhG2qw = iam.Role.fromRoleArn(this, 'AWSServiceRoleForAmazonConnectA13fftWbrUn1aNBhG2qw', arns.AWSServiceRoleForAmazonConnectA13fftWbrUn1aNBhG2qw);

    // Connect instance already exists — referenced via ARN_MAP
    const ConnectInstanceArn = arns.ConnectInstance;

    // ── Synced resources (to be created/updated) ────────────────────────────
    const AndrewSMSENSTemplatev2 = new wisdom.CfnMessageTemplate(this, 'AndrewSMSENSTemplatev2', {
      knowledgeBaseArn: "arn:aws:wisdom:us-west-2:059586875367:knowledge-base/0e2f23a9-f882-47a8-b0f1-18aa4c07c3be",
      name: "Andrew_SMS-ENS_Templatev2",
      channelSubtype: "SMS",
      content: {"smsMessageTemplateContent":{"body":{"plainText":{"content":"***TEST MESSAGE ONLY FOR THE CDTFA ENS***\nThe CDTFA Ventura office is currently closed and will remain closed for the remainder of today.  ***TEST ONLY***"}}}} as any,
      description: "SMS ENS Test Template for Andrew",
      language: "en_US",
      defaultAttributes: {"systemAttributes":{"customerEndpoint":{},"systemEndpoint":{}},"agentAttributes":{},"customerProfileAttributes":{}} as any,
      
    });

    const AndrewSMSENSTemplate = new wisdom.CfnMessageTemplate(this, 'AndrewSMSENSTemplate', {
      knowledgeBaseArn: "arn:aws:wisdom:us-west-2:059586875367:knowledge-base/0e2f23a9-f882-47a8-b0f1-18aa4c07c3be",
      name: "Andrew_SMS-ENS_Template",
      channelSubtype: "SMS",
      content: {"smsMessageTemplateContent":{"body":{"plainText":{"content":"***TEST MESSAGE ONLY FOR THE CDTFA ENS***\nThe California Department of Tax and Fee Administration’s Ventura office is currently closed and will remain closed for the remainder of today.  The Ventura office is scheduled to reopen tomorrow morning. Team members scheduled to work in the office on November XX, 2025, should contact their supervisor for further instruction. \nAll other California Department of Tax and Fee Administration and Board of Equalization facilities are open for business during normal business hours.  If you are scheduled to work in a non-affected facility, you are expected to report to your workstation at your scheduled work time.\nThank you and remain safe. \n"}}}} as any,
      description: "SMS ENS Test Template for Andrew",
      language: "en_US",
      defaultAttributes: {"systemAttributes":{"customerEndpoint":{},"systemEndpoint":{}},"agentAttributes":{},"customerProfileAttributes":{}} as any,
      
    });

    const AndrewSMSENSTemplatev3 = new wisdom.CfnMessageTemplate(this, 'AndrewSMSENSTemplatev3', {
      knowledgeBaseArn: "arn:aws:wisdom:us-west-2:059586875367:knowledge-base/0e2f23a9-f882-47a8-b0f1-18aa4c07c3be",
      name: "Andrew_SMS-ENS_Templatev3",
      channelSubtype: "SMS",
      content: {"smsMessageTemplateContent":{"body":{"plainText":{"content":"*** TEST MESSAGE FOR THE CDTFA ENS ***\nAll CDTFA facilities are open and operational at this time. If you are scheduled to work in a CDTFA facility, you should report to your workstation at your regularly scheduled time. If you have any questions, please contact your supervisor/manager or call 1-800-400-7115.  \n*** TEST MESSAGE ONLY - No action is required at this time ***"}}}} as any,
      description: "SMS ENS Test 3 Template for Andrew",
      language: "en_US",
      defaultAttributes: {"systemAttributes":{"customerEndpoint":{},"systemEndpoint":{}},"agentAttributes":{},"customerProfileAttributes":{}} as any,
      
    });
  }
}
