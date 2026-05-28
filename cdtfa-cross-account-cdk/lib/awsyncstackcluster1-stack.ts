import * as cdk from 'aws-cdk-lib';
import * as connect from 'aws-cdk-lib/aws-connect';
import * as wisdom from 'aws-cdk-lib/aws-wisdom';
import * as path from 'path';
import { Construct } from 'constructs';
import { ARN_MAP } from './arns';
import { ENV_OVERRIDES } from './overrides';

export class AwsyncStackCluster1Stack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
    const ConnectInstanceArnParam = new cdk.CfnParameter(this, "ConnectInstanceArn", {
      type: 'String',
      description: 'ARN of the Amazon Connect instance to deploy resources into',
      default: "arn:aws:connect:us-west-2:797776209609:instance/bd754747-7bce-46be-890e-cd37bd7e0f17",
    });
    const account = this.node.tryGetContext('account') as string ?? Object.keys(ARN_MAP)[0] ?? 'default';
    const arns = ARN_MAP[account] ?? {};
    const envOverrides = ENV_OVERRIDES[account] ?? {};


    // ── Synced resources (to be created/updated) ────────────────────────────
    const SUTMenu = new connect.CfnHoursOfOperation(this, 'SUTMenu', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "SUT Menu",
      timeZone: "PST8PDT",
      config: [
        { day: "WEDNESDAY", startTime: { hours: 7, minutes: 30 }, endTime: { hours: 17, minutes: 0 } },
        { day: "FRIDAY", startTime: { hours: 7, minutes: 30 }, endTime: { hours: 17, minutes: 0 } },
        { day: "TUESDAY", startTime: { hours: 7, minutes: 30 }, endTime: { hours: 17, minutes: 0 } },
        { day: "THURSDAY", startTime: { hours: 7, minutes: 30 }, endTime: { hours: 17, minutes: 0 } },
        { day: "MONDAY", startTime: { hours: 7, minutes: 30 }, endTime: { hours: 17, minutes: 0 } },
      ],
      description: "SUT Menu 7:30 AM - 5:00 PM M-F",
    });

    const BOEMenu = new connect.CfnHoursOfOperation(this, 'BOEMenu', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "BOE Menu",
      timeZone: "PST8PDT",
      config: [
        { day: "WEDNESDAY", startTime: { hours: 7, minutes: 30 }, endTime: { hours: 17, minutes: 0 } },
        { day: "FRIDAY", startTime: { hours: 7, minutes: 30 }, endTime: { hours: 17, minutes: 0 } },
        { day: "MONDAY", startTime: { hours: 7, minutes: 30 }, endTime: { hours: 17, minutes: 0 } },
        { day: "THURSDAY", startTime: { hours: 7, minutes: 30 }, endTime: { hours: 17, minutes: 0 } },
        { day: "TUESDAY", startTime: { hours: 7, minutes: 30 }, endTime: { hours: 17, minutes: 0 } },
      ],
      description: "BOE Menu 7:30 AM - 5:00 PM M-F",
    });

    const EFTMenuOperatingHours = new connect.CfnHoursOfOperation(this, 'EFTMenuOperatingHours', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "EFT Menu",
      timeZone: "PST8PDT",
      config: [
        { day: "TUESDAY", startTime: { hours: 7, minutes: 30 }, endTime: { hours: 17, minutes: 0 } },
        { day: "WEDNESDAY", startTime: { hours: 7, minutes: 30 }, endTime: { hours: 17, minutes: 0 } },
        { day: "MONDAY", startTime: { hours: 7, minutes: 30 }, endTime: { hours: 17, minutes: 0 } },
        { day: "FRIDAY", startTime: { hours: 7, minutes: 30 }, endTime: { hours: 17, minutes: 0 } },
        { day: "THURSDAY", startTime: { hours: 7, minutes: 30 }, endTime: { hours: 17, minutes: 0 } },
      ],
      description: "EFT Menu M-F 7:30AM-5:00PM PT",
    });

    const NormalHours8to5MF = new connect.CfnHoursOfOperation(this, 'NormalHours8to5MF', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "NormalHours8to5MF",
      timeZone: "US/Pacific",
      config: [
        { day: "MONDAY", startTime: { hours: 8, minutes: 0 }, endTime: { hours: 17, minutes: 0 } },
        { day: "THURSDAY", startTime: { hours: 8, minutes: 0 }, endTime: { hours: 17, minutes: 0 } },
        { day: "TUESDAY", startTime: { hours: 8, minutes: 0 }, endTime: { hours: 17, minutes: 0 } },
        { day: "WEDNESDAY", startTime: { hours: 8, minutes: 0 }, endTime: { hours: 17, minutes: 0 } },
        { day: "FRIDAY", startTime: { hours: 8, minutes: 0 }, endTime: { hours: 17, minutes: 0 } },
      ],
      description: "DO NOT CHANGE Normal hours 8:00AM to 5:00PM to check for mid-day meeting",
    });

    const RobocallOutboundToAgent = new connect.CfnHoursOfOperation(this, 'RobocallOutboundToAgent', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "Robocall_Outbound_to_Agent",
      timeZone: "US/Pacific",
      config: [
        { day: "FRIDAY", startTime: { hours: 8, minutes: 0 }, endTime: { hours: 17, minutes: 0 } },
        { day: "MONDAY", startTime: { hours: 8, minutes: 0 }, endTime: { hours: 17, minutes: 0 } },
        { day: "THURSDAY", startTime: { hours: 8, minutes: 0 }, endTime: { hours: 17, minutes: 0 } },
        { day: "TUESDAY", startTime: { hours: 8, minutes: 0 }, endTime: { hours: 17, minutes: 0 } },
        { day: "WEDNESDAY", startTime: { hours: 8, minutes: 0 }, endTime: { hours: 17, minutes: 0 } },
      ],
      description: "Queue that the robocall to agent uses 8:00AM-5:00PM M-F",
    });

    const CSCRickHaleOnly = new connect.CfnSecurityProfile(this, 'CSCRickHaleOnly', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      securityProfileName: "CSC Rick Hale Only",
      permissions: ["AccessMetrics","AccessMetrics.AgentActivityAudit.Access","AccessMetrics.Dashboards.Access","AccessMetrics.DashboardsWithMyData.View","AccessMetrics.HistoricalMetrics.Access","AccessMetrics.RealTimeMetrics.Access","AgentGrouping.View","AgentStates.View","AgentTimeCard.View","Analytics.PerformanceMetrics.Access","AudioDeviceSettings.Access","AutomatedVoiceInteraction.Recordings.Unredacted.Access","AutomatedVoiceInteraction.Transcripts.Unredacted.Access","BasicAgentAccess","CallRecordings.Unredacted.Access","Capacity.Edit","Capacity.Publish","Capacity.View","CoachingSessions.Create","CoachingSessions.Edit","CoachingSessions.View","ConfigureContactAttributes.View","ContactAttributes.View","ContactLensCustomVocabulary.Edit","ContactLensCustomVocabulary.View","ContactLensPostContactSummary.View","ContactSearch.View","ContactSearchSampleContacts.View","ContactSearchWithCharacteristics.View","ContactSearchWithKeywords.View","ContactTranscripts.Redacted.Access","ContactTranscripts.Unredacted.Access","ContactTranscripts.Unredacted.DownloadButton","ContentManagement.Create","ContentManagement.Delete","ContentManagement.Edit","ContentManagement.MessageTemplates.Create","ContentManagement.MessageTemplates.Delete","ContentManagement.MessageTemplates.Edit","ContentManagement.MessageTemplates.View","ContentManagement.View","CustomMetrics.Create","CustomMetrics.Delete","CustomMetrics.Edit","CustomMetrics.Publish","CustomMetrics.View","CustomViews.Access","CustomerProfiles.CalculatedAttributes.Create","CustomerProfiles.CalculatedAttributes.Edit","CustomerProfiles.CalculatedAttributes.View","CustomerProfiles.PredictiveInsights.View","CustomerProfiles.ProfileExplorer.View","CustomerProfiles.Segments.View","CustomerProfiles.View","Evaluation.Create","Evaluation.Edit","Evaluation.View","EvaluationAssistant.Access","EvaluationCalibrationSessions.Create","EvaluationCalibrationSessions.Edit","EvaluationCalibrationSessions.View","EvaluationForms.Create","EvaluationForms.Delete","EvaluationForms.Edit","EvaluationForms.View","EvaluationReviewRequest.Create","EvaluationReviewRequest.View","EvaluationReviews.Create","EvaluationReviews.View","ForecastScheduleInterval.Edit","ForecastScheduleInterval.View","Forecasting.Edit","Forecasting.Publish","Forecasting.View","GraphTrends.View","ManagerBargeIn","ManagerListenIn","ManualAssignAnyContact.Enable","ManualAssignMyContacts.Enable","MetricsReports.Create","MetricsReports.Delete","MetricsReports.Edit","MetricsReports.Publish","MetricsReports.Schedule","MetricsReports.View","MyCoachingSessions.Create","MyCoachingSessions.Edit","MyCoachingSessions.View","MyContacts.View","OutboundCallAccess","Queues.View","RealtimeContactLens.View","ReportSchedules.Create","ReportSchedules.Delete","ReportSchedules.Edit","ReportSchedules.View","RoutingPolicies.Edit","RoutingPolicies.View","Rules.Create","Rules.Delete","Rules.Edit","Rules.View","RulesGenerativeAI.Create","RulesGenerativeAI.Delete","RulesGenerativeAI.Edit","RulesGenerativeAI.View","Scheduling.Edit","Scheduling.Publish","Scheduling.View","ScreenRecording.Access","SelfAssignContacts.Access","StaffCalendar.Edit","StaffCalendar.View","StopContact.Enabled","TeamCalendar.Edit","TeamCalendar.View","ThemeDetection.Create","ThemeDetection.View","TimeOff.Edit","TimeOff.View","TransferContact.Enabled","TransferDestinations.View","UpdateContactSchedule.Enabled","Users.Edit","Users.EditPermission","Users.View","Wisdom.View"],
      description: "CSC Specialist for Rick Hale Only",
    });

    const CDTFAProdAdmin = new connect.CfnSecurityProfile(this, 'CDTFAProdAdmin', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      securityProfileName: "CDTFA-Prod_Admin",
      permissions: ["AccessMetrics.AgentActivityAudit.Access","AccessMetrics.Dashboards.Access","AccessMetrics.HistoricalMetrics.Access","AccessMetrics.RealTimeMetrics.Access","AgentGrouping.Edit","AgentGrouping.EnableAndDisable","AgentGrouping.View","AgentStates.View","AgentTimeCard.View","AudioDeviceSettings.Access","BasicAgentAccess","CallRecordings.Redacted.Access","CallRecordings.Redacted.DownloadButton","CallRecordings.Unredacted.Access","CallRecordings.Unredacted.DownloadButton","Capacity.Edit","Capacity.Publish","Capacity.View","ConfigureContactAttributes.View","ContactAttributes.View","ContactSearchWithCharacteristics.View","ContactSearchWithKeywords.View","ContactTranscripts.Redacted.Access","ContactTranscripts.Unredacted.Access","ContactTranscripts.Unredacted.DownloadButton","DeleteCallRecordings","ForecastScheduleInterval.Edit","ForecastScheduleInterval.View","Forecasting.Edit","Forecasting.Publish","Forecasting.View","GraphTrends.View","HoursOfOperation.Edit","HoursOfOperation.View","ManagerBargeIn","ManagerListenIn","MetricsReports.Create","MetricsReports.Delete","MetricsReports.Edit","MetricsReports.Publish","MetricsReports.Schedule","MetricsReports.View","MyContacts.View","OutboundCallAccess","Prompts.View","RealtimeContactLens.View","ReportSchedules.Create","ReportSchedules.Delete","ReportSchedules.Edit","ReportSchedules.View","ReportsAdmin.Access","ReportsAdmin.Delete","ReportsAdmin.Publish","ReportsAdmin.Schedule","ReportsAdmin.View","RestrictTaskCreation.Access","RoutingPolicies.Create","RoutingPolicies.Edit","RoutingPolicies.View","ScreenRecording.Access","ScreenRecording.Delete","ScreenRecording.Download","SecurityProfiles.Create","SecurityProfiles.Delete","SecurityProfiles.Edit","SecurityProfiles.View","StopContact.Enabled","TransferContact.Enabled","TransferDestinations.View","UpdateContactSchedule.Enabled","Users.Edit","Users.View","VideoContact.Access"],
      description: "Custom profile created for an Admin",
    });

    const CDTFAAgentDefault = new connect.CfnSecurityProfile(this, 'CDTFAAgentDefault', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      securityProfileName: "CDTFA_Agent_Default",
      permissions: ["AccessMetrics.Dashboards.Access","AudioDeviceSettings.Access","BasicAgentAccess","ChatTestMode","ContactAttributes.View","ContactSearch.View","CustomViews.Access","CustomerProfiles.CalculatedAttributes.View","CustomerProfiles.View","MyContacts.View","OutboundCallAccess","PhoneNumbers.View","RestrictTaskCreation.Access","StopContact.Enabled","TransferContact.Enabled","Views.View"],
      description: "Default Security Profile for CDTFA Agents - No Contact Lens Users",
    });

    const TATaxAdvisorSupervisor = new connect.CfnSecurityProfile(this, 'TATaxAdvisorSupervisor', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      securityProfileName: "TA_Tax_Advisor_Supervisor",
      permissions: ["AccessMetrics","AccessMetrics.AgentActivityAudit.Access","AccessMetrics.Dashboards.Access","AccessMetrics.HistoricalMetrics.Access","AccessMetrics.RealTimeMetrics.Access","AgentGrouping.View","AgentStates.View","AgentTimeCard.View","AudioDeviceSettings.Access","BasicAgentAccess","Cases.View","ChatTestMode","ContactAttributes.View","ContactLensCustomVocabulary.View","ContactLensPostContactSummary.View","ContactSearch.View","ContactSearchWithCharacteristics.View","ContactSearchWithKeywords.View","ContentManagement.View","CustomViews.Access","CustomerProfiles.CalculatedAttributes.View","CustomerProfiles.View","GraphTrends.View","HoursOfOperation.View","ListenCallRecordings","ManagerBargeIn","ManagerListenIn","MetricsReports.Create","MetricsReports.Delete","MetricsReports.Edit","MetricsReports.Publish","MetricsReports.Schedule","MetricsReports.View","MyContacts.View","OutboundCallAccess","Queues.View","RealtimeContactLens.View","ReportSchedules.Create","ReportSchedules.Delete","ReportSchedules.Edit","ReportSchedules.View","RoutingPolicies.View","ThemeDetection.View","TransferDestinations.View","Users.Edit","Users.View","Views.View"],
      description: "TA_Tax_Advisor_Supervisor",
    });

    const FODCollectionsAgentDefault = new connect.CfnSecurityProfile(this, 'FODCollectionsAgentDefault', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      securityProfileName: "FOD_Collections_Agent_Default",
      permissions: ["AccessMetrics.DashboardsWithMyData.View","Analytics.PerformanceMetrics.Access","AudioDeviceSettings.Access","BasicAgentAccess","ChatTestMode","ContactAttributes.View","ContentManagement.View","CustomViews.Access","CustomerProfiles.CalculatedAttributes.View","CustomerProfiles.View","MyContacts.View","OutboundCallAccess","RestrictTaskCreation.Access","Views.View"],
      description: "FOD_Collections_Agent_Default",
    });

    const CDTFASupervisorDefault = new connect.CfnSecurityProfile(this, 'CDTFASupervisorDefault', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      securityProfileName: "CDTFA_Supervisor_Default",
      permissions: ["AccessMetrics","AccessMetrics.AgentActivityAudit.Access","AccessMetrics.Dashboards.Access","AccessMetrics.HistoricalMetrics.Access","AccessMetrics.RealTimeMetrics.Access","AgentGrouping.View","AgentTimeCard.View","AudioDeviceSettings.Access","BasicAgentAccess","ContactSearch.View","ContactSearchWithCharacteristics.View","ContactSearchWithKeywords.View","ContentManagement.View","CustomViews.Access","HoursOfOperation.View","ListenCallRecordings","ManagerBargeIn","ManagerListenIn","MetricsReports.Create","MetricsReports.Delete","MetricsReports.Edit","MetricsReports.Publish","MetricsReports.Schedule","MetricsReports.View","MyContacts.View","OutboundCallAccess","Queues.View","ReportSchedules.Create","ReportSchedules.Delete","ReportSchedules.Edit","ReportSchedules.View","RestrictContactAccessByHierarchy.View","TransferDestinations.View","Users.Edit","Users.View"],
      description: "CDTFA Supervisor Default - No Contact Lens Users",
    });

    const EFTAgentDefault = new connect.CfnSecurityProfile(this, 'EFTAgentDefault', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      securityProfileName: "EFT_Agent_Default",
      permissions: ["AccessMetrics.Dashboards.Access","AudioDeviceSettings.Access","BasicAgentAccess","ContactAttributes.View","ContentManagement.View","MyContacts.View","OutboundCallAccess","RestrictTaskCreation.Access","Views.View"],
      description: "EFT_Agent_Default",
    });

    const CUTSSupervisorDefault = new connect.CfnSecurityProfile(this, 'CUTSSupervisorDefault', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      securityProfileName: "CUTS_Supervisor_Default",
      permissions: ["AccessMetrics","AccessMetrics.AgentActivityAudit.Access","AccessMetrics.Dashboards.Access","AccessMetrics.DashboardsWithMyData.View","AccessMetrics.HistoricalMetrics.Access","AccessMetrics.RealTimeMetrics.Access","AgentGrouping.View","AgentStates.View","AgentTimeCard.View","Analytics.PerformanceMetrics.Access","AudioDeviceSettings.Access","BasicAgentAccess","ContactAttributes.View","ContactLensPostContactSummary.View","ContactSearch.View","ContactSearchWithCharacteristics.View","ContactSearchWithKeywords.View","ContentManagement.View","CustomViews.Access","GraphTrends.View","HoursOfOperation.View","ListenCallRecordings","ManagerBargeIn","ManagerListenIn","MetricsReports.Create","MetricsReports.Delete","MetricsReports.Edit","MetricsReports.View","MyContacts.View","OutboundCallAccess","Queues.View","RedactedData.View","RoutingPolicies.View","ThemeDetection.View","TransferDestinations.View","Users.Edit","Users.View"],
      description: "CUTS_Supervisor_Default",
    });

    const TATaxAdvisorAgent = new connect.CfnSecurityProfile(this, 'TATaxAdvisorAgent', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      securityProfileName: "TA_Tax_Advisor_Agent",
      permissions: ["AccessMetrics.RealTimeMetrics.Access","AudioDeviceSettings.Access","BasicAgentAccess","ContactAttributes.View","CustomViews.Access","CustomerProfiles.CalculatedAttributes.View","CustomerProfiles.Segments.View","CustomerProfiles.View","ListenCallRecordings","MyContacts.View","OutboundCallAccess","RestrictTaskCreation.Access"],
      description: "TA_Tax_Advisor_Agent",
    });

    const CUTSAgentDefault = new connect.CfnSecurityProfile(this, 'CUTSAgentDefault', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      securityProfileName: "CUTS_Agent_Default",
      permissions: ["AccessMetrics.Dashboards.Access","AccessMetrics.DashboardsWithMyData.View","Analytics.PerformanceMetrics.Access","AudioDeviceSettings.Access","BasicAgentAccess","ContactAttributes.View","ContentManagement.View","CustomViews.Access","CustomerProfiles.CalculatedAttributes.View","CustomerProfiles.View","MyContacts.View","OutboundCallAccess","RestrictTaskCreation.Access"],
      description: "CUTS_Agent_Default",
    });

    const CSCScheduler = new connect.CfnSecurityProfile(this, 'CSCScheduler', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      securityProfileName: "CSC_Scheduler",
      permissions: ["AccessMetrics","AccessMetrics.AgentActivityAudit.Access","AccessMetrics.Dashboards.Access","AccessMetrics.DashboardsWithMyData.View","AccessMetrics.HistoricalMetrics.Access","AccessMetrics.RealTimeMetrics.Access","AgentGrouping.View","AgentTimeCard.View","Analytics.PerformanceMetrics.Access","AudioDeviceSettings.Access","BasicAgentAccess","Capacity.Edit","Capacity.Publish","Capacity.View","ContactSearch.View","CustomerProfiles.CalculatedAttributes.View","CustomerProfiles.View","EvaluationForms.View","ForecastScheduleInterval.Edit","ForecastScheduleInterval.View","Forecasting.Edit","Forecasting.Publish","Forecasting.View","MyContacts.View","OutboundCallAccess","RealtimeContactLens.View","Rules.View","Scheduling.Edit","Scheduling.Publish","Scheduling.View","StaffCalendar.Edit","StaffCalendar.View","TeamCalendar.Edit","TeamCalendar.View","TimeOff.Approve","TimeOff.Edit","TimeOff.View","TimeOffBalance.Edit","TimeOffBalance.View","Users.View"],
      description: "CSC_Scheduler",
    });

    const STFAgentDefault = new connect.CfnSecurityProfile(this, 'STFAgentDefault', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      securityProfileName: "STF_Agent_Default",
      permissions: ["AccessMetrics.DashboardsWithMyData.View","Analytics.PerformanceMetrics.Access","AudioDeviceSettings.Access","BasicAgentAccess","CallRecordings.Unredacted.Access","ContactAttributes.View","ContactSearch.View","ContactSearchWithCharacteristics.View","ContactSearchWithKeywords.View","ContactTranscripts.Unredacted.Access","CustomViews.Access","CustomerProfiles.CalculatedAttributes.View","CustomerProfiles.View","MyContacts.View","OutboundCallAccess","RestrictTaskCreation.Access","Views.View"],
      description: "STF_Agent_Default that does not have transcription and call summaries.",
    });

    const CSCBTAISupervisorDefault = new connect.CfnSecurityProfile(this, 'CSCBTAISupervisorDefault', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      securityProfileName: "CSC_BTAI_Supervisor_Default",
      permissions: ["AccessMetrics","AccessMetrics.AgentActivityAudit.Access","AccessMetrics.Dashboards.Access","AccessMetrics.DashboardsWithMyData.View","AccessMetrics.HistoricalMetrics.Access","AccessMetrics.RealTimeMetrics.Access","AgentGrouping.View","AgentStates.View","AgentTimeCard.View","Analytics.PerformanceMetrics.Access","AudioDeviceSettings.Access","BasicAgentAccess","CallRecordings.Unredacted.Access","Capacity.View","CoachingSessions.View","ConfigureContactAttributes.View","ContactAttributes.View","ContactLensCustomVocabulary.View","ContactLensPostContactSummary.View","ContactSearch.View","ContactSearchSampleContacts.View","ContactSearchWithCharacteristics.View","ContactSearchWithKeywords.View","ContactTranscripts.Unredacted.Access","ContentManagement.View","CustomMetrics.View","CustomViews.Access","CustomerProfiles.View","Evaluation.Create","Evaluation.Edit","Evaluation.View","EvaluationCalibrationSessions.View","EvaluationForms.View","EvaluationReviewRequest.View","EvaluationReviews.View","ForecastScheduleInterval.View","Forecasting.View","GraphTrends.View","HoursOfOperation.View","ManagerBargeIn","ManagerListenIn","ManualAssignAnyContact.Enable","MetricsReports.Create","MetricsReports.Delete","MetricsReports.Edit","MetricsReports.Publish","MetricsReports.Schedule","MetricsReports.View","MyCoachingSessions.View","OutboundCallAccess","Queues.View","RealtimeContactLens.View","ReportSchedules.Create","ReportSchedules.Delete","ReportSchedules.Edit","ReportSchedules.View","RoutingPolicies.View","Rules.View","RulesGenerativeAI.View","Scheduling.Edit","Scheduling.Publish","Scheduling.View","ScreenRecording.Access","StaffCalendar.Edit","StaffCalendar.View","TeamCalendar.View","ThemeDetection.View","TimeOff.View","TimeOffBalance.Edit","TimeOffBalance.View","TransferDestinations.View","Users.Edit","Users.View","Wisdom.View"],
      description: "CSC Business Taxes Administrator I Default security profile",
    });

    const MCOSupervisorDefault = new connect.CfnSecurityProfile(this, 'MCOSupervisorDefault', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      securityProfileName: "MCO_Supervisor_Default",
      permissions: ["AccessMetrics","AccessMetrics.AgentActivityAudit.Access","AccessMetrics.Dashboards.Access","AccessMetrics.HistoricalMetrics.Access","AccessMetrics.RealTimeMetrics.Access","AgentGrouping.View","AgentStates.View","AgentTimeCard.View","AudioDeviceSettings.Access","BasicAgentAccess","Cases.View","ChatTestMode","ContactAttributes.View","ContactLensPostContactSummary.View","ContactSearch.View","ContactSearchWithCharacteristics.View","ContactSearchWithKeywords.View","ContentManagement.View","CustomViews.Access","Evaluation.Create","Evaluation.Edit","Evaluation.View","EvaluationCalibrationSessions.Create","EvaluationCalibrationSessions.Edit","EvaluationCalibrationSessions.View","GraphTrends.View","HoursOfOperation.View","ListenCallRecordings","ManagerListenIn","MetricsReports.Create","MetricsReports.Delete","MetricsReports.Edit","MetricsReports.Publish","MetricsReports.Schedule","MetricsReports.View","MyContacts.View","OutboundCallAccess","Queues.View","RedactedData.View","ReportSchedules.Create","ReportSchedules.Delete","ReportSchedules.Edit","ReportSchedules.View","RestrictContactAccessByHierarchy.View","RoutingPolicies.View","Rules.View","ThemeDetection.View","TransferDestinations.View","Users.Edit","Users.View","Views.View","VoiceIdAttributesAndSearch.View"],
      description: "MCO_Supervisor_Default",
    });

    const CSCAgentTestEvals = new connect.CfnSecurityProfile(this, 'CSCAgentTestEvals', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      securityProfileName: "CSC_Agent_Test_Evals",
      permissions: ["AccessMetrics.DashboardsWithMyData.View","Analytics.PerformanceMetrics.Access","AudioDeviceSettings.Access","BasicAgentAccess","CallRecordings.Unredacted.Access","ContactAttributes.View","ContactLensCustomVocabulary.View","ContactLensPostContactSummary.View","ContactTranscripts.Unredacted.Access","ContentManagement.View","CustomViews.Access","CustomerProfiles.View","GraphTrends.View","MyCoachingSessions.View","MyContacts.View","MyReceivedEvaluations.View","OutboundCallAccess","RealtimeContactLens.View","StaffCalendar.Edit","StaffCalendar.View","ThemeDetection.View","TransferDestinations.View","Wisdom.View"],
      description: "CSC_Tax_Technician_Agent_Default",
    });

    const CSCSuperUsersOnly = new connect.CfnSecurityProfile(this, 'CSCSuperUsersOnly', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      securityProfileName: "CSC Super Users Only",
      permissions: ["AccessMetrics","AccessMetrics.AgentActivityAudit.Access","AccessMetrics.Dashboards.Access","AccessMetrics.DashboardsWithMyData.View","AccessMetrics.HistoricalMetrics.Access","AccessMetrics.RealTimeMetrics.Access","AgentGrouping.View","AgentStates.View","AgentTimeCard.View","Analytics.PerformanceMetrics.Access","AudioDeviceSettings.Access","BasicAgentAccess","CallRecordings.Redacted.Access","CallRecordings.Unredacted.Access","Capacity.Edit","Capacity.Publish","Capacity.View","CoachingSessions.Create","CoachingSessions.Edit","CoachingSessions.View","ConfigureContactAttributes.View","ContactAttributes.View","ContactLensCustomVocabulary.Edit","ContactLensCustomVocabulary.View","ContactLensPostContactSummary.View","ContactSearch.View","ContactSearchSampleContacts.View","ContactSearchWithCharacteristics.View","ContactSearchWithKeywords.View","ContactTranscripts.Redacted.Access","ContactTranscripts.Unredacted.Access","ContactTranscripts.Unredacted.DownloadButton","ContentManagement.Create","ContentManagement.Delete","ContentManagement.Edit","ContentManagement.MessageTemplates.Create","ContentManagement.MessageTemplates.Delete","ContentManagement.MessageTemplates.Edit","ContentManagement.MessageTemplates.View","ContentManagement.View","CustomMetrics.Create","CustomMetrics.Delete","CustomMetrics.Edit","CustomMetrics.Publish","CustomMetrics.View","CustomViews.Access","CustomerProfiles.CalculatedAttributes.Create","CustomerProfiles.CalculatedAttributes.Edit","CustomerProfiles.CalculatedAttributes.View","CustomerProfiles.PredictiveInsights.View","CustomerProfiles.ProfileExplorer.View","CustomerProfiles.Segments.View","CustomerProfiles.View","Evaluation.Create","Evaluation.Edit","Evaluation.View","EvaluationAssistant.Access","EvaluationCalibrationSessions.Create","EvaluationCalibrationSessions.Edit","EvaluationCalibrationSessions.View","EvaluationForms.Create","EvaluationForms.Delete","EvaluationForms.Edit","EvaluationForms.View","EvaluationReviewRequest.View","EvaluationReviews.View","ForecastScheduleInterval.Edit","ForecastScheduleInterval.View","Forecasting.Edit","Forecasting.Publish","Forecasting.View","GraphTrends.View","HoursOfOperation.View","ManagerBargeIn","ManagerListenIn","ManualAssignAnyContact.Enable","ManualAssignMyContacts.Enable","MetricsReports.Create","MetricsReports.Delete","MetricsReports.Edit","MetricsReports.Publish","MetricsReports.Schedule","MetricsReports.View","MyCoachingSessions.Create","MyCoachingSessions.Edit","MyCoachingSessions.View","MyContacts.View","OutboundCallAccess","Queues.View","RealtimeContactLens.View","ReportSchedules.Create","ReportSchedules.Delete","ReportSchedules.Edit","ReportSchedules.View","RoutingPolicies.Edit","RoutingPolicies.View","Rules.Create","Rules.Delete","Rules.Edit","Rules.View","RulesGenerativeAI.Create","RulesGenerativeAI.Delete","RulesGenerativeAI.Edit","RulesGenerativeAI.View","Scheduling.Edit","Scheduling.Publish","Scheduling.View","ScreenRecording.Access","SelfAssignContacts.Access","StaffCalendar.Edit","StaffCalendar.View","StopContact.Enabled","TeamCalendar.Edit","TeamCalendar.View","ThemeDetection.Create","ThemeDetection.View","TimeOff.Edit","TimeOff.View","TimeOffBalance.View","TransferContact.Enabled","TransferDestinations.View","UpdateContactSchedule.Enabled","Users.Edit","Users.View","Wisdom.View"],
      description: "Profile for CSC users that have the ability to do many administrative tasks such as creating forms. Matthew Spagnolo and Dan Colgrove are the only people assigned to this security profile.",
    });

    const TRASupervisorDefault = new connect.CfnSecurityProfile(this, 'TRASupervisorDefault', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      securityProfileName: "TRA_Supervisor_Default",
      permissions: ["AccessMetrics","AccessMetrics.AgentActivityAudit.Access","AccessMetrics.Dashboards.Access","AccessMetrics.HistoricalMetrics.Access","AccessMetrics.RealTimeMetrics.Access","AgentGrouping.View","AgentStates.Edit","AgentStates.View","AgentTimeCard.View","AudioDeviceSettings.Access","BasicAgentAccess","CaseHistory.View","Cases.View","ChatTestMode","ContactAttributes.View","ContactSearch.View","ContactSearchWithCharacteristics.View","ContactSearchWithKeywords.View","CustomViews.Access","CustomerProfiles.CalculatedAttributes.View","CustomerProfiles.View","HoursOfOperation.View","ManagerBargeIn","ManagerListenIn","MetricsReports.Create","MetricsReports.Delete","MetricsReports.Edit","MetricsReports.Publish","MetricsReports.Schedule","MetricsReports.View","MyContacts.View","OutboundCallAccess","PhoneNumbers.View","Queues.View","ReportSchedules.Create","ReportSchedules.Delete","ReportSchedules.Edit","ReportSchedules.View","RoutingPolicies.View","StopContact.Enabled","TaskTemplates.View","TransferContact.Enabled","TransferDestinations.View","Users.View","Views.View","VoiceIdAttributesAndSearch.View"],
      description: "TRA_Supervisor_Default",
    });

    const InactiveSecurityProfile = new connect.CfnSecurityProfile(this, 'InactiveSecurityProfile', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      securityProfileName: "Inactive",
      
      description: "Security Profile with no rights for inactive agents",
    });

    const CSCSpecialistProfile = new connect.CfnSecurityProfile(this, 'CSCSpecialistProfile', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      securityProfileName: "CSC_Specialist_Profile",
      permissions: ["AccessMetrics","AccessMetrics.AgentActivityAudit.Access","AccessMetrics.Dashboards.Access","AccessMetrics.DashboardsWithMyData.View","AccessMetrics.HistoricalMetrics.Access","AccessMetrics.RealTimeMetrics.Access","AgentGrouping.View","AgentStates.View","AgentTimeCard.View","Analytics.PerformanceMetrics.Access","AudioDeviceSettings.Access","BasicAgentAccess","CallRecordings.Unredacted.Access","Capacity.Edit","Capacity.Publish","Capacity.View","ConfigureContactAttributes.View","ContactAttributes.View","ContactLensCustomVocabulary.Edit","ContactLensCustomVocabulary.View","ContactLensPostContactSummary.View","ContactSearch.View","ContactSearchSampleContacts.View","ContactSearchWithCharacteristics.View","ContactSearchWithKeywords.View","ContactTranscripts.Unredacted.Access","ContentManagement.Create","ContentManagement.Delete","ContentManagement.Edit","ContentManagement.View","CustomMetrics.View","CustomViews.Access","CustomerProfiles.CalculatedAttributes.View","CustomerProfiles.View","Evaluation.Create","Evaluation.Edit","Evaluation.View","EvaluationForms.Create","EvaluationForms.Delete","EvaluationForms.Edit","EvaluationForms.View","EvaluationReviewRequest.Create","EvaluationReviewRequest.View","EvaluationReviews.Create","EvaluationReviews.View","ForecastScheduleInterval.Edit","ForecastScheduleInterval.View","Forecasting.Edit","Forecasting.Publish","Forecasting.View","GraphTrends.View","ManagerBargeIn","ManagerListenIn","ManualAssignAnyContact.Enable","MetricsReports.Create","MetricsReports.Delete","MetricsReports.Edit","MetricsReports.Publish","MetricsReports.Schedule","MetricsReports.View","MyContacts.View","OutboundCallAccess","Queues.View","RealtimeContactLens.View","ReportSchedules.Create","ReportSchedules.Delete","ReportSchedules.Edit","ReportSchedules.View","RoutingPolicies.View","Scheduling.Edit","Scheduling.Publish","Scheduling.View","ScreenRecording.Access","SelfAssignContacts.Access","StaffCalendar.Edit","StaffCalendar.View","TeamCalendar.Edit","TeamCalendar.View","ThemeDetection.Create","ThemeDetection.View","TimeOff.Edit","TimeOff.View","TransferDestinations.View","Users.Edit","Users.EditPermission","Users.View","Wisdom.View"],
      description: "CSC Specialist Default security profile",
    });

    const CSCTESTONLY = new connect.CfnSecurityProfile(this, 'CSCTESTONLY', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      securityProfileName: "CSC_TEST_ONLY",
      permissions: ["AccessMetrics.Dashboards.Access","AudioDeviceSettings.Access","BasicAgentAccess","ContactLensPostContactSummary.View","CustomViews.Access","CustomerProfiles.View","GraphTrends.View","MyContacts.View","OutboundCallAccess","RealtimeContactLens.View","RedactedData.View","RestrictTaskCreation.Access","ScreenRecording.Access","StaffCalendar.Edit","StaffCalendar.View","ThemeDetection.View"],
      description: "CSC_Test_Security Profile",
    });

    const MCOAgentDefault = new connect.CfnSecurityProfile(this, 'MCOAgentDefault', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      securityProfileName: "MCO_Agent_Default",
      permissions: ["AccessMetrics.Dashboards.Access","AudioDeviceSettings.Access","BasicAgentAccess","ChatTestMode","ContactAttributes.View","CustomViews.Access","CustomerProfiles.CalculatedAttributes.View","CustomerProfiles.View","MyContacts.View","OutboundCallAccess","RestrictTaskCreation.Access","Views.View"],
      description: "MCO_Agent_Default",
    });

    const FODSupervisorDefault = new connect.CfnSecurityProfile(this, 'FODSupervisorDefault', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      securityProfileName: "FOD_Supervisor_Default",
      permissions: ["AccessMetrics","AccessMetrics.AgentActivityAudit.Access","AccessMetrics.Dashboards.Access","AccessMetrics.DashboardsWithMyData.View","AccessMetrics.HistoricalMetrics.Access","AccessMetrics.RealTimeMetrics.Access","AgentGrouping.View","AgentStates.View","AgentTimeCard.View","Analytics.PerformanceMetrics.Access","AudioDeviceSettings.Access","BasicAgentAccess","ContactAttributes.View","ContactLensPostContactSummary.View","ContactSearch.View","ContactSearchWithCharacteristics.View","ContactSearchWithKeywords.View","CustomViews.Access","GraphTrends.View","HoursOfOperation.View","ListenCallRecordings","ManagerBargeIn","ManagerListenIn","MetricsReports.Create","MetricsReports.Delete","MetricsReports.Edit","MetricsReports.View","MyContacts.View","OutboundCallAccess","Queues.View","RoutingPolicies.View","TransferDestinations.View","Users.Edit","Users.View","Views.View","VoiceIdAttributesAndSearch.View"],
      description: "FOD_Supervisor_Default",
    });

    const ConnectHierarchyStructure = new connect.CfnUserHierarchyStructure(this, 'ConnectHierarchyStructure', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      userHierarchyStructure: {
        levelOne: { name: "Org" },
        levelTwo: { name: "Call Trees" },
        levelThree: { name: "Main Menu" },
        levelFour: { name: "Sections" },
        levelFive: { name: "Agent Teams" },
      },
    });

    const CDTFA = new connect.CfnUserHierarchyGroup(this, 'CDTFA', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "CDTFA",
      
    });

    const TaxpayerRightsAdvocate = new connect.CfnUserHierarchyGroup(this, 'TaxpayerRightsAdvocate', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "Taxpayer Rights Advocate",
      parentGroupArn: CDTFA.attrUserHierarchyGroupArn,
    });

    const R8004007115MainIncoming = new connect.CfnUserHierarchyGroup(this, 'R8004007115MainIncoming', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "800-400-7115 Main Incoming",
      parentGroupArn: CDTFA.attrUserHierarchyGroupArn,
    });

    const ElectronicFundsTransfer = new connect.CfnUserHierarchyGroup(this, 'ElectronicFundsTransfer', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "Electronic Funds Transfer",
      parentGroupArn: CDTFA.attrUserHierarchyGroupArn,
    });

    const TSDCROS = new connect.CfnUserHierarchyGroup(this, 'TSDCROS', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "TSD - CROS",
      parentGroupArn: CDTFA.attrUserHierarchyGroupArn,
    });

    const ConsumerUseTax = new connect.CfnUserHierarchyGroup(this, 'ConsumerUseTax', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "Consumer Use Tax",
      parentGroupArn: CDTFA.attrUserHierarchyGroupArn,
    });

    const TRAMenu = new connect.CfnUserHierarchyGroup(this, 'TRAMenu', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "TRA Menu",
      parentGroupArn: TaxpayerRightsAdvocate.attrUserHierarchyGroupArn,
    });

    const STFSpecialTaxesAndFees = new connect.CfnUserHierarchyGroup(this, 'STFSpecialTaxesAndFees', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "STF - Special Taxes and Fees",
      parentGroupArn: R8004007115MainIncoming.attrUserHierarchyGroupArn,
    });

    const FODFieldOperationsDivision = new connect.CfnUserHierarchyGroup(this, 'FODFieldOperationsDivision', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "FOD - Field Operations Division",
      parentGroupArn: R8004007115MainIncoming.attrUserHierarchyGroupArn,
    });

    const CSCCustomerServiceCenter = new connect.CfnUserHierarchyGroup(this, 'CSCCustomerServiceCenter', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "CSC – Customer Service Center",
      parentGroupArn: R8004007115MainIncoming.attrUserHierarchyGroupArn,
    });

    const RAULRAS = new connect.CfnUserHierarchyGroup(this, 'RAULRAS', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "RAU-LRAS",
      parentGroupArn: R8004007115MainIncoming.attrUserHierarchyGroupArn,
    });

    const TATaxAdvisors = new connect.CfnUserHierarchyGroup(this, 'TATaxAdvisors', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "TA -Tax Advisors",
      parentGroupArn: R8004007115MainIncoming.attrUserHierarchyGroupArn,
    });

    const EFTMenu = new connect.CfnUserHierarchyGroup(this, 'EFTMenu', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "EFT Menu",
      
    });

    const TSDCROSMenu = new connect.CfnUserHierarchyGroup(this, 'TSDCROSMenu', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "TSD CROS Menu",
      parentGroupArn: TSDCROS.attrUserHierarchyGroupArn,
    });

    const CUTMenu = new connect.CfnUserHierarchyGroup(this, 'CUTMenu', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "CUT Menu",
      parentGroupArn: ConsumerUseTax.attrUserHierarchyGroupArn,
    });

    const TRASection = new connect.CfnUserHierarchyGroup(this, 'TRASection', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "TRA Section",
      parentGroupArn: TRAMenu.attrUserHierarchyGroupArn,
    });

    const STFMotorCarrierMCO = new connect.CfnUserHierarchyGroup(this, 'STFMotorCarrierMCO', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "STF Motor Carrier MCO",
      parentGroupArn: STFSpecialTaxesAndFees.attrUserHierarchyGroupArn,
    });

    const STFCollections = new connect.CfnUserHierarchyGroup(this, 'STFCollections', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "STF Collections",
      parentGroupArn: STFSpecialTaxesAndFees.attrUserHierarchyGroupArn,
    });

    const STFRegistration = new connect.CfnUserHierarchyGroup(this, 'STFRegistration', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "STF Registration",
      parentGroupArn: STFSpecialTaxesAndFees.attrUserHierarchyGroupArn,
    });

    const STFAEB = new connect.CfnUserHierarchyGroup(this, 'STFAEB', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "STF AEB",
      parentGroupArn: STFSpecialTaxesAndFees.attrUserHierarchyGroupArn,
    });

    const STFReturnProcessing = new connect.CfnUserHierarchyGroup(this, 'STFReturnProcessing', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "STF Return Processing",
      parentGroupArn: STFSpecialTaxesAndFees.attrUserHierarchyGroupArn,
    });

    const FODSection = new connect.CfnUserHierarchyGroup(this, 'FODSection', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "FOD Section",
      parentGroupArn: FODFieldOperationsDivision.attrUserHierarchyGroupArn,
    });

    const CSCSection = new connect.CfnUserHierarchyGroup(this, 'CSCSection', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "CSC Section",
      parentGroupArn: CSCCustomerServiceCenter.attrUserHierarchyGroupArn,
    });

    const RAULRASSection = new connect.CfnUserHierarchyGroup(this, 'RAULRASSection', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "RAU-LRAS Section",
      parentGroupArn: RAULRAS.attrUserHierarchyGroupArn,
    });

    const TASection = new connect.CfnUserHierarchyGroup(this, 'TASection', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "TA Section",
      parentGroupArn: TATaxAdvisors.attrUserHierarchyGroupArn,
    });

    const EFTAgents = new connect.CfnUserHierarchyGroup(this, 'EFTAgents', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "EFT Agents",
      parentGroupArn: EFTMenu.attrUserHierarchyGroupArn,
    });

    const TSDCROSSection = new connect.CfnUserHierarchyGroup(this, 'TSDCROSSection', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "TSD CROS Section",
      parentGroupArn: TSDCROSMenu.attrUserHierarchyGroupArn,
    });

    const CUTSection = new connect.CfnUserHierarchyGroup(this, 'CUTSection', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "CUT Section",
      parentGroupArn: CUTMenu.attrUserHierarchyGroupArn,
    });

    const TRAAgents = new connect.CfnUserHierarchyGroup(this, 'TRAAgents', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "TRA Agents",
      parentGroupArn: TRASection.attrUserHierarchyGroupArn,
    });

    const MCORevoCollections = new connect.CfnUserHierarchyGroup(this, 'MCORevoCollections', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "MCO Revo Collections",
      parentGroupArn: STFMotorCarrierMCO.attrUserHierarchyGroupArn,
    });

    const MCORegistrationRefunds = new connect.CfnUserHierarchyGroup(this, 'MCORegistrationRefunds', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "MCO Registration Refunds",
      parentGroupArn: STFMotorCarrierMCO.attrUserHierarchyGroupArn,
    });

    const MCOAudit = new connect.CfnUserHierarchyGroup(this, 'MCOAudit', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "MCO Audit",
      parentGroupArn: STFMotorCarrierMCO.attrUserHierarchyGroupArn,
    });

    const MCOReturn = new connect.CfnUserHierarchyGroup(this, 'MCOReturn', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "MCO Return",
      parentGroupArn: STFMotorCarrierMCO.attrUserHierarchyGroupArn,
    });

    const STFCollectionsTeamC = new connect.CfnUserHierarchyGroup(this, 'STFCollectionsTeamC', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "STF Collections Team C",
      parentGroupArn: STFCollections.attrUserHierarchyGroupArn,
    });

    const STFCollectionsTeamB = new connect.CfnUserHierarchyGroup(this, 'STFCollectionsTeamB', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "STF Collections Team B",
      parentGroupArn: STFCollections.attrUserHierarchyGroupArn,
    });

    const STFCollectionsTeamF = new connect.CfnUserHierarchyGroup(this, 'STFCollectionsTeamF', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "STF Collections Team F",
      parentGroupArn: STFCollections.attrUserHierarchyGroupArn,
    });

    const STFCollectionsTeamA = new connect.CfnUserHierarchyGroup(this, 'STFCollectionsTeamA', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "STF Collections Team A",
      parentGroupArn: STFCollections.attrUserHierarchyGroupArn,
    });

    const STFCollectionsTeamD = new connect.CfnUserHierarchyGroup(this, 'STFCollectionsTeamD', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "STF Collections Team D",
      parentGroupArn: STFCollections.attrUserHierarchyGroupArn,
    });

    const STFCollectionsTeamE = new connect.CfnUserHierarchyGroup(this, 'STFCollectionsTeamE', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "STF Collections Team E",
      parentGroupArn: STFCollections.attrUserHierarchyGroupArn,
    });

    const STFRegistrationTeam4 = new connect.CfnUserHierarchyGroup(this, 'STFRegistrationTeam4', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "STF Registration Team 4",
      parentGroupArn: STFRegistration.attrUserHierarchyGroupArn,
    });

    const STFRegistrationTeam5 = new connect.CfnUserHierarchyGroup(this, 'STFRegistrationTeam5', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "STF Registration Team 5",
      parentGroupArn: STFRegistration.attrUserHierarchyGroupArn,
    });

    const STFRegistrationTeam3 = new connect.CfnUserHierarchyGroup(this, 'STFRegistrationTeam3', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "STF Registration Team 3",
      parentGroupArn: STFRegistration.attrUserHierarchyGroupArn,
    });

    const STFRegistrationTeam1 = new connect.CfnUserHierarchyGroup(this, 'STFRegistrationTeam1', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "STF Registration Team 1",
      parentGroupArn: STFRegistration.attrUserHierarchyGroupArn,
    });

    const STFRegistrationTeam2 = new connect.CfnUserHierarchyGroup(this, 'STFRegistrationTeam2', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "STF Registration Team 2",
      parentGroupArn: STFRegistration.attrUserHierarchyGroupArn,
    });

    const STFAEBAgents = new connect.CfnUserHierarchyGroup(this, 'STFAEBAgents', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "STF AEB Agents",
      parentGroupArn: STFAEB.attrUserHierarchyGroupArn,
    });

    const STFReturnProcessingTeam1 = new connect.CfnUserHierarchyGroup(this, 'STFReturnProcessingTeam1', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "STF Return Processing Team 1",
      parentGroupArn: STFReturnProcessing.attrUserHierarchyGroupArn,
    });

    const STFReturnProcessingTeam3 = new connect.CfnUserHierarchyGroup(this, 'STFReturnProcessingTeam3', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "STF Return Processing Team 3",
      parentGroupArn: STFReturnProcessing.attrUserHierarchyGroupArn,
    });

    const STFReturnProcessingTeam2 = new connect.CfnUserHierarchyGroup(this, 'STFReturnProcessingTeam2', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "STF Return Processing Team 2",
      parentGroupArn: STFReturnProcessing.attrUserHierarchyGroupArn,
    });

    const STFReturnProcessingTeam4 = new connect.CfnUserHierarchyGroup(this, 'STFReturnProcessingTeam4', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "STF Return Processing Team 4",
      parentGroupArn: STFReturnProcessing.attrUserHierarchyGroupArn,
    });

    const STFReturnProcessingTeam5 = new connect.CfnUserHierarchyGroup(this, 'STFReturnProcessingTeam5', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "STF Return Processing Team 5",
      parentGroupArn: STFReturnProcessing.attrUserHierarchyGroupArn,
    });

    const FODRiversideAgents = new connect.CfnUserHierarchyGroup(this, 'FODRiversideAgents', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "FOD Riverside Agents",
      parentGroupArn: FODSection.attrUserHierarchyGroupArn,
    });

    const FODOaklandAgents = new connect.CfnUserHierarchyGroup(this, 'FODOaklandAgents', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "FOD Oakland Agents",
      parentGroupArn: FODSection.attrUserHierarchyGroupArn,
    });

    const FODSanFranciscoAgents = new connect.CfnUserHierarchyGroup(this, 'FODSanFranciscoAgents', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "FOD San Francisco Agents",
      parentGroupArn: FODSection.attrUserHierarchyGroupArn,
    });

    const FODIrvineAgents = new connect.CfnUserHierarchyGroup(this, 'FODIrvineAgents', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "FOD Irvine Agents",
      parentGroupArn: FODSection.attrUserHierarchyGroupArn,
    });

    const FODRanchoMirageAgents = new connect.CfnUserHierarchyGroup(this, 'FODRanchoMirageAgents', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "FOD Rancho Mirage Agents",
      parentGroupArn: FODSection.attrUserHierarchyGroupArn,
    });

    const FODInvestigationsCSBAgents = new connect.CfnUserHierarchyGroup(this, 'FODInvestigationsCSBAgents', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "FOD Investigations CSB Agents",
      parentGroupArn: FODSection.attrUserHierarchyGroupArn,
    });

    const FODVenturaAgents = new connect.CfnUserHierarchyGroup(this, 'FODVenturaAgents', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "FOD Ventura Agents",
      parentGroupArn: FODSection.attrUserHierarchyGroupArn,
    });

    const FODFresnoAgents = new connect.CfnUserHierarchyGroup(this, 'FODFresnoAgents', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "FOD Fresno Agents",
      parentGroupArn: FODSection.attrUserHierarchyGroupArn,
    });

    const FODDiamondBarAgents = new connect.CfnUserHierarchyGroup(this, 'FODDiamondBarAgents', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "FOD Diamond Bar Agents",
      parentGroupArn: FODSection.attrUserHierarchyGroupArn,
    });

    const FODUTCBNorthAgents = new connect.CfnUserHierarchyGroup(this, 'FODUTCBNorthAgents', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "FOD UTCB North Agents",
      parentGroupArn: FODSection.attrUserHierarchyGroupArn,
    });

    const FODGlendaleAgents = new connect.CfnUserHierarchyGroup(this, 'FODGlendaleAgents', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "FOD Glendale Agents",
      parentGroupArn: FODSection.attrUserHierarchyGroupArn,
    });

    const FODCulverCityAgents = new connect.CfnUserHierarchyGroup(this, 'FODCulverCityAgents', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "FOD Culver City Agents",
      parentGroupArn: FODSection.attrUserHierarchyGroupArn,
    });

    const FODRiversideSCOPAgents = new connect.CfnUserHierarchyGroup(this, 'FODRiversideSCOPAgents', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "FOD Riverside SCOP Agents",
      parentGroupArn: FODSection.attrUserHierarchyGroupArn,
    });

    const FODElCentroAgents = new connect.CfnUserHierarchyGroup(this, 'FODElCentroAgents', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "FOD El Centro Agents",
      parentGroupArn: FODSection.attrUserHierarchyGroupArn,
    });

    const FODUTCBSouthAgents = new connect.CfnUserHierarchyGroup(this, 'FODUTCBSouthAgents', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "FOD UTCB South Agents",
      parentGroupArn: FODSection.attrUserHierarchyGroupArn,
    });

    const FODSanDiegoAgents = new connect.CfnUserHierarchyGroup(this, 'FODSanDiegoAgents', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "FOD San Diego Agents",
      parentGroupArn: FODSection.attrUserHierarchyGroupArn,
    });

    const FODFairfieldAgents = new connect.CfnUserHierarchyGroup(this, 'FODFairfieldAgents', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "FOD Fairfield Agents",
      parentGroupArn: FODSection.attrUserHierarchyGroupArn,
    });

    const FODRanchoCucamongaAgents = new connect.CfnUserHierarchyGroup(this, 'FODRanchoCucamongaAgents', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "FOD Rancho Cucamonga Agents",
      parentGroupArn: FODSection.attrUserHierarchyGroupArn,
    });

    const FODStocktonAgents = new connect.CfnUserHierarchyGroup(this, 'FODStocktonAgents', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "FOD Stockton Agents",
      parentGroupArn: FODSection.attrUserHierarchyGroupArn,
    });

    const FODReddingAgents = new connect.CfnUserHierarchyGroup(this, 'FODReddingAgents', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "FOD Redding Agents",
      parentGroupArn: FODSection.attrUserHierarchyGroupArn,
    });

    const FODSacramentoAgents = new connect.CfnUserHierarchyGroup(this, 'FODSacramentoAgents', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "FOD Sacramento Agents",
      parentGroupArn: FODSection.attrUserHierarchyGroupArn,
    });

    const FODSantaClaritaAgents = new connect.CfnUserHierarchyGroup(this, 'FODSantaClaritaAgents', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "FOD Santa Clarita Agents",
      parentGroupArn: FODSection.attrUserHierarchyGroupArn,
    });

    const FODSanJoseAgents = new connect.CfnUserHierarchyGroup(this, 'FODSanJoseAgents', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "FOD San Jose Agents",
      parentGroupArn: FODSection.attrUserHierarchyGroupArn,
    });

    const FODOutOfStateAgents = new connect.CfnUserHierarchyGroup(this, 'FODOutOfStateAgents', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "FOD Out of State Agents",
      parentGroupArn: FODSection.attrUserHierarchyGroupArn,
    });

    const FODBakersfieldAgents = new connect.CfnUserHierarchyGroup(this, 'FODBakersfieldAgents', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "FOD Bakersfield Agents",
      parentGroupArn: FODSection.attrUserHierarchyGroupArn,
    });

    const FODSalinasAgents = new connect.CfnUserHierarchyGroup(this, 'FODSalinasAgents', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "FOD Salinas Agents",
      parentGroupArn: FODSection.attrUserHierarchyGroupArn,
    });

    const FODSantaRosaAgents = new connect.CfnUserHierarchyGroup(this, 'FODSantaRosaAgents', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "FOD Santa Rosa Agents",
      parentGroupArn: FODSection.attrUserHierarchyGroupArn,
    });

    const FODCerritosAgents = new connect.CfnUserHierarchyGroup(this, 'FODCerritosAgents', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "FOD Cerritos Agents",
      parentGroupArn: FODSection.attrUserHierarchyGroupArn,
    });

    const CSCTeamGarcia = new connect.CfnUserHierarchyGroup(this, 'CSCTeamGarcia', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "CSC Team Garcia",
      parentGroupArn: CSCSection.attrUserHierarchyGroupArn,
    });

    const CSCTeamColgrove = new connect.CfnUserHierarchyGroup(this, 'CSCTeamColgrove', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "CSC Team Colgrove",
      parentGroupArn: CSCSection.attrUserHierarchyGroupArn,
    });

    const CSCTeamSpecialist = new connect.CfnUserHierarchyGroup(this, 'CSCTeamSpecialist', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "CSC Team Specialist",
      parentGroupArn: CSCSection.attrUserHierarchyGroupArn,
    });

    const CSCTeamSingh = new connect.CfnUserHierarchyGroup(this, 'CSCTeamSingh', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "CSC Team Singh",
      parentGroupArn: CSCSection.attrUserHierarchyGroupArn,
    });

    const CSCTeamSpagnolo = new connect.CfnUserHierarchyGroup(this, 'CSCTeamSpagnolo', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "CSC Team Spagnolo",
      parentGroupArn: CSCSection.attrUserHierarchyGroupArn,
    });

    const CSCTeamChung = new connect.CfnUserHierarchyGroup(this, 'CSCTeamChung', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "CSC Team Chung",
      parentGroupArn: CSCSection.attrUserHierarchyGroupArn,
    });

    const CSCTeamDominguez = new connect.CfnUserHierarchyGroup(this, 'CSCTeamDominguez', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "CSC Team Dominguez",
      parentGroupArn: CSCSection.attrUserHierarchyGroupArn,
    });

    const CSCTeamMcNamara = new connect.CfnUserHierarchyGroup(this, 'CSCTeamMcNamara', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "CSC Team McNamara",
      parentGroupArn: CSCSection.attrUserHierarchyGroupArn,
    });

    const CSCTeamRichards = new connect.CfnUserHierarchyGroup(this, 'CSCTeamRichards', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "CSC Team Richards",
      parentGroupArn: CSCSection.attrUserHierarchyGroupArn,
    });

    const CSCTeamBTR = new connect.CfnUserHierarchyGroup(this, 'CSCTeamBTR', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "CSC Team BTR",
      parentGroupArn: CSCSection.attrUserHierarchyGroupArn,
    });

    const AxyomAssistAccessTest = new connect.CfnUserHierarchyGroup(this, 'AxyomAssistAccessTest', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "axyom-assist-access-test",
      parentGroupArn: CSCSection.attrUserHierarchyGroupArn,
    });

    const CSCTeamJones = new connect.CfnUserHierarchyGroup(this, 'CSCTeamJones', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "CSC Team Jones",
      parentGroupArn: CSCSection.attrUserHierarchyGroupArn,
    });

    const CSCTeamLetro = new connect.CfnUserHierarchyGroup(this, 'CSCTeamLetro', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "CSC Team Letro",
      parentGroupArn: CSCSection.attrUserHierarchyGroupArn,
    });

    const AxyomAssistAccess = new connect.CfnUserHierarchyGroup(this, 'AxyomAssistAccess', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "axyom-assist-access",
      parentGroupArn: CSCSection.attrUserHierarchyGroupArn,
    });

    const CSCTeamSamadi = new connect.CfnUserHierarchyGroup(this, 'CSCTeamSamadi', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "CSC Team Samadi",
      parentGroupArn: CSCSection.attrUserHierarchyGroupArn,
    });

    const CSCTeamKumar = new connect.CfnUserHierarchyGroup(this, 'CSCTeamKumar', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "CSC Team Kumar",
      parentGroupArn: CSCSection.attrUserHierarchyGroupArn,
    });

    const CSCTeamIrvin = new connect.CfnUserHierarchyGroup(this, 'CSCTeamIrvin', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "CSC Team Irvin",
      parentGroupArn: CSCSection.attrUserHierarchyGroupArn,
    });

    const LRASAgents = new connect.CfnUserHierarchyGroup(this, 'LRASAgents', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "LRAS Agents",
      parentGroupArn: RAULRASSection.attrUserHierarchyGroupArn,
    });

    const RAUReturnAnalysisUnitAgents = new connect.CfnUserHierarchyGroup(this, 'RAUReturnAnalysisUnitAgents', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "RAU - Return Analysis Unit Agents",
      parentGroupArn: RAULRASSection.attrUserHierarchyGroupArn,
    });

    const TaxAdvisorAgents = new connect.CfnUserHierarchyGroup(this, 'TaxAdvisorAgents', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "Tax Advisor Agents",
      parentGroupArn: TASection.attrUserHierarchyGroupArn,
    });

    const TSDCROSAgents = new connect.CfnUserHierarchyGroup(this, 'TSDCROSAgents', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "TSD CROS Agents",
      parentGroupArn: TSDCROSSection.attrUserHierarchyGroupArn,
    });

    const CUTSAgents = new connect.CfnUserHierarchyGroup(this, 'CUTSAgents', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "CUTS Agents",
      parentGroupArn: CUTSection.attrUserHierarchyGroupArn,
    });

    // QuickConnect 'CSC Efile Assistance' — queue or contact flow has no target counterpart, skipping

    // QuickConnect 'STF Alcoholic Bev Collection' — queue or contact flow has no target counterpart, skipping

    // QuickConnect 'STF Cigarette Tobacco Renewal' — queue or contact flow has no target counterpart, skipping

    // QuickConnect 'STF RET Marine Invasive Species' — queue or contact flow has no target counterpart, skipping

    // QuickConnect 'STF Cigarette Tobacco General' — queue or contact flow has no target counterpart, skipping

    const RiversideFieldOffice = new connect.CfnQuickConnect(this, 'RiversideFieldOffice', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "Riverside Field Office",
      quickConnectConfig: { quickConnectType: 'PHONE_NUMBER', phoneConfig: { phoneNumber: "+19516806400" } },
      
    });

    // QuickConnect 'STF RET Childhood Lead Poisoning Prevention' — queue or contact flow has no target counterpart, skipping

    const UTCBReceptionFieldOffice = new connect.CfnQuickConnect(this, 'UTCBReceptionFieldOffice', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "UTCB Reception Field Office",
      quickConnectConfig: { quickConnectType: 'PHONE_NUMBER', phoneConfig: { phoneNumber: "+19163098150" } },
      
    });

    // QuickConnect 'STF Cigarette Tobacco New Reg' — queue or contact flow has no target counterpart, skipping

    // QuickConnect 'STF Alcoholic Bev Tax Reg' — queue or contact flow has no target counterpart, skipping

    const BakersfieldFieldOffice = new connect.CfnQuickConnect(this, 'BakersfieldFieldOffice', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "Bakersfield Field Office",
      quickConnectConfig: { quickConnectType: 'PHONE_NUMBER', phoneConfig: { phoneNumber: "+16613952880" } },
      
    });

    const TAGPraphanSonnySouvannarath = new connect.CfnQuickConnect(this, 'TAGPraphanSonnySouvannarath', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "TAG Praphan (Sonny) Souvannarath",
      quickConnectConfig: { quickConnectType: 'PHONE_NUMBER', phoneConfig: { phoneNumber: "+12792023539" } },
      description: "TAG Direct Dial for Praphan (Sonny) Souvannarath 12792023539",
    });

    // QuickConnect 'STF Underground Storage Reg' — queue or contact flow has no target counterpart, skipping

    // QuickConnect 'CSC General Questions' — queue or contact flow has no target counterpart, skipping

    const CSCTaskAgentAssist = new connect.CfnQuickConnect(this, 'CSCTaskAgentAssist', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "CSC Task Agent Assist",
      quickConnectConfig: { quickConnectType: 'PHONE_NUMBER', phoneConfig: { phoneNumber: "+19169054894" } },
      
    });

    // QuickConnect 'MCO Motor Carrier Returns' — queue or contact flow has no target counterpart, skipping

    // QuickConnect 'STF Electrical Energy Reg' — queue or contact flow has no target counterpart, skipping

    // QuickConnect 'US Customs' — queue or contact flow has no target counterpart, skipping

    // QuickConnect 'TRA Taxpayers Rights Advocate' — queue or contact flow has no target counterpart, skipping

    // QuickConnect 'STF Username Registration' — queue or contact flow has no target counterpart, skipping

    const SacramentoFieldOffice = new connect.CfnQuickConnect(this, 'SacramentoFieldOffice', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "Sacramento Field Office",
      quickConnectConfig: { quickConnectType: 'PHONE_NUMBER', phoneConfig: { phoneNumber: "+19162276700" } },
      
    });

    const FairfieldFieldOffice = new connect.CfnQuickConnect(this, 'FairfieldFieldOffice', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "Fairfield Field Office",
      quickConnectConfig: { quickConnectType: 'PHONE_NUMBER', phoneConfig: { phoneNumber: "+17074274800" } },
      
    });

    // QuickConnect 'MCO Motor Carrier No Fuel Trip Penalty' — queue or contact flow has no target counterpart, skipping

    const TAGKatherineGreen = new connect.CfnQuickConnect(this, 'TAGKatherineGreen', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "TAG Katherine Green",
      quickConnectConfig: { quickConnectType: 'PHONE_NUMBER', phoneConfig: { phoneNumber: "+19169198697" } },
      description: "TAG Direct Dial for Katherine Green 19169198697",
    });

    // QuickConnect 'STF Lead Poisoning Prev Reg' — queue or contact flow has no target counterpart, skipping

    // QuickConnect 'STF RET Energy and Natural Gas Surcharge' — queue or contact flow has no target counterpart, skipping

    const TAGJohnnyPuim = new connect.CfnQuickConnect(this, 'TAGJohnnyPuim', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "TAG Johnny Puim",
      quickConnectConfig: { quickConnectType: 'PHONE_NUMBER', phoneConfig: { phoneNumber: "+12792052843" } },
      description: "TAG Direct Dial for Johnny Puim 12792052843",
    });

    const SanJoseFieldOffice = new connect.CfnQuickConnect(this, 'SanJoseFieldOffice', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "San Jose Field Office",
      quickConnectConfig: { quickConnectType: 'PHONE_NUMBER', phoneConfig: { phoneNumber: "+14082771231" } },
      
    });

    const TAGSarahCrite = new connect.CfnQuickConnect(this, 'TAGSarahCrite', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "TAG Sarah Crite",
      quickConnectConfig: { quickConnectType: 'PHONE_NUMBER', phoneConfig: { phoneNumber: "+12792052846" } },
      description: "TAG Direct Dial for Sarah Crite 12792052846",
    });

    // QuickConnect 'STF-Covered Battery-Embedded Waste Fee Ret' — queue or contact flow has no target counterpart, skipping

    const TAGHeatherMcDonald = new connect.CfnQuickConnect(this, 'TAGHeatherMcDonald', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "TAG Heather McDonald",
      quickConnectConfig: { quickConnectType: 'PHONE_NUMBER', phoneConfig: { phoneNumber: "+12792023612" } },
      description: "TAG Direct Dial for Heather McDonald 12792023612",
    });

    // QuickConnect 'RAU EFT Helpline' — queue or contact flow has no target counterpart, skipping

    // QuickConnect 'STF eWaste Ret' — queue or contact flow has no target counterpart, skipping

    const ElCentroFieldOffice = new connect.CfnQuickConnect(this, 'ElCentroFieldOffice', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "El Centro Field Office",
      quickConnectConfig: { quickConnectType: 'PHONE_NUMBER', phoneConfig: { phoneNumber: "+17603523431" } },
      
    });

    // QuickConnect 'STF Oil Spill Fee Reg' — queue or contact flow has no target counterpart, skipping

    const OutOfStateFieldOffice = new connect.CfnQuickConnect(this, 'OutOfStateFieldOffice', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "Out of State Field Office",
      quickConnectConfig: { quickConnectType: 'PHONE_NUMBER', phoneConfig: { phoneNumber: "+19162276600" } },
      
    });

    // QuickConnect 'MCO Motor Carrier - IFTA Renewal' — queue or contact flow has no target counterpart, skipping

    // QuickConnect 'STF Lead Acid Battery Reg' — queue or contact flow has no target counterpart, skipping

    // QuickConnect 'MCO Motor Carrier - IFTA Registration' — queue or contact flow has no target counterpart, skipping

    // QuickConnect 'MCO Motor Carrier Collections' — queue or contact flow has no target counterpart, skipping

    const TAGNickolasRoss = new connect.CfnQuickConnect(this, 'TAGNickolasRoss', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "TAG Nickolas Ross",
      quickConnectConfig: { quickConnectType: 'PHONE_NUMBER', phoneConfig: { phoneNumber: "+12792023597" } },
      description: "TAG Direct Dial for Nickolas Ross 12792023597",
    });

    // QuickConnect 'TAG-Tax Advisor Group' — queue or contact flow has no target counterpart, skipping

    // QuickConnect 'STF-Covered Battery-Embedded Waste Fee Reg' — queue or contact flow has no target counterpart, skipping

    // QuickConnect 'MCO Motor Carrier Spanish' — queue or contact flow has no target counterpart, skipping

    // QuickConnect 'STF Cannabis Registration' — queue or contact flow has no target counterpart, skipping

    // QuickConnect 'CUTS Advisory' — queue or contact flow has no target counterpart, skipping

    const EDDEmploymentDevelopmentDept = new connect.CfnQuickConnect(this, 'EDDEmploymentDevelopmentDept', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "EDD - Employment Development Dept",
      quickConnectConfig: { quickConnectType: 'PHONE_NUMBER', phoneConfig: { phoneNumber: "+18887453886" } },
      
    });

    // QuickConnect 'STF Fuel Taxes Reg' — queue or contact flow has no target counterpart, skipping

    const FTBFranchiseTaxBoard = new connect.CfnQuickConnect(this, 'FTBFranchiseTaxBoard', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "FTB Franchise Tax Board",
      quickConnectConfig: { quickConnectType: 'PHONE_NUMBER', phoneConfig: { phoneNumber: "+18008621703" } },
      
    });

    // QuickConnect 'CUTS Clearance' — queue or contact flow has no target counterpart, skipping

    const TAGLindaJohnston = new connect.CfnQuickConnect(this, 'TAGLindaJohnston', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "TAG Linda Johnston",
      quickConnectConfig: { quickConnectType: 'PHONE_NUMBER', phoneConfig: { phoneNumber: "+12792052845" } },
      description: "TAG Direct Dial for Linda Johnston 12792052845",
    });

    // QuickConnect 'STF Marine Invasive Reg' — queue or contact flow has no target counterpart, skipping

    // QuickConnect 'STF Tire Recycling Reg' — queue or contact flow has no target counterpart, skipping

    // QuickConnect 'MCO Motor Carrier Petitions' — queue or contact flow has no target counterpart, skipping

    // QuickConnect 'STF Natural Gas Reg' — queue or contact flow has no target counterpart, skipping

    const OaklandFieldOffice = new connect.CfnQuickConnect(this, 'OaklandFieldOffice', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "Oakland Field Office",
      quickConnectConfig: { quickConnectType: 'PHONE_NUMBER', phoneConfig: { phoneNumber: "+15106224100" } },
      
    });

    // QuickConnect 'STF Water Rights Reg' — queue or contact flow has no target counterpart, skipping

    const TAGAnnaNava = new connect.CfnQuickConnect(this, 'TAGAnnaNava', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "TAG Anna Nava",
      quickConnectConfig: { quickConnectType: 'PHONE_NUMBER', phoneConfig: { phoneNumber: "+19169198696" } },
      description: "TAG Direct Dial for Anna Nava 19169198696",
    });

    // QuickConnect 'STF eWaste Reg' — queue or contact flow has no target counterpart, skipping

    // QuickConnect 'STF Emergency Telephone Reg' — queue or contact flow has no target counterpart, skipping

    const TAGIrmaOrtiz = new connect.CfnQuickConnect(this, 'TAGIrmaOrtiz', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "TAG Irma Ortiz",
      quickConnectConfig: { quickConnectType: 'PHONE_NUMBER', phoneConfig: { phoneNumber: "+12792052856" } },
      description: "TAG Direct Dial for Irma Ortiz 12792052856",
    });

    const SanFranciscoFieldOffice = new connect.CfnQuickConnect(this, 'SanFranciscoFieldOffice', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "San Francisco Field Office",
      quickConnectConfig: { quickConnectType: 'PHONE_NUMBER', phoneConfig: { phoneNumber: "+14153566600" } },
      
    });

    // QuickConnect 'STF Childhood Lead Poison Reg' — queue or contact flow has no target counterpart, skipping

    // QuickConnect 'STF RET Alcoholic Beverage' — queue or contact flow has no target counterpart, skipping

    // QuickConnect 'STF RET Emergency Telephone-Prepaid 911' — queue or contact flow has no target counterpart, skipping

    const TAGTinotendaGwarada = new connect.CfnQuickConnect(this, 'TAGTinotendaGwarada', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "TAG Tinotenda Gwarada",
      quickConnectConfig: { quickConnectType: 'PHONE_NUMBER', phoneConfig: { phoneNumber: "+12792023531" } },
      description: "TAG Direct Dial for Tinotenda Gwarada 12792023531",
    });

    // QuickConnect 'STF RET Cannabis' — queue or contact flow has no target counterpart, skipping

    // QuickConnect 'STF RET Fuel Taxes' — queue or contact flow has no target counterpart, skipping

    // QuickConnect 'STF RET Integrated Waste Management' — queue or contact flow has no target counterpart, skipping

    // QuickConnect 'STF Underground Storage Ret' — queue or contact flow has no target counterpart, skipping

    // QuickConnect 'STF Delinquency' — queue or contact flow has no target counterpart, skipping

    // QuickConnect 'STF RET Natural Gas Surcharge' — queue or contact flow has no target counterpart, skipping

    // QuickConnect 'MCO Motor Carrier Billing Refund' — queue or contact flow has no target counterpart, skipping

    // QuickConnect 'STF Water Rights Ret' — queue or contact flow has no target counterpart, skipping

    const ReddingFieldOffice = new connect.CfnQuickConnect(this, 'ReddingFieldOffice', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "Redding Field Office",
      quickConnectConfig: { quickConnectType: 'PHONE_NUMBER', phoneConfig: { phoneNumber: "+15302244729" } },
      
    });

    // QuickConnect 'STF Railroad Response Reg' — queue or contact flow has no target counterpart, skipping

    const SantaAnaFieldOffice = new connect.CfnQuickConnect(this, 'SantaAnaFieldOffice', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "Santa Ana Field Office",
      quickConnectConfig: { quickConnectType: 'PHONE_NUMBER', phoneConfig: { phoneNumber: "+19494403473" } },
      
    });

    // QuickConnect 'STF Billings' — queue or contact flow has no target counterpart, skipping

    const FiservCreditCardPayments = new connect.CfnQuickConnect(this, 'FiservCreditCardPayments', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "Fiserv Credit Card Payments",
      quickConnectConfig: { quickConnectType: 'PHONE_NUMBER', phoneConfig: { phoneNumber: "+18444458221" } },
      description: "Fiserv Inc Credit Card Payments Vendor",
    });

    const SantaRosaFieldOffice = new connect.CfnQuickConnect(this, 'SantaRosaFieldOffice', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "Santa Rosa Field Office",
      quickConnectConfig: { quickConnectType: 'PHONE_NUMBER', phoneConfig: { phoneNumber: "+17075762100" } },
      
    });

    // QuickConnect 'STF RET Oil Spill Prevention Fee' — queue or contact flow has no target counterpart, skipping

    const SanDiegoFieldOffice = new connect.CfnQuickConnect(this, 'SanDiegoFieldOffice', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "San Diego Field Office",
      quickConnectConfig: { quickConnectType: 'PHONE_NUMBER', phoneConfig: { phoneNumber: "+18583854700" } },
      
    });

    // QuickConnect 'STF Firearms and Ammunition Excise Tax Reg' — queue or contact flow has no target counterpart, skipping

    // QuickConnect 'STF Tire Recycling Ret' — queue or contact flow has no target counterpart, skipping

    // QuickConnect 'STF Collections (General)' — queue or contact flow has no target counterpart, skipping

    // QuickConnect 'Q_CSC_NCW_Closeouts' — queue or contact flow has no target counterpart, skipping

    const TAGJohnellWilson = new connect.CfnQuickConnect(this, 'TAGJohnellWilson', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "TAG Johnell Wilson",
      quickConnectConfig: { quickConnectType: 'PHONE_NUMBER', phoneConfig: { phoneNumber: "+12792052859" } },
      description: "TAG Direct Dial for Johnell Wilson 12792052859",
    });

    // QuickConnect 'STF Hazardous Waste Reg' — queue or contact flow has no target counterpart, skipping

    const TAGEricClingman = new connect.CfnQuickConnect(this, 'TAGEricClingman', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "TAG Eric Clingman",
      quickConnectConfig: { quickConnectType: 'PHONE_NUMBER', phoneConfig: { phoneNumber: "+19169198698" } },
      description: "TAG Direct Dial for Eric Clingman 19169198698",
    });

    // QuickConnect 'STF Timber Tax Registration' — queue or contact flow has no target counterpart, skipping

    // QuickConnect 'STF RET Lead Acid Battery' — queue or contact flow has no target counterpart, skipping

    const RanchoMirageFieldOffice = new connect.CfnQuickConnect(this, 'RanchoMirageFieldOffice', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "Rancho Mirage Field Office",
      quickConnectConfig: { quickConnectType: 'PHONE_NUMBER', phoneConfig: { phoneNumber: "+17607704828" } },
      
    });

    const TAGErichWhisenhunt = new connect.CfnQuickConnect(this, 'TAGErichWhisenhunt', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "TAG Erich Whisenhunt",
      quickConnectConfig: { quickConnectType: 'PHONE_NUMBER', phoneConfig: { phoneNumber: "+19169198699" } },
      description: "TAG Direct Dial for Erich Whisenhunt 19169198699",
    });

    const SalinasFieldOffice = new connect.CfnQuickConnect(this, 'SalinasFieldOffice', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "Salinas Field Office",
      quickConnectConfig: { quickConnectType: 'PHONE_NUMBER', phoneConfig: { phoneNumber: "+18317544500" } },
      
    });

    const VenturaFieldOffice = new connect.CfnQuickConnect(this, 'VenturaFieldOffice', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "Ventura Field Office",
      quickConnectConfig: { quickConnectType: 'PHONE_NUMBER', phoneConfig: { phoneNumber: "+18056772700" } },
      
    });

    const CSCSpanish = new connect.CfnQuickConnect(this, 'CSCSpanish', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "CSC Spanish",
      quickConnectConfig: { quickConnectType: 'QUEUE', queueConfig: { queueArn: arns.QCSCSpanish, contactFlowArn: arns.CdtfaQueueQuickConnectSpanish } },
      
    });

    const FresnoFieldOffice = new connect.CfnQuickConnect(this, 'FresnoFieldOffice', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "Fresno Field Office",
      quickConnectConfig: { quickConnectType: 'PHONE_NUMBER', phoneConfig: { phoneNumber: "+15594405330" } },
      
    });

    // QuickConnect 'STF Railroad Response Ret' — queue or contact flow has no target counterpart, skipping

    const MCORegistrationRefundsProfile2 = new connect.CfnRoutingProfile(this, 'MCORegistrationRefundsProfile2', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "MCO_Registration_Refunds Profile 2",
      defaultOutboundQueueArn: arns.BasicQueue,
      mediaConcurrencies: [{ channel: "VOICE", concurrency: 1 }],
      queueConfigs: [{ delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: arns.QMCOCBSpanish } }, { delay: 0, priority: 2, queueReference: { channel: "VOICE", queueArn: arns.QMCOSpanish } }, { delay: 0, priority: 2, queueReference: { channel: "VOICE", queueArn: arns.QMCONewLicenseOrAcct } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: arns.QMCOCBLicenseIFTADecals } }, { delay: 0, priority: 2, queueReference: { channel: "VOICE", queueArn: arns.QMCOLicenseIFTADecals } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: arns.QMCOCBNewLicenseOrAcct } }],
      description: "MCO_Registration_Refunds Profile 2 License New & Renew Only",
    });

    const CSCTrainingSpanishOnly = new connect.CfnRoutingProfile(this, 'CSCTrainingSpanishOnly', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "CSC Training Spanish Only",
      defaultOutboundQueueArn: arns.QCSCSpanish,
      mediaConcurrencies: [{ channel: "VOICE", concurrency: 1 }],
      queueConfigs: [{ delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: arns.QCSCCBSpanish } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: arns.QCSCSpanish } }],
      description: "CSC Training Spanish Only",
    });

    const STFRegAgentTeam1 = new connect.CfnRoutingProfile(this, 'STFRegAgentTeam1', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "STF Reg Agent Team 1",
      defaultOutboundQueueArn: arns.QSTFRegFuelUSTFCLPPF,
      mediaConcurrencies: [{ channel: "VOICE", concurrency: 1 }],
      queueConfigs: [{ delay: 10, priority: 3, queueReference: { channel: "VOICE", queueArn: arns.QSTFCBRegEwasteTireIWMF } }, { delay: 5, priority: 2, queueReference: { channel: "VOICE", queueArn: arns.QSTFRegAlcoholicBev } }, { delay: 5, priority: 2, queueReference: { channel: "VOICE", queueArn: arns.QSTFRegEwasteTireIWMF } }, { delay: 10, priority: 3, queueReference: { channel: "VOICE", queueArn: arns.QSTFCBRegCigaretteTobacco } }, { delay: 10, priority: 3, queueReference: { channel: "VOICE", queueArn: arns.QSTFCBUsernamePassAsst } }, { delay: 10, priority: 3, queueReference: { channel: "VOICE", queueArn: arns.QSTFCBRegCannabis } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: arns.QSTFRegFuelUSTFCLPPF } }, { delay: 5, priority: 2, queueReference: { channel: "VOICE", queueArn: arns.QSTFRegCigaretteTobacco } }, { delay: 5, priority: 2, queueReference: { channel: "VOICE", queueArn: arns.QSTFRegCannabis } }, { delay: 10, priority: 3, queueReference: { channel: "VOICE", queueArn: arns.QSTFCBRegTeleEnergyWater } }, { delay: 5, priority: 2, queueReference: { channel: "VOICE", queueArn: arns.QSTFRegTeleEnergyWater } }, { delay: 10, priority: 3, queueReference: { channel: "VOICE", queueArn: arns.QSTFCBRegAlcoholicBev } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: arns.QSTFCBRegFuelUSTFCLPPF } }, { delay: 10, priority: 3, queueReference: { channel: "VOICE", queueArn: arns.QSTFUsernamePassAsst } }],
      description: "STF Reg Agent Team 1",
    });

    const MCORevoCollectionsProfile2 = new connect.CfnRoutingProfile(this, 'MCORevoCollectionsProfile2', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "MCO Revo_Collections Profile 2",
      defaultOutboundQueueArn: arns.BasicQueue,
      mediaConcurrencies: [{ channel: "VOICE", concurrency: 1 }],
      queueConfigs: [{ delay: 0, priority: 2, queueReference: { channel: "VOICE", queueArn: arns.QMCONewLicenseOrAcct } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: arns.QMCOCBLicenseIFTADecals } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: arns.QMCOCBCollectRevo } }, { delay: 30, priority: 3, queueReference: { channel: "VOICE", queueArn: arns.QMCOCollectRevo } }, { delay: 0, priority: 2, queueReference: { channel: "VOICE", queueArn: arns.QMCOLicenseIFTADecals } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: arns.QMCOCBNewLicenseOrAcct } }],
      description: "MCO Revo_Collections Profile 2",
    });

    const CSCAgentAssistChatSpanishChat = new connect.CfnRoutingProfile(this, 'CSCAgentAssistChatSpanishChat', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "CSC Agent Assist + Chat + Spanish Chat",
      defaultOutboundQueueArn: arns.QCSCCustomerServiceCenter,
      mediaConcurrencies: [{ channel: "CHAT", concurrency: 4 }, { channel: "TASK", concurrency: 1 }, { channel: "VOICE", concurrency: 1 }],
      queueConfigs: [{ delay: 1, priority: 2, queueReference: { channel: "CHAT", queueArn: arns.QCSCWebchatSpanish } }, { delay: 1, priority: 1, queueReference: { channel: "VOICE", queueArn: arns.QCSCAgentAssist } }, { delay: 1, priority: 3, queueReference: { channel: "CHAT", queueArn: arns.QCSCWebchat } }],
      description: "CSC Webchat in Spanish & English and Agent Assist Line",
    });

    const STFRetAgentTeam2TT = new connect.CfnRoutingProfile(this, 'STFRetAgentTeam2TT', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "STF Ret Agent Team 2 TT",
      defaultOutboundQueueArn: arns.QSTFRetCigarette,
      mediaConcurrencies: [{ channel: "VOICE", concurrency: 1 }],
      queueConfigs: [{ delay: 15, priority: 4, queueReference: { channel: "VOICE", queueArn: arns.QSTFRetCigarette } }, { delay: 10, priority: 3, queueReference: { channel: "VOICE", queueArn: arns.QSTFCBUsernamePassAsst } }, { delay: 15, priority: 4, queueReference: { channel: "VOICE", queueArn: arns.QSTFCBRetCigarette } }, { delay: 10, priority: 3, queueReference: { channel: "VOICE", queueArn: arns.QSTFUsernamePassAsst } }],
      description: "STF Ret Agent Team 2 TT",
    });

    const CSCTrainingAgentAssistance = new connect.CfnRoutingProfile(this, 'CSCTrainingAgentAssistance', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "CSC Training Agent Assistance",
      defaultOutboundQueueArn: arns.QCSCAgentAssist,
      mediaConcurrencies: [{ channel: "VOICE", concurrency: 1 }],
      queueConfigs: [{ delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: arns.QCSCAgentAssist } }],
      description: "CSC Training Agent Assistance",
    });

    const CSCDefaultSpanishCloseouts = new connect.CfnRoutingProfile(this, 'CSCDefaultSpanishCloseouts', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "CSC Default + Spanish + Closeouts",
      defaultOutboundQueueArn: arns.QCSCCustomerServiceCenter,
      mediaConcurrencies: [{ channel: "TASK", concurrency: 1 }, { channel: "VOICE", concurrency: 1 }],
      queueConfigs: [{ delay: 2, priority: 1, queueReference: { channel: "VOICE", queueArn: arns.QCSCCustomerServiceCenter } }, { delay: 0, priority: 3, queueReference: { channel: "TASK", queueArn: arns.QCSCNCWReturnedMail } }, { delay: 0, priority: 2, queueReference: { channel: "TASK", queueArn: arns.QCSCNCW345 } }, { delay: 2, priority: 1, queueReference: { channel: "VOICE", queueArn: arns.QCSCCBCustomerServiceCenter } }, { delay: 2, priority: 1, queueReference: { channel: "VOICE", queueArn: arns.QFODCollections } }, { delay: 2, priority: 1, queueReference: { channel: "VOICE", queueArn: arns.QCSCCBSpanish } }, { delay: 2, priority: 1, queueReference: { channel: "VOICE", queueArn: arns.QCSCSpanish } }, { delay: 2, priority: 1, queueReference: { channel: "VOICE", queueArn: arns.QFODCBCollections } }, { delay: 2, priority: 1, queueReference: { channel: "VOICE", queueArn: arns.QCSCEfileAssistance } }, { delay: 2, priority: 1, queueReference: { channel: "VOICE", queueArn: arns.QCSCCBEfileAssistance } }],
      description: "CSC Default + Spanish + Closeouts",
    });

    const Inactive = new connect.CfnRoutingProfile(this, 'Inactive', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "Inactive",
      defaultOutboundQueueArn: arns.BasicQueue,
      mediaConcurrencies: [{ channel: "VOICE", concurrency: 1 }],
      description: "Routing Profile for inactive agents",
    });

    const STFCollectionsTeamCBTR = new connect.CfnRoutingProfile(this, 'STFCollectionsTeamCBTR', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "STF Collections Team C BTR",
      defaultOutboundQueueArn: arns.QSTFNoCalls,
      mediaConcurrencies: [{ channel: "VOICE", concurrency: 1 }],
      queueConfigs: [{ delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: arns.QSTFCBColBillings } }, { delay: 0, priority: 2, queueReference: { channel: "VOICE", queueArn: arns.QSTFColDelinquencies } }, { delay: 0, priority: 2, queueReference: { channel: "VOICE", queueArn: arns.QSTFCBColDelinquencies } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: arns.QSTFNoCalls } }],
      description: "STF Collections Team C BTR",
    });

    const CSCDefaultMail = new connect.CfnRoutingProfile(this, 'CSCDefaultMail', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "CSC Default + Mail",
      defaultOutboundQueueArn: arns.QCSCNCWReturnedMail,
      mediaConcurrencies: [{ channel: "TASK", concurrency: 1 }, { channel: "VOICE", concurrency: 1 }],
      queueConfigs: [{ delay: 2, priority: 1, queueReference: { channel: "VOICE", queueArn: arns.QCSCCustomerServiceCenter } }, { delay: 0, priority: 2, queueReference: { channel: "TASK", queueArn: arns.QCSCNCWReturnedMail } }, { delay: 2, priority: 1, queueReference: { channel: "VOICE", queueArn: arns.QCSCCBCustomerServiceCenter } }, { delay: 2, priority: 1, queueReference: { channel: "VOICE", queueArn: arns.QFODCollections } }, { delay: 2, priority: 1, queueReference: { channel: "VOICE", queueArn: arns.QFODCBCollections } }, { delay: 2, priority: 1, queueReference: { channel: "VOICE", queueArn: arns.QCSCEfileAssistance } }, { delay: 2, priority: 1, queueReference: { channel: "VOICE", queueArn: arns.QCSCCBEfileAssistance } }],
      description: "CSC Default + Mail",
    });

    const MCORevoCollectionsProfile1WithSpanishRoutingProfile = new connect.CfnRoutingProfile(this, 'MCORevoCollectionsProfile1WithSpanishRoutingProfile', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "MCO Revo_Collections Profile 1 with Spanish",
      defaultOutboundQueueArn: arns.BasicQueue,
      mediaConcurrencies: [{ channel: "VOICE", concurrency: 1 }],
      queueConfigs: [{ delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: arns.QMCOCBRetnAsstAppear } }, { delay: 0, priority: 2, queueReference: { channel: "VOICE", queueArn: arns.QMCOBillingRefund } }, { delay: 0, priority: 2, queueReference: { channel: "VOICE", queueArn: arns.QMCOCBBillingRefund } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: arns.QMCOCBSpanish } }, { delay: 30, priority: 3, queueReference: { channel: "VOICE", queueArn: arns.QMCOSpanish } }, { delay: 30, priority: 3, queueReference: { channel: "VOICE", queueArn: arns.QMCONewLicenseOrAcct } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: arns.QMCOCBLicenseIFTADecals } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: arns.QMCOCBCollectRevo } }, { delay: 30, priority: 4, queueReference: { channel: "VOICE", queueArn: arns.QMCOCollectRevo } }, { delay: 30, priority: 3, queueReference: { channel: "VOICE", queueArn: arns.QMCOLicenseIFTADecals } }, { delay: 0, priority: 2, queueReference: { channel: "VOICE", queueArn: arns.QMCORetnAsstAppear } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: arns.QMCOCBNewLicenseOrAcct } }],
      description: "MCO Revocation/Collections Profile 1 with Spanish",
    });

    const TRATaxpayersRightsAdvocateDefault = new connect.CfnRoutingProfile(this, 'TRATaxpayersRightsAdvocateDefault', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "TRA_Taxpayers Rights Advocate Default",
      defaultOutboundQueueArn: arns.QTRAQueue,
      mediaConcurrencies: [{ channel: "CHAT", concurrency: 1 }, { channel: "TASK", concurrency: 1 }, { channel: "VOICE", concurrency: 1 }],
      queueConfigs: [{ delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: arns.QTRAQueue } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: arns.QTRACB } }],
      description: "TRA_Taxpayers Rights Advocate Default",
    });

    const PreferredRoutingProfile = new connect.CfnRoutingProfile(this, 'PreferredRoutingProfile', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "Preferred Routing profile",
      defaultOutboundQueueArn: arns.BasicQueue,
      mediaConcurrencies: [{ channel: "VOICE", concurrency: 1 }],
      queueConfigs: [{ delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: arns.QCSCAgentAssist } }],
      description: "Preferred Queue",
    });

    const MCOAllQueues = new connect.CfnRoutingProfile(this, 'MCOAllQueues', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "MCO All Queues",
      defaultOutboundQueueArn: arns.QMCOAuditQuestions,
      mediaConcurrencies: [{ channel: "VOICE", concurrency: 1 }],
      queueConfigs: [{ delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: arns.QMCOCBRetnAsstAppear } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: arns.QMCOBillingRefund } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: arns.QMCOCBBillingRefund } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: arns.QMCOScaleNoPmt } }, { delay: 0, priority: 2, queueReference: { channel: "VOICE", queueArn: arns.QMCOCBSpanish } }, { delay: 0, priority: 2, queueReference: { channel: "VOICE", queueArn: arns.QMCOSpanish } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: arns.QMCONewLicenseOrAcct } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: arns.QMCOCBAuditQuestions } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: arns.QMCOCBLicenseIFTADecals } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: arns.QMCOCBCollectRevo } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: arns.QMCOCollectRevo } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: arns.QMCOAuditQuestions } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: arns.QMCOCBScaleNoPmt } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: arns.QMCOLicenseIFTADecals } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: arns.QMCORetnAsstAppear } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: arns.QMCOCBNewLicenseOrAcct } }],
      description: "MCO All Queues level 1, Spanish level 2",
    });

    const MCOAllQueuesSpanish = new connect.CfnRoutingProfile(this, 'MCOAllQueuesSpanish', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "MCO All Queues Spanish",
      defaultOutboundQueueArn: arns.QMCOSpanish,
      mediaConcurrencies: [{ channel: "VOICE", concurrency: 1 }],
      queueConfigs: [{ delay: 0, priority: 2, queueReference: { channel: "VOICE", queueArn: arns.QMCOCBRetnAsstAppear } }, { delay: 0, priority: 2, queueReference: { channel: "VOICE", queueArn: arns.QMCOBillingRefund } }, { delay: 0, priority: 2, queueReference: { channel: "VOICE", queueArn: arns.QMCOCBBillingRefund } }, { delay: 0, priority: 2, queueReference: { channel: "VOICE", queueArn: arns.QMCOScaleNoPmt } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: arns.QMCOCBSpanish } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: arns.QMCOSpanish } }, { delay: 0, priority: 2, queueReference: { channel: "VOICE", queueArn: arns.QMCONewLicenseOrAcct } }, { delay: 0, priority: 2, queueReference: { channel: "VOICE", queueArn: arns.QMCOCBAuditQuestions } }, { delay: 0, priority: 2, queueReference: { channel: "VOICE", queueArn: arns.QMCOCBLicenseIFTADecals } }, { delay: 0, priority: 2, queueReference: { channel: "VOICE", queueArn: arns.QMCOCBCollectRevo } }, { delay: 0, priority: 2, queueReference: { channel: "VOICE", queueArn: arns.QMCOCollectRevo } }, { delay: 0, priority: 2, queueReference: { channel: "VOICE", queueArn: arns.QMCOAuditQuestions } }, { delay: 0, priority: 2, queueReference: { channel: "VOICE", queueArn: arns.QMCOCBScaleNoPmt } }, { delay: 0, priority: 2, queueReference: { channel: "VOICE", queueArn: arns.QMCOLicenseIFTADecals } }, { delay: 0, priority: 2, queueReference: { channel: "VOICE", queueArn: arns.QMCORetnAsstAppear } }, { delay: 0, priority: 2, queueReference: { channel: "VOICE", queueArn: arns.QMCOCBNewLicenseOrAcct } }],
      description: "MCO Spanish",
    });

    const STFRegAgentDefaultTeam1 = new connect.CfnRoutingProfile(this, 'STFRegAgentDefaultTeam1', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "STF_Reg_Agent_Default Team 1",
      defaultOutboundQueueArn: arns.QSTFRegFuelUSTFCLPPF,
      mediaConcurrencies: [{ channel: "VOICE", concurrency: 1 }],
      queueConfigs: [{ delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: arns.QSTFCBRegEwasteTireIWMF } }, { delay: 0, priority: 2, queueReference: { channel: "VOICE", queueArn: arns.QSTFRegAlcoholicBev } }, { delay: 0, priority: 2, queueReference: { channel: "VOICE", queueArn: arns.QSTFRegEwasteTireIWMF } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: arns.QSTFCBRegCigaretteTobacco } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: arns.QSTFCBRegCannabis } }, { delay: 0, priority: 2, queueReference: { channel: "VOICE", queueArn: arns.QSTFRegFuelUSTFCLPPF } }, { delay: 0, priority: 2, queueReference: { channel: "VOICE", queueArn: arns.QSTFRegCigaretteTobacco } }, { delay: 0, priority: 2, queueReference: { channel: "VOICE", queueArn: arns.QSTFRegCannabis } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: arns.QSTFCBRegTeleEnergyWater } }, { delay: 0, priority: 2, queueReference: { channel: "VOICE", queueArn: arns.QSTFRegTeleEnergyWater } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: arns.QSTFCBRegAlcoholicBev } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: arns.QSTFCBRegFuelUSTFCLPPF } }],
      description: "STF_Reg_Agent_Default Team 1",
    });

    const STFCollectionsTeamCTT = new connect.CfnRoutingProfile(this, 'STFCollectionsTeamCTT', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "STF Collections Team C TT",
      defaultOutboundQueueArn: arns.QSTFColDelinquencies,
      mediaConcurrencies: [{ channel: "VOICE", concurrency: 1 }],
      queueConfigs: [{ delay: 0, priority: 2, queueReference: { channel: "VOICE", queueArn: arns.QSTFCBColBillings } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: arns.QSTFColDelinquencies } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: arns.QSTFCBColDelinquencies } }, { delay: 0, priority: 2, queueReference: { channel: "VOICE", queueArn: arns.QSTFNoCalls } }],
      description: "STF Collections Team C TT",
    });

    const TASupAgentDefault = new connect.CfnRoutingProfile(this, 'TASupAgentDefault', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "TA_Sup_Agent_Default",
      defaultOutboundQueueArn: arns.QTATaxAdvisors,
      mediaConcurrencies: [{ channel: "VOICE", concurrency: 1 }],
      queueConfigs: [{ delay: 180, priority: 2, queueReference: { channel: "VOICE", queueArn: arns.QTATaxAdvisors } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: arns.QTACBTaxAdvisors } }],
      description: "TA_Sup_Agent_Default",
    });

    const MCOReturnReview2 = new connect.CfnRoutingProfile(this, 'MCOReturnReview2', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "MCO_Return_Review 2",
      defaultOutboundQueueArn: arns.BasicQueue,
      mediaConcurrencies: [{ channel: "VOICE", concurrency: 1 }],
      queueConfigs: [{ delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: arns.QMCOCBRetnAsstAppear } }, { delay: 0, priority: 2, queueReference: { channel: "VOICE", queueArn: arns.QMCOBillingRefund } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: arns.QMCOCBBillingRefund } }, { delay: 0, priority: 2, queueReference: { channel: "VOICE", queueArn: arns.QMCONewLicenseOrAcct } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: arns.QMCOCBLicenseIFTADecals } }, { delay: 0, priority: 2, queueReference: { channel: "VOICE", queueArn: arns.QMCOLicenseIFTADecals } }, { delay: 0, priority: 2, queueReference: { channel: "VOICE", queueArn: arns.QMCORetnAsstAppear } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: arns.QMCOCBNewLicenseOrAcct } }],
      description: "MCO Return Review Profile 2",
    });

    const MCOReturnReview1 = new connect.CfnRoutingProfile(this, 'MCOReturnReview1', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "MCO_Return_Review 1",
      defaultOutboundQueueArn: arns.QMCORetnAsstAppear,
      mediaConcurrencies: [{ channel: "VOICE", concurrency: 1 }],
      queueConfigs: [{ delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: arns.QMCOCBRetnAsstAppear } }, { delay: 0, priority: 2, queueReference: { channel: "VOICE", queueArn: arns.QMCOBillingRefund } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: arns.QMCOCBBillingRefund } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: arns.QMCONewLicenseOrAcct } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: arns.QMCOCBLicenseIFTADecals } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: arns.QMCOCBCollectRevo } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: arns.QMCOCollectRevo } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: arns.QMCOLicenseIFTADecals } }, { delay: 0, priority: 2, queueReference: { channel: "VOICE", queueArn: arns.QMCORetnAsstAppear } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: arns.QMCOCBNewLicenseOrAcct } }],
      description: "MCO Return Review Team Profile 1",
    });

    const FODTT3CollectorsSpanish = new connect.CfnRoutingProfile(this, 'FODTT3CollectorsSpanish', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "FOD TT3 Collectors + Spanish",
      defaultOutboundQueueArn: arns.QFODCollections,
      mediaConcurrencies: [{ channel: "VOICE", concurrency: 1 }],
      queueConfigs: [{ delay: 2, priority: 1, queueReference: { channel: "VOICE", queueArn: arns.QFODCollections } }, { delay: 180, priority: 1, queueReference: { channel: "VOICE", queueArn: arns.QCSCCBSpanish } }, { delay: 180, priority: 1, queueReference: { channel: "VOICE", queueArn: arns.QCSCSpanish } }, { delay: 2, priority: 1, queueReference: { channel: "VOICE", queueArn: arns.QFODCBCollections } }, { delay: 2, priority: 1, queueReference: { channel: "VOICE", queueArn: arns.QCSCEfileAssistance } }, { delay: 2, priority: 1, queueReference: { channel: "VOICE", queueArn: arns.QCSCCBEfileAssistance } }],
      description: "FOD TT3 Collectors + Spanish",
    });

    const CSCTrainingDefault = new connect.CfnRoutingProfile(this, 'CSCTrainingDefault', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "CSC Training Default",
      defaultOutboundQueueArn: arns.QCSCCustomerServiceCenter,
      mediaConcurrencies: [{ channel: "VOICE", concurrency: 1 }],
      queueConfigs: [{ delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: arns.QCSCCustomerServiceCenter } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: arns.QCSCCBCustomerServiceCenter } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: arns.QCSCEfileAssistance } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: arns.QCSCCBEfileAssistance } }],
      description: "CSC Training Default",
    });

    const MCORevoCollectionsProfile1RoutingProfile = new connect.CfnRoutingProfile(this, 'MCORevoCollectionsProfile1RoutingProfile', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "MCO Revo_Collections Profile 1",
      defaultOutboundQueueArn: arns.BasicQueue,
      mediaConcurrencies: [{ channel: "VOICE", concurrency: 1 }],
      queueConfigs: [{ delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: arns.QMCOCBRetnAsstAppear } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: arns.QMCOBillingRefund } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: arns.QMCOCBBillingRefund } }, { delay: 30, priority: 3, queueReference: { channel: "VOICE", queueArn: arns.QMCONewLicenseOrAcct } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: arns.QMCOCBLicenseIFTADecals } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: arns.QMCOCBCollectRevo } }, { delay: 60, priority: 4, queueReference: { channel: "VOICE", queueArn: arns.QMCOCollectRevo } }, { delay: 30, priority: 3, queueReference: { channel: "VOICE", queueArn: arns.QMCOLicenseIFTADecals } }, { delay: 0, priority: 2, queueReference: { channel: "VOICE", queueArn: arns.QMCORetnAsstAppear } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: arns.QMCOCBNewLicenseOrAcct } }],
      description: "MCO Revo_Collections Profile 1",
    });

    const CUTSAgentSpanishPriority = new connect.CfnRoutingProfile(this, 'CUTSAgentSpanishPriority', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "CUTS_Agent_Spanish_Priority",
      defaultOutboundQueueArn: arns.QCUTSAdvisory,
      mediaConcurrencies: [{ channel: "VOICE", concurrency: 1 }],
      queueConfigs: [{ delay: 600, priority: 2, queueReference: { channel: "VOICE", queueArn: arns.QCUTSAdvisory } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: arns.QCUTSCBSpanish } }, { delay: 180, priority: 2, queueReference: { channel: "VOICE", queueArn: arns.QCUTSCBClearance } }, { delay: 180, priority: 2, queueReference: { channel: "VOICE", queueArn: arns.QCUTSCBAdvisory } }, { delay: 600, priority: 2, queueReference: { channel: "VOICE", queueArn: arns.QCUTSClearance } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: arns.QCUTSSpanish } }],
      description: "CUTS Spanish Priority",
    });

    const STFRetAgentTeam5TT = new connect.CfnRoutingProfile(this, 'STFRetAgentTeam5TT', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "STF Ret Agent Team 5 TT",
      defaultOutboundQueueArn: arns.QSTFCBRetEwasteTireIWMF,
      mediaConcurrencies: [{ channel: "VOICE", concurrency: 1 }],
      queueConfigs: [{ delay: 15, priority: 4, queueReference: { channel: "VOICE", queueArn: arns.QSTFRetEwasteTireIWMF } }, { delay: 10, priority: 3, queueReference: { channel: "VOICE", queueArn: arns.QSTFCBUsernamePassAsst } }, { delay: 15, priority: 4, queueReference: { channel: "VOICE", queueArn: arns.QSTFCBRetEwasteTireIWMF } }, { delay: 10, priority: 3, queueReference: { channel: "VOICE", queueArn: arns.QSTFUsernamePassAsst } }],
      description: "STF Return Agent Team 5 Tax Tech",
    });

    const CUTSAgentSpanishReserve = new connect.CfnRoutingProfile(this, 'CUTSAgentSpanishReserve', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "CUTS_Agent_Spanish_Reserve",
      defaultOutboundQueueArn: arns.QCUTSAdvisory,
      mediaConcurrencies: [{ channel: "VOICE", concurrency: 1 }],
      queueConfigs: [{ delay: 600, priority: 2, queueReference: { channel: "VOICE", queueArn: arns.QCUTSAdvisory } }, { delay: 600, priority: 1, queueReference: { channel: "VOICE", queueArn: arns.QCUTSCBClearance } }, { delay: 600, priority: 1, queueReference: { channel: "VOICE", queueArn: arns.QCUTSCBAdvisory } }, { delay: 600, priority: 2, queueReference: { channel: "VOICE", queueArn: arns.QCUTSClearance } }],
      description: "CUTS Spanish Reserve Agent",
    });

    const CSCTrainingEfileOnly = new connect.CfnRoutingProfile(this, 'CSCTrainingEfileOnly', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "CSC Training Efile Only",
      defaultOutboundQueueArn: arns.QCSCCustomerServiceCenter,
      mediaConcurrencies: [{ channel: "VOICE", concurrency: 1 }],
      queueConfigs: [{ delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: arns.QCSCEfileAssistance } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: arns.QCSCCBEfileAssistance } }],
      description: "CSC Training Efile Only",
    });

    const CSCDefaultSpanish = new connect.CfnRoutingProfile(this, 'CSCDefaultSpanish', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "CSC Default + Spanish",
      defaultOutboundQueueArn: arns.QCSCSpanish,
      mediaConcurrencies: [{ channel: "TASK", concurrency: 1 }, { channel: "VOICE", concurrency: 1 }],
      queueConfigs: [{ delay: 2, priority: 1, queueReference: { channel: "VOICE", queueArn: arns.QCSCCustomerServiceCenter } }, { delay: 180, priority: 1, queueReference: { channel: "VOICE", queueArn: arns.QCUTSCBSpanish } }, { delay: 2, priority: 1, queueReference: { channel: "VOICE", queueArn: arns.QCSCCBCustomerServiceCenter } }, { delay: 2, priority: 1, queueReference: { channel: "VOICE", queueArn: arns.QFODCollections } }, { delay: 2, priority: 1, queueReference: { channel: "VOICE", queueArn: arns.QCSCCBSpanish } }, { delay: 2, priority: 1, queueReference: { channel: "VOICE", queueArn: arns.QCSCSpanish } }, { delay: 2, priority: 1, queueReference: { channel: "VOICE", queueArn: arns.QFODCBCollections } }, { delay: 2, priority: 1, queueReference: { channel: "VOICE", queueArn: arns.QCSCEfileAssistance } }, { delay: 2, priority: 1, queueReference: { channel: "VOICE", queueArn: arns.QCSCCBEfileAssistance } }, { delay: 180, priority: 1, queueReference: { channel: "VOICE", queueArn: arns.QCUTSSpanish } }],
      description: "CSC Default + Spanish",
    });

    const CSCChatOnly = new connect.CfnRoutingProfile(this, 'CSCChatOnly', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "CSC Chat Only",
      defaultOutboundQueueArn: arns.QCSCCustomerServiceCenter,
      mediaConcurrencies: [{ channel: "CHAT", concurrency: 4 }, { channel: "TASK", concurrency: 1 }, { channel: "VOICE", concurrency: 1 }],
      queueConfigs: [{ delay: 0, priority: 1, queueReference: { channel: "CHAT", queueArn: arns.QCSCWebchat } }],
      description: "CSC Chat Only",
    });

    const STFRetAgentTeam1TT = new connect.CfnRoutingProfile(this, 'STFRetAgentTeam1TT', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "STF Ret Agent Team 1 TT",
      defaultOutboundQueueArn: arns.QSTFRetFuelUSTFCLPPF,
      mediaConcurrencies: [{ channel: "VOICE", concurrency: 1 }],
      queueConfigs: [{ delay: 15, priority: 4, queueReference: { channel: "VOICE", queueArn: arns.QSTFCBRetFuelUSTFCLPPF } }, { delay: 10, priority: 3, queueReference: { channel: "VOICE", queueArn: arns.QSTFCBUsernamePassAsst } }, { delay: 15, priority: 4, queueReference: { channel: "VOICE", queueArn: arns.QSTFRetCannabis } }, { delay: 15, priority: 4, queueReference: { channel: "VOICE", queueArn: arns.QSTFRetFuelUSTFCLPPF } }, { delay: 15, priority: 4, queueReference: { channel: "VOICE", queueArn: arns.QSTFCBRetCannabis } }, { delay: 10, priority: 3, queueReference: { channel: "VOICE", queueArn: arns.QSTFUsernamePassAsst } }],
      description: "STF Ret Agent Team 1 TT",
    });

    const STFCollectionsTeamATT = new connect.CfnRoutingProfile(this, 'STFCollectionsTeamATT', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "STF Collections Team A TT",
      defaultOutboundQueueArn: arns.QSTFColDelinquencies,
      mediaConcurrencies: [{ channel: "VOICE", concurrency: 1 }],
      queueConfigs: [{ delay: 0, priority: 2, queueReference: { channel: "VOICE", queueArn: arns.QSTFCBColBillings } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: arns.QSTFColDelinquencies } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: arns.QSTFCBColDelinquencies } }, { delay: 0, priority: 2, queueReference: { channel: "VOICE", queueArn: arns.QSTFNoCalls } }],
      description: "STF Collections Team A TT",
    });

    const FODTT3Collectors = new connect.CfnRoutingProfile(this, 'FODTT3Collectors', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "FOD TT3 Collectors",
      defaultOutboundQueueArn: arns.QFODCollections,
      mediaConcurrencies: [{ channel: "VOICE", concurrency: 1 }],
      queueConfigs: [{ delay: 2, priority: 1, queueReference: { channel: "VOICE", queueArn: arns.QFODCollections } }, { delay: 2, priority: 1, queueReference: { channel: "VOICE", queueArn: arns.QFODCBCollections } }, { delay: 2, priority: 1, queueReference: { channel: "VOICE", queueArn: arns.QCSCEfileAssistance } }, { delay: 2, priority: 1, queueReference: { channel: "VOICE", queueArn: arns.QCSCCBEfileAssistance } }],
      description: "FOD TT3 Collectors",
    });

    const MCORevoCollectionsProfile1WithSpanishRoutingProfile2 = new connect.CfnRoutingProfile(this, 'MCORevoCollectionsProfile1WithSpanishRoutingProfile2', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "MCO_Revo_Collections Profile 1 with Spanish",
      defaultOutboundQueueArn: arns.BasicQueue,
      mediaConcurrencies: [{ channel: "VOICE", concurrency: 1 }],
      queueConfigs: [{ delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: arns.QMCOCBRetnAsstAppear } }, { delay: 0, priority: 2, queueReference: { channel: "VOICE", queueArn: arns.QMCOBillingRefund } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: arns.QMCOCBBillingRefund } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: arns.QMCOCBSpanish } }, { delay: 0, priority: 2, queueReference: { channel: "VOICE", queueArn: arns.QMCOSpanish } }, { delay: 0, priority: 2, queueReference: { channel: "VOICE", queueArn: arns.QMCONewLicenseOrAcct } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: arns.QMCOCBLicenseIFTADecals } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: arns.QMCOCBCollectRevo } }, { delay: 0, priority: 2, queueReference: { channel: "VOICE", queueArn: arns.QMCOCollectRevo } }, { delay: 0, priority: 2, queueReference: { channel: "VOICE", queueArn: arns.QMCOLicenseIFTADecals } }, { delay: 0, priority: 2, queueReference: { channel: "VOICE", queueArn: arns.QMCORetnAsstAppear } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: arns.QMCOCBNewLicenseOrAcct } }],
      description: "MCO_Revo_Collections Profile 1 with Spanish",
    });

    const CSCAgentAssistChat = new connect.CfnRoutingProfile(this, 'CSCAgentAssistChat', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "CSC Agent Assist + Chat",
      defaultOutboundQueueArn: arns.QCSCCustomerServiceCenter,
      mediaConcurrencies: [{ channel: "CHAT", concurrency: 4 }, { channel: "TASK", concurrency: 1 }, { channel: "VOICE", concurrency: 1 }],
      queueConfigs: [{ delay: 1, priority: 1, queueReference: { channel: "VOICE", queueArn: arns.QCSCAgentAssist } }, { delay: 1, priority: 2, queueReference: { channel: "CHAT", queueArn: arns.QCSCWebchat } }],
      description: "CSC Agent Assist + Chat",
    });

    const CUTSAgentDefaultReserve = new connect.CfnRoutingProfile(this, 'CUTSAgentDefaultReserve', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "CUTS_Agent_Default - Reserve",
      defaultOutboundQueueArn: arns.QCUTSAdvisory,
      mediaConcurrencies: [{ channel: "VOICE", concurrency: 1 }],
      queueConfigs: [{ delay: 300, priority: 2, queueReference: { channel: "VOICE", queueArn: arns.QCUTSAdvisory } }, { delay: 180, priority: 1, queueReference: { channel: "VOICE", queueArn: arns.QCUTSCBClearance } }, { delay: 180, priority: 1, queueReference: { channel: "VOICE", queueArn: arns.QCUTSCBAdvisory } }, { delay: 300, priority: 2, queueReference: { channel: "VOICE", queueArn: arns.QCUTSClearance } }],
      description: "CUTS_Agent_Default - Reserve",
    });

    const CSCDefaultSpanishSpanishChat = new connect.CfnRoutingProfile(this, 'CSCDefaultSpanishSpanishChat', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "CSC Default + Spanish + Spanish Chat",
      defaultOutboundQueueArn: arns.QCSCSpanish,
      mediaConcurrencies: [{ channel: "CHAT", concurrency: 1 }, { channel: "TASK", concurrency: 1 }, { channel: "VOICE", concurrency: 1 }],
      queueConfigs: [{ delay: 2, priority: 2, queueReference: { channel: "VOICE", queueArn: arns.QCSCCustomerServiceCenter } }, { delay: 2, priority: 1, queueReference: { channel: "CHAT", queueArn: arns.QCSCWebchatSpanish } }, { delay: 180, priority: 2, queueReference: { channel: "VOICE", queueArn: arns.QCUTSCBSpanish } }, { delay: 2, priority: 2, queueReference: { channel: "VOICE", queueArn: arns.QCSCCBCustomerServiceCenter } }, { delay: 2, priority: 2, queueReference: { channel: "VOICE", queueArn: arns.QFODCollections } }, { delay: 2, priority: 2, queueReference: { channel: "VOICE", queueArn: arns.QCSCCBSpanish } }, { delay: 2, priority: 2, queueReference: { channel: "VOICE", queueArn: arns.QCSCSpanish } }, { delay: 2, priority: 2, queueReference: { channel: "VOICE", queueArn: arns.QFODCBCollections } }, { delay: 2, priority: 2, queueReference: { channel: "VOICE", queueArn: arns.QCSCEfileAssistance } }, { delay: 2, priority: 2, queueReference: { channel: "VOICE", queueArn: arns.QCSCCBEfileAssistance } }, { delay: 180, priority: 2, queueReference: { channel: "VOICE", queueArn: arns.QCUTSSpanish } }],
      description: "CSC Default + Spanish + Spanish Chat",
    });

    const STFRegAgentTeam3 = new connect.CfnRoutingProfile(this, 'STFRegAgentTeam3', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "STF Reg Agent Team 3",
      defaultOutboundQueueArn: arns.QSTFRegTeleEnergyWater,
      mediaConcurrencies: [{ channel: "VOICE", concurrency: 1 }],
      queueConfigs: [{ delay: 5, priority: 2, queueReference: { channel: "VOICE", queueArn: arns.QSTFCBRegEwasteTireIWMF } }, { delay: 5, priority: 2, queueReference: { channel: "VOICE", queueArn: arns.QSTFRegAlcoholicBev } }, { delay: 5, priority: 2, queueReference: { channel: "VOICE", queueArn: arns.QSTFRegEwasteTireIWMF } }, { delay: 5, priority: 2, queueReference: { channel: "VOICE", queueArn: arns.QSTFCBRegCigaretteTobacco } }, { delay: 10, priority: 3, queueReference: { channel: "VOICE", queueArn: arns.QSTFCBUsernamePassAsst } }, { delay: 5, priority: 2, queueReference: { channel: "VOICE", queueArn: arns.QSTFCBRegCannabis } }, { delay: 5, priority: 2, queueReference: { channel: "VOICE", queueArn: arns.QSTFRegFuelUSTFCLPPF } }, { delay: 5, priority: 2, queueReference: { channel: "VOICE", queueArn: arns.QSTFRegCigaretteTobacco } }, { delay: 5, priority: 2, queueReference: { channel: "VOICE", queueArn: arns.QSTFRegCannabis } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: arns.QSTFCBRegTeleEnergyWater } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: arns.QSTFRegTeleEnergyWater } }, { delay: 5, priority: 2, queueReference: { channel: "VOICE", queueArn: arns.QSTFCBRegAlcoholicBev } }, { delay: 5, priority: 2, queueReference: { channel: "VOICE", queueArn: arns.QSTFCBRegFuelUSTFCLPPF } }, { delay: 10, priority: 3, queueReference: { channel: "VOICE", queueArn: arns.QSTFUsernamePassAsst } }],
      description: "STF Reg Agent Team 3",
    });

    const CSCDefaultAgentAssist = new connect.CfnRoutingProfile(this, 'CSCDefaultAgentAssist', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "CSC Default + Agent Assist",
      defaultOutboundQueueArn: arns.QCSCCustomerServiceCenter,
      mediaConcurrencies: [{ channel: "TASK", concurrency: 1 }, { channel: "VOICE", concurrency: 1 }],
      queueConfigs: [{ delay: 2, priority: 2, queueReference: { channel: "VOICE", queueArn: arns.QCSCCustomerServiceCenter } }, { delay: 2, priority: 1, queueReference: { channel: "VOICE", queueArn: arns.QCSCAgentAssist } }, { delay: 2, priority: 2, queueReference: { channel: "VOICE", queueArn: arns.QCSCCBCustomerServiceCenter } }, { delay: 2, priority: 2, queueReference: { channel: "VOICE", queueArn: arns.QFODCollections } }, { delay: 2, priority: 2, queueReference: { channel: "VOICE", queueArn: arns.QFODCBCollections } }, { delay: 2, priority: 2, queueReference: { channel: "VOICE", queueArn: arns.QCSCEfileAssistance } }, { delay: 2, priority: 2, queueReference: { channel: "VOICE", queueArn: arns.QCSCCBEfileAssistance } }],
      description: "CSC Default + Agent Assist",
    });

    const TAAgentDefault = new connect.CfnRoutingProfile(this, 'TAAgentDefault', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "TA_Agent_Default",
      defaultOutboundQueueArn: arns.QTATaxAdvisors,
      mediaConcurrencies: [{ channel: "VOICE", concurrency: 1 }],
      queueConfigs: [{ delay: 2, priority: 2, queueReference: { channel: "VOICE", queueArn: arns.QTATaxAdvisors } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: arns.QTACBTaxAdvisors } }],
      description: "Agent Default profile for Tax Advisors (IAU)",
    });

    const STFRegAgentTeam2 = new connect.CfnRoutingProfile(this, 'STFRegAgentTeam2', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "STF Reg Agent Team 2",
      defaultOutboundQueueArn: arns.QSTFRegCigaretteTobacco,
      mediaConcurrencies: [{ channel: "VOICE", concurrency: 1 }],
      queueConfigs: [{ delay: 10, priority: 3, queueReference: { channel: "VOICE", queueArn: arns.QSTFCBRegEwasteTireIWMF } }, { delay: 5, priority: 2, queueReference: { channel: "VOICE", queueArn: arns.QSTFRegAlcoholicBev } }, { delay: 5, priority: 2, queueReference: { channel: "VOICE", queueArn: arns.QSTFRegEwasteTireIWMF } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: arns.QSTFCBRegCigaretteTobacco } }, { delay: 10, priority: 3, queueReference: { channel: "VOICE", queueArn: arns.QSTFCBUsernamePassAsst } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: arns.QSTFCBRegCannabis } }, { delay: 5, priority: 2, queueReference: { channel: "VOICE", queueArn: arns.QSTFRegFuelUSTFCLPPF } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: arns.QSTFRegCigaretteTobacco } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: arns.QSTFRegCannabis } }, { delay: 10, priority: 3, queueReference: { channel: "VOICE", queueArn: arns.QSTFCBRegTeleEnergyWater } }, { delay: 5, priority: 2, queueReference: { channel: "VOICE", queueArn: arns.QSTFRegTeleEnergyWater } }, { delay: 5, priority: 2, queueReference: { channel: "VOICE", queueArn: arns.QSTFCBRegAlcoholicBev } }, { delay: 10, priority: 3, queueReference: { channel: "VOICE", queueArn: arns.QSTFCBRegFuelUSTFCLPPF } }, { delay: 10, priority: 3, queueReference: { channel: "VOICE", queueArn: arns.QSTFUsernamePassAsst } }],
      description: "STF Reg Agent Team 2",
    });

    const CUTSAgentPriority = new connect.CfnRoutingProfile(this, 'CUTSAgentPriority', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "CUTS_Agent_Priority",
      defaultOutboundQueueArn: arns.QCUTSAdvisory,
      mediaConcurrencies: [{ channel: "VOICE", concurrency: 1 }],
      queueConfigs: [{ delay: 0, priority: 2, queueReference: { channel: "VOICE", queueArn: arns.QCUTSAdvisory } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: arns.QCUTSCBClearance } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: arns.QCUTSCBAdvisory } }, { delay: 0, priority: 2, queueReference: { channel: "VOICE", queueArn: arns.QCUTSClearance } }],
      description: "CUTS Agent Priority",
    });

    const STFRetAgentTeam3TT = new connect.CfnRoutingProfile(this, 'STFRetAgentTeam3TT', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "STF Ret Agent Team 3 TT",
      defaultOutboundQueueArn: arns.QSTFRetAlcoholicBev,
      mediaConcurrencies: [{ channel: "VOICE", concurrency: 1 }],
      queueConfigs: [{ delay: 15, priority: 4, queueReference: { channel: "VOICE", queueArn: arns.QSTFRetAlcoholicBev } }, { delay: 10, priority: 3, queueReference: { channel: "VOICE", queueArn: arns.QSTFCBUsernamePassAsst } }, { delay: 15, priority: 4, queueReference: { channel: "VOICE", queueArn: arns.QSTFCBRetAlcoholicBev } }, { delay: 10, priority: 3, queueReference: { channel: "VOICE", queueArn: arns.QSTFUsernamePassAsst } }],
      description: "STF Ret Agent Team 3 TT",
    });

    const STFRegAgentTeam4 = new connect.CfnRoutingProfile(this, 'STFRegAgentTeam4', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "STF Reg Agent Team 4",
      defaultOutboundQueueArn: arns.QSTFRegAlcoholicBev,
      mediaConcurrencies: [{ channel: "VOICE", concurrency: 1 }],
      queueConfigs: [{ delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: arns.QSTFCBRegEwasteTireIWMF } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: arns.QSTFRegAlcoholicBev } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: arns.QSTFRegEwasteTireIWMF } }, { delay: 10, priority: 3, queueReference: { channel: "VOICE", queueArn: arns.QSTFCBRegCigaretteTobacco } }, { delay: 10, priority: 3, queueReference: { channel: "VOICE", queueArn: arns.QSTFCBUsernamePassAsst } }, { delay: 10, priority: 3, queueReference: { channel: "VOICE", queueArn: arns.QSTFCBRegCannabis } }, { delay: 5, priority: 2, queueReference: { channel: "VOICE", queueArn: arns.QSTFRegFuelUSTFCLPPF } }, { delay: 5, priority: 2, queueReference: { channel: "VOICE", queueArn: arns.QSTFRegCigaretteTobacco } }, { delay: 5, priority: 2, queueReference: { channel: "VOICE", queueArn: arns.QSTFRegCannabis } }, { delay: 10, priority: 3, queueReference: { channel: "VOICE", queueArn: arns.QSTFCBRegTeleEnergyWater } }, { delay: 5, priority: 2, queueReference: { channel: "VOICE", queueArn: arns.QSTFRegTeleEnergyWater } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: arns.QSTFCBRegAlcoholicBev } }, { delay: 10, priority: 3, queueReference: { channel: "VOICE", queueArn: arns.QSTFCBRegFuelUSTFCLPPF } }, { delay: 10, priority: 3, queueReference: { channel: "VOICE", queueArn: arns.QSTFUsernamePassAsst } }],
      description: "STF Reg Agent Team 4",
    });

    const STFCollectionsTeamBBTR = new connect.CfnRoutingProfile(this, 'STFCollectionsTeamBBTR', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "STF Collections Team B BTR",
      defaultOutboundQueueArn: arns.QSTFNoCalls,
      mediaConcurrencies: [{ channel: "VOICE", concurrency: 1 }],
      queueConfigs: [{ delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: arns.QSTFCBColBillings } }, { delay: 0, priority: 2, queueReference: { channel: "VOICE", queueArn: arns.QSTFColDelinquencies } }, { delay: 0, priority: 2, queueReference: { channel: "VOICE", queueArn: arns.QSTFCBColDelinquencies } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: arns.QSTFNoCalls } }],
      description: "STF Collections Team B BTR",
    });

    const STFCollectionsTeamCBTCS = new connect.CfnRoutingProfile(this, 'STFCollectionsTeamCBTCS', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "STF Collections Team C BTCS",
      defaultOutboundQueueArn: arns.QSTFNoCalls,
      mediaConcurrencies: [{ channel: "VOICE", concurrency: 1 }],
      queueConfigs: [{ delay: 0, priority: 3, queueReference: { channel: "VOICE", queueArn: arns.QSTFCBColBillings } }, { delay: 0, priority: 3, queueReference: { channel: "VOICE", queueArn: arns.QSTFColDelinquencies } }, { delay: 0, priority: 3, queueReference: { channel: "VOICE", queueArn: arns.QSTFCBColDelinquencies } }, { delay: 0, priority: 3, queueReference: { channel: "VOICE", queueArn: arns.QSTFNoCalls } }],
      description: "STF Collections Team C BTCS",
    });

    const CSCTrainingMailOnly = new connect.CfnRoutingProfile(this, 'CSCTrainingMailOnly', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "CSC Training Mail Only",
      defaultOutboundQueueArn: arns.QCSCNCWReturnedMail,
      mediaConcurrencies: [{ channel: "TASK", concurrency: 1 }],
      queueConfigs: [{ delay: 0, priority: 1, queueReference: { channel: "TASK", queueArn: arns.QCSCNCWReturnedMail } }],
      description: "CSC Training Mail Only",
    });

    const FODCollectionsOnly = new connect.CfnRoutingProfile(this, 'FODCollectionsOnly', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "FOD_Collections_Only",
      defaultOutboundQueueArn: arns.QFODCollections,
      mediaConcurrencies: [{ channel: "VOICE", concurrency: 1 }],
      queueConfigs: [{ delay: 2, priority: 1, queueReference: { channel: "VOICE", queueArn: arns.QFODCollections } }, { delay: 2, priority: 1, queueReference: { channel: "VOICE", queueArn: arns.QFODCBCollections } }],
      description: "FOD Collections Line Only",
    });

    const STFRetAgentTeam4BTRLIMITED = new connect.CfnRoutingProfile(this, 'STFRetAgentTeam4BTRLIMITED', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "STF Ret Agent Team 4 BTR LIMITED",
      defaultOutboundQueueArn: arns.QSTFRetEnvFees,
      mediaConcurrencies: [{ channel: "VOICE", concurrency: 1 }],
      queueConfigs: [{ delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: arns.QSTFRetHazEnv } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: arns.QSTFRetEnvFees } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: arns.QSTFCBRetEnvFees } }],
      description: "STF Team 4 Return Env Fees and Haz Waste queues only. Only Use on Special Request from Supervisor to limit the calls to Team 4 queues only.",
    });

    const CSCDefaultSpanishAgentAssist = new connect.CfnRoutingProfile(this, 'CSCDefaultSpanishAgentAssist', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "CSC Default + Spanish + Agent Assist",
      defaultOutboundQueueArn: arns.QCSCCustomerServiceCenter,
      mediaConcurrencies: [{ channel: "VOICE", concurrency: 1 }],
      queueConfigs: [{ delay: 2, priority: 1, queueReference: { channel: "VOICE", queueArn: arns.QCSCCustomerServiceCenter } }, { delay: 1, priority: 1, queueReference: { channel: "VOICE", queueArn: arns.QCSCAgentAssist } }, { delay: 180, priority: 1, queueReference: { channel: "VOICE", queueArn: arns.QCUTSCBSpanish } }, { delay: 2, priority: 1, queueReference: { channel: "VOICE", queueArn: arns.QCSCCBCustomerServiceCenter } }, { delay: 2, priority: 1, queueReference: { channel: "VOICE", queueArn: arns.QFODCollections } }, { delay: 2, priority: 1, queueReference: { channel: "VOICE", queueArn: arns.QCSCCBSpanish } }, { delay: 2, priority: 1, queueReference: { channel: "VOICE", queueArn: arns.QCSCSpanish } }, { delay: 2, priority: 1, queueReference: { channel: "VOICE", queueArn: arns.QFODCBCollections } }, { delay: 2, priority: 1, queueReference: { channel: "VOICE", queueArn: arns.QCSCEfileAssistance } }, { delay: 2, priority: 1, queueReference: { channel: "VOICE", queueArn: arns.QCSCCBEfileAssistance } }, { delay: 180, priority: 1, queueReference: { channel: "VOICE", queueArn: arns.QCUTSSpanish } }],
      description: "CSC Default + Spanish + Agent Assist",
    });

    const STFRetNoCalls = new connect.CfnRoutingProfile(this, 'STFRetNoCalls', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "STF Ret No Calls",
      defaultOutboundQueueArn: arns.QSTFNoCalls,
      mediaConcurrencies: [{ channel: "VOICE", concurrency: 1 }],
      queueConfigs: [{ delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: arns.QSTFNoCalls } }],
      description: "Return Processing Branch No 800 Calls Routing Profile",
    });

    const STFCollectionsTeamABTCS = new connect.CfnRoutingProfile(this, 'STFCollectionsTeamABTCS', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "STF Collections Team A BTCS",
      defaultOutboundQueueArn: arns.QSTFColDelinquencies,
      mediaConcurrencies: [{ channel: "VOICE", concurrency: 1 }],
      queueConfigs: [{ delay: 0, priority: 3, queueReference: { channel: "VOICE", queueArn: arns.QSTFCBColBillings } }, { delay: 0, priority: 3, queueReference: { channel: "VOICE", queueArn: arns.QSTFColDelinquencies } }, { delay: 0, priority: 3, queueReference: { channel: "VOICE", queueArn: arns.QSTFCBColDelinquencies } }, { delay: 0, priority: 3, queueReference: { channel: "VOICE", queueArn: arns.QSTFNoCalls } }],
      description: "STF Collections Team A BTCS",
    });

    const STFCollectionsTeamBBTCS = new connect.CfnRoutingProfile(this, 'STFCollectionsTeamBBTCS', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "STF Collections Team B BTCS",
      defaultOutboundQueueArn: arns.QSTFNoCalls,
      mediaConcurrencies: [{ channel: "VOICE", concurrency: 1 }],
      queueConfigs: [{ delay: 0, priority: 3, queueReference: { channel: "VOICE", queueArn: arns.QSTFCBColBillings } }, { delay: 0, priority: 3, queueReference: { channel: "VOICE", queueArn: arns.QSTFColDelinquencies } }, { delay: 0, priority: 3, queueReference: { channel: "VOICE", queueArn: arns.QSTFCBColDelinquencies } }, { delay: 0, priority: 3, queueReference: { channel: "VOICE", queueArn: arns.QSTFNoCalls } }],
      description: "STF Collections Team B BTCS",
    });

    const STFCollectionsTeamDTT = new connect.CfnRoutingProfile(this, 'STFCollectionsTeamDTT', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "STF Collections Team D TT",
      defaultOutboundQueueArn: arns.QSTFColDelinquencies,
      mediaConcurrencies: [{ channel: "VOICE", concurrency: 1 }],
      queueConfigs: [{ delay: 0, priority: 2, queueReference: { channel: "VOICE", queueArn: arns.QSTFCBColBillings } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: arns.QSTFColDelinquencies } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: arns.QSTFCBColDelinquencies } }, { delay: 0, priority: 2, queueReference: { channel: "VOICE", queueArn: arns.QSTFNoCalls } }],
      description: "STF Collections Team D TT",
    });

    const CSCDefault = new connect.CfnRoutingProfile(this, 'CSCDefault', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "CSC Default",
      defaultOutboundQueueArn: arns.QCSCCustomerServiceCenter,
      mediaConcurrencies: [{ channel: "TASK", concurrency: 1 }, { channel: "VOICE", concurrency: 1 }],
      queueConfigs: [{ delay: 2, priority: 1, queueReference: { channel: "VOICE", queueArn: arns.QCSCCustomerServiceCenter } }, { delay: 2, priority: 1, queueReference: { channel: "VOICE", queueArn: arns.QCSCCBCustomerServiceCenter } }, { delay: 2, priority: 1, queueReference: { channel: "VOICE", queueArn: arns.QFODCollections } }, { delay: 2, priority: 1, queueReference: { channel: "VOICE", queueArn: arns.QFODCBCollections } }, { delay: 2, priority: 1, queueReference: { channel: "VOICE", queueArn: arns.QCSCEfileAssistance } }, { delay: 2, priority: 1, queueReference: { channel: "VOICE", queueArn: arns.QCSCCBEfileAssistance } }],
      description: "CSC Default",
    });

    const CSCTrainingNoQueues = new connect.CfnRoutingProfile(this, 'CSCTrainingNoQueues', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "CSC Training No Queues",
      defaultOutboundQueueArn: arns.QCSCTraining,
      mediaConcurrencies: [{ channel: "CHAT", concurrency: 1 }, { channel: "TASK", concurrency: 1 }, { channel: "VOICE", concurrency: 1 }],
      queueConfigs: [{ delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: arns.QCSCTraining } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: arns.QCSCCBTraining } }],
      description: "CSC Training No Queues",
    });

    const STFRegAgentDefaultTeam2 = new connect.CfnRoutingProfile(this, 'STFRegAgentDefaultTeam2', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "STF_Reg_Agent_Default Team 2",
      defaultOutboundQueueArn: arns.BasicQueue,
      mediaConcurrencies: [{ channel: "VOICE", concurrency: 1 }],
      queueConfigs: [{ delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: arns.QSTFCBRegEwasteTireIWMF } }, { delay: 0, priority: 2, queueReference: { channel: "VOICE", queueArn: arns.QSTFRegAlcoholicBev } }, { delay: 0, priority: 2, queueReference: { channel: "VOICE", queueArn: arns.QSTFRegEwasteTireIWMF } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: arns.QSTFCBRegCigaretteTobacco } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: arns.QSTFCBUsernamePassAsst } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: arns.QSTFCBRegCannabis } }, { delay: 0, priority: 2, queueReference: { channel: "VOICE", queueArn: arns.QSTFRegFuelUSTFCLPPF } }, { delay: 0, priority: 2, queueReference: { channel: "VOICE", queueArn: arns.QSTFRegCigaretteTobacco } }, { delay: 0, priority: 2, queueReference: { channel: "VOICE", queueArn: arns.QSTFRegCannabis } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: arns.QSTFCBRegTeleEnergyWater } }, { delay: 0, priority: 2, queueReference: { channel: "VOICE", queueArn: arns.QSTFRegTeleEnergyWater } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: arns.QSTFCBRegAlcoholicBev } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: arns.QSTFCBRegFuelUSTFCLPPF } }, { delay: 0, priority: 2, queueReference: { channel: "VOICE", queueArn: arns.QSTFUsernamePassAsst } }],
      description: "STF_Reg_Agent_Default Team 2",
    });

    const CSCDefault345 = new connect.CfnRoutingProfile(this, 'CSCDefault345', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "CSC Default + 345",
      defaultOutboundQueueArn: arns.QCSCNCW345,
      mediaConcurrencies: [{ channel: "TASK", concurrency: 1 }, { channel: "VOICE", concurrency: 1 }],
      queueConfigs: [{ delay: 2, priority: 1, queueReference: { channel: "VOICE", queueArn: arns.QCSCCustomerServiceCenter } }, { delay: 2, priority: 1, queueReference: { channel: "VOICE", queueArn: arns.QCSCCBCustomerServiceCenter } }, { delay: 2, priority: 1, queueReference: { channel: "VOICE", queueArn: arns.QFODCollections } }, { delay: 2, priority: 1, queueReference: { channel: "VOICE", queueArn: arns.QFODCBCollections } }, { delay: 2, priority: 1, queueReference: { channel: "VOICE", queueArn: arns.QCSCEfileAssistance } }, { delay: 0, priority: 2, queueReference: { channel: "TASK", queueArn: arns.QCSCNCW345 } }, { delay: 2, priority: 1, queueReference: { channel: "VOICE", queueArn: arns.QCSCCBEfileAssistance } }],
      description: "CSC Default + 345",
    });

    const STFRetAgentsBTCS = new connect.CfnRoutingProfile(this, 'STFRetAgentsBTCS', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "STF Ret Agents BTCS",
      defaultOutboundQueueArn: arns.QSTFRetAlcoholicBev,
      mediaConcurrencies: [{ channel: "VOICE", concurrency: 1 }],
      description: "STF Ret Agents BTCS",
    });

    const CSCChatSpanishChat = new connect.CfnRoutingProfile(this, 'CSCChatSpanishChat', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "CSC Chat + Spanish Chat",
      defaultOutboundQueueArn: arns.QCSCCustomerServiceCenter,
      mediaConcurrencies: [{ channel: "CHAT", concurrency: 4 }],
      queueConfigs: [{ delay: 0, priority: 1, queueReference: { channel: "CHAT", queueArn: arns.QCSCWebchatSpanish } }, { delay: 0, priority: 2, queueReference: { channel: "CHAT", queueArn: arns.QCSCWebchat } }],
      description: "Spanish Webchat agent with Webchat with English as secondary",
    });

    const STFCollectionsTeamABTR = new connect.CfnRoutingProfile(this, 'STFCollectionsTeamABTR', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "STF Collections Team A BTR",
      defaultOutboundQueueArn: arns.QSTFNoCalls,
      mediaConcurrencies: [{ channel: "VOICE", concurrency: 1 }],
      queueConfigs: [{ delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: arns.QSTFCBColBillings } }, { delay: 0, priority: 2, queueReference: { channel: "VOICE", queueArn: arns.QSTFColDelinquencies } }, { delay: 0, priority: 2, queueReference: { channel: "VOICE", queueArn: arns.QSTFCBColDelinquencies } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: arns.QSTFNoCalls } }],
      description: "STF Collections Team A BTR",
    });

    const CSCAgentAssistOnly = new connect.CfnRoutingProfile(this, 'CSCAgentAssistOnly', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "CSC Agent Assist Only",
      defaultOutboundQueueArn: arns.QCSCAgentAssist,
      mediaConcurrencies: [{ channel: "TASK", concurrency: 1 }, { channel: "VOICE", concurrency: 1 }],
      queueConfigs: [{ delay: 1, priority: 1, queueReference: { channel: "VOICE", queueArn: arns.QCSCAgentAssist } }],
      description: "CSC Agent Assist Only",
    });

    const CSCRemoteAgentDefaultSpanish = new connect.CfnRoutingProfile(this, 'CSCRemoteAgentDefaultSpanish', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "CSC Remote Agent Default + Spanish",
      defaultOutboundQueueArn: arns.QFODCollections,
      mediaConcurrencies: [{ channel: "VOICE", concurrency: 1 }],
      queueConfigs: [{ delay: 2, priority: 1, queueReference: { channel: "VOICE", queueArn: arns.QFODCollections } }, { delay: 180, priority: 1, queueReference: { channel: "VOICE", queueArn: arns.QCSCCBSpanish } }, { delay: 180, priority: 1, queueReference: { channel: "VOICE", queueArn: arns.QCSCSpanish } }, { delay: 2, priority: 1, queueReference: { channel: "VOICE", queueArn: arns.QFODCBCollections } }, { delay: 2, priority: 1, queueReference: { channel: "VOICE", queueArn: arns.QCSCEfileAssistance } }, { delay: 2, priority: 1, queueReference: { channel: "VOICE", queueArn: arns.QCSCCBEfileAssistance } }],
      description: "CSC Remote Agent Default + Spanish",
    });

    const MCORevoCollectionsProfile1RoutingProfile2 = new connect.CfnRoutingProfile(this, 'MCORevoCollectionsProfile1RoutingProfile2', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "MCO_Revo_Collections Profile 1",
      defaultOutboundQueueArn: arns.QMCONewLicenseOrAcct,
      mediaConcurrencies: [{ channel: "VOICE", concurrency: 1 }],
      queueConfigs: [{ delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: arns.QMCOCBRetnAsstAppear } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: arns.QMCOBillingRefund } }, { delay: 0, priority: 2, queueReference: { channel: "VOICE", queueArn: arns.QMCONewLicenseOrAcct } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: arns.QMCOCBLicenseIFTADecals } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: arns.QMCOCBCollectRevo } }, { delay: 0, priority: 2, queueReference: { channel: "VOICE", queueArn: arns.QMCOCollectRevo } }, { delay: 0, priority: 2, queueReference: { channel: "VOICE", queueArn: arns.QMCOLicenseIFTADecals } }, { delay: 0, priority: 2, queueReference: { channel: "VOICE", queueArn: arns.QMCORetnAsstAppear } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: arns.QMCOCBNewLicenseOrAcct } }],
      description: "MCO_Revo_Collections Profile 1",
    });

    const TSDCallCenterAdmin = new connect.CfnRoutingProfile(this, 'TSDCallCenterAdmin', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "TSD Call Center Admin",
      defaultOutboundQueueArn: arns.QCSCCustomerServiceCenter,
      mediaConcurrencies: [{ channel: "CHAT", concurrency: 1 }, { channel: "EMAIL", concurrency: 1 }, { channel: "TASK", concurrency: 1 }, { channel: "VOICE", concurrency: 1 }],
      queueConfigs: [{ delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: arns.QCSCTraining } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: arns.QOutboundCROS } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: arns.QCSCCBTraining } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: arns.BasicQueue } }, { delay: 0, priority: 1, queueReference: { channel: "CHAT", queueArn: arns.QOutboundCROS } }, { delay: 0, priority: 1, queueReference: { channel: "EMAIL", queueArn: arns.QOutboundCROS } }, { delay: 0, priority: 1, queueReference: { channel: "TASK", queueArn: arns.QOutboundCROS } }],
      description: "TSD Call Center Admin",
    });

    const CSCRemoteAgentDefault = new connect.CfnRoutingProfile(this, 'CSCRemoteAgentDefault', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "CSC Remote Agent Default",
      defaultOutboundQueueArn: arns.QFODCollections,
      mediaConcurrencies: [{ channel: "VOICE", concurrency: 1 }],
      queueConfigs: [{ delay: 2, priority: 1, queueReference: { channel: "VOICE", queueArn: arns.QFODCollections } }, { delay: 2, priority: 1, queueReference: { channel: "VOICE", queueArn: arns.QFODCBCollections } }, { delay: 2, priority: 1, queueReference: { channel: "VOICE", queueArn: arns.QCSCEfileAssistance } }, { delay: 2, priority: 1, queueReference: { channel: "VOICE", queueArn: arns.QCSCCBEfileAssistance } }],
      description: "CSC Remote Agent Default",
    });

    const MCORegistrationRefundsSpanishEnglish = new connect.CfnRoutingProfile(this, 'MCORegistrationRefundsSpanishEnglish', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "MCO_Registration_Refunds Spanish_English",
      defaultOutboundQueueArn: arns.BasicQueue,
      mediaConcurrencies: [{ channel: "VOICE", concurrency: 1 }],
      queueConfigs: [{ delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: arns.QMCOCBRetnAsstAppear } }, { delay: 0, priority: 2, queueReference: { channel: "VOICE", queueArn: arns.QMCOBillingRefund } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: arns.QMCOCBBillingRefund } }, { delay: 0, priority: 2, queueReference: { channel: "VOICE", queueArn: arns.QMCOScaleNoPmt } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: arns.QMCOCBSpanish } }, { delay: 0, priority: 2, queueReference: { channel: "VOICE", queueArn: arns.QMCOSpanish } }, { delay: 0, priority: 3, queueReference: { channel: "VOICE", queueArn: arns.QMCONewLicenseOrAcct } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: arns.QMCOCBAuditQuestions } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: arns.QMCOCBLicenseIFTADecals } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: arns.QMCOCBCollectRevo } }, { delay: 0, priority: 2, queueReference: { channel: "VOICE", queueArn: arns.QMCOCollectRevo } }, { delay: 0, priority: 2, queueReference: { channel: "VOICE", queueArn: arns.QMCOAuditQuestions } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: arns.QMCOCBScaleNoPmt } }, { delay: 0, priority: 3, queueReference: { channel: "VOICE", queueArn: arns.QMCOLicenseIFTADecals } }, { delay: 0, priority: 2, queueReference: { channel: "VOICE", queueArn: arns.QMCORetnAsstAppear } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: arns.QMCOCBNewLicenseOrAcct } }],
      description: "MCO_Registration_Refunds Profile with English and Spanish Queues",
    });

    const EFTAdvisoryPriority = new connect.CfnRoutingProfile(this, 'EFTAdvisoryPriority', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "EFT_Advisory Priority",
      defaultOutboundQueueArn: arns.QEFTAdvisory,
      mediaConcurrencies: [{ channel: "VOICE", concurrency: 1 }],
      queueConfigs: [{ delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: arns.QEFTCBAdvisory } }, { delay: 0, priority: 2, queueReference: { channel: "VOICE", queueArn: arns.QEFTAdvisory } }],
      description: "EFT Advisory Group Priority Routing profile",
    });

    const MCORegistrationRefundsProfile1 = new connect.CfnRoutingProfile(this, 'MCORegistrationRefundsProfile1', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "MCO_Registration_Refunds Profile 1",
      defaultOutboundQueueArn: arns.QMCORetnAsstAppear,
      mediaConcurrencies: [{ channel: "VOICE", concurrency: 1 }],
      queueConfigs: [{ delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: arns.QMCOCBRetnAsstAppear } }, { delay: 0, priority: 2, queueReference: { channel: "VOICE", queueArn: arns.QMCOBillingRefund } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: arns.QMCOCBBillingRefund } }, { delay: 0, priority: 2, queueReference: { channel: "VOICE", queueArn: arns.QMCOScaleNoPmt } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: arns.QMCOCBSpanish } }, { delay: 0, priority: 2, queueReference: { channel: "VOICE", queueArn: arns.QMCOSpanish } }, { delay: 60, priority: 3, queueReference: { channel: "VOICE", queueArn: arns.QMCONewLicenseOrAcct } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: arns.QMCOCBAuditQuestions } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: arns.QMCOCBLicenseIFTADecals } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: arns.QMCOCBCollectRevo } }, { delay: 0, priority: 2, queueReference: { channel: "VOICE", queueArn: arns.QMCOCollectRevo } }, { delay: 0, priority: 2, queueReference: { channel: "VOICE", queueArn: arns.QMCOAuditQuestions } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: arns.QMCOCBScaleNoPmt } }, { delay: 60, priority: 3, queueReference: { channel: "VOICE", queueArn: arns.QMCOLicenseIFTADecals } }, { delay: 0, priority: 2, queueReference: { channel: "VOICE", queueArn: arns.QMCORetnAsstAppear } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: arns.QMCOCBNewLicenseOrAcct } }],
      description: "MCO_Registration_Refunds Profile 1",
    });

    const STFCollectionsTeamETT = new connect.CfnRoutingProfile(this, 'STFCollectionsTeamETT', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "STF Collections Team E TT",
      defaultOutboundQueueArn: arns.QSTFColDelinquencies,
      mediaConcurrencies: [{ channel: "VOICE", concurrency: 1 }],
      queueConfigs: [{ delay: 0, priority: 2, queueReference: { channel: "VOICE", queueArn: arns.QSTFCBColBillings } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: arns.QSTFColDelinquencies } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: arns.QSTFCBColDelinquencies } }, { delay: 0, priority: 2, queueReference: { channel: "VOICE", queueArn: arns.QSTFNoCalls } }],
      description: "STF Collections Team E TT",
    });

    const CSCTrainingCloseoutsOnly = new connect.CfnRoutingProfile(this, 'CSCTrainingCloseoutsOnly', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "CSC Training Closeouts Only",
      defaultOutboundQueueArn: arns.QCSCNCW345,
      mediaConcurrencies: [{ channel: "TASK", concurrency: 1 }],
      queueConfigs: [{ delay: 0, priority: 1, queueReference: { channel: "TASK", queueArn: arns.QCSCNCW345 } }],
      description: "CSC Training Closeouts Only",
    });

    const AgentOutbound = new connect.CfnRoutingProfile(this, 'AgentOutbound', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "Agent_outbound",
      defaultOutboundQueueArn: arns.QCSCCustomerServiceCenter,
      mediaConcurrencies: [{ channel: "CHAT", concurrency: 1 }, { channel: "VOICE", concurrency: 1 }],
      queueConfigs: [{ delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: arns.QCSCCustomerServiceCenter } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: arns.BasicQueue } }],
      description: "Used to route outbound calls dynamically based on the agent DID",
    });

    const EFTAdvisoryReserve = new connect.CfnRoutingProfile(this, 'EFTAdvisoryReserve', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "EFT_Advisory_Reserve",
      defaultOutboundQueueArn: arns.QEFTAdvisory,
      mediaConcurrencies: [{ channel: "VOICE", concurrency: 1 }],
      queueConfigs: [{ delay: 180, priority: 1, queueReference: { channel: "VOICE", queueArn: arns.QEFTCBAdvisory } }, { delay: 300, priority: 2, queueReference: { channel: "VOICE", queueArn: arns.QEFTAdvisory } }],
      description: "EFT Reserve profile",
    });

    const STFRegAgentDefaultTeam3 = new connect.CfnRoutingProfile(this, 'STFRegAgentDefaultTeam3', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "STF_Reg_Agent_Default Team 3",
      defaultOutboundQueueArn: arns.BasicQueue,
      mediaConcurrencies: [{ channel: "VOICE", concurrency: 1 }],
      queueConfigs: [{ delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: arns.QSTFCBRegEwasteTireIWMF } }, { delay: 0, priority: 2, queueReference: { channel: "VOICE", queueArn: arns.QSTFRegAlcoholicBev } }, { delay: 0, priority: 2, queueReference: { channel: "VOICE", queueArn: arns.QSTFRegEwasteTireIWMF } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: arns.QSTFCBRegCigaretteTobacco } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: arns.QSTFCBUsernamePassAsst } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: arns.QSTFCBRegCannabis } }, { delay: 0, priority: 2, queueReference: { channel: "VOICE", queueArn: arns.QSTFRegFuelUSTFCLPPF } }, { delay: 0, priority: 2, queueReference: { channel: "VOICE", queueArn: arns.QSTFRegCigaretteTobacco } }, { delay: 0, priority: 2, queueReference: { channel: "VOICE", queueArn: arns.QSTFRegCannabis } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: arns.QSTFCBRegTeleEnergyWater } }, { delay: 0, priority: 2, queueReference: { channel: "VOICE", queueArn: arns.QSTFRegTeleEnergyWater } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: arns.QSTFCBRegAlcoholicBev } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: arns.QSTFCBRegFuelUSTFCLPPF } }, { delay: 0, priority: 2, queueReference: { channel: "VOICE", queueArn: arns.QSTFUsernamePassAsst } }],
      description: "STF_Reg_Agent_Default Team 3",
    });

    const STFColAgentDefault = new connect.CfnRoutingProfile(this, 'STFColAgentDefault', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "STF_Col_Agent_Default",
      defaultOutboundQueueArn: arns.BasicQueue,
      mediaConcurrencies: [{ channel: "VOICE", concurrency: 1 }],
      queueConfigs: [{ delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: arns.QSTFCBColBillings } }, { delay: 0, priority: 2, queueReference: { channel: "VOICE", queueArn: arns.QSTFColDelinquencies } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: arns.QSTFCBColDelinquencies } }, { delay: 0, priority: 2, queueReference: { channel: "VOICE", queueArn: arns.QSTFNoCalls } }],
      description: "Default Agent profile for STF Collections",
    });

    const STFAEBAgentDefaultUsernamePassword = new connect.CfnRoutingProfile(this, 'STFAEBAgentDefaultUsernamePassword', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "STF_AEB_Agent_Default_Username_Password",
      defaultOutboundQueueArn: arns.BasicQueue,
      mediaConcurrencies: [{ channel: "VOICE", concurrency: 1 }],
      queueConfigs: [{ delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: arns.QSTFCBUsernamePassAsst } }, { delay: 0, priority: 2, queueReference: { channel: "VOICE", queueArn: arns.QSTFUsernamePassAsst } }],
      description: "STF AEB Team A - Username/Password Reset Default Profile",
    });

    // RoutingProfile 'Axyom Assist Test Routing Profile' — default outbound queue 'arn:aws:connect:us-west-2:059586875367:instance/e2511377-f263-44a1-b4ca-d2cdbcf28a97/queue/adaccdad-6ad0-4f6e-831e-85f5d11bfd24' has no target counterpart, skipping

    const STFRegAgentDefaultTeam4 = new connect.CfnRoutingProfile(this, 'STFRegAgentDefaultTeam4', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "STF_Reg_Agent_Default Team 4",
      defaultOutboundQueueArn: arns.QSTFCBRegAlcoholicBev,
      mediaConcurrencies: [{ channel: "VOICE", concurrency: 1 }],
      queueConfigs: [{ delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: arns.QSTFCBRegEwasteTireIWMF } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: arns.QSTFRegAlcoholicBev } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: arns.QSTFRegEwasteTireIWMF } }, { delay: 0, priority: 3, queueReference: { channel: "VOICE", queueArn: arns.QSTFCBRegCigaretteTobacco } }, { delay: 0, priority: 3, queueReference: { channel: "VOICE", queueArn: arns.QSTFCBUsernamePassAsst } }, { delay: 0, priority: 3, queueReference: { channel: "VOICE", queueArn: arns.QSTFCBRegCannabis } }, { delay: 0, priority: 2, queueReference: { channel: "VOICE", queueArn: arns.QSTFRegFuelUSTFCLPPF } }, { delay: 0, priority: 2, queueReference: { channel: "VOICE", queueArn: arns.QSTFRegCigaretteTobacco } }, { delay: 0, priority: 2, queueReference: { channel: "VOICE", queueArn: arns.QSTFRegCannabis } }, { delay: 0, priority: 3, queueReference: { channel: "VOICE", queueArn: arns.QSTFCBRegTeleEnergyWater } }, { delay: 0, priority: 2, queueReference: { channel: "VOICE", queueArn: arns.QSTFRegTeleEnergyWater } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: arns.QSTFCBRegAlcoholicBev } }, { delay: 0, priority: 3, queueReference: { channel: "VOICE", queueArn: arns.QSTFCBRegFuelUSTFCLPPF } }, { delay: 0, priority: 3, queueReference: { channel: "VOICE", queueArn: arns.QSTFUsernamePassAsst } }],
      description: "STF_Reg_Agent_Default Team 4",
    });

    const STFCollectionsTeamBTT = new connect.CfnRoutingProfile(this, 'STFCollectionsTeamBTT', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "STF Collections Team B TT",
      defaultOutboundQueueArn: arns.QSTFColDelinquencies,
      mediaConcurrencies: [{ channel: "VOICE", concurrency: 1 }],
      queueConfigs: [{ delay: 0, priority: 2, queueReference: { channel: "VOICE", queueArn: arns.QSTFCBColBillings } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: arns.QSTFColDelinquencies } }, { delay: 0, priority: 1, queueReference: { channel: "VOICE", queueArn: arns.QSTFCBColDelinquencies } }, { delay: 0, priority: 2, queueReference: { channel: "VOICE", queueArn: arns.QSTFNoCalls } }],
      description: "STF Collections Team B TT",
    });

    const CSCRemoteAgentEfileOnly = new connect.CfnRoutingProfile(this, 'CSCRemoteAgentEfileOnly', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "CSC Remote Agent Efile Only",
      defaultOutboundQueueArn: arns.BasicQueue,
      mediaConcurrencies: [{ channel: "VOICE", concurrency: 1 }],
      queueConfigs: [{ delay: 2, priority: 1, queueReference: { channel: "VOICE", queueArn: arns.QCSCEfileAssistance } }, { delay: 2, priority: 1, queueReference: { channel: "VOICE", queueArn: arns.QCSCCBEfileAssistance } }],
      description: "CSC Remote Agent Efile Only",
    });

    const AA30SecondNotification = new connect.CfnRule(this, 'AA30SecondNotification', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "AA_30_Second_Notification",
      triggerEventSource: { eventSourceName: "OnMetricDataUpdate" },
      function: "{\"Version\":\"2022-11-25\",\"RuleFunction\":{\"Operator\":\"OR\",\"Operands\":[{\"Operator\":\"OR\",\"Operands\":[{\"Operator\":\"NumberGreaterOrEqualTo\",\"ComparisonValue\":\"$.MetricData.OLDEST_CONTACT_AGE\",\"Operands\":[30],\"FilterClause\":{\"LogicOperator\":\"AND\",\"Filters\":[{\"Type\":\"MetricDataFilterByQueue\",\"Data\":[\"4651ebea-8cc7-4890-8ede-b41c3ddd6436\"]}]},\"Negate\":false}]}],\"FilterClause\":{\"LogicOperator\":\"AND\",\"Filters\":[{\"Type\":\"MetricDataGrouping\",\"Data\":[\"QUEUE\"]}]}}}",
      actions: {
        sendNotificationActions: [{ content: "\nPlease check the Agent Assistance Queue!\n\nNote: This email was triggered by a wait time of greater than 30 seconds on the Agent Assistance Queue.", contentType: "PLAIN_TEXT", deliveryMethod: "EMAIL", recipient: { userArns: ["arn:aws:connect:us-west-2:059586875367:instance/e2511377-f263-44a1-b4ca-d2cdbcf28a97/agent/6d2c31d8-42a6-4bdb-9f35-52cffc7a4a96", "arn:aws:connect:us-west-2:059586875367:instance/e2511377-f263-44a1-b4ca-d2cdbcf28a97/agent/81616b6d-101a-414d-9b1b-8ea539bfc288", "arn:aws:connect:us-west-2:059586875367:instance/e2511377-f263-44a1-b4ca-d2cdbcf28a97/agent/acb6275d-07d1-4eb1-b064-4862daabce4f", "arn:aws:connect:us-west-2:059586875367:instance/e2511377-f263-44a1-b4ca-d2cdbcf28a97/agent/eeed1fb8-a4b6-4f3a-bcdb-b1b2ff3968f3", "arn:aws:connect:us-west-2:059586875367:instance/e2511377-f263-44a1-b4ca-d2cdbcf28a97/agent/f225524c-02d1-4cd4-8f77-8d526677c33a", "arn:aws:connect:us-west-2:059586875367:instance/e2511377-f263-44a1-b4ca-d2cdbcf28a97/agent/69f2dabc-1397-4d00-b0ed-568d2a05016b"] } as any, subject: "*** Agent Assistance Queue Alert ***", }],
      },
      publishStatus: "PUBLISHED",
    });

    const CSCLateBreakAlertTeamXuan = new connect.CfnRule(this, 'CSCLateBreakAlertTeamXuan', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "CSC_Late_Break_Alert_Team_Xuan",
      triggerEventSource: { eventSourceName: "OnMetricDataUpdate" },
      function: "{\"Version\":\"2022-11-25\",\"RuleFunction\":{\"Operator\":\"OR\",\"Operands\":[{\"Operator\":\"OR\",\"Operands\":[{\"Operator\":\"EQUALS\",\"ComparisonValue\":\"$.MetricData.AGENT_ACTIVITY\",\"Operands\":[\"5b37ede4-548c-472c-a1b5-52a179a8a735\"],\"FilterClause\":{\"LogicOperator\":\"AND\",\"Filters\":[{\"Type\":\"MetricDataFilterByAgent\",\"Data\":[\"84d4340a-69c0-4777-80b6-51d670a370a0\",\"528e2720-9e7e-45a1-9cea-ec91f34fa46e\",\"eecdd9a9-7a60-47c8-a936-7326f413f1c1\",\"5364f114-5c9b-4b13-a13d-03cbe7aa9048\",\"9624f586-ce1f-4e45-a0d7-7b32628a65a7\",\"8a46ca59-79ae-45c0-919d-f87bf1c490bc\",\"a953a527-ccd5-4594-bc7d-2ab7aa6a2c2b\"]},{\"Type\":\"AgentActivityDurationSeconds\",\"Data\":{\"Past\":360}}]},\"Negate\":false},{\"Operator\":\"EQUALS\",\"ComparisonValue\":\"$.MetricData.AGENT_ACTIVITY\",\"Operands\":[\"98f48f29-6ddd-4a3d-a592-d5ab640bf75e\"],\"FilterClause\":{\"LogicOperator\":\"AND\",\"Filters\":[{\"Type\":\"MetricDataFilterByAgent\",\"Data\":[\"84d4340a-69c0-4777-80b6-51d670a370a0\",\"528e2720-9e7e-45a1-9cea-ec91f34fa46e\",\"eecdd9a9-7a60-47c8-a936-7326f413f1c1\",\"5364f114-5c9b-4b13-a13d-03cbe7aa9048\",\"9624f586-ce1f-4e45-a0d7-7b32628a65a7\",\"8a46ca59-79ae-45c0-919d-f87bf1c490bc\",\"a953a527-ccd5-4594-bc7d-2ab7aa6a2c2b\"]},{\"Type\":\"AgentActivityDurationSeconds\",\"Data\":{\"Past\":960}}]},\"Negate\":false}]}],\"FilterClause\":{\"LogicOperator\":\"AND\",\"Filters\":[]}}}",
      actions: {
        sendNotificationActions: [{ content: "The following team member has exceeded a scheduled break by one minute or longer:\n\n$.MetricDataUpdate.Dimensions.Agents[*].Names\n\nThis notification from Amazon Connect was generated by Rule: $.RuleName", contentType: "PLAIN_TEXT", deliveryMethod: "EMAIL", recipient: { userArns: ["arn:aws:connect:us-west-2:059586875367:instance/e2511377-f263-44a1-b4ca-d2cdbcf28a97/agent/2371d234-6de3-432a-b4b8-7af158db3e4b"] } as any, subject: "Late Break Alert: $.MetricDataUpdate.Dimensions.Agents[*].Names ", }],
      },
      publishStatus: "PUBLISHED",
    });

    // Rule 'CSC_Late_Break_Alert_Team_Anita' — no recognized actions found; skip creation (TODO: review ActionType values)

    const CUTS10MinuteNotification = new connect.CfnRule(this, 'CUTS10MinuteNotification', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "CUTS_10_Minute_Notification",
      triggerEventSource: { eventSourceName: "OnMetricDataUpdate" },
      function: "{\"Version\":\"2022-11-25\",\"RuleFunction\":{\"Operator\":\"OR\",\"Operands\":[{\"Operator\":\"OR\",\"Operands\":[{\"Operator\":\"NumberGreaterOrEqualTo\",\"ComparisonValue\":\"$.MetricData.OLDEST_CONTACT_AGE\",\"Operands\":[600],\"FilterClause\":{\"LogicOperator\":\"AND\",\"Filters\":[{\"Type\":\"MetricDataFilterByQueue\",\"Data\":[\"0a01c2bf-f188-48af-8855-24ea95a9a738\",\"b8c02828-0b36-47f7-a3cc-f955b17122d7\",\"a3414dfa-1daf-4b3d-8620-98d42bc8fe53\",\"527185c0-619c-4bee-b222-8bc7c813d3e3\",\"ca46a433-f4a8-4053-a5d8-095664f524bd\",\"fd254fdb-584e-4de1-a808-d85cddc319cf\",\"c0b3ff96-e9f8-4f02-9a8d-2e2fe010870f\",\"1869634d-3baf-4cd6-9f3e-ab7d4c74ba2e\"]}]},\"Negate\":false}]}],\"FilterClause\":{\"LogicOperator\":\"AND\",\"Filters\":[{\"Type\":\"MetricDataGrouping\",\"Data\":[\"QUEUE\"]}]}}}",
      actions: {
        sendNotificationActions: [{ content: "This email was triggered by a wait time of greater than 10 minutes on a CUTS Queue.", contentType: "PLAIN_TEXT", deliveryMethod: "EMAIL", recipient: { userArns: ["arn:aws:connect:us-west-2:059586875367:instance/e2511377-f263-44a1-b4ca-d2cdbcf28a97/agent/acb6275d-07d1-4eb1-b064-4862daabce4f"] } as any, subject: "*** CUTS Queue Alert ***", }],
      },
      publishStatus: "PUBLISHED",
    });

    const LateBreakLunchAdrianaMendoza = new connect.CfnRule(this, 'LateBreakLunchAdrianaMendoza', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "Late_Break_Lunch-Adriana_Mendoza",
      triggerEventSource: { eventSourceName: "OnMetricDataUpdate" },
      function: "{\"Version\":\"2022-11-25\",\"RuleFunction\":{\"Operator\":\"OR\",\"Operands\":[{\"Operator\":\"OR\",\"Operands\":[{\"Operator\":\"EQUALS\",\"ComparisonValue\":\"$.MetricData.AGENT_ACTIVITY\",\"Operands\":[\"5b37ede4-548c-472c-a1b5-52a179a8a735\"],\"FilterClause\":{\"LogicOperator\":\"AND\",\"Filters\":[{\"Type\":\"MetricDataFilterByAgent\",\"Data\":[\"c1613b8c-3837-4ad9-a63c-6cc38f3b98fb\"]},{\"Type\":\"AgentActivityDurationSeconds\",\"Data\":{\"Past\":360}}]},\"Negate\":false},{\"Operator\":\"EQUALS\",\"ComparisonValue\":\"$.MetricData.AGENT_ACTIVITY\",\"Operands\":[\"98f48f29-6ddd-4a3d-a592-d5ab640bf75e\"],\"FilterClause\":{\"LogicOperator\":\"AND\",\"Filters\":[{\"Type\":\"MetricDataFilterByAgent\",\"Data\":[\"c1613b8c-3837-4ad9-a63c-6cc38f3b98fb\"]},{\"Type\":\"AgentActivityDurationSeconds\",\"Data\":{\"Past\":960}}]},\"Negate\":false},{\"Operator\":\"EQUALS\",\"ComparisonValue\":\"$.MetricData.AGENT_ACTIVITY\",\"Operands\":[\"e01d3bc4-b086-4ae8-add4-a803b6ccb4a0\"],\"FilterClause\":{\"LogicOperator\":\"AND\",\"Filters\":[{\"Type\":\"MetricDataFilterByAgent\",\"Data\":[\"c1613b8c-3837-4ad9-a63c-6cc38f3b98fb\"]},{\"Type\":\"AgentActivityDurationSeconds\",\"Data\":{\"Past\":1860}}]},\"Negate\":false}]}],\"FilterClause\":{\"LogicOperator\":\"AND\",\"Filters\":[]}}}",
      actions: {
        sendNotificationActions: [{ content: "\nHi Adriana,\n\nYou received this email because you had a break or lunch exceed your scheduled time.  Please remember to return to work timely.  \n\nIf there are any extenuating circumstances regarding this break/lunch overage, please make sure to speak with your administrator.\n\nThanks,\n\nAmazon Connect \n(This notification was generated by Rule: $.RuleName)", contentType: "PLAIN_TEXT", deliveryMethod: "EMAIL", recipient: { userArns: ["arn:aws:connect:us-west-2:059586875367:instance/e2511377-f263-44a1-b4ca-d2cdbcf28a97/agent/c1613b8c-3837-4ad9-a63c-6cc38f3b98fb"] } as any, subject: "Late Break or Lunch Notification: Adriana Mendoza", }],
      },
      publishStatus: "PUBLISHED",
    });

    const AgentAssistanceWaitTime = new connect.CfnRule(this, 'AgentAssistanceWaitTime', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "Agent_Assistance_Wait_Time",
      triggerEventSource: { eventSourceName: "OnMetricDataUpdate" },
      function: "{\"Version\":\"2022-11-25\",\"RuleFunction\":{\"Operator\":\"OR\",\"Operands\":[{\"Operator\":\"OR\",\"Operands\":[{\"Operator\":\"NumberGreaterOrEqualTo\",\"ComparisonValue\":\"$.MetricData.OLDEST_CONTACT_AGE\",\"Operands\":[120],\"FilterClause\":{\"LogicOperator\":\"AND\",\"Filters\":[{\"Type\":\"MetricDataFilterByQueue\",\"Data\":[\"4651ebea-8cc7-4890-8ede-b41c3ddd6436\"]}]},\"Negate\":false}]}],\"FilterClause\":{\"LogicOperator\":\"AND\",\"Filters\":[{\"Type\":\"MetricDataGrouping\",\"Data\":[\"QUEUE\"]}]}}}",
      actions: {
        sendNotificationActions: [{ content: "This notification from Amazon Connect was generated by Rule: $.RuleName", contentType: "PLAIN_TEXT", deliveryMethod: "EMAIL", recipient: { userArns: ["arn:aws:connect:us-west-2:059586875367:instance/e2511377-f263-44a1-b4ca-d2cdbcf28a97/agent/817eede6-51d4-4925-a6b1-4bd470c2402e", "arn:aws:connect:us-west-2:059586875367:instance/e2511377-f263-44a1-b4ca-d2cdbcf28a97/agent/8ffd967e-72e5-4dfc-85c0-7bd80d919075", "arn:aws:connect:us-west-2:059586875367:instance/e2511377-f263-44a1-b4ca-d2cdbcf28a97/agent/c8f9a9e4-cce4-4011-8670-ee1eebb8d1ed"] } as any, subject: "*** Agent Assistance Queue Alert ***", }],
      },
      publishStatus: "PUBLISHED",
    });

    const CSCLateBreakAlertTeamSam = new connect.CfnRule(this, 'CSCLateBreakAlertTeamSam', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "CSC_Late_Break_Alert_Team_Sam",
      triggerEventSource: { eventSourceName: "OnMetricDataUpdate" },
      function: "{\"Version\":\"2022-11-25\",\"RuleFunction\":{\"Operator\":\"OR\",\"Operands\":[{\"Operator\":\"OR\",\"Operands\":[{\"Operator\":\"EQUALS\",\"ComparisonValue\":\"$.MetricData.AGENT_ACTIVITY\",\"Operands\":[\"5b37ede4-548c-472c-a1b5-52a179a8a735\"],\"FilterClause\":{\"LogicOperator\":\"AND\",\"Filters\":[{\"Type\":\"MetricDataFilterByAgent\",\"Data\":[\"14d33190-af47-4658-9510-118eea982439\",\"3006d81c-6505-485d-a765-dcc3fff43930\",\"3234c568-b607-4ff5-ac05-51db0f26996c\",\"7af38299-9836-49b8-8367-40d5dab320d6\",\"2a2fe30f-96b6-4f05-a87f-d20eed505da2\",\"5a1903c6-b950-4c53-8ec9-4429ceee928d\",\"e7605b1c-ec75-4191-a6d3-d17dfeb4d777\"]},{\"Type\":\"AgentActivityDurationSeconds\",\"Data\":{\"Past\":360}}]},\"Negate\":false},{\"Operator\":\"EQUALS\",\"ComparisonValue\":\"$.MetricData.AGENT_ACTIVITY\",\"Operands\":[\"98f48f29-6ddd-4a3d-a592-d5ab640bf75e\"],\"FilterClause\":{\"LogicOperator\":\"AND\",\"Filters\":[{\"Type\":\"MetricDataFilterByAgent\",\"Data\":[\"14d33190-af47-4658-9510-118eea982439\",\"3006d81c-6505-485d-a765-dcc3fff43930\",\"3234c568-b607-4ff5-ac05-51db0f26996c\",\"7af38299-9836-49b8-8367-40d5dab320d6\",\"2a2fe30f-96b6-4f05-a87f-d20eed505da2\",\"5a1903c6-b950-4c53-8ec9-4429ceee928d\",\"e7605b1c-ec75-4191-a6d3-d17dfeb4d777\"]},{\"Type\":\"AgentActivityDurationSeconds\",\"Data\":{\"Past\":960}}]},\"Negate\":false}]}],\"FilterClause\":{\"LogicOperator\":\"AND\",\"Filters\":[]}}}",
      actions: {
        sendNotificationActions: [{ content: "The following team member has exceeded a scheduled break by one minute or longer:\n\n$.MetricDataUpdate.Dimensions.Agents[*].Names\n\nThis notification from Amazon Connect was generated by Rule: $.RuleName", contentType: "PLAIN_TEXT", deliveryMethod: "EMAIL", recipient: { userArns: ["arn:aws:connect:us-west-2:059586875367:instance/e2511377-f263-44a1-b4ca-d2cdbcf28a97/agent/7fecfed6-3142-4a4c-9110-28c02a429158"] } as any, subject: "Late Break Alert: $.MetricDataUpdate.Dimensions.Agents[*].Names ", }],
      },
      publishStatus: "PUBLISHED",
    });

    const CSCLateBreakAlertTeamMelissa = new connect.CfnRule(this, 'CSCLateBreakAlertTeamMelissa', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "CSC_Late_Break_Alert_Team_Melissa",
      triggerEventSource: { eventSourceName: "OnMetricDataUpdate" },
      function: "{\"Version\":\"2022-11-25\",\"RuleFunction\":{\"Operator\":\"OR\",\"Operands\":[{\"Operator\":\"OR\",\"Operands\":[{\"Operator\":\"EQUALS\",\"ComparisonValue\":\"$.MetricData.AGENT_ACTIVITY\",\"Operands\":[\"5b37ede4-548c-472c-a1b5-52a179a8a735\"],\"FilterClause\":{\"LogicOperator\":\"AND\",\"Filters\":[{\"Type\":\"MetricDataFilterByAgent\",\"Data\":[\"a9d38c69-8482-451f-8b57-5079810cda3a\",\"02c9b02b-24dd-432d-84f8-f4e2b21d274f\",\"958adab7-457f-4a05-8842-c148c05a42d2\",\"3aec0570-4321-47af-b7b9-49d9948d80b0\",\"f5eb1738-e2e5-4921-9db8-c36a0a31a94a\",\"ff336574-7a02-4fc3-acca-b43c5e261a2f\",\"01210ae6-4ac8-45cb-b766-8623c3192657\"]},{\"Type\":\"AgentActivityDurationSeconds\",\"Data\":{\"Past\":360}}]},\"Negate\":false},{\"Operator\":\"EQUALS\",\"ComparisonValue\":\"$.MetricData.AGENT_ACTIVITY\",\"Operands\":[\"98f48f29-6ddd-4a3d-a592-d5ab640bf75e\"],\"FilterClause\":{\"LogicOperator\":\"AND\",\"Filters\":[{\"Type\":\"MetricDataFilterByAgent\",\"Data\":[\"a9d38c69-8482-451f-8b57-5079810cda3a\",\"02c9b02b-24dd-432d-84f8-f4e2b21d274f\",\"958adab7-457f-4a05-8842-c148c05a42d2\",\"3aec0570-4321-47af-b7b9-49d9948d80b0\",\"f5eb1738-e2e5-4921-9db8-c36a0a31a94a\",\"ff336574-7a02-4fc3-acca-b43c5e261a2f\",\"01210ae6-4ac8-45cb-b766-8623c3192657\"]},{\"Type\":\"AgentActivityDurationSeconds\",\"Data\":{\"Past\":960}}]},\"Negate\":false}]}],\"FilterClause\":{\"LogicOperator\":\"AND\",\"Filters\":[]}}}",
      actions: {
        sendNotificationActions: [{ content: "The following team member has exceeded a scheduled break by one minute or longer:\n\n$.MetricDataUpdate.Dimensions.Agents[*].Names\n\nThis notification from Amazon Connect was generated by Rule: $.RuleName", contentType: "PLAIN_TEXT", deliveryMethod: "EMAIL", recipient: { userArns: ["arn:aws:connect:us-west-2:059586875367:instance/e2511377-f263-44a1-b4ca-d2cdbcf28a97/agent/f1b74309-1275-449e-9a65-4366395d96ee"] } as any, subject: "Late Break Alert: $.MetricDataUpdate.Dimensions.Agents[*].Names ", }],
      },
      publishStatus: "PUBLISHED",
    });

    // Rule 'CSC_Late_Break_Alert_Team_Mike' — no recognized actions found; skip creation (TODO: review ActionType values)

    const CSCLateBreakAlertTeamRicky = new connect.CfnRule(this, 'CSCLateBreakAlertTeamRicky', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "CSC_Late_Break_Alert_Team_Ricky",
      triggerEventSource: { eventSourceName: "OnMetricDataUpdate" },
      function: "{\"Version\":\"2022-11-25\",\"RuleFunction\":{\"Operator\":\"OR\",\"Operands\":[{\"Operator\":\"OR\",\"Operands\":[{\"Operator\":\"EQUALS\",\"ComparisonValue\":\"$.MetricData.AGENT_ACTIVITY\",\"Operands\":[\"5b37ede4-548c-472c-a1b5-52a179a8a735\"],\"FilterClause\":{\"LogicOperator\":\"AND\",\"Filters\":[{\"Type\":\"MetricDataFilterByAgent\",\"Data\":[\"b06106d2-ad26-40ca-9001-275157f394da\",\"0a65c07c-d37d-4001-9b6d-908cc607886e\",\"d1f3165a-e080-4451-9000-c568657a72ae\",\"957b0827-dc6a-4923-b026-e07e1e69e3f5\",\"6d03fdd1-475e-46e2-8f31-3865aafddc01\",\"f06e495b-d283-419f-90f9-9aff8c2fe5b5\",\"792a678e-1fd2-443d-bc54-3b908989c234\"]},{\"Type\":\"AgentActivityDurationSeconds\",\"Data\":{\"Past\":360}}]},\"Negate\":false},{\"Operator\":\"EQUALS\",\"ComparisonValue\":\"$.MetricData.AGENT_ACTIVITY\",\"Operands\":[\"98f48f29-6ddd-4a3d-a592-d5ab640bf75e\"],\"FilterClause\":{\"LogicOperator\":\"AND\",\"Filters\":[{\"Type\":\"MetricDataFilterByAgent\",\"Data\":[\"b06106d2-ad26-40ca-9001-275157f394da\",\"0a65c07c-d37d-4001-9b6d-908cc607886e\",\"d1f3165a-e080-4451-9000-c568657a72ae\",\"957b0827-dc6a-4923-b026-e07e1e69e3f5\",\"6d03fdd1-475e-46e2-8f31-3865aafddc01\",\"f06e495b-d283-419f-90f9-9aff8c2fe5b5\",\"792a678e-1fd2-443d-bc54-3b908989c234\"]},{\"Type\":\"AgentActivityDurationSeconds\",\"Data\":{\"Past\":960}}]},\"Negate\":false}]}],\"FilterClause\":{\"LogicOperator\":\"AND\",\"Filters\":[]}}}",
      actions: {
        sendNotificationActions: [{ content: "The following team member has exceeded a scheduled break by one minute or longer:\n\n$.MetricDataUpdate.Dimensions.Agents[*].Names\n\nThis notification from Amazon Connect was generated by Rule: $.RuleName", contentType: "PLAIN_TEXT", deliveryMethod: "EMAIL", recipient: { userArns: ["arn:aws:connect:us-west-2:059586875367:instance/e2511377-f263-44a1-b4ca-d2cdbcf28a97/agent/80b6870a-e657-43df-a3ab-b623d41e5123"] } as any, subject: "Late Break Alert: $.MetricDataUpdate.Dimensions.Agents[*].Names ", }],
      },
      publishStatus: "PUBLISHED",
    });

    const CSCLateBreakAlertTeamJesse = new connect.CfnRule(this, 'CSCLateBreakAlertTeamJesse', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "CSC_Late_Break_Alert_Team_Jesse",
      triggerEventSource: { eventSourceName: "OnMetricDataUpdate" },
      function: "{\"Version\":\"2022-11-25\",\"RuleFunction\":{\"Operator\":\"OR\",\"Operands\":[{\"Operator\":\"OR\",\"Operands\":[{\"Operator\":\"EQUALS\",\"ComparisonValue\":\"$.MetricData.AGENT_ACTIVITY\",\"Operands\":[\"5b37ede4-548c-472c-a1b5-52a179a8a735\"],\"FilterClause\":{\"LogicOperator\":\"AND\",\"Filters\":[{\"Type\":\"MetricDataFilterByAgent\",\"Data\":[\"9c7d4ef4-5f25-4eab-a1ec-6122f7465ef1\",\"53602c01-42e9-4ea3-9b09-16435014c398\",\"96a04f5f-fccb-44e2-bfa4-a4daec50ff56\",\"604a76eb-c9b5-466a-9cf5-8cfa8aea1bdb\",\"17de4c7d-2463-4767-a5d7-2c8bcfed94eb\",\"00684b71-dbe5-4a26-bbf9-6c0e557689c1\"]},{\"Type\":\"AgentActivityDurationSeconds\",\"Data\":{\"Past\":360}}]},\"Negate\":false},{\"Operator\":\"EQUALS\",\"ComparisonValue\":\"$.MetricData.AGENT_ACTIVITY\",\"Operands\":[\"98f48f29-6ddd-4a3d-a592-d5ab640bf75e\"],\"FilterClause\":{\"LogicOperator\":\"AND\",\"Filters\":[{\"Type\":\"MetricDataFilterByAgent\",\"Data\":[\"9c7d4ef4-5f25-4eab-a1ec-6122f7465ef1\",\"53602c01-42e9-4ea3-9b09-16435014c398\",\"96a04f5f-fccb-44e2-bfa4-a4daec50ff56\",\"604a76eb-c9b5-466a-9cf5-8cfa8aea1bdb\",\"17de4c7d-2463-4767-a5d7-2c8bcfed94eb\",\"00684b71-dbe5-4a26-bbf9-6c0e557689c1\"]},{\"Type\":\"AgentActivityDurationSeconds\",\"Data\":{\"Past\":960}}]},\"Negate\":false}]}],\"FilterClause\":{\"LogicOperator\":\"AND\",\"Filters\":[]}}}",
      actions: {
        sendNotificationActions: [{ content: "The following team member has exceeded a scheduled break by one minute or longer:\n\n$.MetricDataUpdate.Dimensions.Agents[*].Names\n\nThis notification from Amazon Connect was generated by Rule: $.RuleName", contentType: "PLAIN_TEXT", deliveryMethod: "EMAIL", recipient: { userArns: ["arn:aws:connect:us-west-2:059586875367:instance/e2511377-f263-44a1-b4ca-d2cdbcf28a97/agent/c621cafb-5bcf-49f3-b473-8c16a24c33e8"] } as any, subject: "Late Break Alert: $.MetricDataUpdate.Dimensions.Agents[*].Names ", }],
      },
      publishStatus: "PUBLISHED",
    });

    const AfterCallRule = new connect.CfnRule(this, 'AfterCallRule', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "AfterCallRule",
      triggerEventSource: { eventSourceName: "OnMetricDataUpdate" },
      function: "{\"Version\":\"2022-11-25\",\"RuleFunction\":{\"Operator\":\"AND\",\"Operands\":[{\"Operator\":\"OR\",\"Operands\":[{\"Operator\":\"EQUALS\",\"ComparisonValue\":\"$.MetricData.AGENT_ACTIVITY\",\"Operands\":[\"AFTER_CONTACT_WORK\"],\"FilterClause\":{\"LogicOperator\":\"AND\",\"Filters\":[{\"Type\":\"MetricDataFilterByAgent\",\"Data\":[\"088ecb26-c432-4706-8927-63bee4af8f7c\"]},{\"Type\":\"AgentActivityDurationSeconds\",\"Data\":{\"Past\":300}}]},\"Negate\":false}]}],\"FilterClause\":{\"LogicOperator\":\"AND\",\"Filters\":[]}}}",
      actions: {
        sendNotificationActions: [{ content: "This notification from Amazon Connect was generated by Rule: $.RuleName\n\nAndrew has been in After Call Work status for 5 minutes.", contentType: "PLAIN_TEXT", deliveryMethod: "EMAIL", recipient: { userArns: ["arn:aws:connect:us-west-2:059586875367:instance/e2511377-f263-44a1-b4ca-d2cdbcf28a97/agent/7beef9f2-64d7-45aa-9de0-8707ad451132"] } as any, subject: "ACW Rules notification", }],
      },
      publishStatus: "PUBLISHED",
    });

    const ChatWaitTime2Minutes = new connect.CfnRule(this, 'ChatWaitTime2Minutes', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "Chat_Wait_Time_2_Minutes",
      triggerEventSource: { eventSourceName: "OnMetricDataUpdate" },
      function: "{\"Version\":\"2022-11-25\",\"RuleFunction\":{\"Operator\":\"OR\",\"Operands\":[{\"Operator\":\"OR\",\"Operands\":[{\"Operator\":\"NumberGreaterOrEqualTo\",\"ComparisonValue\":\"$.MetricData.OLDEST_CONTACT_AGE\",\"Operands\":[120],\"FilterClause\":{\"LogicOperator\":\"AND\",\"Filters\":[{\"Type\":\"MetricDataFilterByQueue\",\"Data\":[\"a5c2c6e4-69ac-4e1a-93c7-ff335991d763\",\"2b75020e-418e-4001-a8a7-a0dee577a44b\"]}]},\"Negate\":false}]}],\"FilterClause\":{\"LogicOperator\":\"AND\",\"Filters\":[{\"Type\":\"MetricDataGrouping\",\"Data\":[\"QUEUE\"]}]}}}",
      actions: {
        sendNotificationActions: [{ content: "\nPlease check the chat queues!\n\nNote: This email was triggered by a wait time of greater than 2 minutes on one of the chat queues.", contentType: "PLAIN_TEXT", deliveryMethod: "EMAIL", recipient: { userArns: ["arn:aws:connect:us-west-2:059586875367:instance/e2511377-f263-44a1-b4ca-d2cdbcf28a97/agent/69f2dabc-1397-4d00-b0ed-568d2a05016b", "arn:aws:connect:us-west-2:059586875367:instance/e2511377-f263-44a1-b4ca-d2cdbcf28a97/agent/6d2c31d8-42a6-4bdb-9f35-52cffc7a4a96", "arn:aws:connect:us-west-2:059586875367:instance/e2511377-f263-44a1-b4ca-d2cdbcf28a97/agent/7230c1bd-349a-46e2-8af0-d6714ea1f538", "arn:aws:connect:us-west-2:059586875367:instance/e2511377-f263-44a1-b4ca-d2cdbcf28a97/agent/81616b6d-101a-414d-9b1b-8ea539bfc288", "arn:aws:connect:us-west-2:059586875367:instance/e2511377-f263-44a1-b4ca-d2cdbcf28a97/agent/acb6275d-07d1-4eb1-b064-4862daabce4f", "arn:aws:connect:us-west-2:059586875367:instance/e2511377-f263-44a1-b4ca-d2cdbcf28a97/agent/eeed1fb8-a4b6-4f3a-bcdb-b1b2ff3968f3", "arn:aws:connect:us-west-2:059586875367:instance/e2511377-f263-44a1-b4ca-d2cdbcf28a97/agent/f225524c-02d1-4cd4-8f77-8d526677c33a"] } as any, subject: "*** 2 Minute Chat Alert ***", }],
      },
      publishStatus: "PUBLISHED",
    });

    const QueueWaitTime25Minutes = new connect.CfnRule(this, 'QueueWaitTime25Minutes', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "Queue_Wait_Time_25_Minutes",
      triggerEventSource: { eventSourceName: "OnMetricDataUpdate" },
      function: "{\"Version\":\"2022-11-25\",\"RuleFunction\":{\"Operator\":\"OR\",\"Operands\":[{\"Operator\":\"OR\",\"Operands\":[{\"Operator\":\"NumberGreaterOrEqualTo\",\"ComparisonValue\":\"$.MetricData.OLDEST_CONTACT_AGE\",\"Operands\":[1500],\"FilterClause\":{\"LogicOperator\":\"AND\",\"Filters\":[{\"Type\":\"MetricDataFilterByQueue\",\"Data\":[\"5ca05302-cdf7-4530-b57d-835888742ed6\",\"ec71c60e-5c02-4dcd-8b77-e410fe022b29\",\"69940ff8-f3bd-41c6-a407-8570e58bbd08\",\"03279fe4-11de-4625-aa4c-cba8885ef9b0\",\"a7390907-484b-465c-9908-6ed2d2a60e1b\",\"98360ddf-babf-45aa-bd80-3c7f23613b6e\",\"61241469-f5e3-4fa7-a1d9-3c4fc3faf35a\",\"a35d8b83-e83b-499e-876a-832683647267\"]}]},\"Negate\":false}]}],\"FilterClause\":{\"LogicOperator\":\"AND\",\"Filters\":[{\"Type\":\"MetricDataGrouping\",\"Data\":[\"QUEUE\"]}]}}}",
      actions: {
        sendNotificationActions: [{ content: "This notification from Amazon Connect was generated by Rule: $.RuleName", contentType: "PLAIN_TEXT", deliveryMethod: "EMAIL", recipient: { userArns: ["arn:aws:connect:us-west-2:059586875367:instance/e2511377-f263-44a1-b4ca-d2cdbcf28a97/agent/817eede6-51d4-4925-a6b1-4bd470c2402e", "arn:aws:connect:us-west-2:059586875367:instance/e2511377-f263-44a1-b4ca-d2cdbcf28a97/agent/8ffd967e-72e5-4dfc-85c0-7bd80d919075", "arn:aws:connect:us-west-2:059586875367:instance/e2511377-f263-44a1-b4ca-d2cdbcf28a97/agent/acb6275d-07d1-4eb1-b064-4862daabce4f", "arn:aws:connect:us-west-2:059586875367:instance/e2511377-f263-44a1-b4ca-d2cdbcf28a97/agent/c8f9a9e4-cce4-4011-8670-ee1eebb8d1ed", "arn:aws:connect:us-west-2:059586875367:instance/e2511377-f263-44a1-b4ca-d2cdbcf28a97/agent/c92715d8-e928-40f6-aa52-7850186a6058", "arn:aws:connect:us-west-2:059586875367:instance/e2511377-f263-44a1-b4ca-d2cdbcf28a97/agent/f225524c-02d1-4cd4-8f77-8d526677c33a"] } as any, subject: "*** 25 Minute Queue Alert *** ", }],
      },
      publishStatus: "PUBLISHED",
    });

    const LateBreakLunchMichelleHammel = new connect.CfnRule(this, 'LateBreakLunchMichelleHammel', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "Late_Break_Lunch-Michelle_Hammel",
      triggerEventSource: { eventSourceName: "OnMetricDataUpdate" },
      function: "{\"Version\":\"2022-11-25\",\"RuleFunction\":{\"Operator\":\"OR\",\"Operands\":[{\"Operator\":\"AND\",\"Operands\":[{\"Operator\":\"EQUALS\",\"ComparisonValue\":\"$.MetricData.AGENT_ACTIVITY\",\"Operands\":[\"5b37ede4-548c-472c-a1b5-52a179a8a735\"],\"FilterClause\":{\"LogicOperator\":\"AND\",\"Filters\":[{\"Type\":\"MetricDataFilterByAgent\",\"Data\":[\"fb14a446-f464-46ed-afee-6b77c4a7fb28\"]},{\"Type\":\"AgentActivityDurationSeconds\",\"Data\":{\"Past\":360}}]},\"Negate\":false},{\"Operator\":\"EQUALS\",\"ComparisonValue\":\"$.MetricData.AGENT_ACTIVITY\",\"Operands\":[\"98f48f29-6ddd-4a3d-a592-d5ab640bf75e\"],\"FilterClause\":{\"LogicOperator\":\"AND\",\"Filters\":[{\"Type\":\"MetricDataFilterByAgent\",\"Data\":[\"fb14a446-f464-46ed-afee-6b77c4a7fb28\"]},{\"Type\":\"AgentActivityDurationSeconds\",\"Data\":{\"Past\":960}}]},\"Negate\":false},{\"Operator\":\"EQUALS\",\"ComparisonValue\":\"$.MetricData.AGENT_ACTIVITY\",\"Operands\":[\"e01d3bc4-b086-4ae8-add4-a803b6ccb4a0\"],\"FilterClause\":{\"LogicOperator\":\"AND\",\"Filters\":[{\"Type\":\"MetricDataFilterByAgent\",\"Data\":[\"fb14a446-f464-46ed-afee-6b77c4a7fb28\"]},{\"Type\":\"AgentActivityDurationSeconds\",\"Data\":{\"Past\":1860}}]},\"Negate\":false}]}],\"FilterClause\":{\"LogicOperator\":\"AND\",\"Filters\":[]}}}",
      actions: {
        sendNotificationActions: [{ content: "Hi Michelle,\r\n\r\nYou received this email because you had a break or lunch exceed your scheduled time.  Please remember to return to work timely.  \r\n\r\nIf there are any extenuating circumstances regarding this break/lunch overage, please make sure to speak with your administrator.\r\n\r\nThanks,\r\n\r\nAmazon Connect \r\n\nThis notification from Amazon Connect was generated by Rule: $.RuleName\n", contentType: "PLAIN_TEXT", deliveryMethod: "EMAIL", recipient: { userArns: ["arn:aws:connect:us-west-2:059586875367:instance/e2511377-f263-44a1-b4ca-d2cdbcf28a97/agent/fb14a446-f464-46ed-afee-6b77c4a7fb28", "arn:aws:connect:us-west-2:059586875367:instance/e2511377-f263-44a1-b4ca-d2cdbcf28a97/agent/c8f9a9e4-cce4-4011-8670-ee1eebb8d1ed"] } as any, subject: "Late Break or Lunch Notification: Michelle Hammel", }],
      },
      publishStatus: "PUBLISHED",
    });

    const TRA10MinuteNotification = new connect.CfnRule(this, 'TRA10MinuteNotification', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "TRA_10_Minute_Notification",
      triggerEventSource: { eventSourceName: "OnMetricDataUpdate" },
      function: "{\"Version\":\"2022-11-25\",\"RuleFunction\":{\"Operator\":\"OR\",\"Operands\":[{\"Operator\":\"OR\",\"Operands\":[{\"Operator\":\"NumberGreaterOrEqualTo\",\"ComparisonValue\":\"$.MetricData.OLDEST_CONTACT_AGE\",\"Operands\":[600],\"FilterClause\":{\"LogicOperator\":\"AND\",\"Filters\":[{\"Type\":\"MetricDataFilterByQueue\",\"Data\":[\"34bcda32-ffbc-46e3-82c9-5934ddd26302\",\"9873364d-daf1-49ee-8efc-db94280dc6cb\",\"537289aa-632c-4292-ba56-8ff8b6886c41\",\"0245d12b-201c-423d-a717-c160271c543b\"]}]},\"Negate\":false}]}],\"FilterClause\":{\"LogicOperator\":\"AND\",\"Filters\":[{\"Type\":\"MetricDataGrouping\",\"Data\":[\"QUEUE\"]}]}}}",
      actions: {
        sendNotificationActions: [{ content: "This email was triggered by a wait time of greater than 10 minutes on a TRA Queue.", contentType: "PLAIN_TEXT", deliveryMethod: "EMAIL", recipient: { userArns: ["arn:aws:connect:us-west-2:059586875367:instance/e2511377-f263-44a1-b4ca-d2cdbcf28a97/agent/acb6275d-07d1-4eb1-b064-4862daabce4f"] } as any, subject: "*** TRA Queue Alert ***", }],
      },
      publishStatus: "PUBLISHED",
    });

    const CSCLateBreakAlertTeamLeonard = new connect.CfnRule(this, 'CSCLateBreakAlertTeamLeonard', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "CSC_Late_Break_Alert_Team_Leonard",
      triggerEventSource: { eventSourceName: "OnMetricDataUpdate" },
      function: "{\"Version\":\"2022-11-25\",\"RuleFunction\":{\"Operator\":\"OR\",\"Operands\":[{\"Operator\":\"OR\",\"Operands\":[{\"Operator\":\"EQUALS\",\"ComparisonValue\":\"$.MetricData.AGENT_ACTIVITY\",\"Operands\":[\"5b37ede4-548c-472c-a1b5-52a179a8a735\"],\"FilterClause\":{\"LogicOperator\":\"AND\",\"Filters\":[{\"Type\":\"MetricDataFilterByAgent\",\"Data\":[\"f7a2435c-ac5a-47bb-b56d-b5ecd8e7384a\",\"0884bd70-af03-4802-b0eb-05c3609c384f\",\"6e63b933-77c2-4340-89dc-2b72fed86aa3\",\"59aa5c8d-f075-4789-94cf-368faea6f82e\",\"4f51cb72-ae62-4151-b186-72f126c32aa1\",\"04a515c0-ef6c-4cd1-b74f-d93832c859d1\",\"4ae9fdc1-6ba3-4282-bccc-bab2944a6bf6\"]},{\"Type\":\"AgentActivityDurationSeconds\",\"Data\":{\"Past\":360}}]},\"Negate\":false},{\"Operator\":\"EQUALS\",\"ComparisonValue\":\"$.MetricData.AGENT_ACTIVITY\",\"Operands\":[\"98f48f29-6ddd-4a3d-a592-d5ab640bf75e\"],\"FilterClause\":{\"LogicOperator\":\"AND\",\"Filters\":[{\"Type\":\"MetricDataFilterByAgent\",\"Data\":[\"f7a2435c-ac5a-47bb-b56d-b5ecd8e7384a\",\"0884bd70-af03-4802-b0eb-05c3609c384f\",\"6e63b933-77c2-4340-89dc-2b72fed86aa3\",\"59aa5c8d-f075-4789-94cf-368faea6f82e\",\"4f51cb72-ae62-4151-b186-72f126c32aa1\",\"04a515c0-ef6c-4cd1-b74f-d93832c859d1\",\"4ae9fdc1-6ba3-4282-bccc-bab2944a6bf6\"]},{\"Type\":\"AgentActivityDurationSeconds\",\"Data\":{\"Past\":960}}]},\"Negate\":false}]}],\"FilterClause\":{\"LogicOperator\":\"AND\",\"Filters\":[]}}}",
      actions: {
        sendNotificationActions: [{ content: "The following team member has exceeded a scheduled break by one minute or longer:\n\n$.MetricDataUpdate.Dimensions.Agents[*].Names\n\nThis notification from Amazon Connect was generated by Rule: $.RuleName", contentType: "PLAIN_TEXT", deliveryMethod: "EMAIL", recipient: { userArns: ["arn:aws:connect:us-west-2:059586875367:instance/e2511377-f263-44a1-b4ca-d2cdbcf28a97/agent/c92715d8-e928-40f6-aa52-7850186a6058"] } as any, subject: "Late Break Alert: $.MetricDataUpdate.Dimensions.Agents[*].Names ", }],
      },
      publishStatus: "PUBLISHED",
    });

    const LateBreakLunchBrianVanVliet = new connect.CfnRule(this, 'LateBreakLunchBrianVanVliet', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "Late_Break_Lunch-Brian_VanVliet",
      triggerEventSource: { eventSourceName: "OnMetricDataUpdate" },
      function: "{\"Version\":\"2022-11-25\",\"RuleFunction\":{\"Operator\":\"OR\",\"Operands\":[{\"Operator\":\"OR\",\"Operands\":[{\"Operator\":\"EQUALS\",\"ComparisonValue\":\"$.MetricData.AGENT_ACTIVITY\",\"Operands\":[\"e01d3bc4-b086-4ae8-add4-a803b6ccb4a0\"],\"FilterClause\":{\"LogicOperator\":\"AND\",\"Filters\":[{\"Type\":\"MetricDataFilterByAgent\",\"Data\":[\"c2bd1083-03bf-4f91-ae50-2e509fc1c6f1\"]},{\"Type\":\"AgentActivityDurationSeconds\",\"Data\":{\"Past\":1860}}]},\"Negate\":false}]},{\"Operator\":\"OR\",\"Operands\":[{\"Operator\":\"EQUALS\",\"ComparisonValue\":\"$.MetricData.AGENT_ACTIVITY\",\"Operands\":[\"98f48f29-6ddd-4a3d-a592-d5ab640bf75e\"],\"FilterClause\":{\"LogicOperator\":\"AND\",\"Filters\":[{\"Type\":\"MetricDataFilterByAgent\",\"Data\":[\"c2bd1083-03bf-4f91-ae50-2e509fc1c6f1\"]},{\"Type\":\"AgentActivityDurationSeconds\",\"Data\":{\"Past\":960}}]},\"Negate\":false}]}],\"FilterClause\":{\"LogicOperator\":\"AND\",\"Filters\":[]}}}",
      actions: {
        sendNotificationActions: [{ content: "\nHi Brian,\n\nYou received this email because you had a break or lunch exceed your scheduled time.  Please remember to return to work timely.  \n\nIf there are any extenuating circumstances regarding this break/lunch overage, please make sure to speak with your administrator.\n\nThanks,\n\nAmazon Connect \n(This notification was generated by Rule: $.RuleName)", contentType: "PLAIN_TEXT", deliveryMethod: "EMAIL", recipient: { userArns: ["arn:aws:connect:us-west-2:059586875367:instance/e2511377-f263-44a1-b4ca-d2cdbcf28a97/agent/c2bd1083-03bf-4f91-ae50-2e509fc1c6f1"] } as any, subject: "Late Break or Lunch Notification: Brian Van Vliet", }],
      },
      publishStatus: "PUBLISHED",
    });

    const ChatEscalation = new connect.CfnRule(this, 'ChatEscalation', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "ChatEscalation",
      triggerEventSource: { eventSourceName: "OnRealTimeChatAnalysisAvailable" },
      function: "{\"Version\":\"2022-11-25\",\"RuleFunction\":{\"Operator\":\"OR\",\"Operands\":[{\"Operator\":\"CONTAINS_ANY\",\"Operands\":[[{\"Type\":\"PLAIN\",\"Value\":\"escalation\"}],[{\"Type\":\"PLAIN\",\"Value\":\"I want to speak to a manager\"}],[{\"Type\":\"PLAIN\",\"Value\":\"let me speak to a supervisor\"}],[{\"Type\":\"PLAIN\",\"Value\":\"get your manager\"}]],\"ComparisonValue\":\"$.ContactLens.RealTimeChat.PatternMatch.Transcript\",\"FilterClause\":{\"LogicOperator\":\"AND\",\"Filters\":[{\"Type\":\"ParticipantRole\",\"Data\":\"AGENT\"},{\"Type\":\"PatternMatchLanguageFilter\",\"Data\":\"EN\"}]},\"Negate\":false}]}}",
      actions: {
        assignContactCategoryActions: [{}],
        sendNotificationActions: [{ content: "Chat Escalation notification from Amazon Connect. This is contact Id: $.ContactLens.RealTimeChat.ContactId\n\nView contact: https://mycdtfa.my.connect.aws/connect/contact-trace-records/details/$.ContactLens.RealTimeChat.ContactId#realtime\n\nPlease use the real-time metrics to assisst with the call. ", contentType: "PLAIN_TEXT", deliveryMethod: "EMAIL", recipient: { userArns: ["arn:aws:connect:us-west-2:059586875367:instance/e2511377-f263-44a1-b4ca-d2cdbcf28a97/agent/088ecb26-c432-4706-8927-63bee4af8f7c", "arn:aws:connect:us-west-2:059586875367:instance/e2511377-f263-44a1-b4ca-d2cdbcf28a97/agent/7beef9f2-64d7-45aa-9de0-8707ad451132"] } as any, subject: "Rules notification - Contact Id: $.ContactLens.RealTimeChat.ContactId", }],
      },
      publishStatus: "PUBLISHED",
    });

    const AxyomAssistChatAccess = new connect.CfnRule(this, 'AxyomAssistChatAccess', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "axyom-assist-chat-access",
      triggerEventSource: { eventSourceName: "OnRealTimeChatAnalysisAvailable" },
      function: "{\"Version\":\"2022-11-25\",\"RuleFunction\":{\"Operator\":\"AND\",\"Operands\":[{\"Operator\":\"EQUALS\",\"Operands\":[\"true\"],\"ComparisonValue\":\"$.ContactLens.RealTimeChat.ContactAttribute.axyom-assist-access\",\"Negate\":false}]}}",
      actions: {
        assignContactCategoryActions: [{}],
      },
      publishStatus: "PUBLISHED",
    });

    const MCO5MinuteNotification = new connect.CfnRule(this, 'MCO5MinuteNotification', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "MCO_5_Minute_Notification",
      triggerEventSource: { eventSourceName: "OnMetricDataUpdate" },
      function: "{\"Version\":\"2022-11-25\",\"RuleFunction\":{\"Operator\":\"OR\",\"Operands\":[{\"Operator\":\"OR\",\"Operands\":[{\"Operator\":\"NumberGreaterOrEqualTo\",\"ComparisonValue\":\"$.MetricData.OLDEST_CONTACT_AGE\",\"Operands\":[300],\"FilterClause\":{\"LogicOperator\":\"AND\",\"Filters\":[{\"Type\":\"MetricDataFilterByQueue\",\"Data\":[\"9f04b14c-9759-423d-bf51-dac8c1f00667\",\"1e3b0ea6-65e7-4dcf-89ea-4e2c731c6328\",\"56f606d9-2605-458c-a76f-65e38f3855d3\",\"230aa79c-dc12-4344-934d-1fcb9f262ece\",\"788722ae-5d4e-4584-82e6-fce02d189fef\",\"590c9088-70ba-46d0-9ff0-b901187a5365\",\"e0493c03-700f-468b-bc2f-ef6bbbe5af8e\",\"5d20293c-0077-4b2f-bece-295081ebcc04\",\"02c081e3-e7e6-4274-8bff-32097c1dc60a\",\"cb7be7de-d388-411f-8127-c3c3132ca89d\",\"4d781e9e-5d7d-4735-960f-dcd0265972e9\",\"9e744996-4530-4272-a0c8-5dfd4dff4b9f\",\"d9500996-c3af-47c1-ac52-eb6a4da3071b\",\"5634c1da-72a4-47e6-9c35-e8aa520fc9b6\",\"6b5f62a6-eeaf-4aac-8f2c-0d5cbdf1712e\",\"db8c653e-17c3-4d90-8b3b-aa10e21bb3b0\",\"367e76a8-b94c-46f4-b716-224bc1b42995\",\"4ee676f7-cc39-44a7-9645-73878557f33e\"]}]},\"Negate\":false}]}],\"FilterClause\":{\"LogicOperator\":\"AND\",\"Filters\":[{\"Type\":\"MetricDataGrouping\",\"Data\":[\"QUEUE\"]}]}}}",
      actions: {
        sendNotificationActions: [{ content: "This email was triggered by a wait time of greater than 5 minutes on one of the MCO Queues.", contentType: "PLAIN_TEXT", deliveryMethod: "EMAIL", recipient: { userArns: ["arn:aws:connect:us-west-2:059586875367:instance/e2511377-f263-44a1-b4ca-d2cdbcf28a97/agent/3aa08973-a235-4f9f-b0fd-f1f9c656f5af", "arn:aws:connect:us-west-2:059586875367:instance/e2511377-f263-44a1-b4ca-d2cdbcf28a97/agent/8b3c3410-9afb-43e1-b8b1-f4b19799e1d6", "arn:aws:connect:us-west-2:059586875367:instance/e2511377-f263-44a1-b4ca-d2cdbcf28a97/agent/8cc9a3f6-2078-470a-8dc7-4df54d15f101", "arn:aws:connect:us-west-2:059586875367:instance/e2511377-f263-44a1-b4ca-d2cdbcf28a97/agent/fe838d5e-1b90-4a9d-a070-8aaa1fd5d13a"] } as any, subject: "*** MCO Queue Alert ***", }],
      },
      publishStatus: "PUBLISHED",
    });

    const ChatFraud = new connect.CfnRule(this, 'ChatFraud', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "ChatFraud",
      triggerEventSource: { eventSourceName: "OnRealTimeChatAnalysisAvailable" },
      function: "{\"Version\":\"2022-11-25\",\"RuleFunction\":{\"Operator\":\"OR\",\"Operands\":[{\"Operator\":\"CONTAINS_ANY\",\"Operands\":[[{\"Type\":\"PLAIN\",\"Value\":\"fraud\"}],[{\"Type\":\"PLAIN\",\"Value\":\"I think my account has been accessed by someone\"}],[{\"Type\":\"PLAIN\",\"Value\":\"fraudulent charges\"}],[{\"Type\":\"PLAIN\",\"Value\":\"fraud charges\"}],[{\"Type\":\"PLAIN\",\"Value\":\"victim of fraud\"}]],\"ComparisonValue\":\"$.ContactLens.RealTimeChat.PatternMatch.Transcript\",\"FilterClause\":{\"LogicOperator\":\"AND\",\"Filters\":[{\"Type\":\"ParticipantRole\",\"Data\":\"AGENT\"},{\"Type\":\"PatternMatchLanguageFilter\",\"Data\":\"EN\"}]},\"Negate\":false}]}}",
      actions: {
        assignContactCategoryActions: [{}],
        sendNotificationActions: [{ content: "This chat fraud notification from Amazon Connect is for contact Id: $.ContactLens.RealTimeChat.ContactId\n\nView contact: https://mycdtfa.my.connect.aws/connect/contact-trace-records/details/$.ContactLens.RealTimeChat.ContactId#realtime\n\nPlease use the real-time metrics page to assist in this chat. ", contentType: "PLAIN_TEXT", deliveryMethod: "EMAIL", recipient: { userArns: ["arn:aws:connect:us-west-2:059586875367:instance/e2511377-f263-44a1-b4ca-d2cdbcf28a97/agent/088ecb26-c432-4706-8927-63bee4af8f7c", "arn:aws:connect:us-west-2:059586875367:instance/e2511377-f263-44a1-b4ca-d2cdbcf28a97/agent/7beef9f2-64d7-45aa-9de0-8707ad451132"] } as any, subject: "Chat Fraud Rules notification - Contact Id: $.ContactLens.RealTimeChat.ContactId", }],
      },
      publishStatus: "PUBLISHED",
    });

    const ChatWaitTime10Minutes = new connect.CfnRule(this, 'ChatWaitTime10Minutes', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "Chat_Wait_Time_10_Minutes",
      triggerEventSource: { eventSourceName: "OnMetricDataUpdate" },
      function: "{\"Version\":\"2022-11-25\",\"RuleFunction\":{\"Operator\":\"OR\",\"Operands\":[{\"Operator\":\"OR\",\"Operands\":[{\"Operator\":\"NumberGreaterOrEqualTo\",\"ComparisonValue\":\"$.MetricData.OLDEST_CONTACT_AGE\",\"Operands\":[600],\"FilterClause\":{\"LogicOperator\":\"AND\",\"Filters\":[{\"Type\":\"MetricDataFilterByQueue\",\"Data\":[\"a5c2c6e4-69ac-4e1a-93c7-ff335991d763\",\"2b75020e-418e-4001-a8a7-a0dee577a44b\"]}]},\"Negate\":false}]}],\"FilterClause\":{\"LogicOperator\":\"AND\",\"Filters\":[{\"Type\":\"MetricDataGrouping\",\"Data\":[\"QUEUE\"]}]}}}",
      actions: {
        sendNotificationActions: [{ content: "\nPlease check the chat queues!\n\nNote: This email was triggered by a wait time of greater than 10 minutes on one of the chat queues.", contentType: "PLAIN_TEXT", deliveryMethod: "EMAIL", recipient: { userArns: ["arn:aws:connect:us-west-2:059586875367:instance/e2511377-f263-44a1-b4ca-d2cdbcf28a97/agent/817eede6-51d4-4925-a6b1-4bd470c2402e", "arn:aws:connect:us-west-2:059586875367:instance/e2511377-f263-44a1-b4ca-d2cdbcf28a97/agent/8ffd967e-72e5-4dfc-85c0-7bd80d919075", "arn:aws:connect:us-west-2:059586875367:instance/e2511377-f263-44a1-b4ca-d2cdbcf28a97/agent/acb6275d-07d1-4eb1-b064-4862daabce4f", "arn:aws:connect:us-west-2:059586875367:instance/e2511377-f263-44a1-b4ca-d2cdbcf28a97/agent/c8f9a9e4-cce4-4011-8670-ee1eebb8d1ed", "arn:aws:connect:us-west-2:059586875367:instance/e2511377-f263-44a1-b4ca-d2cdbcf28a97/agent/f225524c-02d1-4cd4-8f77-8d526677c33a"] } as any, subject: "*** 10 Minute Chat Alert ***", }],
      },
      publishStatus: "PUBLISHED",
    });

    const LateBreakLunchJeradPorter = new connect.CfnRule(this, 'LateBreakLunchJeradPorter', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "Late_Break_Lunch-Jerad_Porter",
      triggerEventSource: { eventSourceName: "OnMetricDataUpdate" },
      function: "{\"Version\":\"2022-11-25\",\"RuleFunction\":{\"Operator\":\"OR\",\"Operands\":[{\"Operator\":\"OR\",\"Operands\":[{\"Operator\":\"EQUALS\",\"ComparisonValue\":\"$.MetricData.AGENT_ACTIVITY\",\"Operands\":[\"5b37ede4-548c-472c-a1b5-52a179a8a735\"],\"FilterClause\":{\"LogicOperator\":\"AND\",\"Filters\":[{\"Type\":\"MetricDataFilterByAgent\",\"Data\":[\"d4ae46ab-b70d-47ff-aac9-099491d33fba\"]},{\"Type\":\"AgentActivityDurationSeconds\",\"Data\":{\"Past\":360}}]},\"Negate\":false},{\"Operator\":\"EQUALS\",\"ComparisonValue\":\"$.MetricData.AGENT_ACTIVITY\",\"Operands\":[\"98f48f29-6ddd-4a3d-a592-d5ab640bf75e\"],\"FilterClause\":{\"LogicOperator\":\"AND\",\"Filters\":[{\"Type\":\"MetricDataFilterByAgent\",\"Data\":[\"d4ae46ab-b70d-47ff-aac9-099491d33fba\"]},{\"Type\":\"AgentActivityDurationSeconds\",\"Data\":{\"Past\":960}}]},\"Negate\":false},{\"Operator\":\"EQUALS\",\"ComparisonValue\":\"$.MetricData.AGENT_ACTIVITY\",\"Operands\":[\"e01d3bc4-b086-4ae8-add4-a803b6ccb4a0\"],\"FilterClause\":{\"LogicOperator\":\"AND\",\"Filters\":[{\"Type\":\"MetricDataFilterByAgent\",\"Data\":[\"d4ae46ab-b70d-47ff-aac9-099491d33fba\"]},{\"Type\":\"AgentActivityDurationSeconds\",\"Data\":{\"Past\":2760}}]},\"Negate\":false}]}],\"FilterClause\":{\"LogicOperator\":\"AND\",\"Filters\":[]}}}",
      actions: {
        sendNotificationActions: [{ content: "\nHi Jerad,\n\nYou received this email because you had a break or lunch exceed your scheduled time.  Please remember to return to work timely.  \n\nIf there are any extenuating circumstances regarding this break/lunch overage, please make sure to speak with your administrator.\n\nThanks,\n\nAmazon Connect \n(This notification was generated by Rule: $.RuleName)", contentType: "PLAIN_TEXT", deliveryMethod: "EMAIL", recipient: { userArns: ["arn:aws:connect:us-west-2:059586875367:instance/e2511377-f263-44a1-b4ca-d2cdbcf28a97/agent/d4ae46ab-b70d-47ff-aac9-099491d33fba"] } as any, subject: "Late Break or Lunch Notification: Jerad Porter", }],
      },
      publishStatus: "PUBLISHED",
    });

    const CSCLateBreakAlertTeamDyshon = new connect.CfnRule(this, 'CSCLateBreakAlertTeamDyshon', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "CSC_Late_Break_Alert_Team_Dyshon",
      triggerEventSource: { eventSourceName: "OnMetricDataUpdate" },
      function: "{\"Version\":\"2022-11-25\",\"RuleFunction\":{\"Operator\":\"OR\",\"Operands\":[{\"Operator\":\"OR\",\"Operands\":[{\"Operator\":\"EQUALS\",\"ComparisonValue\":\"$.MetricData.AGENT_ACTIVITY\",\"Operands\":[\"5b37ede4-548c-472c-a1b5-52a179a8a735\"],\"FilterClause\":{\"LogicOperator\":\"AND\",\"Filters\":[{\"Type\":\"MetricDataFilterByAgent\",\"Data\":[\"1e9ff791-c27f-430e-a3a0-8b77a22a704b\",\"3aec27ce-a2b4-404b-89f1-9b6d52248e4d\",\"f656dcf9-43b6-4b86-a83f-b21dbfc98a3f\",\"f3092731-ee36-4674-91d8-852a36933b89\",\"8a3b3025-2eb5-469a-a8f6-7ae7546ba0f0\",\"8df1e7e9-e901-4b44-86c9-fc24d5381168\",\"df87821c-6224-4905-a335-3d1ea7e5f098\",\"9fc79ecd-c5f8-4e98-bbdb-e26abc1e7288\",\"a1b0791f-2f96-448a-9459-e0e45b087c72\"]},{\"Type\":\"AgentActivityDurationSeconds\",\"Data\":{\"Past\":360}}]},\"Negate\":false},{\"Operator\":\"EQUALS\",\"ComparisonValue\":\"$.MetricData.AGENT_ACTIVITY\",\"Operands\":[\"98f48f29-6ddd-4a3d-a592-d5ab640bf75e\"],\"FilterClause\":{\"LogicOperator\":\"AND\",\"Filters\":[{\"Type\":\"MetricDataFilterByAgent\",\"Data\":[\"1e9ff791-c27f-430e-a3a0-8b77a22a704b\",\"3aec27ce-a2b4-404b-89f1-9b6d52248e4d\",\"f656dcf9-43b6-4b86-a83f-b21dbfc98a3f\",\"f3092731-ee36-4674-91d8-852a36933b89\",\"8a3b3025-2eb5-469a-a8f6-7ae7546ba0f0\",\"8df1e7e9-e901-4b44-86c9-fc24d5381168\",\"df87821c-6224-4905-a335-3d1ea7e5f098\",\"9fc79ecd-c5f8-4e98-bbdb-e26abc1e7288\",\"a1b0791f-2f96-448a-9459-e0e45b087c72\"]},{\"Type\":\"AgentActivityDurationSeconds\",\"Data\":{\"Past\":960}}]},\"Negate\":false}]}],\"FilterClause\":{\"LogicOperator\":\"AND\",\"Filters\":[]}}}",
      actions: {
        sendNotificationActions: [{ content: "The following team member has exceeded a scheduled break by one minute or longer:\n\n$.MetricDataUpdate.Dimensions.Agents[*].Names\n\nThis notification from Amazon Connect was generated by Rule: $.RuleName", contentType: "PLAIN_TEXT", deliveryMethod: "EMAIL", recipient: { userArns: ["arn:aws:connect:us-west-2:059586875367:instance/e2511377-f263-44a1-b4ca-d2cdbcf28a97/agent/c17ace5f-2aa7-4139-8dad-0bdbca1faed3"] } as any, subject: "Late Break Alert: $.MetricDataUpdate.Dimensions.Agents[*].Names ", }],
      },
      publishStatus: "PUBLISHED",
    });

    const TAGQueueAlert = new connect.CfnRule(this, 'TAGQueueAlert', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "TAG_Queue_Alert",
      triggerEventSource: { eventSourceName: "OnMetricDataUpdate" },
      function: "{\"Version\":\"2022-11-25\",\"RuleFunction\":{\"Operator\":\"AND\",\"Operands\":[{\"Operator\":\"OR\",\"Operands\":[{\"Operator\":\"NumberGreaterOrEqualTo\",\"ComparisonValue\":\"$.MetricData.OLDEST_CONTACT_AGE\",\"Operands\":[360],\"FilterClause\":{\"LogicOperator\":\"AND\",\"Filters\":[{\"Type\":\"MetricDataFilterByQueue\",\"Data\":[\"0d9dd72c-9879-4b84-bc11-98dd04f9e5cb\",\"74b80973-9098-4e14-8c16-36a0ab57afa1\"]},{\"Type\":\"MetricDataFilterByChannel\",\"Data\":[\"VOICE\"]}]},\"Negate\":false}]}],\"FilterClause\":{\"LogicOperator\":\"AND\",\"Filters\":[{\"Type\":\"MetricDataGrouping\",\"Data\":[\"QUEUE\"]}]}}}",
      actions: {
        sendNotificationActions: [{ content: "Please check the TAG and TAG Callback Queues\n\nThis notification from Amazon Connect was generated by Rule: $.RuleName", contentType: "PLAIN_TEXT", deliveryMethod: "EMAIL", recipient: { userArns: ["arn:aws:connect:us-west-2:059586875367:instance/e2511377-f263-44a1-b4ca-d2cdbcf28a97/agent/34864110-8714-4e86-8973-8450e1d3b54c", "arn:aws:connect:us-west-2:059586875367:instance/e2511377-f263-44a1-b4ca-d2cdbcf28a97/agent/9c9e8fe6-8e7d-4cce-819f-5d81b7ffff08", "arn:aws:connect:us-west-2:059586875367:instance/e2511377-f263-44a1-b4ca-d2cdbcf28a97/agent/9e558ae9-101c-4efc-a7d6-844ad097d9f3"] } as any, subject: "!!! TAG Queue Alert !!!", }],
      },
      publishStatus: "PUBLISHED",
    });

    const CSCLateBreakAlertTeamKim = new connect.CfnRule(this, 'CSCLateBreakAlertTeamKim', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "CSC_Late_Break_Alert_Team_Kim",
      triggerEventSource: { eventSourceName: "OnMetricDataUpdate" },
      function: "{\"Version\":\"2022-11-25\",\"RuleFunction\":{\"Operator\":\"OR\",\"Operands\":[{\"Operator\":\"OR\",\"Operands\":[{\"Operator\":\"EQUALS\",\"ComparisonValue\":\"$.MetricData.AGENT_ACTIVITY\",\"Operands\":[\"5b37ede4-548c-472c-a1b5-52a179a8a735\"],\"FilterClause\":{\"LogicOperator\":\"AND\",\"Filters\":[{\"Type\":\"MetricDataFilterByAgent\",\"Data\":[\"65b04d1c-ff88-4cab-92b0-94857a481ef0\",\"b2e202ca-8199-405a-8825-f8cc2a877717\",\"b42388df-297b-4f8f-86d9-ab1c08ab7beb\",\"ddde91d6-1c0c-46d5-8129-df74c90165d4\",\"df759c24-2819-4113-96f8-d6be0c939ba1\"]},{\"Type\":\"AgentActivityDurationSeconds\",\"Data\":{\"Past\":360}}]},\"Negate\":false},{\"Operator\":\"EQUALS\",\"ComparisonValue\":\"$.MetricData.AGENT_ACTIVITY\",\"Operands\":[\"98f48f29-6ddd-4a3d-a592-d5ab640bf75e\"],\"FilterClause\":{\"LogicOperator\":\"AND\",\"Filters\":[{\"Type\":\"MetricDataFilterByAgent\",\"Data\":[\"65b04d1c-ff88-4cab-92b0-94857a481ef0\",\"b2e202ca-8199-405a-8825-f8cc2a877717\",\"b42388df-297b-4f8f-86d9-ab1c08ab7beb\",\"ddde91d6-1c0c-46d5-8129-df74c90165d4\",\"df759c24-2819-4113-96f8-d6be0c939ba1\"]},{\"Type\":\"AgentActivityDurationSeconds\",\"Data\":{\"Past\":960}}]},\"Negate\":false}]}],\"FilterClause\":{\"LogicOperator\":\"AND\",\"Filters\":[]}}}",
      actions: {
        sendNotificationActions: [{ content: "The following team member has exceeded a scheduled break by one minute or longer:\n\n$.MetricDataUpdate.Dimensions.Agents[*].Names\n\nThis notification from Amazon Connect was generated by Rule: $.RuleName", contentType: "PLAIN_TEXT", deliveryMethod: "EMAIL", recipient: { userArns: ["arn:aws:connect:us-west-2:059586875367:instance/e2511377-f263-44a1-b4ca-d2cdbcf28a97/agent/2a94d2f1-f6a6-4020-99ea-c3b812fbc9c8"] } as any, subject: "Late Break Alert: $.MetricDataUpdate.Dimensions.Agents[*].Names ", }],
      },
      publishStatus: "PUBLISHED",
    });

    const AxyomAssistPhoneAccess = new connect.CfnRule(this, 'AxyomAssistPhoneAccess', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "axyom-assist-phone-access",
      triggerEventSource: { eventSourceName: "OnRealTimeCallAnalysisAvailable" },
      function: "{\"Version\":\"2022-11-25\",\"RuleFunction\":{\"Operator\":\"AND\",\"Operands\":[{\"Operator\":\"EQUALS\",\"Operands\":[\"true\"],\"ComparisonValue\":\"$.ContactLens.RealTimeCall.ContactAttribute.axyom-assist-access\",\"Negate\":false}]}}",
      actions: {
        assignContactCategoryActions: [{}],
      },
      publishStatus: "PUBLISHED",
    });

    const Fraud = new connect.CfnRule(this, 'Fraud', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "Fraud",
      triggerEventSource: { eventSourceName: "OnRealTimeCallAnalysisAvailable" },
      function: "{\"Version\":\"2022-11-25\",\"RuleFunction\":{\"Operator\":\"OR\",\"Operands\":[{\"Operator\":\"CONTAINS_ANY\",\"Operands\":[[{\"Type\":\"PLAIN\",\"Value\":\"fraud\"}],[{\"Type\":\"PLAIN\",\"Value\":\"I think my account has been accessed by someone\"}],[{\"Type\":\"PLAIN\",\"Value\":\"fraudulent charges\"}],[{\"Type\":\"PLAIN\",\"Value\":\"fraud charges\"}],[{\"Type\":\"PLAIN\",\"Value\":\"victim of fraud\"}]],\"ComparisonValue\":\"$.ContactLens.RealTimeCall.PatternMatch.Transcript\",\"FilterClause\":{\"LogicOperator\":\"AND\",\"Filters\":[{\"Type\":\"ParticipantRole\",\"Data\":\"CUSTOMER\"},{\"Type\":\"PatternMatchLanguageFilter\",\"Data\":\"EN\"}]},\"Negate\":false}]}}",
      actions: {
        assignContactCategoryActions: [{}],
        sendNotificationActions: [{ content: "This fraud notification from Amazon Connect is for contact Id: $.ContactLens.RealTimeCall.ContactId\n\nView contact: https://mycdtfa.my.connect.aws/connect/contact-trace-records/details/$.ContactLens.RealTimeCall.ContactId#realtime\n\nPlease use the real-time metrics page to join this call. ", contentType: "PLAIN_TEXT", deliveryMethod: "EMAIL", recipient: { userArns: ["arn:aws:connect:us-west-2:059586875367:instance/e2511377-f263-44a1-b4ca-d2cdbcf28a97/agent/6a64135d-a48f-4b4c-9982-97d85502a92a"] } as any, subject: "Fraud Rules notification - Contact Id: $.ContactLens.RealTimeCall.ContactId", }],
      },
      publishStatus: "PUBLISHED",
    });

    const ChatProfanity = new connect.CfnRule(this, 'ChatProfanity', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "ChatProfanity",
      triggerEventSource: { eventSourceName: "OnRealTimeChatAnalysisAvailable" },
      function: "{\"Version\":\"2022-11-25\",\"RuleFunction\":{\"Operator\":\"OR\",\"Operands\":[{\"Operator\":\"CONTAINS_ANY\",\"Operands\":[[{\"Type\":\"PLAIN\",\"Value\":\"fuck\"}],[{\"Type\":\"PLAIN\",\"Value\":\"shit\"}],[{\"Type\":\"PLAIN\",\"Value\":\"dick\"}],[{\"Type\":\"PLAIN\",\"Value\":\"asshole\"}],[{\"Type\":\"PLAIN\",\"Value\":\"bitch\"}],[{\"Type\":\"PLAIN\",\"Value\":\"motherfucker\"}],[{\"Type\":\"PLAIN\",\"Value\":\"cunt\"}]],\"ComparisonValue\":\"$.ContactLens.RealTimeChat.PatternMatch.Transcript\",\"FilterClause\":{\"LogicOperator\":\"AND\",\"Filters\":[{\"Type\":\"ParticipantRole\",\"Data\":\"AGENT\"},{\"Type\":\"PatternMatchLanguageFilter\",\"Data\":\"EN\"}]},\"Negate\":false}]}}",
      actions: {
        assignContactCategoryActions: [{}],
        sendNotificationActions: [{ content: "This notification from Amazon Connect is for contact Id: $.ContactLens.RealTimeChat.ContactId\n\nView contact: https://mycdtfa.my.connect.aws/connect/contact-trace-records/details/$.ContactLens.RealTimeChat.ContactId#realtime\n\nProfanity was detected in this chat. Please use the Real-Time Metrics screen to assist. ", contentType: "PLAIN_TEXT", deliveryMethod: "EMAIL", recipient: { userArns: ["arn:aws:connect:us-west-2:059586875367:instance/e2511377-f263-44a1-b4ca-d2cdbcf28a97/agent/088ecb26-c432-4706-8927-63bee4af8f7c", "arn:aws:connect:us-west-2:059586875367:instance/e2511377-f263-44a1-b4ca-d2cdbcf28a97/agent/7beef9f2-64d7-45aa-9de0-8707ad451132"] } as any, subject: "Chat Profanity Rules notification - Contact Id: $.ContactLens.RealTimeChat.ContactId", }],
      },
      publishStatus: "PUBLISHED",
    });

    const NoFurtherQuestionsChat = new connect.CfnRule(this, 'NoFurtherQuestionsChat', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "NoFurtherQuestionsChat",
      triggerEventSource: { eventSourceName: "OnPostChatAnalysisAvailable" },
      function: "{\"Version\":\"2022-11-25\",\"RuleFunction\":{\"Operator\":\"OR\",\"Operands\":[{\"Operator\":\"CONTAINS_ANY\",\"Operands\":[\"Since you have no further questions\",\"if there are no further questions\",\"as you have no further questions\",\"Since there are no further questions\"],\"ComparisonValue\":\"$.ContactLens.PostChat.SemanticMatch.Transcript\",\"FilterClause\":{\"LogicOperator\":\"AND\",\"Filters\":[{\"Type\":\"ParticipantRole\",\"Data\":\"AGENT\"}]},\"Negate\":false}]}}",
      actions: {
        assignContactCategoryActions: [{}],
      },
      publishStatus: "PUBLISHED",
    });

    const NegitiveAgentSentiment = new connect.CfnRule(this, 'NegitiveAgentSentiment', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "NegitiveAgentSentiment",
      triggerEventSource: { eventSourceName: "OnRealTimeCallAnalysisAvailable" },
      function: "{\"Version\":\"2022-11-25\",\"RuleFunction\":{\"Operator\":\"OR\",\"Operands\":[{\"Operator\":\"EQUALS\",\"Operands\":[\"NEGATIVE\"],\"ComparisonValue\":\"$.ContactLens.RealTimeCall.Sentiment.State\",\"Negate\":false,\"FilterClause\":{\"LogicOperator\":\"AND\",\"Filters\":[{\"Type\":\"ParticipantRole\",\"Data\":\"AGENT\"},{\"Type\":\"RealTimeCallContactPeriodSeconds\",\"Data\":{\"Past\":120}}]}}]}}",
      actions: {
        assignContactCategoryActions: [{}],
        sendNotificationActions: [{ content: "This notification from Amazon Connect is for contact Id: $.ContactLens.RealTimeCall.ContactId\n\nView contact: https://mycdtfa.my.connect.aws/connect/contact-trace-records/details/$.ContactLens.RealTimeCall.ContactId#realtime\n\nNegitive Agent Sentiment was detected in this call. Please use the real time metrics page to listen in on the call. ", contentType: "PLAIN_TEXT", deliveryMethod: "EMAIL", recipient: { userArns: ["arn:aws:connect:us-west-2:059586875367:instance/e2511377-f263-44a1-b4ca-d2cdbcf28a97/agent/088ecb26-c432-4706-8927-63bee4af8f7c", "arn:aws:connect:us-west-2:059586875367:instance/e2511377-f263-44a1-b4ca-d2cdbcf28a97/agent/7beef9f2-64d7-45aa-9de0-8707ad451132"] } as any, subject: "Negitive Agent Sentiment Rules notification - Contact Id: $.ContactLens.RealTimeCall.ContactId", }],
      },
      publishStatus: "PUBLISHED",
    });

    const NegitiveCustomerChatSentiment = new connect.CfnRule(this, 'NegitiveCustomerChatSentiment', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "NegitiveCustomerChatSentiment",
      triggerEventSource: { eventSourceName: "OnRealTimeChatAnalysisAvailable" },
      function: "{\"Version\":\"2022-11-25\",\"RuleFunction\":{\"Operator\":\"OR\",\"Operands\":[{\"Operator\":\"EQUALS\",\"Operands\":[\"NEGATIVE\"],\"ComparisonValue\":\"$.ContactLens.RealTimeChat.Sentiment.State\",\"Negate\":false,\"FilterClause\":{\"LogicOperator\":\"AND\",\"Filters\":[{\"Type\":\"ParticipantRole\",\"Data\":\"CUSTOMER\"},{\"Type\":\"RealTimeChatContactPeriodSeconds\",\"Data\":{\"Past\":120}}]}}]}}",
      actions: {
        assignContactCategoryActions: [{}],
        sendNotificationActions: [{ content: "This notification from Amazon Connect is for contact Id: $.ContactLens.RealTimeChat.ContactId\n\nView contact: https://mycdtfa.my.connect.aws/connect/contact-trace-records/details/$.ContactLens.RealTimeChat.ContactId#realtime\n\nNegitive Customer Chat Sentiment has been detected. Please use the Real-Time Metrics page to assist. ", contentType: "PLAIN_TEXT", deliveryMethod: "EMAIL", recipient: { userArns: ["arn:aws:connect:us-west-2:059586875367:instance/e2511377-f263-44a1-b4ca-d2cdbcf28a97/agent/088ecb26-c432-4706-8927-63bee4af8f7c", "arn:aws:connect:us-west-2:059586875367:instance/e2511377-f263-44a1-b4ca-d2cdbcf28a97/agent/7beef9f2-64d7-45aa-9de0-8707ad451132"] } as any, subject: "Negitive Customer Chat Sentiment Rules notification - Contact Id: $.ContactLens.RealTimeChat.ContactId", }],
      },
      publishStatus: "PUBLISHED",
    });

    const AccountNumberEnteredSpanishChat = new connect.CfnRule(this, 'AccountNumberEnteredSpanishChat', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "AccountNumberEnteredSpanishChat",
      triggerEventSource: { eventSourceName: "OnPostChatAnalysisAvailable" },
      function: "{\"Version\":\"2022-11-25\",\"RuleFunction\":{\"Operator\":\"OR\",\"Operands\":[{\"Operator\":\"CONTAINS_ANY\",\"Operands\":[[{\"Type\":\"PLAIN\",\"Value\":\"Mostrar el número de cuenta\"}],[{\"Type\":\"PLAIN\",\"Value\":\"veo que a ingresado el número de cuenta\"}]],\"ComparisonValue\":\"$.ContactLens.PostChat.PatternMatch.Transcript\",\"FilterClause\":{\"LogicOperator\":\"AND\",\"Filters\":[{\"Type\":\"ParticipantRole\",\"Data\":\"AGENT\"},{\"Type\":\"PatternMatchLanguageFilter\",\"Data\":\"ES\"}]},\"Negate\":false}]}}",
      actions: {
        assignContactCategoryActions: [{}],
      },
      publishStatus: "PUBLISHED",
    });

    const NegitiveAgentChatSentiment = new connect.CfnRule(this, 'NegitiveAgentChatSentiment', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "NegitiveAgentChatSentiment",
      triggerEventSource: { eventSourceName: "OnRealTimeChatAnalysisAvailable" },
      function: "{\"Version\":\"2022-11-25\",\"RuleFunction\":{\"Operator\":\"OR\",\"Operands\":[{\"Operator\":\"EQUALS\",\"Operands\":[\"NEGATIVE\"],\"ComparisonValue\":\"$.ContactLens.RealTimeChat.Sentiment.State\",\"Negate\":false,\"FilterClause\":{\"LogicOperator\":\"AND\",\"Filters\":[{\"Type\":\"ParticipantRole\",\"Data\":\"AGENT\"},{\"Type\":\"RealTimeChatContactPeriodSeconds\",\"Data\":{\"Past\":120}}]}}]}}",
      actions: {
        assignContactCategoryActions: [{}],
        sendNotificationActions: [{ content: "This notification from Amazon Connect is for contact Id: $.ContactLens.RealTimeChat.ContactId\n\nView contact: https://mycdtfa.my.connect.aws/connect/contact-trace-records/details/$.ContactLens.RealTimeChat.ContactId#realtime\n\nNegitive Agent Chat Sentiment detected. Please use Real-Time Metrics to assist. ", contentType: "PLAIN_TEXT", deliveryMethod: "EMAIL", recipient: { userArns: ["arn:aws:connect:us-west-2:059586875367:instance/e2511377-f263-44a1-b4ca-d2cdbcf28a97/agent/088ecb26-c432-4706-8927-63bee4af8f7c", "arn:aws:connect:us-west-2:059586875367:instance/e2511377-f263-44a1-b4ca-d2cdbcf28a97/agent/7beef9f2-64d7-45aa-9de0-8707ad451132"] } as any, subject: "Negitive Agent Chat Sentiment Rules notification - Contact Id: $.ContactLens.RealTimeChat.ContactId", }],
      },
      publishStatus: "PUBLISHED",
    });

    const NegitiveCustomerSentiment = new connect.CfnRule(this, 'NegitiveCustomerSentiment', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "NegitiveCustomerSentiment",
      triggerEventSource: { eventSourceName: "OnRealTimeCallAnalysisAvailable" },
      function: "{\"Version\":\"2022-11-25\",\"RuleFunction\":{\"Operator\":\"OR\",\"Operands\":[{\"Operator\":\"EQUALS\",\"Operands\":[\"NEGATIVE\"],\"ComparisonValue\":\"$.ContactLens.RealTimeCall.Sentiment.State\",\"Negate\":false,\"FilterClause\":{\"LogicOperator\":\"AND\",\"Filters\":[{\"Type\":\"ParticipantRole\",\"Data\":\"CUSTOMER\"},{\"Type\":\"RealTimeCallContactPeriodSeconds\",\"Data\":{\"Past\":120}}]}}]}}",
      actions: {
        assignContactCategoryActions: [{}],
        sendNotificationActions: [{ content: "This notification from Amazon Connect is for contact Id: $.ContactLens.RealTimeCall.ContactId\n\nView contact: https://mycdtfa.my.connect.aws/connect/contact-trace-records/details/$.ContactLens.RealTimeCall.ContactId#realtime\n\nContact lens has detected Negitive Customer Sentiment on this call, please use the Real-Time Metric screen to assist with the call. ", contentType: "PLAIN_TEXT", deliveryMethod: "EMAIL", recipient: { userArns: ["arn:aws:connect:us-west-2:059586875367:instance/e2511377-f263-44a1-b4ca-d2cdbcf28a97/agent/088ecb26-c432-4706-8927-63bee4af8f7c", "arn:aws:connect:us-west-2:059586875367:instance/e2511377-f263-44a1-b4ca-d2cdbcf28a97/agent/7beef9f2-64d7-45aa-9de0-8707ad451132"] } as any, subject: "Negitive Customer Sentiment Rules notification - Contact Id: $.ContactLens.RealTimeCall.ContactId", }],
      },
      publishStatus: "PUBLISHED",
    });

    const HappyToHelpSpanishChat = new connect.CfnRule(this, 'HappyToHelpSpanishChat', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "HappyToHelpSpanishChat",
      triggerEventSource: { eventSourceName: "OnPostChatAnalysisAvailable" },
      function: "{\"Version\":\"2022-11-25\",\"RuleFunction\":{\"Operator\":\"OR\",\"Operands\":[{\"Operator\":\"CONTAINS_ANY\",\"Operands\":[[{\"Type\":\"PLAIN\",\"Value\":\"Me allegro podido ayudarle resolver todas sus preguntas\"}],[{\"Type\":\"PLAIN\",\"Value\":\"Estoy feliz de haber podido ayudar\"}],[{\"Type\":\"PLAIN\",\"Value\":\"Me alegro de haber podido ayudar\"}],[{\"Type\":\"PLAIN\",\"Value\":\"Feliz de poder ayudar a resolver todas sus preguntas\"}]],\"ComparisonValue\":\"$.ContactLens.PostChat.PatternMatch.Transcript\",\"FilterClause\":{\"LogicOperator\":\"AND\",\"Filters\":[{\"Type\":\"ParticipantRole\",\"Data\":\"AGENT\"},{\"Type\":\"PatternMatchLanguageFilter\",\"Data\":\"ES\"}]},\"Negate\":false}]}}",
      actions: {
        assignContactCategoryActions: [{}],
      },
      publishStatus: "PUBLISHED",
    });

    const NoAccountNumberSpanishChat = new connect.CfnRule(this, 'NoAccountNumberSpanishChat', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "NoAccountNumberSpanishChat",
      triggerEventSource: { eventSourceName: "OnPostChatAnalysisAvailable" },
      function: "{\"Version\":\"2022-11-25\",\"RuleFunction\":{\"Operator\":\"OR\",\"Operands\":[{\"Operator\":\"CONTAINS_ANY\",\"Operands\":[[{\"Type\":\"PLAIN\",\"Value\":\"puede darme su número de cuenta\"}],[{\"Type\":\"PLAIN\",\"Value\":\"Puedo tener su número de cuenta\"}],[{\"Type\":\"PLAIN\",\"Value\":\"Me puede dar su número de cuenta por favor\"}]],\"ComparisonValue\":\"$.ContactLens.PostChat.PatternMatch.Transcript\",\"FilterClause\":{\"LogicOperator\":\"AND\",\"Filters\":[{\"Type\":\"ParticipantRole\",\"Data\":\"AGENT\"},{\"Type\":\"PatternMatchLanguageFilter\",\"Data\":\"ES\"}]},\"Negate\":false}]}}",
      actions: {
        assignContactCategoryActions: [{}],
      },
      publishStatus: "PUBLISHED",
    });

    const ClosingOtherQuestionsSpanishChat = new connect.CfnRule(this, 'ClosingOtherQuestionsSpanishChat', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "ClosingOtherQuestionsSpanishChat",
      triggerEventSource: { eventSourceName: "OnPostChatAnalysisAvailable" },
      function: "{\"Version\":\"2022-11-25\",\"RuleFunction\":{\"Operator\":\"OR\",\"Operands\":[{\"Operator\":\"CONTAINS_ANY\",\"Operands\":[[{\"Type\":\"PLAIN\",\"Value\":\"Tiene alguna otra pregunta el día de hoy?\"}],[{\"Type\":\"PLAIN\",\"Value\":\"Hay algo más en lo que pueda ayudarle?\"}],[{\"Type\":\"PLAIN\",\"Value\":\"Puedo ayudarte con algo más?\"}]],\"ComparisonValue\":\"$.ContactLens.PostChat.PatternMatch.Transcript\",\"FilterClause\":{\"LogicOperator\":\"AND\",\"Filters\":[{\"Type\":\"ParticipantRole\",\"Data\":\"AGENT\"},{\"Type\":\"PatternMatchLanguageFilter\",\"Data\":\"ES\"}]},\"Negate\":false}]}}",
      actions: {
        assignContactCategoryActions: [{}],
      },
      publishStatus: "PUBLISHED",
    });

    const AccountNumberNotEnteredChat = new connect.CfnRule(this, 'AccountNumberNotEnteredChat', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "AccountNumberNotEnteredChat",
      triggerEventSource: { eventSourceName: "OnPostChatAnalysisAvailable" },
      function: "{\"Version\":\"2022-11-25\",\"RuleFunction\":{\"Operator\":\"OR\",\"Operands\":[{\"Operator\":\"CONTAINS_ANY\",\"Operands\":[\"may I have your account number?\",\"may I have your account number please?\",\"may I please have your account number?\",\"see you provided account number\"],\"ComparisonValue\":\"$.ContactLens.PostChat.SemanticMatch.Transcript\",\"FilterClause\":{\"LogicOperator\":\"AND\",\"Filters\":[{\"Type\":\"ParticipantRole\",\"Data\":\"AGENT\"}]},\"Negate\":false}]}}",
      actions: {
        assignContactCategoryActions: [{}],
      },
      publishStatus: "PUBLISHED",
    });

    const ProfanitySTFCOL = new connect.CfnRule(this, 'ProfanitySTFCOL', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "Profanity_STF_COL",
      triggerEventSource: { eventSourceName: "OnPostCallAnalysisAvailable" },
      function: "{\"Version\":\"2022-11-25\",\"RuleFunction\":{\"Operator\":\"AND\",\"Operands\":[{\"Operator\":\"CONTAINS_ANY\",\"Operands\":[[{\"Type\":\"PLAIN\",\"Value\":\"fuck\"}],[{\"Type\":\"PLAIN\",\"Value\":\"shit\"}],[{\"Type\":\"PLAIN\",\"Value\":\"bitch\"}],[{\"Type\":\"PLAIN\",\"Value\":\"asshole\"}],[{\"Type\":\"PLAIN\",\"Value\":\"motherfucker\"}],[{\"Type\":\"PLAIN\",\"Value\":\"cunt\"}],[{\"Type\":\"PLAIN\",\"Value\":\"bullshit\"}],[{\"Type\":\"PLAIN\",\"Value\":\"fucking\"}]],\"ComparisonValue\":\"$.ContactLens.PostCall.PatternMatch.Transcript\",\"FilterClause\":{\"LogicOperator\":\"AND\",\"Filters\":[{\"Type\":\"ParticipantRole\",\"Data\":\"AGENT\"},{\"Type\":\"PatternMatchLanguageFilter\",\"Data\":\"EN\"}]},\"Negate\":false},{\"Operator\":\"CONTAINS_ANY\",\"Operands\":[\"8860e9bd-2509-4ddb-8e33-fbe8ca4dd617\",\"e7cd38bb-a878-4a6d-8e7a-f8a531a7ba80\",\"0e1216c4-41f0-43d5-be2c-835797fbe600\",\"491cf830-99b7-45dd-bca4-274e56385f2d\",\"65bf4d9c-cc6e-48d7-b35c-502949e594d8\",\"ba2da1a3-12c5-431e-a7e7-e4ca25731cbf\",\"26be0d2c-955e-4d4e-9e6f-d640fd0e4859\",\"ace286f8-7a47-4200-9d69-c368d343fb51\"],\"ComparisonValue\":\"$.ContactLens.PostCall.Queue.QueueId\",\"Negate\":false}]}}",
      actions: {
        assignContactCategoryActions: [{}],
        sendNotificationActions: [{ content: "This notification from Amazon Connect is for contact Id: $.ContactLens.PostCall.ContactId\n\nView contact: https://mycdtfa.my.connect.aws/connect/contact-trace-records/details/$.ContactLens.PostCall.ContactId\n\nProfanity was used in this call by the agent.", contentType: "PLAIN_TEXT", deliveryMethod: "EMAIL", recipient: { userArns: ["arn:aws:connect:us-west-2:059586875367:instance/e2511377-f263-44a1-b4ca-d2cdbcf28a97/agent/2efa1a30-ce32-4490-99f8-da641b852921", "arn:aws:connect:us-west-2:059586875367:instance/e2511377-f263-44a1-b4ca-d2cdbcf28a97/agent/4f50d50b-136d-457c-b18c-ceaa93154e2d", "arn:aws:connect:us-west-2:059586875367:instance/e2511377-f263-44a1-b4ca-d2cdbcf28a97/agent/f3ef1b46-5f0e-4b6b-aa03-bfc6d54d9412"] } as any, subject: "STF COL Agent Profanity Rule Notification - $.ContactLens.PostCall.Agent.Name", }],
      },
      publishStatus: "PUBLISHED",
    });

    const ProfanitySTFRLS = new connect.CfnRule(this, 'ProfanitySTFRLS', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "Profanity_STF_RLS",
      triggerEventSource: { eventSourceName: "OnPostCallAnalysisAvailable" },
      function: "{\"Version\":\"2022-11-25\",\"RuleFunction\":{\"Operator\":\"AND\",\"Operands\":[{\"Operator\":\"CONTAINS_ANY\",\"Operands\":[[{\"Type\":\"PLAIN\",\"Value\":\"fuck\"}],[{\"Type\":\"PLAIN\",\"Value\":\"shit\"}],[{\"Type\":\"PLAIN\",\"Value\":\"bitch\"}],[{\"Type\":\"PLAIN\",\"Value\":\"asshole\"}],[{\"Type\":\"PLAIN\",\"Value\":\"motherfucker\"}],[{\"Type\":\"PLAIN\",\"Value\":\"cunt\"}],[{\"Type\":\"PLAIN\",\"Value\":\"bullshit\"}],[{\"Type\":\"PLAIN\",\"Value\":\"fucking\"}]],\"ComparisonValue\":\"$.ContactLens.PostCall.PatternMatch.Transcript\",\"FilterClause\":{\"LogicOperator\":\"AND\",\"Filters\":[{\"Type\":\"ParticipantRole\",\"Data\":\"AGENT\"},{\"Type\":\"PatternMatchLanguageFilter\",\"Data\":\"EN\"}]},\"Negate\":false},{\"Operator\":\"CONTAINS_ANY\",\"Operands\":[\"ba2918ce-1459-481d-ad1b-96eb1c3bf998\",\"55d1cfa9-625b-428b-8d3d-ff49d64e3413\",\"460ad546-9921-4ade-935a-c593e9c97bd0\",\"0286115d-610d-4c0f-b247-4f864c57ccec\",\"c48bfd88-e4f7-4ada-a75a-d0fe04ae6ee4\",\"a67f9727-d0b0-40e7-964d-ff4cae595d8f\",\"4ff8ac9e-89b8-4b93-bd60-79f0c6716fdd\",\"06c042ed-7da9-4bb1-b33c-f54333dcb195\",\"a397923a-7e44-4a6f-b7ec-829ffc5c8c81\",\"9800bb46-39c1-46f0-9250-b7f868a0261f\",\"2eed431a-9b1a-4086-af4c-fec1a89da7ef\",\"739b35f6-c11a-4381-ab50-b32f9cb20288\",\"b69dd4a2-aee1-45cf-b43f-86215c8ebad4\",\"f7d5dedf-e152-4240-9a5d-e38fbdb7eb26\"],\"ComparisonValue\":\"$.ContactLens.PostCall.Queue.QueueId\",\"Negate\":false}]}}",
      actions: {
        assignContactCategoryActions: [{}],
        sendNotificationActions: [{ content: "This notification from Amazon Connect is for contact Id: $.ContactLens.PostCall.ContactId\n\nView contact: https://mycdtfa.my.connect.aws/connect/contact-trace-records/details/$.ContactLens.PostCall.ContactId\n\nProfanity was used in this call by the agent.", contentType: "PLAIN_TEXT", deliveryMethod: "EMAIL", recipient: { userArns: ["arn:aws:connect:us-west-2:059586875367:instance/e2511377-f263-44a1-b4ca-d2cdbcf28a97/agent/1fcf2ab7-2798-4b45-87bc-01055978d2d8", "arn:aws:connect:us-west-2:059586875367:instance/e2511377-f263-44a1-b4ca-d2cdbcf28a97/agent/4cc63438-a629-44cd-8951-25f01bd948a7", "arn:aws:connect:us-west-2:059586875367:instance/e2511377-f263-44a1-b4ca-d2cdbcf28a97/agent/655300b5-d807-4ebc-a37c-86271d19055c"] } as any, subject: "STF RLS Agent Profanity Rule Notification - $.ContactLens.PostCall.Agent.Name", }],
      },
      publishStatus: "PUBLISHED",
    });

    const HoldMetricsThresholdRule = new connect.CfnRule(this, 'HoldMetricsThresholdRule', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "Hold_Metrics_Threshold_Rule",
      triggerEventSource: { eventSourceName: "OnPostCallAnalysisAvailable" },
      function: "{\"Version\":\"2022-11-25\",\"RuleFunction\":{\"Operator\":\"OR\",\"Operands\":[{\"Operator\":\"NumberGreaterOrEqualTo\",\"Operands\":[3],\"ComparisonValue\":\"$.ContactLens.PostCall.Agent.NumberOfHolds\",\"Negate\":false},{\"Operator\":\"NumberGreaterOrEqualTo\",\"Operands\":[120],\"ComparisonValue\":\"$.ContactLens.PostCall.Agent.LongestHoldDurationSecs\",\"Negate\":false},{\"Operator\":\"NumberGreaterOrEqualTo\",\"Operands\":[240],\"ComparisonValue\":\"$.ContactLens.PostCall.Agent.CustomerHoldDurationSecs\",\"Negate\":false}]}}",
      actions: {
        assignContactCategoryActions: [{}],
      },
      publishStatus: "PUBLISHED",
    });

    const AccountNumberEnteredSpanish = new connect.CfnRule(this, 'AccountNumberEnteredSpanish', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "AccountNumberEnteredSpanish",
      triggerEventSource: { eventSourceName: "OnPostCallAnalysisAvailable" },
      function: "{\"Version\":\"2022-11-25\",\"RuleFunction\":{\"Operator\":\"OR\",\"Operands\":[{\"Operator\":\"CONTAINS_ANY\",\"Operands\":[\"veo que a ingresado el número de cuenta\",\"Mostrar el número de cuenta\"],\"ComparisonValue\":\"$.ContactLens.PostCall.ExactMatch.Transcript\",\"FilterClause\":{\"LogicOperator\":\"AND\",\"Filters\":[{\"Type\":\"PostCallContactPeriodSeconds\",\"Data\":{\"First\":20}},{\"Type\":\"ParticipantRole\",\"Data\":\"AGENT\"}]},\"Negate\":false},{\"Operator\":\"CONTAINS_ANY\",\"Operands\":[[{\"Type\":\"PLAIN\",\"Value\":\"veo que a ingresado el número de cuenta\"}],[{\"Type\":\"PLAIN\",\"Value\":\"Mostrar el número de cuenta\"}]],\"ComparisonValue\":\"$.ContactLens.PostCall.PatternMatch.Transcript\",\"FilterClause\":{\"LogicOperator\":\"AND\",\"Filters\":[{\"Type\":\"PostCallContactPeriodSeconds\",\"Data\":{\"First\":20}},{\"Type\":\"ParticipantRole\",\"Data\":\"AGENT\"},{\"Type\":\"PatternMatchLanguageFilter\",\"Data\":\"ES\"}]},\"Negate\":false}]}}",
      actions: {
        assignContactCategoryActions: [{}],
      },
      publishStatus: "PUBLISHED",
    });

    const CoveredBatteryEmbeddedWasteRecycling = new connect.CfnRule(this, 'CoveredBatteryEmbeddedWasteRecycling', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "Covered_Battery-Embedded_Waste_Recycling",
      triggerEventSource: { eventSourceName: "OnPostCallAnalysisAvailable" },
      function: "{\"Version\":\"2022-11-25\",\"RuleFunction\":{\"Operator\":\"OR\",\"Operands\":[{\"Operator\":\"EQUALS\",\"Operands\":[\"The customer had questions about covered battery-embedded waste recycling fee accounts.\"],\"ComparisonValue\":\"$.ContactLens.PostCall.SemanticMatch.Phrase\",\"Negate\":false},{\"Operator\":\"CONTAINS_ANY\",\"Operands\":[\"covered battery\",\"covered battery-embedded\",\"CBE\"],\"ComparisonValue\":\"$.ContactLens.PostCall.SemanticMatch.Transcript\",\"FilterClause\":{\"LogicOperator\":\"AND\",\"Filters\":[{\"Type\":\"ParticipantRole\",\"Data\":\"ANY\"}]},\"Negate\":false}]}}",
      actions: {
        assignContactCategoryActions: [{}],
      },
      publishStatus: "PUBLISHED",
    });

    const ClosingOtherQuestionsSpanish = new connect.CfnRule(this, 'ClosingOtherQuestionsSpanish', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "ClosingOtherQuestionsSpanish",
      triggerEventSource: { eventSourceName: "OnPostCallAnalysisAvailable" },
      function: "{\"Version\":\"2022-11-25\",\"RuleFunction\":{\"Operator\":\"OR\",\"Operands\":[{\"Operator\":\"CONTAINS_ANY\",\"Operands\":[\"Tiene alguna otra pregunta el día de hoy?\",\"Hay algo más en lo que pueda ayudarle?\",\"Puedo ayudarte con algo más?\"],\"ComparisonValue\":\"$.ContactLens.PostCall.ExactMatch.Transcript\",\"FilterClause\":{\"LogicOperator\":\"AND\",\"Filters\":[{\"Type\":\"ParticipantRole\",\"Data\":\"AGENT\"}]},\"Negate\":false},{\"Operator\":\"CONTAINS_ANY\",\"Operands\":[[{\"Type\":\"PLAIN\",\"Value\":\"Tiene alguna otra pregunta el día de hoy?\"}],[{\"Type\":\"PLAIN\",\"Value\":\"Hay algo más en lo que pueda ayudarle?\"}],[{\"Type\":\"PLAIN\",\"Value\":\"Puedo ayudarte con algo más?\"}]],\"ComparisonValue\":\"$.ContactLens.PostCall.PatternMatch.Transcript\",\"FilterClause\":{\"LogicOperator\":\"AND\",\"Filters\":[{\"Type\":\"ParticipantRole\",\"Data\":\"AGENT\"},{\"Type\":\"PatternMatchLanguageFilter\",\"Data\":\"ES\"}]},\"Negate\":false}]}}",
      actions: {
        assignContactCategoryActions: [{}],
      },
      publishStatus: "PUBLISHED",
    });

    const NoResponseFromCaller = new connect.CfnRule(this, 'NoResponseFromCaller', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "NoResponseFromCaller",
      triggerEventSource: { eventSourceName: "OnPostCallAnalysisAvailable" },
      function: "{\"Version\":\"2022-11-25\",\"RuleFunction\":{\"Operator\":\"OR\",\"Operands\":[{\"Operator\":\"CONTAINS_ANY\",\"Operands\":[\"are you there?\",\"can you hear me?\",\"I unfortunately cannot hear you\"],\"ComparisonValue\":\"$.ContactLens.PostCall.ExactMatch.Transcript\",\"FilterClause\":{\"LogicOperator\":\"AND\",\"Filters\":[{\"Type\":\"PostCallContactPeriodSeconds\",\"Data\":{\"First\":60}},{\"Type\":\"ParticipantRole\",\"Data\":\"AGENT\"}]},\"Negate\":false},{\"Operator\":\"CONTAINS_ANY\",\"Operands\":[\"are you there?\",\"can you hear me?\",\"I unfortunately cannot hear you\"],\"ComparisonValue\":\"$.ContactLens.PostCall.SemanticMatch.Transcript\",\"FilterClause\":{\"LogicOperator\":\"AND\",\"Filters\":[{\"Type\":\"ParticipantRole\",\"Data\":\"AGENT\"}]},\"Negate\":false}]}}",
      actions: {
        assignContactCategoryActions: [{}],
      },
      publishStatus: "PUBLISHED",
    });

    const AgentInterruptsCustomerX3 = new connect.CfnRule(this, 'AgentInterruptsCustomerX3', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "Agent_Interrupts_CustomerX3",
      triggerEventSource: { eventSourceName: "OnPostCallAnalysisAvailable" },
      function: "{\"Version\":\"2022-11-25\",\"RuleFunction\":{\"Operator\":\"AND\",\"Operands\":[{\"Operator\":\"NumberGreaterOrEqualTo\",\"Operands\":[3],\"ComparisonValue\":\"$.ContactLens.PostCall.Interruptions.Instances\",\"Negate\":false,\"FilterClause\":{\"LogicOperator\":\"AND\",\"Filters\":[{\"Type\":\"Interaction\",\"Data\":\"AGENT_INTERACTION\"}]}}]}}",
      actions: {
        assignContactCategoryActions: [{}],
      },
      publishStatus: "PUBLISHED",
    });

    const HappyToHelp = new connect.CfnRule(this, 'HappyToHelp', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "HappyToHelp",
      triggerEventSource: { eventSourceName: "OnPostCallAnalysisAvailable" },
      function: "{\"Version\":\"2022-11-25\",\"RuleFunction\":{\"Operator\":\"OR\",\"Operands\":[{\"Operator\":\"CONTAINS_ANY\",\"Operands\":[\"Glad I could help resolve all your questions\",\"Happy I could help resolve all your questions\",\"I am glad I was able to help\",\"I am happy I could help\"],\"ComparisonValue\":\"$.ContactLens.PostCall.ExactMatch.Transcript\",\"FilterClause\":{\"LogicOperator\":\"AND\",\"Filters\":[{\"Type\":\"ParticipantRole\",\"Data\":\"AGENT\"}]},\"Negate\":false},{\"Operator\":\"CONTAINS_ANY\",\"Operands\":[\"Glad I could help resolve all your questions\",\"Happy I could help resolve all your questions\",\"I am glad I was able to help\",\"I am happy I could help\"],\"ComparisonValue\":\"$.ContactLens.PostCall.SemanticMatch.Transcript\",\"FilterClause\":{\"LogicOperator\":\"AND\",\"Filters\":[{\"Type\":\"ParticipantRole\",\"Data\":\"AGENT\"}]},\"Negate\":false}]}}",
      actions: {
        assignContactCategoryActions: [{}],
      },
      publishStatus: "PUBLISHED",
    });

    const ProfanitySTFRPS = new connect.CfnRule(this, 'ProfanitySTFRPS', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "Profanity_STF_RPS",
      triggerEventSource: { eventSourceName: "OnPostCallAnalysisAvailable" },
      function: "{\"Version\":\"2022-11-25\",\"RuleFunction\":{\"Operator\":\"AND\",\"Operands\":[{\"Operator\":\"CONTAINS_ANY\",\"Operands\":[[{\"Type\":\"PLAIN\",\"Value\":\"fuck\"}],[{\"Type\":\"PLAIN\",\"Value\":\"shit\"}],[{\"Type\":\"PLAIN\",\"Value\":\"bitch\"}],[{\"Type\":\"PLAIN\",\"Value\":\"asshole\"}],[{\"Type\":\"PLAIN\",\"Value\":\"motherfucker\"}],[{\"Type\":\"PLAIN\",\"Value\":\"cunt\"}],[{\"Type\":\"PLAIN\",\"Value\":\"bullshit\"}],[{\"Type\":\"PLAIN\",\"Value\":\"fucking\"}]],\"ComparisonValue\":\"$.ContactLens.PostCall.PatternMatch.Transcript\",\"FilterClause\":{\"LogicOperator\":\"AND\",\"Filters\":[{\"Type\":\"ParticipantRole\",\"Data\":\"AGENT\"},{\"Type\":\"PatternMatchLanguageFilter\",\"Data\":\"EN\"}]},\"Negate\":false},{\"Operator\":\"CONTAINS_ANY\",\"Operands\":[\"a9faaa08-e0a6-474a-8fa7-c2c99313d38a\",\"efbaab53-eef8-4925-8134-6f3b289128b4\",\"5b1c90e8-43d6-4734-925e-9ea7aa633647\",\"e97130a3-d5a2-4254-a868-78098662f819\",\"5ff44e5f-fbe3-4871-93d0-117f2d6ed0c0\",\"3560faf9-8614-4ce1-a8b0-3efae712ac47\",\"680d2904-98fc-461e-8f74-b68824457ec4\",\"4a0d9546-1ef2-4ea3-8d5a-b1bda6b8420e\",\"64e1db15-7f21-4a7a-ada0-03188466f63e\",\"15ca2db6-9595-4675-b7e9-72bea9704115\",\"e79f6907-4e0b-45dc-9e27-c087096a1118\",\"42e49fa1-fa14-41aa-8531-3c233e8a9288\",\"86991be4-a9fe-4372-8756-2a3d34bd00e2\",\"ad400d34-d02d-427a-a912-f7a1e76f0ad7\"],\"ComparisonValue\":\"$.ContactLens.PostCall.Queue.QueueId\",\"Negate\":false}]}}",
      actions: {
        assignContactCategoryActions: [{}],
        sendNotificationActions: [{ content: "This notification from Amazon Connect is for contact Id: $.ContactLens.PostCall.ContactId\n\nView contact: https://mycdtfa.my.connect.aws/connect/contact-trace-records/details/$.ContactLens.PostCall.ContactId\n\nProfanity was used in this call by the agent.", contentType: "PLAIN_TEXT", deliveryMethod: "EMAIL", recipient: { userArns: ["arn:aws:connect:us-west-2:059586875367:instance/e2511377-f263-44a1-b4ca-d2cdbcf28a97/agent/1fcf2ab7-2798-4b45-87bc-01055978d2d8", "arn:aws:connect:us-west-2:059586875367:instance/e2511377-f263-44a1-b4ca-d2cdbcf28a97/agent/4cc63438-a629-44cd-8951-25f01bd948a7", "arn:aws:connect:us-west-2:059586875367:instance/e2511377-f263-44a1-b4ca-d2cdbcf28a97/agent/655300b5-d807-4ebc-a37c-86271d19055c"] } as any, subject: "STF RPS Agent Profanity Rule Notification - $.ContactLens.PostCall.Agent.Name", }],
      },
      publishStatus: "PUBLISHED",
    });

    const Wildfires = new connect.CfnRule(this, 'Wildfires', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "Wildfires",
      triggerEventSource: { eventSourceName: "OnPostCallAnalysisAvailable" },
      function: "{\"Version\":\"2022-11-25\",\"RuleFunction\":{\"Operator\":\"AND\",\"Operands\":[{\"Operator\":\"EQUALS\",\"Operands\":[\"The customer stated they were impacted by wildfires\"],\"ComparisonValue\":\"$.ContactLens.PostCall.SemanticMatch.Phrase\",\"Negate\":false}]}}",
      actions: {
        assignContactCategoryActions: [{}],
      },
      publishStatus: "PUBLISHED",
    });

    const PasswordAssistance = new connect.CfnRule(this, 'PasswordAssistance', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "Password_Assistance",
      triggerEventSource: { eventSourceName: "OnPostCallAnalysisAvailable" },
      function: "{\"Version\":\"2022-11-25\",\"RuleFunction\":{\"Operator\":\"AND\",\"Operands\":[{\"Operator\":\"EQUALS\",\"Operands\":[\"The customer needed assistance with a password.\"],\"ComparisonValue\":\"$.ContactLens.PostCall.SemanticMatch.Phrase\",\"Negate\":false}]}}",
      actions: {
        assignContactCategoryActions: [{}],
      },
      publishStatus: "PUBLISHED",
    });

    const ProfanitySpanish = new connect.CfnRule(this, 'ProfanitySpanish', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "Profanity_Spanish",
      triggerEventSource: { eventSourceName: "OnPostCallAnalysisAvailable" },
      function: "{\"Version\":\"2022-11-25\",\"RuleFunction\":{\"Operator\":\"AND\",\"Operands\":[{\"Operator\":\"CONTAINS_ANY\",\"Operands\":[[{\"Type\":\"PLAIN\",\"Value\":\"joder\"}],[{\"Type\":\"PLAIN\",\"Value\":\"mierda\"}],[{\"Type\":\"PLAIN\",\"Value\":\"puta\"}],[{\"Type\":\"PLAIN\",\"Value\":\"puto\"}],[{\"Type\":\"PLAIN\",\"Value\":\"cabron\"}],[{\"Type\":\"PLAIN\",\"Value\":\"chinga tu madre\"}],[{\"Type\":\"PLAIN\",\"Value\":\"hijo de puta\"}],[{\"Type\":\"PLAIN\",\"Value\":\"pendejo\"}],[{\"Type\":\"PLAIN\",\"Value\":\"pendeja\"}],[{\"Type\":\"PLAIN\",\"Value\":\"chingar\"}],[{\"Type\":\"PLAIN\",\"Value\":\"chingate\"}],[{\"Type\":\"PLAIN\",\"Value\":\"pinche\"}]],\"ComparisonValue\":\"$.ContactLens.PostCall.PatternMatch.Transcript\",\"FilterClause\":{\"LogicOperator\":\"AND\",\"Filters\":[{\"Type\":\"ParticipantRole\",\"Data\":\"AGENT\"},{\"Type\":\"PatternMatchLanguageFilter\",\"Data\":\"ES\"}]},\"Negate\":false},{\"Operator\":\"CONTAINS_ANY\",\"Operands\":[\"69940ff8-f3bd-41c6-a407-8570e58bbd08\",\"98360ddf-babf-45aa-bd80-3c7f23613b6e\",\"2b75020e-418e-4001-a8a7-a0dee577a44b\"],\"ComparisonValue\":\"$.ContactLens.PostCall.Queue.QueueId\",\"Negate\":false}]}}",
      actions: {
        assignContactCategoryActions: [{}],
        sendNotificationActions: [{ content: "This notification from Amazon Connect is for contact Id: $.ContactLens.PostCall.ContactId\n\nView contact: https://mycdtfa.my.connect.aws/connect/contact-trace-records/details/$.ContactLens.PostCall.ContactId", contentType: "PLAIN_TEXT", deliveryMethod: "EMAIL", recipient: { userArns: ["arn:aws:connect:us-west-2:059586875367:instance/e2511377-f263-44a1-b4ca-d2cdbcf28a97/agent/8ffd967e-72e5-4dfc-85c0-7bd80d919075", "arn:aws:connect:us-west-2:059586875367:instance/e2511377-f263-44a1-b4ca-d2cdbcf28a97/agent/c92715d8-e928-40f6-aa52-7850186a6058"] } as any, subject: "Agent Profanity Rule Spanish: $.ContactLens.PostCall.Agent.Name", }],
      },
      publishStatus: "PUBLISHED",
    });

    const NoFurtherQuestions = new connect.CfnRule(this, 'NoFurtherQuestions', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "NoFurtherQuestions",
      triggerEventSource: { eventSourceName: "OnPostCallAnalysisAvailable" },
      function: "{\"Version\":\"2022-11-25\",\"RuleFunction\":{\"Operator\":\"OR\",\"Operands\":[{\"Operator\":\"CONTAINS_ANY\",\"Operands\":[\"Since you have no further questions\",\"if there are no further questions\",\"as you have no further questions\",\"Since there are no further questions\"],\"ComparisonValue\":\"$.ContactLens.PostCall.ExactMatch.Transcript\",\"FilterClause\":{\"LogicOperator\":\"AND\",\"Filters\":[{\"Type\":\"ParticipantRole\",\"Data\":\"AGENT\"}]},\"Negate\":false},{\"Operator\":\"CONTAINS_ANY\",\"Operands\":[\"Since you have no further questions\",\"if there are no further questions\",\"as you have no further questions\",\"Since there are no further questions\"],\"ComparisonValue\":\"$.ContactLens.PostCall.SemanticMatch.Transcript\",\"FilterClause\":{\"LogicOperator\":\"AND\",\"Filters\":[{\"Type\":\"ParticipantRole\",\"Data\":\"AGENT\"}]},\"Negate\":false}]}}",
      actions: {
        assignContactCategoryActions: [{}],
      },
      publishStatus: "PUBLISHED",
    });

    const NoFurtherQuestionsSpanish = new connect.CfnRule(this, 'NoFurtherQuestionsSpanish', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "NoFurtherQuestionsSpanish",
      triggerEventSource: { eventSourceName: "OnPostCallAnalysisAvailable" },
      function: "{\"Version\":\"2022-11-25\",\"RuleFunction\":{\"Operator\":\"OR\",\"Operands\":[{\"Operator\":\"CONTAINS_ANY\",\"Operands\":[\"Ya que no tiene más preguntas hoy\",\"Si no hay más preguntas\",\"ya que no tienes más preguntas\"],\"ComparisonValue\":\"$.ContactLens.PostCall.ExactMatch.Transcript\",\"FilterClause\":{\"LogicOperator\":\"AND\",\"Filters\":[{\"Type\":\"ParticipantRole\",\"Data\":\"AGENT\"}]},\"Negate\":false},{\"Operator\":\"CONTAINS_ANY\",\"Operands\":[[{\"Type\":\"PLAIN\",\"Value\":\"Ya que no tiene más preguntas hoy\"}],[{\"Type\":\"PLAIN\",\"Value\":\"Si no hay más preguntas\"}],[{\"Type\":\"PLAIN\",\"Value\":\"ya que no tienes más preguntas\"}]],\"ComparisonValue\":\"$.ContactLens.PostCall.PatternMatch.Transcript\",\"FilterClause\":{\"LogicOperator\":\"AND\",\"Filters\":[{\"Type\":\"ParticipantRole\",\"Data\":\"AGENT\"},{\"Type\":\"PatternMatchLanguageFilter\",\"Data\":\"ES\"}]},\"Negate\":false}]}}",
      actions: {
        assignContactCategoryActions: [{}],
      },
      publishStatus: "PUBLISHED",
    });

    const HazardousWaste = new connect.CfnRule(this, 'HazardousWaste', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "Hazardous_Waste",
      triggerEventSource: { eventSourceName: "OnPostCallAnalysisAvailable" },
      function: "{\"Version\":\"2022-11-25\",\"RuleFunction\":{\"Operator\":\"OR\",\"Operands\":[{\"Operator\":\"EQUALS\",\"Operands\":[\"The customer had questions regarding hazardous waste\"],\"ComparisonValue\":\"$.ContactLens.PostCall.SemanticMatch.Phrase\",\"Negate\":false}]}}",
      actions: {
        assignContactCategoryActions: [{}],
      },
      publishStatus: "PUBLISHED",
    });

    const AutomaticCBEvaluations = new connect.CfnRule(this, 'AutomaticCBEvaluations', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "AutomaticCBEvaluations",
      triggerEventSource: { eventSourceName: "OnPostCallAnalysisAvailable" },
      function: "{\"Version\":\"2022-11-25\",\"RuleFunction\":{\"Operator\":\"OR\",\"Operands\":[{\"Operator\":\"CONTAINS_ANY\",\"Operands\":[\"5ca05302-cdf7-4530-b57d-835888742ed6\",\"ec71c60e-5c02-4dcd-8b77-e410fe022b29\",\"a35d8b83-e83b-499e-876a-832683647267\"],\"ComparisonValue\":\"$.ContactLens.PostCall.Queue.QueueId\",\"Negate\":false}]}}",
      actions: {
        assignContactCategoryActions: [{}],
        submitAutoEvaluationActions: [{ evaluationFormArn: arns.AutomatedEvaluationCallbacks }],
      },
      publishStatus: "PUBLISHED",
    });

    const Profanity = new connect.CfnRule(this, 'Profanity', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "Profanity",
      triggerEventSource: { eventSourceName: "OnPostCallAnalysisAvailable" },
      function: "{\"Version\":\"2022-11-25\",\"RuleFunction\":{\"Operator\":\"AND\",\"Operands\":[{\"Operator\":\"CONTAINS_ANY\",\"Operands\":[[{\"Type\":\"PLAIN\",\"Value\":\"fuck\"}],[{\"Type\":\"PLAIN\",\"Value\":\"shit\"}],[{\"Type\":\"PLAIN\",\"Value\":\"bitch\"}],[{\"Type\":\"PLAIN\",\"Value\":\"asshole\"}],[{\"Type\":\"PLAIN\",\"Value\":\"motherfucker\"}],[{\"Type\":\"PLAIN\",\"Value\":\"cunt\"}],[{\"Type\":\"PLAIN\",\"Value\":\"bullshit\"}],[{\"Type\":\"PLAIN\",\"Value\":\"fucking\"}]],\"ComparisonValue\":\"$.ContactLens.PostCall.PatternMatch.Transcript\",\"FilterClause\":{\"LogicOperator\":\"AND\",\"Filters\":[{\"Type\":\"ParticipantRole\",\"Data\":\"AGENT\"},{\"Type\":\"PatternMatchLanguageFilter\",\"Data\":\"EN\"}]},\"Negate\":false},{\"Operator\":\"CONTAINS_ANY\",\"Operands\":[\"4651ebea-8cc7-4890-8ede-b41c3ddd6436\",\"5ca05302-cdf7-4530-b57d-835888742ed6\",\"ec71c60e-5c02-4dcd-8b77-e410fe022b29\",\"69940ff8-f3bd-41c6-a407-8570e58bbd08\",\"03279fe4-11de-4625-aa4c-cba8885ef9b0\",\"a7390907-484b-465c-9908-6ed2d2a60e1b\",\"98360ddf-babf-45aa-bd80-3c7f23613b6e\",\"a35d8b83-e83b-499e-876a-832683647267\",\"61241469-f5e3-4fa7-a1d9-3c4fc3faf35a\"],\"ComparisonValue\":\"$.ContactLens.PostCall.Queue.QueueId\",\"Negate\":false}]}}",
      actions: {
        assignContactCategoryActions: [{}],
        sendNotificationActions: [{ content: "This notification from Amazon Connect is for contact Id: $.ContactLens.PostCall.ContactId\n\nView contact: https://mycdtfa.my.connect.aws/connect/contact-trace-records/details/$.ContactLens.PostCall.ContactId", contentType: "PLAIN_TEXT", deliveryMethod: "EMAIL", recipient: { userArns: ["arn:aws:connect:us-west-2:059586875367:instance/e2511377-f263-44a1-b4ca-d2cdbcf28a97/agent/8ffd967e-72e5-4dfc-85c0-7bd80d919075", "arn:aws:connect:us-west-2:059586875367:instance/e2511377-f263-44a1-b4ca-d2cdbcf28a97/agent/c92715d8-e928-40f6-aa52-7850186a6058"] } as any, subject: "Agent Profanity Rule Notification - $.ContactLens.PostCall.Agent.Name", }],
      },
      publishStatus: "PUBLISHED",
    });

    // TaskTemplate 'CSC General Referral TEST' — no target contact-flow ARN available, skipping

    // TaskTemplate 'CSC General Referral' — no target contact-flow ARN available, skipping

    // TaskTemplate 'CSC NCW: Returned Mail' — no target contact-flow ARN available, skipping

    // TaskTemplate 'CSC NCW: Closeout' — no target contact-flow ARN available, skipping

    const TestGeneralTask = new connect.CfnTaskTemplate(this, 'TestGeneralTask', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
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

    // TaskTemplate 'CSC NCW 345' — no target contact-flow ARN available, skipping

    const GeneralReferral = new connect.CfnView(this, 'GeneralReferral', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "General Referral",
      template: {"Head":{"Configuration":{"Layout":{"Columns":[12]}},"Title":"General Referral"},"Body":[{"_id":"Header_1","Type":"Header","Props":{"variant":"h1","description":"Use this form for general referrals to other sections"},"Content":["General Referral"]},{"_id":"Section_1","Type":"Section","Props":{"Heading":""},"Content":[{"_id":"FormInput_1","Type":"FormInput","Props":{"Label":"Account Number","Name":"input-1","DefaultValue":"xxx-xxxxxx","InputType":"text","Required":false,"HelperText":"Callers Account or Permit Number"},"Content":[]},{"_id":"Dropdown_1730413113338","Type":"Dropdown","Props":{"Label":"Verified","Name":"cdtfa-referral-verified_dropdown","DefaultValue":[""],"Options":[{"Label":"SSN/ITIN","Value":"SSN"},{"Label":"Drivers License / State ID","Value":"Drivers License State ID"},{"Label":"FEIN","Value":"FEIN"},{"Label":"Non-U.S. DL, ID or Passport","Value":"Non-U.S. DL, ID or Passport"},{"Label":"Confirmation Number","Value":"Confirmation Number"},{"Label":"Previous Return/Payment Info","Value":"Previous Return/Payment Info"},{"Label":"Other (Specify Below)","Value":"Other"}],"MultiSelect":false,"Clearable":false,"Required":false},"Content":[]},{"_id":"FormInput_1730412015166","Type":"FormInput","Props":{"Label":"Taxpayer's Name","Name":"cdtfa-referral-tp_name","DefaultValue":"First Name Last Name","InputType":"text","Required":false,"HelperText":"Taxpayer's Name format First Name Last Name or Company Name"},"Content":[]},{"_id":"FormInput_1730415460388","Type":"FormInput","Props":{"Label":"Verified Other (Specify)","Name":"Other_Specify","DefaultValue":"","InputType":"$.FormInput_1730415460388.InputType","Required":false,"HelperText":"Use this field if you checked \"Other\" in the Verified field"},"Content":[]},{"_id":"FormInput_1730412239542","Type":"FormInput","Props":{"Label":"Caller's Name","Name":"cdtfa-referral-caller_name","DefaultValue":"First Name Last Name","InputType":"text","Required":true,"HelperText":"Caller Name format First Name Last Name"},"Content":[]},{"_id":"Dropdown_1730412689726","Type":"Dropdown","Props":{"Label":"Caller's Title","Name":"cdtfa-referral-Caller_Title_Dropdown","DefaultValue":[""],"Options":[{"Label":"Owner","Value":"Owner"},{"Label":"Officer","Value":"Officer"},{"Label":"Partner","Value":"Partner"},{"Label":"Member (LLC)","Value":"Member_LLC"},{"Label":"Employee","Value":"Employee"},{"Label":"3rd Party (Verified)","Value":"3rd_Party"}],"MultiSelect":false,"Clearable":true,"Required":true},"Content":[]},{"_id":"FormInput_2","Type":"FormInput","Props":{"Label":"Caller's Telephone Number","Name":"input-1","DefaultValue":"xxx-xxx-xxxx","InputType":"tel","Required":true,"HelperText":"Callers Phone Number Format 800-400-7115"},"Content":[]},{"_id":"FormInput_1730413738893","Type":"FormInput","Props":{"Label":"Foreign Language","Name":"cdtfa-referral-foreign_language","DefaultValue":"","InputType":"text","Required":false,"HelperText":"If the caller requested a call back in a different language, enter it here."},"Content":[]},{"_id":"TextArea_1737075666296","Type":"TextArea","Props":{"Label":"Comments","Name":"Comments","DefaultValue":"","Required":true,"HelperText":"Enter the details of this General Referral","MaxLength":"2000"},"Content":[]},{"_id":"SubmitButton_1730415449185","Type":"SubmitButton","Props":{"Action":"ActionSelected","Label":"Submit General Referral","IconAlign":"left","IconName":"check"},"Content":[]}],"Configuration":{"Layout":{"Columns":["6","6"]}}}]},
      actions: ["ActionSelected"],
      
    });

    const WebcallFormView = new connect.CfnView(this, 'WebcallFormView', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "webcall-form-view",
      template: {"Head":{"Configuration":{"Layout":{"Columns":[12]}},"Title":"webcall-form-view"},"Body":[{"_id":"Header_1756935541871","Type":"Header","Props":{"variant":"h2","description":"Before you are connected to the CDTFA Customer Service Center at 1-800-400-7115, please provide us with your name and phone number."},"Content":["Call Us"]},{"_id":"FormInput_1756935946254","Type":"FormInput","Props":{"Label":"First Name","Name":"First-Name","DefaultValue":"","InputType":"text","Required":true,"HelperText":"Please enter your first name (required)","ValidationPattern":""},"Content":[]},{"_id":"FormInput_1756936036581","Type":"FormInput","Props":{"Label":"Last Name","Name":"Last-Name-webcall","DefaultValue":"","InputType":"text","Required":true,"HelperText":"Please enter your last name (required)","ValidationPattern":""},"Content":[]},{"_id":"FormInput_1756936175242","Type":"FormInput","Props":{"Label":"Phone Number","Name":"Phone-Number-Webcall","DefaultValue":"000-000-0000","InputType":"tel","Required":true,"HelperText":"Area Code & Phone Number (required)","ValidationPattern":"$.FormInput_1756936175242.ValidationPattern"},"Content":[]},{"_id":"SubmitButton_1756936792278","Type":"SubmitButton","Props":{"Action":"ActionSelected","Label":"Call","IconAlign":"left"},"Content":["Submit Button"]}]},
      actions: ["ActionSelected"],
      
    });

    const Testviewtodelete = new connect.CfnView(this, 'Testviewtodelete', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "testviewtodelete",
      template: {"Head":{"Configuration":{"Layout":{"Columns":[12]}},"Integrations":[],"Title":"testviewtodelete"},"Body":[{"_id":"AttributeSection_1766014236130","Type":"AttributeSection","Props":{"Items":[{"Label":"Default Label 1","Value":"Default Value 1"},{"Label":"Default Label 2","Value":"Default Value 2"},{"Label":"Default Label 3","Value":"Default Value 3"},{"Label":"Default Label 4","Value":"Default Value 4"}],"Columns":""},"Content":[],"Configuration":{"Layout":{"Columns":3}}},{"_id":"Button_1766014839235","Type":"Button","Props":{"Variant":"normal","IconName":"","IconAlign":"left","Action":"ActionSelected","Disabled":false},"Content":["Button"]}]},
      actions: ["ActionSelected"],
      
    });

    const AxyomAssistTest = new connect.CfnView(this, 'AxyomAssistTest', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "Axyom Assist Test",
      template: {"Head":{"Configuration":{"Layout":{"Columns":[12]}},"Title":"Axyom Assist Test"},"Body":[{"_id":"Container_1747154573772","Type":"Container","Props":{"HideBorder":false},"Content":[{"_id":"Application_1747154680668","Type":"Application","Props":{"AppIdentifier":"Axyom Assist Test","Path":"$.Application_1747154680668.Path"},"Content":[],"Configuration":{"Style":{"--application-height":"94vh"}}}],"Configuration":{"Style":{"--container-border-radius":"0px","--container-border-width":"0px","--container-footer-divider-width":"0px"},"Layout":{"Columns":"12","Align":"center"}}}]},
      actions: [],
      
    });

    const AxyomAssistTestV2 = new connect.CfnView(this, 'AxyomAssistTestV2', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "Axyom Assist Test v2",
      template: {"Head":{"Configuration":{"Layout":{"Columns":[12]}},"Integrations":[],"Title":"Axyom Assist Test v2"},"Body":[{"_id":"Application_1765996076302","Type":"Application","Props":{"AppIdentifier":"Axyom Assist Test","Path":"$.Application_1765996076302.Path"},"Content":[],"Configuration":{"Style":{"--application-height":"90dvh"}}},{"_id":"ExpandableSection_1765996333320","Type":"ExpandableSection","Props":{"header":"Customer Information","variant":"default"},"Content":[{"_id":"AttributeBar_1765996401712","Type":"AttributeBar","Props":{"Attributes":"$.AttributeBar_1765996401712.Attributes"},"Content":[]}]}]},
      actions: [],
      
    });

    const AxyomAssist = new connect.CfnView(this, 'AxyomAssist', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "Axyom Assist",
      template: {"Head":{"Configuration":{"Layout":{"Columns":[12]}},"Title":"Axyom Assist"},"Body":[{"_id":"Container_1755648379619","Type":"Container","Props":{"HideBorder":false},"Content":[{"_id":"Application_1755648544176","Type":"Application","Props":{"AppIdentifier":"Axyom Assist","Path":"$.Application_1755648544176.Path"},"Content":[],"Configuration":{"Style":{"--application-height":"94vH"}}}],"Configuration":{"Style":{"--container-border-radius":"0px","--container-border-width":"0px","--container-footer-divider-width":"0px"},"Layout":{"Columns":12,"Align":"center"}}}]},
      actions: [],
      
    });

    const AxyomAssistV2 = new connect.CfnView(this, 'AxyomAssistV2', {
      instanceArn: ConnectInstanceArnParam.valueAsString,
      name: "Axyom Assist v2",
      template: {"Head":{"Configuration":{"Layout":{"Columns":[12]}},"Integrations":[],"Title":"Axyom Assist v2"},"Body":[{"_id":"Application_1766093711875","Type":"Application","Props":{"AppIdentifier":"Axyom Assist","Path":"$.Application_1766093711875.Path"},"Content":[],"Configuration":{"Style":{"--application-height":"90dvh"}}},{"_id":"ExpandableSection_1766093750317","Type":"ExpandableSection","Props":{"header":"Customer Information","variant":"default"},"Content":[{"_id":"AttributeBar_1766093779032","Type":"AttributeBar","Props":{"Attributes":"$.AttributeBar_1766093779032.Attributes"},"Content":[]}]}]},
      actions: [],
      
    });

    // PredefinedAttribute 'cdtfa-connect-campaign-sms' — empty StringList, skipping (TODO: add values)

    const RickTest = new wisdom.CfnQuickResponse(this, 'RickTest', {
      knowledgeBaseArn: AmazonConnectQuickResponsesAe9d5df5598b5ba9A84d2697125b2da0.attrKnowledgeBaseArn,
      name: "_RickTest",
      content: { content: "Testing the link functionality \"here\" (https://www.yahoo.com)" } as any,
      contentType: "application/x.quickresponse;format=markdown",
      description: "Test for Rick",
      
      isActive: true,
      channels: ["Chat"],
      language: "en_US",
      
    });

    const ComentarioRetroalimentacin = new wisdom.CfnQuickResponse(this, 'ComentarioRetroalimentacin', {
      knowledgeBaseArn: AmazonConnectQuickResponsesAe9d5df5598b5ba9A84d2697125b2da0.attrKnowledgeBaseArn,
      name: "Comentario/Retroalimentación",
      content: { content: "Gracias por su(s) comentario(s). Constantemente buscamos mejorar nuestros servicios en línea y sus comentarios son muy importantes para nosotros. Por favor envíe sus sugerencias por \"correo electrónico\" (http://cdtfa.ca.gov/email/)." } as any,
      contentType: "application/x.quickresponse;format=markdown",
      
      shortcutKey: "Comentario",
      isActive: true,
      channels: ["Chat"],
      language: "en_US",
      
    });

    const Pub113SCuponesDescuentosReembolsos = new wisdom.CfnQuickResponse(this, 'Pub113SCuponesDescuentosReembolsos', {
      knowledgeBaseArn: AmazonConnectQuickResponsesAe9d5df5598b5ba9A84d2697125b2da0.attrKnowledgeBaseArn,
      name: "Pub 113-S – Cupones, Descuentos & Reembolsos",
      content: { content: "Por favor revise nuestra publicación 113-S, \"Coupons, Discounts and Rebates\" (https://www.cdtfa.ca.gov/formspubs/pub113-s/#discounts) que tiene información en inglés y español. Si tiene preguntas adicionales, por favor póngase en contacto con nosotros llamando al 1-800-400-7115 de lunes a viernes, de 7:30 a.m. a 5:00 p.m., hora del Pacífico (menos los días festivos estatales)." } as any,
      contentType: "application/x.quickresponse;format=markdown",
      
      shortcutKey: "Pub 113_SP",
      isActive: true,
      channels: ["Chat"],
      language: "en_US",
      
    });

    const ReenvoOtrasAgenciasEstatales = new wisdom.CfnQuickResponse(this, 'ReenvoOtrasAgenciasEstatales', {
      knowledgeBaseArn: AmazonConnectQuickResponsesAe9d5df5598b5ba9A84d2697125b2da0.attrKnowledgeBaseArn,
      name: "Reenvío – Otras Agencias Estatales",
      content: { content: "Para recibir asistencia con su pregunta, tiene que ponerse en contacto con la correspondiente agencia de impuestos estatal. Puede encontrar la información en inglés que necesita, por favor consulte la página web de la \"Federation of Tax Administrators\" (https://www.taxadmin.org/)." } as any,
      contentType: "application/x.quickresponse;format=markdown",
      
      shortcutKey: "OtraOfcEst",
      isActive: true,
      channels: ["Chat"],
      language: "en_US",
      
    });

    const Pub61Services = new wisdom.CfnQuickResponse(this, 'Pub61Services', {
      knowledgeBaseArn: AmazonConnectQuickResponsesAe9d5df5598b5ba9A84d2697125b2da0.attrKnowledgeBaseArn,
      name: "Pub 61 - Services",
      content: { content: "Services that do not include the sales of tangible personal property are generally not subject to sales or use tax. For a list of exemptions and exclusions, please refer to \"publication 61, Sales and Use Taxes: Tax Expenditures\" (http://www.cdtfa.ca.gov/formspubs/pub61.pdf). If you have any further questions, please contact us at 1-800-400-7115 weekdays between 7:30 a.m. and 5:00 p.m., Pacific time (except state holidays)." } as any,
      contentType: "application/x.quickresponse;format=markdown",
      
      shortcutKey: "Pub 61",
      isActive: true,
      channels: ["Chat"],
      language: "en_US",
      
    });

    const ReenvoDefensorDeDerechosDelContribuyente = new wisdom.CfnQuickResponse(this, 'ReenvoDefensorDeDerechosDelContribuyente', {
      knowledgeBaseArn: AmazonConnectQuickResponsesAe9d5df5598b5ba9A84d2697125b2da0.attrKnowledgeBaseArn,
      name: "Reenvío – Defensor de Derechos del Contribuyente",
      content: { content: "Usted puede contactar la \"Oficina del Defensor de los Derechos de los Contribuyentes\" (http://www.cdtfa.ca.gov/tra/) marcando el 1-916-324-2798 o el 1-888-324-2798 de lunes a viernes, de 7:30 a.m. a 5:00 p.m., hora del Pacífico (menos los días festivos estatales)." } as any,
      contentType: "application/x.quickresponse;format=markdown",
      
      shortcutKey: "Defensor",
      isActive: true,
      channels: ["Chat"],
      language: "en_US",
      
    });

    const CalGoldSP = new wisdom.CfnQuickResponse(this, 'CalGoldSP', {
      knowledgeBaseArn: AmazonConnectQuickResponsesAe9d5df5598b5ba9A84d2697125b2da0.attrKnowledgeBaseArn,
      name: "CalGold (SP)",
      content: { content: "Ciudades y condados pueden requerir que usted tramite una licencia de negocios para poder operar dentro de su jurisdicción. Para más información sobre permisos de negocios, por favor visite la página de internet de \"CalGold\" (https://calgold.ca.gov/).\nProbablemente tenga que contactar a los funcionarios de su ciudad o condado para determinar las licencias o permisos requeridos por su localidad." } as any,
      contentType: "application/x.quickresponse;format=markdown",
      
      shortcutKey: "CalGold_SP",
      isActive: true,
      channels: ["Chat"],
      language: "en_US",
      
    });

    const PreguntaPorCorreoElectrnicoYoLlamada = new wisdom.CfnQuickResponse(this, 'PreguntaPorCorreoElectrnicoYoLlamada', {
      knowledgeBaseArn: AmazonConnectQuickResponsesAe9d5df5598b5ba9A84d2697125b2da0.attrKnowledgeBaseArn,
      name: "Pregunta por correo electrónico y/o Llamada",
      content: { content: "Puede enviar sus preguntas por \"correo electrónico\" (https://www.cdtfa.ca.gov/email/). Sus preguntas serán referidas a la sección apropiada para que le respondan.\nTambién puede contactarnos llamando al 1-800-400-7115 de lunes a viernes de 7:30 a.m. a 5:00 p.m., hora del Pacífico (menos los días festivos estatales)." } as any,
      contentType: "application/x.quickresponse;format=markdown",
      
      shortcutKey: "CorreoElec",
      isActive: true,
      channels: ["Chat"],
      language: "en_US",
      
    });

    const InicioDeSesinConNombreDeUsuario = new wisdom.CfnQuickResponse(this, 'InicioDeSesinConNombreDeUsuario', {
      knowledgeBaseArn: AmazonConnectQuickResponsesAe9d5df5598b5ba9A84d2697125b2da0.attrKnowledgeBaseArn,
      name: "¿Inicio de sesión con nombre de usuario?",
      content: { content: "¿Puede entrar a su perfil de servicios en línea con su nombre de usuario y contraseña? Usted puede entrar a su perfil de Servicios en línea \"aquí\" (https://onlineservices.cdtfa.ca.gov/_/)." } as any,
      contentType: "application/x.quickresponse;format=markdown",
      
      shortcutKey: "NombreUsua",
      isActive: true,
      channels: ["Chat"],
      language: "en_US",
      
    });

    const MarketplaceCerrarCuentaCmoDeclarar12 = new wisdom.CfnQuickResponse(this, 'MarketplaceCerrarCuentaCmoDeclarar12', {
      knowledgeBaseArn: AmazonConnectQuickResponsesAe9d5df5598b5ba9A84d2697125b2da0.attrKnowledgeBaseArn,
      name: "Marketplace – Cerrar Cuenta/Cómo Declarar 1/2",
      content: { content: "La guía en inglés para el \"Marketplace Facilitator Act\" (https://www.cdtfa.ca.gov/industry/MPFAct.htm) tiene una sección muy completa que cubre la mayoría de las preguntas generales para aquellos negocios que operan con facilitadores de ventas por internet.\nSi usted hace ventas únicamente por facilitadores de ventas por internet y esa compañía está registrada con el CDTFA, usted puede cerrar su permiso de ventas desde el 30 de septiembre de 2019. Sin embargo, para los períodos para declarar del 1 de octubre de 2019 y después, usted puede reclamar una deducción bajo “Otras ventas no sujetas a impuestos”. Escoja “Ventas en el mercado” por el menú desplegable. Usted solamente podrá aplicar la deducción si hace negocios con facilitadores de ventas por internet que sean responsables de recolectar los impuestos para usted." } as any,
      contentType: "application/x.quickresponse;format=markdown",
      
      shortcutKey: "MP_Cerrar1",
      isActive: true,
      channels: ["Chat"],
      language: "en_US",
      
    });

    const MarketplaceDeduccin12 = new wisdom.CfnQuickResponse(this, 'MarketplaceDeduccin12', {
      knowledgeBaseArn: AmazonConnectQuickResponsesAe9d5df5598b5ba9A84d2697125b2da0.attrKnowledgeBaseArn,
      name: "Marketplace – Deducción 1/2",
      content: { content: "En su declaración del impuesto sobre las ventas y el uso, en la sección de deducciones, usted puede reclamar sus ventas por medio de facilitadores de ventas por internet como una deducción; en la sección “Otras deducciones no sujetas a impuestos”, escoja “Ventas en el mercado” por el menú desplegable. Usted solamente puede aplicar esta deducción si el facilitador de ventas por internet es quien colecta el impuesto para usted.\nLa guía para el \"Marketplace Facilitator Act\" (https://www.cdtfa.ca.gov/industry/MPFAct.htm) tiene con una sección muy completa que cubre la mayoría de las preguntas generales para aquellos negocios que operan con facilitadores de ventas por internet.\nSi tiene más preguntas, por favor póngase en contacto con nuestra Oficina de Estados Fuera de California, la cual se encarga de todos los asuntos relacionados con la ley conocido como el Marketplace Facilitator Act." } as any,
      contentType: "application/x.quickresponse;format=markdown",
      
      shortcutKey: "MP_DED_SP1",
      isActive: true,
      channels: ["Chat"],
      language: "en_US",
      
    });

    const ServiciosEnLneaNombreDeUsuarioOlvidado = new wisdom.CfnQuickResponse(this, 'ServiciosEnLneaNombreDeUsuarioOlvidado', {
      knowledgeBaseArn: AmazonConnectQuickResponsesAe9d5df5598b5ba9A84d2697125b2da0.attrKnowledgeBaseArn,
      name: "Servicios en Línea – Nombre de usuario olvidado",
      content: { content: "Usted puede recuperar su nombre de usuario seleccionando la opción: “¿Olvidó su nombre de usuario?” en nuestra página de \"servicios en línea\" (https://onlineservices.cdtfa.ca.gov/_/).\nSi tiene dificultades recuperando su nombre de usuario, por favor póngase en contacto con nosotros marcando el 1-800-400-7115 de lunes a viernes, de 7:30 a.m. a 5:00 p.m., hora del Pacífico (menos los días festivos estatales)." } as any,
      contentType: "application/x.quickresponse;format=markdown",
      
      shortcutKey: "UsuarioOlv",
      isActive: true,
      channels: ["Chat"],
      language: "en_US",
      
    });

    const RegistroCerrarCuenta = new wisdom.CfnQuickResponse(this, 'RegistroCerrarCuenta', {
      knowledgeBaseArn: AmazonConnectQuickResponsesAe9d5df5598b5ba9A84d2697125b2da0.attrKnowledgeBaseArn,
      name: "Registro – Cerrar Cuenta",
      content: { content: "Si usted ya no realiza ventas de propiedad personal tangible en California, lo mejor es que cierre su permiso de ventas.\nCon su nombre de usuario y contraseña, desde su perfil de servicios en línea, usted puede cerrar su permiso.\nUna vez que esté dentro de su perfil con su nombre de usuario y contraseña, siga los pasos a continuación para cerrar una cuenta:\n1. De la pestaña de “Cuentas,” seleccione la cuenta que desea cerrar.\n2. En la columna de “I Want to,” seleccione \"More.\"\n3. Haga clic en \"Account Closure.\"\n4. Siga las pantallas del sistema y envíe la solicitud.\nLa Publicación 74-S, \"Cómo Clausurar su Cuenta\" (http://www.cdtfa.ca.gov/formspubs/pub74s.pdf) contiene información necesaria para que usted cierre su permiso con el CDTFA correctamente. Esta publicación incluye el formulario \"CDTFA-65-S, Notificación de cierre\" (https://www.cdtfa.ca.gov/formspubs/cdtfa65s.pdf). Si usted no tiene un perfíl de servicios en línea, este formulario le ayudará a iniciar el proceso para cerrar su cuenta." } as any,
      contentType: "application/x.quickresponse;format=markdown",
      
      shortcutKey: "CerrarCuen",
      isActive: true,
      channels: ["Chat"],
      language: "en_US",
      
    });

    const ServiciosEnLneaCambioDeNombreLegal = new wisdom.CfnQuickResponse(this, 'ServiciosEnLneaCambioDeNombreLegal', {
      knowledgeBaseArn: AmazonConnectQuickResponsesAe9d5df5598b5ba9A84d2697125b2da0.attrKnowledgeBaseArn,
      name: "Servicios en Línea – Cambio de Nombre Legal",
      content: { content: "Primero, con su nombre de usuario y contraseña, entre a su perfil de \"servicios en línea\" (https://onlineservices.cdtfa.ca.gov/_/). Ahora, seleccione la pestaña “Customer Information.” Seleccione el nombre que desea cambiar. De ahí, a mano superior derecha, bajo el menú “I Want to,” escoja “Request to Change Legal Name” y siga las pantallas del sistema." } as any,
      contentType: "application/x.quickresponse;format=markdown",
      
      shortcutKey: "NombreLega",
      isActive: true,
      channels: ["Chat"],
      language: "en_US",
      
    });

    const RegistroActualizarDBAParaCuenta = new wisdom.CfnQuickResponse(this, 'RegistroActualizarDBAParaCuenta', {
      knowledgeBaseArn: AmazonConnectQuickResponsesAe9d5df5598b5ba9A84d2697125b2da0.attrKnowledgeBaseArn,
      name: "Registro – Actualizar DBA: Para Cuenta",
      content: { content: "Por favor siga estos pasos para actualizar el nombre DBA en su cuenta:\n1. Entre a su perfil de \"servicios en línea\" (https://onlineservices.cdtfa.ca.gov/_/) su nombre de usuario y contraseña.\n2. De la pestaña de “Cuentas” seleccione la cuenta que desea actualizar.\n3. Haga clic en la pestaña “Names and Addresses”.\n4. Bajo el título “Nombres de cuentas y direcciones,” haga clic en “Add,” o en el nombre DBA que ahí se muestre.\n5. Siga las pantallas del sistema para actualizar el nombre DBA y envíe su solicitud." } as any,
      contentType: "application/x.quickresponse;format=markdown",
      
      shortcutKey: "DBACuenta",
      isActive: true,
      channels: ["Chat"],
      language: "en_US",
      
    });

    const PagoPagoConNombreDeUsuario = new wisdom.CfnQuickResponse(this, 'PagoPagoConNombreDeUsuario', {
      knowledgeBaseArn: AmazonConnectQuickResponsesAe9d5df5598b5ba9A84d2697125b2da0.attrKnowledgeBaseArn,
      name: "Pago – Pago con Nombre de Usuario",
      content: { content: "Desde nuestro portal de Servicios en línea, después de entrar a su perfil con su nombre de usuario y contraseña, usted puede realizar pagos.\nPara empezar, siga estos pasos:\n1. Vaya a la página de \"Servicios en línea\" (https://onlineservices.cdtfa.ca.gov/_/) del CDTFA.\n2. Con su nombre de usuario y contraseña, entre a su cuenta.\n3. Haga clic en la cuenta de Impuesto sobre las ventas y el uso a la cual desea realizar un pago.\n4. Haga clic en el período para el pago.\n5. Haga clic en “Realicé un pago.”\n6. Seleccione su forma de pago (cuenta bancaria o tarjeta).\n7. Complete y envíe su pago." } as any,
      contentType: "application/x.quickresponse;format=markdown",
      
      shortcutKey: "PagoUsuar",
      isActive: true,
      channels: ["Chat"],
      language: "en_US",
      
    });

    const Registration = new wisdom.CfnQuickResponse(this, 'Registration', {
      knowledgeBaseArn: AmazonConnectQuickResponsesAe9d5df5598b5ba9A84d2697125b2da0.attrKnowledgeBaseArn,
      name: "Registration",
      content: { content: "The CDTFA requires persons engaging in the business of selling tangible personal property in California to obtain a seller’s permit. A seller’s permit is required for both retail and wholesale sales.\nYou may register for a seller's permit on our \"Online Services\" (https://onlineservices.cdtfa.ca.gov/_/) page. First, log in with your username and password, then select \"Register a New Business Activity\" under the \"I Want To\" menu." } as any,
      contentType: "application/x.quickresponse;format=markdown",
      
      shortcutKey: "Register",
      isActive: true,
      channels: ["Chat"],
      language: "en_US",
      
    });

    const PagoTransferenciaElectrnicaDeFondosEFTPreguntasFrecuentesFAQ = new wisdom.CfnQuickResponse(this, 'PagoTransferenciaElectrnicaDeFondosEFTPreguntasFrecuentesFAQ', {
      knowledgeBaseArn: AmazonConnectQuickResponsesAe9d5df5598b5ba9A84d2697125b2da0.attrKnowledgeBaseArn,
      name: "Pago – Transferencia Electrónica de Fondos (EFT) Preguntas Frecuentes (FAQ)",
      content: { content: "Este es el enlace para nuestra página en inglés con \"preguntas frecuentes sobre la transferencia de fondos electrónicos\" (https://www.cdtfa.ca.gov/services/eft-faq.htm) (EFT por sus siglas en inglés)." } as any,
      contentType: "application/x.quickresponse;format=markdown",
      
      shortcutKey: "EFT_SP",
      isActive: true,
      channels: ["Chat"],
      language: "en_US",
      
    });

    const RegistroActualizarNombreDBAEnLocacin = new wisdom.CfnQuickResponse(this, 'RegistroActualizarNombreDBAEnLocacin', {
      knowledgeBaseArn: AmazonConnectQuickResponsesAe9d5df5598b5ba9A84d2697125b2da0.attrKnowledgeBaseArn,
      name: "Registro – Actualizar Nombre DBA: En Locación",
      content: { content: "Por favor siga estos pasos para actualizar el nombre DBA en el sitio:\n1. Entre a su perfil de \"servicios en línea\" (https://onlineservices.cdtfa.ca.gov/_/) con su nombre de usuario y contraseña.\n2. De la pestaña de “Cuentas, seleccione la cuenta que quiere actualizar.\n3. De la columna “I Want To,” haga clic en “More.”\n4. Haga clic en “Add/Edit a Location Name.”\n5. Siga las pantallas del sistema para actualizar el nombre DBA y envíe su solicitud." } as any,
      contentType: "application/x.quickresponse;format=markdown",
      
      shortcutKey: "DBALocacn",
      isActive: true,
      channels: ["Chat"],
      language: "en_US",
      
    });

    const RegistroReorganizacin12 = new wisdom.CfnQuickResponse(this, 'RegistroReorganizacin12', {
      knowledgeBaseArn: AmazonConnectQuickResponsesAe9d5df5598b5ba9A84d2697125b2da0.attrKnowledgeBaseArn,
      name: "Registro - Reorganización 1/2",
      content: { content: "Si su negocio ha sido reorganizado a un nuevo tipo de entidad legal de negocios (propietario único a sociedad o corporación; corporación a sociedad o propietario único; corporación a compañía de responsabilidad limitada (LLC por sus siglas en inglés) usted debe cerrar su permiso de vendedor.\nDesde nuestra página de \"servicios en línea\" (https://onlineservices.cdtfa.ca.gov/_/), ingresando a su cuenta con su nombre de usuario y contraseña, usted puede cerrar su permiso de vendedor.\nUna vez que esté dentro de su perfil con su nombre de usuario y contraseña, siga los pasos a continuación para cerrar una cuenta:\n1. De la pestaña de “Cuentas,” seleccione la cuenta que desea cerrar.\n2. En la columna de “I Want to,” seleccione \"More.\"\n3. Haga clic en \"Account Closure.\"\n4. Siga las pantallas del sistema y envíe la solicitud." } as any,
      contentType: "application/x.quickresponse;format=markdown",
      
      shortcutKey: "Reorg_SP_1",
      isActive: true,
      channels: ["Chat"],
      language: "en_US",
      
    });

    const DeclaracinEnmienda = new wisdom.CfnQuickResponse(this, 'DeclaracinEnmienda', {
      knowledgeBaseArn: AmazonConnectQuickResponsesAe9d5df5598b5ba9A84d2697125b2da0.attrKnowledgeBaseArn,
      name: "Declaración – Enmienda",
      content: { content: "Si nota que alguna de sus declaraciones tiene un error, usted puede enmendar su declaración en línea siguiendo estos pasos:\n1. Vaya a la página de \"servicios en línea\" (https://onlineservices.cdtfa.ca.gov/_/).\n2. Ingrese a su perfil con su nombre de usuario y contraseña.\n3. Haga clic en la pestaña de \"Cuentas.\"\n4. Seleccione la cuenta de Impuesto sobre las ventas y el uso.\n5. Haga clic en el período que desea enmendar.\n6. En la sección de \"I Want To,\" haga clic en \"File, Amend, or Print a Return.\"\n7. Haga clic en \"Editar la presentación.\"\nSi lo prefiere, también puede enmendar la declaración en papel o, si su declaración fue presentada antes de Mayo 7, 2018, por favor visite la página de internet del CDTFA, \"Amend a Return\" (https://www.cdtfa.ca.gov/taxes-and-fees/amend-a-return.htm) para instrucciones en inglés." } as any,
      contentType: "application/x.quickresponse;format=markdown",
      
      shortcutKey: "Enmienda",
      isActive: true,
      channels: ["Chat"],
      language: "en_US",
      
    });

    const ImpuestoDeUsoComprasSujetasAlImpuestoDeUso = new wisdom.CfnQuickResponse(this, 'ImpuestoDeUsoComprasSujetasAlImpuestoDeUso', {
      knowledgeBaseArn: AmazonConnectQuickResponsesAe9d5df5598b5ba9A84d2697125b2da0.attrKnowledgeBaseArn,
      name: "Impuesto de Uso – Compras Sujetas al Impuesto de Uso",
      content: { content: "Por favor revise la publicación 110-S, \"Cuestiones básicas del Impuesto sobre el uso de California\" (https://www.cdtfa.ca.gov/formspubs/pub110-S/).  Si aún tiene preguntas, por favor póngase en contacto con nosotros marcando al 1-800-400-7115, de lunes a viernes, de 7:30 a.m. a 5:00 p.m., hora del Pacífico (menos los días festivos estatales)." } as any,
      contentType: "application/x.quickresponse;format=markdown",
      
      shortcutKey: "SujetasUso",
      isActive: true,
      channels: ["Chat"],
      language: "en_US",
      
    });

    const TasaDeImpuestoImpuestoDelDistrito = new wisdom.CfnQuickResponse(this, 'TasaDeImpuestoImpuestoDelDistrito', {
      knowledgeBaseArn: AmazonConnectQuickResponsesAe9d5df5598b5ba9A84d2697125b2da0.attrKnowledgeBaseArn,
      name: "Tasa de Impuesto – Impuesto del Distrito",
      content: { content: "El poseedor de un permiso de vendedor en California es responsable por recolectar el impuesto sobre las ventas por ventas entregadas en California. La tasa de impuesto sobre las ventas que se debe aplicar es la que se encuentre vigente en el lugar donde hace la entrega. Cuando y donde se haga el pago, es irrelevante.\nPara información sobre las tasas, por favor visite nuestra página de \"California City & County Sales & Use Tax Rates\" (https://www.cdtfa.ca.gov/taxes-and-fees/sales-use-tax-rates.htm) en inglés.\nPara información adicional, por favor consulte:\n• Publicación 44-S, \"Impuestos de distrito\" (https://www.cdtfa.ca.gov/formspubs/pub44-s.pdf)\n• Publicación 105-S, \"Impuestos de Distrito y Ventas Entregadas en California\" (https://www.cdtfa.ca.gov/formspubs/pub105-s/)" } as any,
      contentType: "application/x.quickresponse;format=markdown",
      
      shortcutKey: "TasaDistr",
      isActive: true,
      channels: ["Chat"],
      language: "en_US",
      
    });

    const ReturnPrintSubmittedReturn = new wisdom.CfnQuickResponse(this, 'ReturnPrintSubmittedReturn', {
      knowledgeBaseArn: AmazonConnectQuickResponsesAe9d5df5598b5ba9A84d2697125b2da0.attrKnowledgeBaseArn,
      name: "Return - Print Submitted Return",
      content: { content: "To access your return submission, please visit the \"CDTFA Online Services\" (https://onlineservices.cdtfa.ca.gov/_/) home page and click on “Retrieve a Saved Request” under the “Limited Access Functions” menu. The “Retrieve a Saved Request” function will display the return and give you the option to print even though you have already submitted it. If you still require assistance, please contact us at 1-800-400-7115 weekdays between 7:30 a.m. and 5:00 p.m., Pacific Time (except state holidays)." } as any,
      contentType: "application/x.quickresponse;format=markdown",
      
      shortcutKey: "Saved Ret",
      isActive: true,
      channels: ["Chat"],
      language: "en_US",
      
    });

    const SignUpNowRegister12 = new wisdom.CfnQuickResponse(this, 'SignUpNowRegister12', {
      knowledgeBaseArn: AmazonConnectQuickResponsesAe9d5df5598b5ba9A84d2697125b2da0.attrKnowledgeBaseArn,
      name: "Sign Up Now - Register 1/2",
      content: { content: "Online Services – Username and Password for Business Owners:\nIf you are a business owner, you can create a username to gain access to your account. To create your username, please visit the CDTFA \"Online Services\" (https://onlineservices.cdtfa.ca.gov/) home page and click on “Sign Up Now.\" For additional information about creating a username, please visit CDTFA’s Online Services \"Tutorials\" (https://www.cdtfa.ca.gov/services/#Tutorials) page and watch the “\"How to Create a Username and Password for Business Owners and Gain All Access\" (https://youtu.be/sMGgwE8lqVI)” video." } as any,
      contentType: "application/x.quickresponse;format=markdown",
      
      shortcutKey: "SignUpNow1",
      isActive: true,
      channels: ["Chat"],
      language: "en_US",
      
    });

    const PaymentVoucherReprint = new wisdom.CfnQuickResponse(this, 'PaymentVoucherReprint', {
      knowledgeBaseArn: AmazonConnectQuickResponsesAe9d5df5598b5ba9A84d2697125b2da0.attrKnowledgeBaseArn,
      name: "Payment - Voucher Reprint",
      content: { content: "Our system does not currently allow reprinting of payment vouchers. However, you may create a payment voucher to remit your payment. To create your payment voucher, include on a sheet of paper the following information:\n• Your account number\n• The name on the account\n• The type of payment (for example: Return Payment, Prepayment 1, Outstanding Balance etc.)\n•The period to apply the payment to\n• The payment amount\nPlease send the above with your check or money order to:\nCalifornia Department of Tax and Fee Administration\nPO Box 942879\nSacramento, CA 94279-0001\nNote: Remember to write your account number on your check or money order." } as any,
      contentType: "application/x.quickresponse;format=markdown",
      
      shortcutKey: "PmtVoucher",
      isActive: true,
      channels: ["Chat"],
      language: "en_US",
      
    });

    const SignUpNowRegister22 = new wisdom.CfnQuickResponse(this, 'SignUpNowRegister22', {
      knowledgeBaseArn: AmazonConnectQuickResponsesAe9d5df5598b5ba9A84d2697125b2da0.attrKnowledgeBaseArn,
      name: "Sign Up Now – Register 2/2",
      content: { content: "Online Services – Username and Password for Third Party:\nYou can create a username as a Third-Party Delegate (Tax Preparer/CPA, Representative, Employee, other) to gain access to an account. To create your username, please visit the CDTFA \"Online Services\" (https://onlineservices.cdtfa.ca.gov/) home page and click on Sign Up Now. For more information about creating a username, please visit CDTFA’s Online Services \"Tutorials\" (https://www.cdtfa.ca.gov/services/#Tutorials) page and watch the “\"How to Create a Username and Password for Third Party Access\" (https://youtu.be/sMGgwE8lqVI)” video." } as any,
      contentType: "application/x.quickresponse;format=markdown",
      
      shortcutKey: "SignUpNow2",
      isActive: true,
      channels: ["Chat"],
      language: "en_US",
      
    });

    const Pub18SOrganizacionesSinFinesDeLucro = new wisdom.CfnQuickResponse(this, 'Pub18SOrganizacionesSinFinesDeLucro', {
      knowledgeBaseArn: AmazonConnectQuickResponsesAe9d5df5598b5ba9A84d2697125b2da0.attrKnowledgeBaseArn,
      name: "Pub 18-S – Organizaciones sin Fines de Lucro",
      content: { content: "Aunque muchas organizaciones sin fines de lucro y organizaciones religiosas están exentas de pagar impuestos sobre el ingreso y la propiedad, generalmente sus compras de propiedad personal tangible están sujetas al impuesto sobre las ventas y el uso. Generalmente, las ventas de propiedad personal tangible por organizaciones religiosas, sin fines de lucro, y benéficas frecuentemente están sujetas al impuesto sobre las ventas.\nPara información adicional, por favor revise nuestra publicación 18-S, \"Organizaciones sin Fines de Lucro\" (http://www.cdtfa.ca.gov/formspubs/pub18-s.pdf). Si tiene preguntas adicionales, por favor póngase en contacto con nosotros llamando al 1-800-400-7115 de lunes a viernes, de 87:30 a.m. a 5:00 p.m., hora del Pacífico (menos los días festivos estatales)." } as any,
      contentType: "application/x.quickresponse;format=markdown",
      
      shortcutKey: "Pub 18_SP",
      isActive: true,
      channels: ["Chat"],
      language: "en_US",
      
    });

    const TasaDeImpuestoTasaLocalDeImpuesto = new wisdom.CfnQuickResponse(this, 'TasaDeImpuestoTasaLocalDeImpuesto', {
      knowledgeBaseArn: AmazonConnectQuickResponsesAe9d5df5598b5ba9A84d2697125b2da0.attrKnowledgeBaseArn,
      name: "Tasa de Impuesto – Tasa Local de Impuesto",
      content: { content: "En la página de internet del CDTFA contamos con \"tasas de impuesto vigentes e históricas\" (http://www.cdtfa.ca.gov/taxes-and-fees/rates.htm) .\nComo recurso adicional, contamos con una herramienta que le permite buscar el \"impuesto de ventas actual para una dirección específica.\" (https://maps.cdtfa.ca.gov/)" } as any,
      contentType: "application/x.quickresponse;format=markdown",
      
      shortcutKey: "TasaLocal",
      isActive: true,
      channels: ["Chat"],
      language: "en_US",
      
    });

    const Pub100CargosPorManejoYEnvoDeMercanca = new wisdom.CfnQuickResponse(this, 'Pub100CargosPorManejoYEnvoDeMercanca', {
      knowledgeBaseArn: AmazonConnectQuickResponsesAe9d5df5598b5ba9A84d2697125b2da0.attrKnowledgeBaseArn,
      name: "Pub 100 – Cargos por Manejo y Envío de Mercancía",
      content: { content: "Por favor revise publicación 100 en inglés, \"Shipping and Delivery Charges\" (https://www.cdtfa.ca.gov/formspubs/pub100/).  Si tiene preguntas adicionales, por favor póngase en contacto con nosotros llamando al 1-800-400-7115 de lunes a viernes, de 7:30 a.m. a 5:00 p.m., hora del Pacífico (menos los días festivos estatales)." } as any,
      contentType: "application/x.quickresponse;format=markdown",
      
      shortcutKey: "Pub 100_SP",
      isActive: true,
      channels: ["Chat"],
      language: "en_US",
      
    });

    const RegistroRecuperarUnBorrador = new wisdom.CfnQuickResponse(this, 'RegistroRecuperarUnBorrador', {
      knowledgeBaseArn: AmazonConnectQuickResponsesAe9d5df5598b5ba9A84d2697125b2da0.attrKnowledgeBaseArn,
      name: "Registro – Recuperar un Borrador",
      content: { content: "Para recuperar el borrador de su registro, por favor vaya a la página de \"servicios en línea del CDTFA\" (https://onlineservices.cdtfa.ca.gov/_/#2),). De la columna de “Registro” haga clic en \"Recupere un registro guardado. El sistema le pedirá que ingrese su correo electrónico y el código de confirmación que el sistema le dio cuando guardó su borrador.\nSi tiene dificultades para recuperar su registro, por favor llámenos al 1-800-400-7115 de lunes a viernes, de 7:30 a.m. a 5:00 p. m., hora del Pacífico (menos los días festivos estatales)." } as any,
      contentType: "application/x.quickresponse;format=markdown",
      
      shortcutKey: "RecuBorra",
      isActive: true,
      channels: ["Chat"],
      language: "en_US",
      
    });

    const RegistroSolicitudParaActualizarUnaCuenta = new wisdom.CfnQuickResponse(this, 'RegistroSolicitudParaActualizarUnaCuenta', {
      knowledgeBaseArn: AmazonConnectQuickResponsesAe9d5df5598b5ba9A84d2697125b2da0.attrKnowledgeBaseArn,
      name: "Registro – Solicitud para Actualizar una Cuenta",
      content: { content: "Desafortunadamente, no tengo acceso a ninguna cuenta por chat en línea. Por favor llámenos marcando el 1-800-400-7115 de lunes a viernes, de 7:03 a.m. a 5:00 p.m., hora del Pacífico (menos los días festivos estatales). Uno de nuestros representantes con gusto le atenderá.\nTambién puede llenar y enviar por correo postal el formulario \"CDTFA-345-WEB-S, Aviso de cambios en el negocio\" (https://www.cdtfa.ca.gov/formspubs/cdtfa345web-s.pdf), o puede hablar con un representante en su \"oficina local del CDTFA\" (https://www.cdtfa.ca.gov/office-locations-es.htm)." } as any,
      contentType: "application/x.quickresponse;format=markdown",
      
      shortcutKey: "Actualizar",
      isActive: true,
      channels: ["Chat"],
      language: "en_US",
      
    });

    const Reembolsos = new wisdom.CfnQuickResponse(this, 'Reembolsos', {
      knowledgeBaseArn: AmazonConnectQuickResponsesAe9d5df5598b5ba9A84d2697125b2da0.attrKnowledgeBaseArn,
      name: "Reembolsos",
      content: { content: "Para solicitar un reembolso por internet, debe contar con un perfil de servicios en línea que tenga acceso completo a todas las funciones del sistema.\n1. Ingrese su cuenta de \"servicios en línea\" (https://onlineservices.cdtfa.ca.gov/_/).\n2. Seleccione la cuenta sobre al cual está solicitando el reembolso en la pestaña “Cuentas.”\n3. Bajo la columna “I Want To,” haga clic en \"More.\"\n4. Haga clic en \"Submit a Claim for Refund.\"\nPor correo postal también puede solicitar un reembolso o crédito a su cuenta, usando el formulario CDTFA-101-S, \"Reclamo de reembolso o crédito\" (https://www.cdtfa.ca.gov/formspubs/cdtfa101-s.pdf)." } as any,
      contentType: "application/x.quickresponse;format=markdown",
      
      shortcutKey: "Reembolsos",
      isActive: true,
      channels: ["Chat"],
      language: "en_US",
      
    });

    const Pub52SVehculosYEmbarcaciones = new wisdom.CfnQuickResponse(this, 'Pub52SVehculosYEmbarcaciones', {
      knowledgeBaseArn: AmazonConnectQuickResponsesAe9d5df5598b5ba9A84d2697125b2da0.attrKnowledgeBaseArn,
      name: "Pub 52-S - Vehículos y Embarcaciones",
      content: { content: "Por favor revise nuestra publicación 52-S, \"Vehículos y embarcaciones: impuesto sobre el uso\" (https://cdtfa.ca.gov/formspubs/pub52-S.pdf). Si tiene preguntas adicionales, por favor póngase en contacto con nuestra sección del impuesto sobre el uso del consumidor llamando al 1-916-445-9524. Para hablar con un representante en español, oprima el número dos." } as any,
      contentType: "application/x.quickresponse;format=markdown",
      
      shortcutKey: "Pub 52_SP",
      isActive: true,
      channels: ["Chat"],
      language: "en_US",
      
    });

    const AlivioDePenalizacin = new wisdom.CfnQuickResponse(this, 'AlivioDePenalizacin', {
      knowledgeBaseArn: AmazonConnectQuickResponsesAe9d5df5598b5ba9A84d2697125b2da0.attrKnowledgeBaseArn,
      name: "Alivio de Penalización",
      content: { content: "Puede solicitar alivio de multas siguiendo estos pasos por el internet:\n1. Con su nombre de usuario y contraseña, entre a su \"perfil de servicios en línea\" (https://onlineservices.cdtfa.ca.gov/).\n2. Haga clic en la pestaña \"Cuentas.\"\n3. Seleccione la cuenta de impuesto de ventas y el uso.\n4. En la columna “I Want To,” haga clic en \"More.\"\n5. Haga clic en \"Submit a Relief Request\" y siga las pantallas del sistema para enviar su solicitud.\nSi la solicitud es aprobada, la multa será removida, sin embargo, los intereses se aumentarán.\nTambién puede pedir alivio con el formulario \"CDTFA-735-S, Solicitud de alivio de multas, cuotas de recuperación de los costos de cobro y/o intereses\" (https://www.cdtfa.ca.gov/formspubs/cdtfa735-s.pdf)." } as any,
      contentType: "application/x.quickresponse;format=markdown",
      
      shortcutKey: "AlivioPena",
      isActive: true,
      channels: ["Chat"],
      language: "en_US",
      
    });

    const RegistroReorganizacin22 = new wisdom.CfnQuickResponse(this, 'RegistroReorganizacin22', {
      knowledgeBaseArn: AmazonConnectQuickResponsesAe9d5df5598b5ba9A84d2697125b2da0.attrKnowledgeBaseArn,
      name: "Registro - Reorganización 2/2",
      content: { content: "Además, nuestra publicación 74-S, \"Como Clausura su Cuenta\" (http://www.cdtfa.ca.gov/formspubs/pub74s.pdf) le puede proporcionar información adicional para cerrar correctamente su cuenta con el CDTFA. Esta publicación incluye el formulario \"CDTFA-65-S\" (https://www.cdtfa.ca.gov/formspubs/cdtfa65s.pdf), Notificación de cierre. Si usted aún no tiene un perfil de servicios en línea, puede usar el formulario \"CDTFA-65-S\" (https://www.cdtfa.ca.gov/formspubs/cdtfa65s.pdf) para iniciar el proceso de cerrar su cuenta.\nEntonces podrá solicitar para un nuevo permiso de vendedor para su nueva entidad.\nPuede obtener un permiso de vendedor desde nuestro portal de \"servicios en línea\" (https://onlineservices.cdtfa.ca.gov/_/). En la columna de \"I want to\" seleccione \"Registre una nueva actividad comercial.”" } as any,
      contentType: "application/x.quickresponse;format=markdown",
      
      shortcutKey: "Reorg_SP_2",
      isActive: true,
      channels: ["Chat"],
      language: "en_US",
      
    });

    const RegistroCerrarUbicacinConNombreDeUsuario = new wisdom.CfnQuickResponse(this, 'RegistroCerrarUbicacinConNombreDeUsuario', {
      knowledgeBaseArn: AmazonConnectQuickResponsesAe9d5df5598b5ba9A84d2697125b2da0.attrKnowledgeBaseArn,
      name: "Registro – Cerrar Ubicación (Con Nombre de Usuario)",
      content: { content: "Si usted ya no vende de alguna de sus locaciones, es necesario que usted cierre esa localidad. Para cerrarla, por favor siga estos pasos:\n1. Con su nombre de usuario y contraseña, entre a su \"cuenta en línea.\" (https://onlineservices.cdtfa.ca.gov/_/)\n2. De la pestaña de \"Cuentas,\" seleccione la cuenta.\n3. En la columna de “I Want to,” haga clic en \"More.\"\n4. Seleccione \"Close a Location.\"\n5. Complete el formulario siguiendo las pantallas del sistema y envíe su solicitud.\nTambién puede llenar y enviar por correo postal el formulario \"CDTFA-345-WEB-S, Aviso de cambios en el negocio\" (https://www.cdtfa.ca.gov/formspubs/cdtfa345web-s.pdf)." } as any,
      contentType: "application/x.quickresponse;format=markdown",
      
      shortcutKey: "CerrarUbi",
      isActive: true,
      channels: ["Chat"],
      language: "en_US",
      
    });

    const RegistroAgregarUbicacinConNombreDeUsuario = new wisdom.CfnQuickResponse(this, 'RegistroAgregarUbicacinConNombreDeUsuario', {
      knowledgeBaseArn: AmazonConnectQuickResponsesAe9d5df5598b5ba9A84d2697125b2da0.attrKnowledgeBaseArn,
      name: "Registro – Agregar Ubicación (Con Nombre de Usuario)",
      content: { content: "Si esta hacienda ventas en una nueva ubicación, puede agregarla a su cuenta. Para agregar una nueva ubicación, siga estos pasos:\n1. Con su nombre de usuario y contraseña, ingrese a su \"cuenta en línea\" (https://onlineservices.cdtfa.ca.gov/_/).\n2. En la pestaña de “Cuentas,” seleccione la cuenta a la cual agregará la nueva ubicación.\n3. De la columna “I Want To,” seleccione \"More.\"\n4. Haga clic en \"Register a New Location.\"\n5. Complete el formulario siguiendo las pantallas del sistema y envíelo.\nTambién puede llenar y enviar por correo postal el formulario \"CDTFA-345-WEB-S, Aviso de cambios en el negocio\" (https://www.cdtfa.ca.gov/formspubs/cdtfa345web-s.pdf)." } as any,
      contentType: "application/x.quickresponse;format=markdown",
      
      shortcutKey: "AgregarUbi",
      isActive: true,
      channels: ["Chat"],
      language: "en_US",
      
    });

    const DeclaracinQuitarPenalizacin = new wisdom.CfnQuickResponse(this, 'DeclaracinQuitarPenalizacin', {
      knowledgeBaseArn: AmazonConnectQuickResponsesAe9d5df5598b5ba9A84d2697125b2da0.attrKnowledgeBaseArn,
      name: "Declaración – Quitar Penalización",
      content: { content: "Puede solicitar alivio de la penalización siguiendo estos pasos:\n1. \"Ingrese a su cuenta\" (https://onlineservices.cdtfa.ca.gov/_/) con su nombre de usuario y contraseña.\n2. Haga clic en la pestaña \"Cuentas.\"\n3. Seleccione la cuenta de “Impuesto sobre las ventas y el uso” bajo la pestaña de “Cuentas.”\n4. De la columna de “I Want To,” haga clic en \"More.\"\n5. Haga clic en \"Submit a Relief Request\" y siga las pantallas del sistema para enviar su solicitud.\nSi su solicitud es aprobada, la penalización será renunciada. Sin embargo, los intereses continuarán acumulándose de cualquier saldo que este pendiente por cubrir.\nTambién puede solicitar alivio de la penalización usando el formulario \"CDTFA-735-S, Solicitud de alivio de multas, cuota de recuperación de los costos de cobro y/o intereses\" (https://www.cdtfa.ca.gov/formspubs/cdtfa735-s.pdf)." } as any,
      contentType: "application/x.quickresponse;format=markdown",
      
      shortcutKey: "QuitarPen",
      isActive: true,
      channels: ["Chat"],
      language: "en_US",
      
    });

    const RegistroActualizarDireccinConNombreDeUsuario = new wisdom.CfnQuickResponse(this, 'RegistroActualizarDireccinConNombreDeUsuario', {
      knowledgeBaseArn: AmazonConnectQuickResponsesAe9d5df5598b5ba9A84d2697125b2da0.attrKnowledgeBaseArn,
      name: "Registro – Actualizar Dirección con Nombre de Usuario",
      content: { content: "Una vez que haya entrado a su perfil de \"servicios en línea\" (https://onlineservices.cdtfa.ca.gov/_/) con su nombre de usuario y contraseñay siga los pasos a continuación:\n1. Haga clic en la pestaña Cuentas.\n2. Seleccione la cuenta que desea actualizar.\n3. Haga clic en la pestaña de “Names and Addresses.”\n4. Abajo, del lado derecho de la pantalla, haga clic en “Mailing.”\n5. Haga clic en “Cambiar esta dirección.”\n6. Actualice la dirección, verifíquele, haga clic en “Siguiente” y haga clic en “Enviar.”\nTambién puede llamarnos al 1-800-400-7115 de lunes a viernes, de 7:30 a.m. a 5:00 p.m., hora del Pacífico (menos los días festivos estatales) donde uno de nuestros representantes con gusto le atenderá.\nDe igual forma, puede llenar y enviar por correo postal el formulario \"CDTFA-345-WEB-S, Aviso de cambios en el negocio\" (https://www.cdtfa.ca.gov/formspubs/cdtfa345web-s.pdf)." } as any,
      contentType: "application/x.quickresponse;format=markdown",
      
      shortcutKey: "Dirreccion",
      isActive: true,
      channels: ["Chat"],
      language: "en_US",
      
    });

    const RegistrationMAUpdateWithUsername = new wisdom.CfnQuickResponse(this, 'RegistrationMAUpdateWithUsername', {
      knowledgeBaseArn: AmazonConnectQuickResponsesAe9d5df5598b5ba9A84d2697125b2da0.attrKnowledgeBaseArn,
      name: "Registration - M/A Update with Username",
      content: { content: "Once logged in with a username and password on our \"Online Services\" (https://onlineservices.cdtfa.ca.gov/_/) page, please follow the steps below:\n1. Click the Accounts tab.\n2. Select the Sales and Use Tax account you want to update.\n3. Click on the Names and Addresses tab.\n4. Click on the “mailing address” on the bottom right.\n5. Click on “Change this Address.”\n6. Update your address, and click “Submit.”\nAlternatively, you can contact us at 1-800-400-7115 weekdays between 7:30 a.m. and 5:00 p.m., Pacific time (except state holidays). A representative will be happy to assist you.\nYou can also fill out form \"CDTFA-345-WEB, Notice of Business Change\" (https://www.cdtfa.ca.gov/formspubs/cdtfa345web.pdf) and send it to us by mail." } as any,
      contentType: "application/x.quickresponse;format=markdown",
      
      shortcutKey: "M/A Update",
      isActive: true,
      channels: ["Chat"],
      language: "en_US",
      
    });

    const DeclaracinFechasLmiteParaDeclararPago = new wisdom.CfnQuickResponse(this, 'DeclaracinFechasLmiteParaDeclararPago', {
      knowledgeBaseArn: AmazonConnectQuickResponsesAe9d5df5598b5ba9A84d2697125b2da0.attrKnowledgeBaseArn,
      name: "Declaración – Fechas Límite para Declarar/Pago",
      content: { content: "Si usted sabe la frecuencia con la que debe hacer su declaración, familiarícese con \"Fechas para la presentación de las declaraciones de impuestos sobre las ventas y el uso\" (https://www.cdtfa.ca.gov/taxes-and-fees/sales-use-tax-returns-filing-dates-es.htm)." } as any,
      contentType: "application/x.quickresponse;format=markdown",
      
      shortcutKey: "FechaLimit",
      isActive: true,
      channels: ["Chat"],
      language: "en_US",
      
    });

    const DeclaracinExtensinParaDeclarar = new wisdom.CfnQuickResponse(this, 'DeclaracinExtensinParaDeclarar', {
      knowledgeBaseArn: AmazonConnectQuickResponsesAe9d5df5598b5ba9A84d2697125b2da0.attrKnowledgeBaseArn,
      name: "Declaración – Extensión para Declarar",
      content: { content: "Para solicitar una extensión para presentar su declaración, entre a su perfil de servicios en línea con su nombre de usuario y contraseña.\nUna vez dentro de su perfil, siga estos pasos:\n1. Seleccione la cuenta de la cual va a solicitar la extensión.\n2. Seleccione “Request a Filing Extension.”\n3. Complete el formulario siguiendo las pantallas del sistema y envíe la solicitud.\nSi no tiene un perfil de servicios en línea, abriendo el menú “Iniciar sesión,” por favor revise los \"Videos Tutoriales\" (https://www.cdtfa.ca.gov/services/#Tutorials)." } as any,
      contentType: "application/x.quickresponse;format=markdown",
      
      shortcutKey: "Extensn_SP",
      isActive: true,
      channels: ["Chat"],
      language: "en_US",
      
    });

    const DeclaracinImprimirDeclaracinEnviada = new wisdom.CfnQuickResponse(this, 'DeclaracinImprimirDeclaracinEnviada', {
      knowledgeBaseArn: AmazonConnectQuickResponsesAe9d5df5598b5ba9A84d2697125b2da0.attrKnowledgeBaseArn,
      name: "Declaración – Imprimir Declaración Enviada",
      content: { content: "Para recuperar la declaración que envió, por favor visite la página de \"servicios en línea del\" (https://onlineservices.cdtfa.ca.gov/_/) CDTFA y del menú “Funciones de Acceso Limitado,” haga clic en “Recupere una solicitud guardada” bajo “Buscar una presentación existente” ingrese su correo electrónico y el código de confirmación en las casillas, y haga clic en el botón “Buscar.” Si aún necesita ayuda, llámenos marcando el 1-800-400-7115 de lunes a viernes, de 7:30 a.m. a 5:00 p.m., hora del Pacífico (menos los días festivos estatales)." } as any,
      contentType: "application/x.quickresponse;format=markdown",
      
      shortcutKey: "ImpriEnvia",
      isActive: true,
      channels: ["Chat"],
      language: "en_US",
      
    });

    const CallLogIn = new wisdom.CfnQuickResponse(this, 'CallLogIn', {
      knowledgeBaseArn: AmazonConnectQuickResponsesAe9d5df5598b5ba9A84d2697125b2da0.attrKnowledgeBaseArn,
      name: "Call – Log in",
      content: { content: "Unfortunately, I can’t access your profile information via Online Chat. For assistance with logging in, please call 1-800-400-7115 weekdays between 7:30 a.m. and 5:00 p.m., Pacific time (except state holidays). A representative will be happy to assist you." } as any,
      contentType: "application/x.quickresponse;format=markdown",
      
      shortcutKey: "Call_LogIn",
      isActive: true,
      channels: ["Chat"],
      language: "en_US",
      
    });

    const DeclaracinCmoSeDeterminaLaFrecuenciaParaDeclarar = new wisdom.CfnQuickResponse(this, 'DeclaracinCmoSeDeterminaLaFrecuenciaParaDeclarar', {
      knowledgeBaseArn: AmazonConnectQuickResponsesAe9d5df5598b5ba9A84d2697125b2da0.attrKnowledgeBaseArn,
      name: "¿Declaración – Cómo se determina la frecuencia para declarar?",
      content: { content: "Generalmente el CDTFA asigna la frecuencia para declarar dependiendo en las ventas sujetas al impuesto anticipadas en el momento de registrar o del impuesta de ventas que declara. La directriz a continuación muestra los umbrales que el CDTFA usa para basar frecuencia para declarar.\nIncremento de impuestos proyectado (cada mes) - $0 a $100\n- Frecuencia para declarar: anual o anual fiscal\nIncremento de impuestos proyectado (cada mes)) - $101 a $1,200\n- Frecuencia para declarar: trimestral\nIncremento de impuestos proyectado (cada mes)- $1,201 en adelante\n- Frecuencia para declarar: r: trimestral con pagos anticipados\nPara más información sobre fechas para declarar, puede revisar \"Fechas para la presentación de las declaraciones de impuestos sobre las ventas y el uso\" (https://www.cdtfa.ca.gov/taxes-and-fees/sales-use-tax-returns-filing-dates-es.htm)." } as any,
      contentType: "application/x.quickresponse;format=markdown",
      
      shortcutKey: "DeterFrecu",
      isActive: true,
      channels: ["Chat"],
      language: "en_US",
      
    });

    const TaxRateLocateTaxRates = new wisdom.CfnQuickResponse(this, 'TaxRateLocateTaxRates', {
      knowledgeBaseArn: AmazonConnectQuickResponsesAe9d5df5598b5ba9A84d2697125b2da0.attrKnowledgeBaseArn,
      name: "Tax Rate - Locate Tax Rates",
      content: { content: "Current and historical tax rates are available on the CDTFA website’s \"Tax and Fee Rates page\" (http://www.cdtfa.ca.gov/taxes-and-fees/rates.htm).\nAs an additional resource, we offer a tool that you can use to determine the current sales and use tax rate for a specific address: \"Find a Sales and Use Tax Rate\" (https://maps.cdtfa.ca.gov/)." } as any,
      contentType: "application/x.quickresponse;format=markdown",
      
      shortcutKey: "TaxRates",
      isActive: true,
      channels: ["Chat"],
      language: "en_US",
      
    });

    const CallAuthenticationCode = new wisdom.CfnQuickResponse(this, 'CallAuthenticationCode', {
      knowledgeBaseArn: AmazonConnectQuickResponsesAe9d5df5598b5ba9A84d2697125b2da0.attrKnowledgeBaseArn,
      name: "Call – Authentication Code",
      content: { content: "Unfortunately, I can’t access your profile information via Online Chat. For assistance with receiving an authentication code and logging in, please call 1-800-400-7115 weekdays between 7:30 a.m. and 5:00 p.m., Pacific time (except state holidays). A representative will be happy to assist you." } as any,
      contentType: "application/x.quickresponse;format=markdown",
      
      shortcutKey: "Call_Auth",
      isActive: true,
      channels: ["Chat"],
      language: "en_US",
      
    });

    const DeclaracinRecuperarBorradorDeDeclaracin = new wisdom.CfnQuickResponse(this, 'DeclaracinRecuperarBorradorDeDeclaracin', {
      knowledgeBaseArn: AmazonConnectQuickResponsesAe9d5df5598b5ba9A84d2697125b2da0.attrKnowledgeBaseArn,
      name: "Declaración – Recuperar Borrador de Declaración",
      content: { content: "Para recuperar el borrador que guardo de su declaración, por favor vaya la página de \"servicios en línea\" (https://onlineservices.cdtfa.ca.gov/_/) del CDTFA y bajo el menú de “Funciones de acceso limitado” haga clic en \"Recupere una solicitud guardada.\" El Sistema le pedirá que ponga su correo electrónico y el código de confirmación.\nSi tiene dificultades para recuperar su borrador, por favor llámenos marcando el 1-800-400-7115 de lunes a viernes, de 7:30 a.m. a 5:00 p.m., hora del Pacífico (menos los días festivos estatales)." } as any,
      contentType: "application/x.quickresponse;format=markdown",
      
      shortcutKey: "RecupDecla",
      isActive: true,
      channels: ["Chat"],
      language: "en_US",
      
    });

    const LlameIniciarSesin = new wisdom.CfnQuickResponse(this, 'LlameIniciarSesin', {
      knowledgeBaseArn: AmazonConnectQuickResponsesAe9d5df5598b5ba9A84d2697125b2da0.attrKnowledgeBaseArn,
      name: "Llame-Iniciar sesión",
      content: { content: "Desafortunadamente, no puedo acceder a la información de su perfil a través del chat en línea. Si necesita ayuda para iniciar sesión, llame al 1-800-400-7115 de Lunes a Viernes entre las 7:30 a.m. y las 5:00 p.m., hora del Pacifico (excepto los días feriados estatales). Un representante lo asistirá con gusto." } as any,
      contentType: "application/x.quickresponse;format=markdown",
      
      shortcutKey: "InicirSesn",
      isActive: true,
      channels: ["Chat"],
      language: "en_US",
      
    });

    const MarketplaceDeduction = new wisdom.CfnQuickResponse(this, 'MarketplaceDeduction', {
      knowledgeBaseArn: AmazonConnectQuickResponsesAe9d5df5598b5ba9A84d2697125b2da0.attrKnowledgeBaseArn,
      name: "Marketplace – Deduction",
      content: { content: "You may claim a deduction under “Other” and type in “Marketplace Facilitated Sales” on the nontaxable sales page of your sales and use tax return. Your claimed deductions must be sales made through a Marketplace for which the Marketplace facilitator is responsible for collection and payment of the tax.\nPlease review the \"Marketplace Facilitator Act Industry Guide\" (https://www.cdtfa.ca.gov/industry/MPFAct.htm). It has a great FAQ section that addresses many general questions of interest to Marketplace Sellers.\nIf you have further questions, please contact our Out-of-State Office, which is handling all inquiries pertaining to the Marketplace Facilitator Act.\nPlease see their contact information below:\nOut-of-State Office\nPhone: 1-916-227-6600\nFax: 1-916-227-6641\nTo reach a representative, press “2” when you hear the automated system." } as any,
      contentType: "application/x.quickresponse;format=markdown",
      
      shortcutKey: "MP_Deduct",
      isActive: true,
      channels: ["Chat"],
      language: "en_US",
      
    });

    const SellersPermitGeneralResaleCertificate = new wisdom.CfnQuickResponse(this, 'SellersPermitGeneralResaleCertificate', {
      knowledgeBaseArn: AmazonConnectQuickResponsesAe9d5df5598b5ba9A84d2697125b2da0.attrKnowledgeBaseArn,
      name: "Seller’s Permit - General Resale Certificate",
      content: { content: "Once you obtain a seller’s permit, you can use a \"California resale certificate\" (https://www.cdtfa.ca.gov/formspubs/cdtfa230.pdf) to purchase items that you will be reselling.\nPlease refer to \"Publication 73, Your California Seller's Permit\" (https://www.cdtfa.ca.gov/formspubs/pub73.pdf); pages 24-25 of the publication provide important information about using resale certificates.\nFor more information, refer to \"publication 103, Sales for Resale\" (https://www.cdtfa.ca.gov/formspubs/pub103/)." } as any,
      contentType: "application/x.quickresponse;format=markdown",
      
      shortcutKey: "ResaleCert",
      isActive: true,
      channels: ["Chat"],
      language: "en_US",
      
    });

    const CallResetPassword = new wisdom.CfnQuickResponse(this, 'CallResetPassword', {
      knowledgeBaseArn: AmazonConnectQuickResponsesAe9d5df5598b5ba9A84d2697125b2da0.attrKnowledgeBaseArn,
      name: "Call – Reset Password",
      content: { content: "Unfortunately, I can’t access your profile information via Online Chat. For assistance with resetting your password and logging in, please call 1-800-400-7115 weekdays between 7:30 a.m. and 5:00 p.m., Pacific time (except state holidays). A representative will be happy to assist you." } as any,
      contentType: "application/x.quickresponse;format=markdown",
      
      shortcutKey: "Call_Reset",
      isActive: true,
      channels: ["Chat"],
      language: "en_US",
      
    });

    const LlameRestablecerContrasea = new wisdom.CfnQuickResponse(this, 'LlameRestablecerContrasea', {
      knowledgeBaseArn: AmazonConnectQuickResponsesAe9d5df5598b5ba9A84d2697125b2da0.attrKnowledgeBaseArn,
      name: "Llame-Restablecer contraseña",
      content: { content: "Desafortunadamente, no puedo acceder a la información de su perfil a través del chat en línea. Si necesita ayuda para restablecer su contraseña e iniciar sesión, llame al 1-800-400-7115 de Lunes a Viernes entre las 7:30 a.m. y las 5:00 p.m., hora del Pacifico (excepto los días feriados estatales). Un representante lo asistirá con gusto." } as any,
      contentType: "application/x.quickresponse;format=markdown",
      
      shortcutKey: "Resetear",
      isActive: true,
      channels: ["Chat"],
      language: "en_US",
      
    });

    const LlameCdigoDeAutenticacin = new wisdom.CfnQuickResponse(this, 'LlameCdigoDeAutenticacin', {
      knowledgeBaseArn: AmazonConnectQuickResponsesAe9d5df5598b5ba9A84d2697125b2da0.attrKnowledgeBaseArn,
      name: "Llame- Código de Autenticación",
      content: { content: "Desafortunadamente, no puedo acceder a la información de su perfil a través del chat en línea. Si necesita ayuda para recibir un código de autenticación e iniciar sesión, llame al 1-800-400-7115 de Lunes a Viernes entre las 7:30 a.m. y las 5:00 p.m., hora del Pacifico (excepto los días feriados estatales). Un representante lo asistirá con gusto." } as any,
      contentType: "application/x.quickresponse;format=markdown",
      
      shortcutKey: "Autentcion",
      isActive: true,
      channels: ["Chat"],
      language: "en_US",
      
    });

    const ServiciosEnLneaReAperturaDeCuenta = new wisdom.CfnQuickResponse(this, 'ServiciosEnLneaReAperturaDeCuenta', {
      knowledgeBaseArn: AmazonConnectQuickResponsesAe9d5df5598b5ba9A84d2697125b2da0.attrKnowledgeBaseArn,
      name: "Servicios en Línea – Re-Apertura de Cuenta",
      content: { content: "Si su cuenta ha sido cerrada, usted puede pedir para volver a abrir su cuenta en línea con un nombre de usuario y contraseña. Por favor siga estos pasos:\n1. Con su nombre de usuario y contraseña, entre a su perfil de \"servicios en línea\" (https://onlineservices.cdtfa.ca.gov)\n2. Desde la pestaña de “Cuentas,” seleccione la cuenta de Impuesto sobre las ventas y uso que desea volver a abrir\n3. Haga clic en su nombre debajo de “Cuentas”\n4. Debajo de “I Want to,” haga clic en “More”\n5. Haga clic en “Account Re-Open” debajo de “Account Maintenance”\nSi su solicitud es aprobada, la cuenta será reabierta.\nPara información adicional, por favor contacte su oficina local del CDTFA en la página web \"Ubicaciones y direcciones de las oficinas\" (https://www.cdtfa.ca.gov/office-locations-es.htm). Las oficinas locales del CDTFA están abiertas de lunes a viernes, de 8:00 a.m. a 5:00 p.m., hora del Pacífico (menos los días festivos estatales). Para hablar con un representante, presione el “0” al oír la grabación del sistema." } as any,
      contentType: "application/x.quickresponse;format=markdown",
      
      shortcutKey: "Re-Apertur",
      isActive: true,
      channels: ["Chat"],
      language: "en_US",
      
    });

    const ServiciosEnLneaAlternativaANombreDeUsuario = new wisdom.CfnQuickResponse(this, 'ServiciosEnLneaAlternativaANombreDeUsuario', {
      knowledgeBaseArn: AmazonConnectQuickResponsesAe9d5df5598b5ba9A84d2697125b2da0.attrKnowledgeBaseArn,
      name: "Servicios en Línea – Alternativa a Nombre de Usuario",
      content: { content: "Si tiene dificultad para entrar a su perfil de servicios en línea, aún puede presentar una declaración. Vaya a la página de \"servicios en línea\" (https://onlineservices.cdtfa.ca.gov/_/) en la opción de la derecha que dice “Inicio de sesión rápido,” seleccione “Presente una declaración,” luego seleccione “Declaración de impuesto sobre las ventas y el uso.” Después de la pantalla con información importante, usted puede elegir la siguiente opción:\no Opción 2: Id de cliente y número de cuenta" } as any,
      contentType: "application/x.quickresponse;format=markdown",
      
      shortcutKey: "Option2_SP",
      isActive: true,
      channels: ["Chat"],
      language: "en_US",
      
    });

    const OnlineServicesLegalNameChange = new wisdom.CfnQuickResponse(this, 'OnlineServicesLegalNameChange', {
      knowledgeBaseArn: AmazonConnectQuickResponsesAe9d5df5598b5ba9A84d2697125b2da0.attrKnowledgeBaseArn,
      name: "Online Services – Legal Name Change",
      content: { content: "First, log in with your username and password on the \"Online Services\" (https://onlineservices.cdtfa.ca.gov/_/) page. Next, select the \"Customer Information” tab. Next, select the name you want to change.  From there, select \"Request to Change Legal Name\" under the \"I Want To\" menu on the right side of the page, and follow the prompts." } as any,
      contentType: "application/x.quickresponse;format=markdown",
      
      shortcutKey: "Legal Name",
      isActive: true,
      channels: ["Chat"],
      language: "en_US",
      
    });

    const OnlineServicesLegalNameChangeIndividual = new wisdom.CfnQuickResponse(this, 'OnlineServicesLegalNameChangeIndividual', {
      knowledgeBaseArn: AmazonConnectQuickResponsesAe9d5df5598b5ba9A84d2697125b2da0.attrKnowledgeBaseArn,
      name: "Online Services – Legal Name Change (Individual)",
      content: { content: "First, log in with your username and password on the \"Online Services\" (https://onlineservices.cdtfa.ca.gov/_/) page. Next, select \"More” under the \"I Want To\" menu on the right side of the page, scroll down to the “Other Requests” section, then select \"Change Your Legal Name\" and follow the prompts." } as any,
      contentType: "application/x.quickresponse;format=markdown",
      
      shortcutKey: "Name_Sole",
      isActive: true,
      channels: ["Chat"],
      language: "en_US",
      
    });

    const ServiciosEnLneaCambioDeNombreLegalIndividual = new wisdom.CfnQuickResponse(this, 'ServiciosEnLneaCambioDeNombreLegalIndividual', {
      knowledgeBaseArn: AmazonConnectQuickResponsesAe9d5df5598b5ba9A84d2697125b2da0.attrKnowledgeBaseArn,
      name: "Servicios en línea- Cambio de nombre legal (Individual)",
      content: { content: "Primero, inicie sesión con su nombre usuario y contraseña en la pagina de \"Servicios en línea\" (https://onlineservices.cdtfa.ca.gov/_/). Seleccione “Más” debajo del menú “Quiero” en el lado derecho de la página. Desplácese hacia abajo hasta la sección “Otras solicitudes,” luego seleccione “Cambiar su nombre legal,” y siga las instrucciones." } as any,
      contentType: "application/x.quickresponse;format=markdown",
      
      shortcutKey: "Nmbre_Solo",
      isActive: true,
      channels: ["Chat"],
      language: "en_US",
      
    });

    const AssistWebinar = new wisdom.CfnQuickResponse(this, 'AssistWebinar', {
      knowledgeBaseArn: AmazonConnectQuickResponsesAe9d5df5598b5ba9A84d2697125b2da0.attrKnowledgeBaseArn,
      name: "Assist - Webinar",
      content: { content: "For any questions or concerns regarding an event/webinar, please email us at \"cdtfaevents@cdtfa.ca.gov\" (mailto:cdtfaevents@cdtfa.ca.gov)." } as any,
      contentType: "application/x.quickresponse;format=markdown",
      
      shortcutKey: "Webinar",
      isActive: true,
      channels: ["Chat"],
      language: "en_US",
      
    });

    const RegistrationReorganization22 = new wisdom.CfnQuickResponse(this, 'RegistrationReorganization22', {
      knowledgeBaseArn: AmazonConnectQuickResponsesAe9d5df5598b5ba9A84d2697125b2da0.attrKnowledgeBaseArn,
      name: "Registration - Reorganization 2/2",
      content: { content: "In addition, \"publication 74, Closing Out Your Account\" (http://www.cdtfa.ca.gov/formspubs/pub74.pdf), will provide you all the necessary information to close out your CDTFA account properly. The publication contains form \"CDTFA-65, Notice of Closeout\" (https://www.cdtfa.ca.gov/formspubs/cdtfa65.pdf). If you are not an online registered user, form CDTFA-65 will allow you to initiate the process of closing out your account.\nYou may then register for a new seller's permit for the new entity.\nYou can register for a seller's permit on our \"Online Services\" (https://onlineservices.cdtfa.ca.gov/_/) page. First, log in with your username and password, then select \"Register a New Business Activity\" under the \"I Want To\" menu." } as any,
      contentType: "application/x.quickresponse;format=markdown",
      
      shortcutKey: "Reorg2",
      isActive: true,
      channels: ["Chat"],
      language: "en_US",
      
    });

    const HowMayIAssist = new wisdom.CfnQuickResponse(this, 'HowMayIAssist', {
      knowledgeBaseArn: AmazonConnectQuickResponsesAe9d5df5598b5ba9A84d2697125b2da0.attrKnowledgeBaseArn,
      name: "How May I Assist",
      content: { content: "How may I assist you?" } as any,
      contentType: "application/x.quickresponse;format=markdown",
      
      shortcutKey: "Assist",
      isActive: true,
      channels: ["Chat"],
      language: "en_US",
      
    });

    const AssistW9 = new wisdom.CfnQuickResponse(this, 'AssistW9', {
      knowledgeBaseArn: AmazonConnectQuickResponsesAe9d5df5598b5ba9A84d2697125b2da0.attrKnowledgeBaseArn,
      name: "Assist - W-9",
      content: { content: "We can provide you with our Taxpayer Identification Number (82-2162215); however, we are unable to provide you with a W-9 for funds relating to tax or fee payments.\nAs a state agency, the CDTFA is exempt from backup withholding as an Exempt Payee. For more information, please review the Exempt Payee section of Internal Revenue Service Form \"W-9\" (http://www.irs.gov/pub/irs-pdf/fw9.pdf).\nYou can contact the IRS directly at 1-800-829-1040." } as any,
      contentType: "application/x.quickresponse;format=markdown",
      
      shortcutKey: "W9",
      isActive: true,
      channels: ["Chat"],
      language: "en_US",
      
    });

    const ForwardCustoms = new wisdom.CfnQuickResponse(this, 'ForwardCustoms', {
      knowledgeBaseArn: AmazonConnectQuickResponsesAe9d5df5598b5ba9A84d2697125b2da0.attrKnowledgeBaseArn,
      name: "Forward - Customs",
      content: { content: "Your inquiry appears to be related to US Customs. Unfortunately, I am unable to assist with that program type. For assistance, please contact us at 1-800-400-7115 weekdays between 7:30 a.m. and 5:00 p.m., Pacific time (except state holidays). A telephone agent will be happy to assist you." } as any,
      contentType: "application/x.quickresponse;format=markdown",
      
      shortcutKey: "Customs",
      isActive: true,
      channels: ["Chat"],
      language: "en_US",
      
    });

    const OnlineServicesRemoveAccess = new wisdom.CfnQuickResponse(this, 'OnlineServicesRemoveAccess', {
      knowledgeBaseArn: AmazonConnectQuickResponsesAe9d5df5598b5ba9A84d2697125b2da0.attrKnowledgeBaseArn,
      name: "Online Services - Remove Access",
      content: { content: "To cancel access to an account, please log in with your username, then follow the steps below:\n1. Select “Settings” on the top right.\n2. Select the “Access” tab.\n3. Select your access type next to “General Access” of the account you want removed.\n4. Click on “Cancel my access to this account.”" } as any,
      contentType: "application/x.quickresponse;format=markdown",
      
      shortcutKey: "CancelAcc",
      isActive: true,
      channels: ["Chat"],
      language: "en_US",
      
    });

    const OnlineServicesFileAndPayOnlyAccess = new wisdom.CfnQuickResponse(this, 'OnlineServicesFileAndPayOnlyAccess', {
      knowledgeBaseArn: AmazonConnectQuickResponsesAe9d5df5598b5ba9A84d2697125b2da0.attrKnowledgeBaseArn,
      name: "Online Services - File and Pay Only Access",
      content: { content: "If the option is not listed under the “More” section, you may not have the proper access level to complete the request online. To check your access level or speak to a representative for assistance over the phone, please contact us at 1-800-400-7115 weekdays between 7:30 a.m. and 5:00 p.m., Pacific time (except state holidays)." } as any,
      contentType: "application/x.quickresponse;format=markdown",
      
      shortcutKey: "File&PayAc",
      isActive: true,
      channels: ["Chat"],
      language: "en_US",
      
    });

    const ServiciosEnLneaSolicitarReinstalacin = new wisdom.CfnQuickResponse(this, 'ServiciosEnLneaSolicitarReinstalacin', {
      knowledgeBaseArn: AmazonConnectQuickResponsesAe9d5df5598b5ba9A84d2697125b2da0.attrKnowledgeBaseArn,
      name: "Servicios en Línea-Solicitar Reinstalación",
      content: { content: "Por favor siga los pasos a continuación para solicitar la reinstalación de su cuenta:\n1. Inicie sesión con su nombre de usuario en la pagina de \"Servicios en línea\" (https://onlineservices.cdtfa.ca.gov/_/).\n2. Desplácese hacia abajo de la pagina\n3. Debajo de la pestaña “Cuentas”, seleccione la cuenta de Impuesto sobre las ventas y el uso\n4. Haga clic en “Más” debajo de “Quiero”\n5. Haga clic en Solicitar Reinstalación debajo de “Más”\nPara obtener información adicional, comuníquese con su \"oficina local\" (https://www.cdtfa.ca.gov/office-locations.htm).\nLas oficinas locales del CDTFA están abiertas de lunes a viernes de 8:00 a. m. a 5:00 p. m., hora del Pacífico (excepto los feriados estatales). Para comunicarse con un representante, presione \"0\" en el saludo automático." } as any,
      contentType: "application/x.quickresponse;format=markdown",
      
      shortcutKey: "Reinstalac",
      isActive: true,
      channels: ["Chat"],
      language: "en_US",
      
    });

    const SalesTaxClearance = new wisdom.CfnQuickResponse(this, 'SalesTaxClearance', {
      knowledgeBaseArn: AmazonConnectQuickResponsesAe9d5df5598b5ba9A84d2697125b2da0.attrKnowledgeBaseArn,
      name: "Sales Tax Clearance",
      content: { content: "To submit a request for a sales tax clearance online, please follow the steps below:\n1. Navigate to our \"Online Services\" (https://onlineservices.cdtfa.ca.gov/_/) homepage.\n2. Under the Limited Access Functions section, click on Request a Tax and Fee Clearance.\n3. Follow the prompts to complete the request for a sales tax clearance.\nNote: Clearance Requests can only be submitted by the buyer or a representative of the buyer." } as any,
      contentType: "application/x.quickresponse;format=markdown",
      
      shortcutKey: "Clearance",
      isActive: true,
      channels: ["Chat"],
      language: "en_US",
      
    });

    const OnlineServicesVerifyASalesAndUseTaxPayment = new wisdom.CfnQuickResponse(this, 'OnlineServicesVerifyASalesAndUseTaxPayment', {
      knowledgeBaseArn: AmazonConnectQuickResponsesAe9d5df5598b5ba9A84d2697125b2da0.attrKnowledgeBaseArn,
      name: "Online Services - Verify a Sales and Use tax payment",
      content: { content: "To verify a sales and use tax payment, please follow the steps below:\n1. Navigate to our \"CDTFA Online Services\" (https://onlineservices.cdtfa.ca.gov/_/) page.\n2. Under the “Payments” section, click on “Verify a Sales and Use Tax Payment.”\n3. Follow the prompts and submit your request." } as any,
      contentType: "application/x.quickresponse;format=markdown",
      
      shortcutKey: "VerifySUT",
      isActive: true,
      channels: ["Chat"],
      language: "en_US",
      
    });

    const PreguntaDeCortesa = new wisdom.CfnQuickResponse(this, 'PreguntaDeCortesa', {
      knowledgeBaseArn: AmazonConnectQuickResponsesAe9d5df5598b5ba9A84d2697125b2da0.attrKnowledgeBaseArn,
      name: "Pregunta de Cortesía",
      content: { content: "¿Tiene más preguntas generales con las que le pueda ayudar?" } as any,
      contentType: "application/x.quickresponse;format=markdown",
      
      shortcutKey: "Cortesía",
      isActive: true,
      channels: ["Chat"],
      language: "en_US",
      
    });

    const OnlineServicesUsernameAlternative = new wisdom.CfnQuickResponse(this, 'OnlineServicesUsernameAlternative', {
      knowledgeBaseArn: AmazonConnectQuickResponsesAe9d5df5598b5ba9A84d2697125b2da0.attrKnowledgeBaseArn,
      name: "Online Services - Username Alternative",
      content: { content: "If you are having difficulties logging in with your username, you can still file a return. Go to the \"Online Services\" (https://onlineservices.cdtfa.ca.gov/_/) page, and under the “Express Login” to the right of the username and password fields, select “File a Return,” then select “Sales and Use Tax.”" } as any,
      contentType: "application/x.quickresponse;format=markdown",
      
      shortcutKey: "ExpressLog",
      isActive: true,
      channels: ["Chat"],
      language: "en_US",
      
    });

    const OnlineServicesVerifyAPermitLicenseOrAccountInfoChanged = new wisdom.CfnQuickResponse(this, 'OnlineServicesVerifyAPermitLicenseOrAccountInfoChanged', {
      knowledgeBaseArn: AmazonConnectQuickResponsesAe9d5df5598b5ba9A84d2697125b2da0.attrKnowledgeBaseArn,
      name: "Online Services - Verify a Permit, License, or Account - Info Changed",
      content: { content: "The online services “Verify a Permit, License, or Account” feature has been changed. In addition to the address not being displayed, the owner’s name and DBA are not displayed when the ownership type is an individual (sole proprietorship), married co-ownership, or domestic partnership.\nThere is no requirement to verify the name and address on a resale certificate. You are only required to verify that the permit is valid. This is in addition to the requirement of accepting a Resale Certificate in good faith as described in \"Publication 103, Sales for Resale\" (https://www.cdtfa.ca.gov/formspubs/pub103/)." } as any,
      contentType: "application/x.quickresponse;format=markdown",
      
      shortcutKey: "VerifyInfo",
      isActive: true,
      channels: ["Chat"],
      language: "en_US",
      
    });

    const ReturnAmendAReturnCommonQuestions12 = new wisdom.CfnQuickResponse(this, 'ReturnAmendAReturnCommonQuestions12', {
      knowledgeBaseArn: AmazonConnectQuickResponsesAe9d5df5598b5ba9A84d2697125b2da0.attrKnowledgeBaseArn,
      name: "Return- Amend a Return - Common Questions 1/2",
      content: { content: "When you file an amended return, the system will not account for your previous filing or payment history. Instead, it will recalculate the entire liability for the period and calculate penalty and interest as of that date on the recalculated amount of tax. Once you submit the return, we will review it. If we accept your amended return, we will recalculate any additional tax due, and any applicable penalty or interest on only the portion of the tax that was not originally paid in full by the original due date." } as any,
      contentType: "application/x.quickresponse;format=markdown",
      
      shortcutKey: "AmendQues1",
      isActive: true,
      channels: ["Chat"],
      language: "en_US",
      
    });

    const CSCGreetingEnglish = new wisdom.CfnQuickResponse(this, 'CSCGreetingEnglish', {
      knowledgeBaseArn: AmazonConnectQuickResponsesAe9d5df5598b5ba9A84d2697125b2da0.attrKnowledgeBaseArn,
      name: "CSC Greeting - English",
      content: { content: "Hello. You’re chatting with a live agent. I am happy to assist with your general sales and use tax questions. Please note that I am unable to access any account-specific or web profile information. I’m reviewing your chat session now." } as any,
      contentType: "application/x.quickresponse;format=markdown",
      
      shortcutKey: "Greeting",
      isActive: true,
      channels: ["Chat"],
      language: "en_US",
      
    });

    const ReturnPrepaymentNotShowing = new wisdom.CfnQuickResponse(this, 'ReturnPrepaymentNotShowing', {
      knowledgeBaseArn: AmazonConnectQuickResponsesAe9d5df5598b5ba9A84d2697125b2da0.attrKnowledgeBaseArn,
      name: "Return - Prepayment Not Showing",
      content: { content: "If you made a prepayment on an account that does not require a prepayment, you can manually deduct the prepayments you have made from the total tax due on your return. Then make a payment for the remaining tax due. The prepayments will post overnight, clearing the remaining balance." } as any,
      contentType: "application/x.quickresponse;format=markdown",
      
      shortcutKey: "NoPrepay",
      isActive: true,
      channels: ["Chat"],
      language: "en_US",
      
    });

    const SellersPermitIfRegisteredIncorrectly = new wisdom.CfnQuickResponse(this, 'SellersPermitIfRegisteredIncorrectly', {
      knowledgeBaseArn: AmazonConnectQuickResponsesAe9d5df5598b5ba9A84d2697125b2da0.attrKnowledgeBaseArn,
      name: "Seller’s Permit – If Registered Incorrectly",
      content: { content: "If you believe your permit was registered incorrectly, you are required to close out your seller's permit. Unfortunately, we are not able to convert accounts from one entity type to another.\n\"Publication 74, Closing Out Your Account\" (http://www.cdtfa.ca.gov/formspubs/pub74.pdf), will provide you all the necessary information to close out your CDTFA account properly. The publication contains form \"CDTFA-65, Notice of Closeout\" (http://www.cdtfa.ca.gov/formspubs/cdtfa65.pdf). If you are not a registered user, this form will allow you to initiate the process of closing out your account.\nYou will also need to apply for a new seller's permit.\nTo get started, please visit our \"CDTFA Online Services\" (https://onlineservices.cdtfa.ca.gov/_/) page, click on Register a New Business Activity, and follow the prompts.\nFor additional information regarding registration, please visit our \"Register for a Permit, License, or Account\" (http://www.cdtfa.ca.gov/services) page." } as any,
      contentType: "application/x.quickresponse;format=markdown",
      
      shortcutKey: "wrongentit",
      isActive: true,
      channels: ["Chat"],
      language: "en_US",
      
    });

    const ReturnAmendAReturnCommonQuestions22 = new wisdom.CfnQuickResponse(this, 'ReturnAmendAReturnCommonQuestions22', {
      knowledgeBaseArn: AmazonConnectQuickResponsesAe9d5df5598b5ba9A84d2697125b2da0.attrKnowledgeBaseArn,
      name: "Return- Amend a Return - Common Questions 2/2",
      content: { content: "If any additional tax is due, we encourage you to pay only the remaining tax due without including any penalty or interest. If we determine that any additional penalty or interest is due, we will send you a separate statement via U.S. Postal Service.\nIf your original payment submitted was more than the correct amount due as recalculated on your amended return, you may submit a claim for refund once we review and accept the amended return, generally within 1-2 weeks. You will be able to confirm our acceptance of the amended return by logging into your account with your username and password. If the account balance reflects a credit as expected, you may proceed with submitting your claim for refund." } as any,
      contentType: "application/x.quickresponse;format=markdown",
      
      shortcutKey: "AmendQues2",
      isActive: true,
      channels: ["Chat"],
      language: "en_US",
      
    });

    const CourtesyQuestion = new wisdom.CfnQuickResponse(this, 'CourtesyQuestion', {
      knowledgeBaseArn: AmazonConnectQuickResponsesAe9d5df5598b5ba9A84d2697125b2da0.attrKnowledgeBaseArn,
      name: "Courtesy Question",
      content: { content: "Are there any other general questions I can assist you with?" } as any,
      contentType: "application/x.quickresponse;format=markdown",
      
      shortcutKey: "Courtesy",
      isActive: true,
      channels: ["Chat"],
      language: "en_US",
      
    });

    const UnableToFindTaxRate = new wisdom.CfnQuickResponse(this, 'UnableToFindTaxRate', {
      knowledgeBaseArn: AmazonConnectQuickResponsesAe9d5df5598b5ba9A84d2697125b2da0.attrKnowledgeBaseArn,
      name: "Unable To Find Tax Rate",
      content: { content: "If our tax rate lookup system was unable to provide the current rate, please submit an email request with the address information you provided to CDTFA-AddressLookupQuestions@cdtfa.ca.gov. Responses are generally within 24 hours." } as any,
      contentType: "application/x.quickresponse;format=markdown",
      
      shortcutKey: "UnableRate",
      isActive: true,
      channels: ["Chat"],
      language: "en_US",
      
    });

    const RegistrationLLCCorporation = new wisdom.CfnQuickResponse(this, 'RegistrationLLCCorporation', {
      knowledgeBaseArn: AmazonConnectQuickResponsesAe9d5df5598b5ba9A84d2697125b2da0.attrKnowledgeBaseArn,
      name: "Registration - LLC/Corporation",
      content: { content: "For the question, \"Is the application for the person/entity below?\" you need to select \"No.\"" } as any,
      contentType: "application/x.quickresponse;format=markdown",
      
      shortcutKey: "Reg Entity",
      isActive: true,
      channels: ["Chat"],
      language: "en_US",
      
    });

    const RegistroEstatus = new wisdom.CfnQuickResponse(this, 'RegistroEstatus', {
      knowledgeBaseArn: AmazonConnectQuickResponsesAe9d5df5598b5ba9A84d2697125b2da0.attrKnowledgeBaseArn,
      name: "Registro – Estatus",
      content: { content: "Para verificar el estado de su registro, siga estos pasos:\n1. Inicie sesión en la pagina de \"Servicios en línea\" (https://onlineservices.cdtfa.ca.gov/_/) del CDTFA.\n2. En el menú debajo de “Quiero,” haga clic en Obtener el estado de su registro.\n3. Ingrese su número de confirmación.\nGeneralmente, los permisos de venta se emiten el mismo día. Sin embargo, en algunos casos pueden requerir una verificación adicional, y recibirá un correo electrónico cuando cambie el estado de su solicitud." } as any,
      contentType: "application/x.quickresponse;format=markdown",
      
      shortcutKey: "EstatusReg",
      isActive: true,
      channels: ["Chat"],
      language: "en_US",
      
    });

    const RegistrationStatus = new wisdom.CfnQuickResponse(this, 'RegistrationStatus', {
      knowledgeBaseArn: AmazonConnectQuickResponsesAe9d5df5598b5ba9A84d2697125b2da0.attrKnowledgeBaseArn,
      name: "Registration - Status",
      content: { content: "To check your registration status, follow these steps:\n1. Sign in with your username and password on the \"CDTFA Online Services\" (https://onlineservices.cdtfa.ca.gov/_/) page.\n2. Under the I Want To menu, click the Get Your Registration Status\n3. Enter your confirmation number.\nGenerally, seller’s permits are issued the same day. However, in some cases they may require further verification, and you will receive an email when the status changes." } as any,
      contentType: "application/x.quickresponse;format=markdown",
      
      shortcutKey: "Reg Status",
      isActive: true,
      channels: ["Chat"],
      language: "en_US",
      
    });

    const ForwardLocalOffice = new wisdom.CfnQuickResponse(this, 'ForwardLocalOffice', {
      knowledgeBaseArn: AmazonConnectQuickResponsesAe9d5df5598b5ba9A84d2697125b2da0.attrKnowledgeBaseArn,
      name: "Forward - Local Office",
      content: { content: "Unfortunately, I can’t assist you with that, but your local office staff can.  Click here https://www.cdtfa.ca.gov/office-locations.htm for a listing of local office contact information.\nCDTFA local offices are open weekdays between 8:00 a.m. and 5:00 p.m., Pacific time (except state holidays). To reach a representative, press “0” at the automated greeting." } as any,
      contentType: "application/x.quickresponse;format=markdown",
      
      shortcutKey: "LO",
      isActive: true,
      channels: ["Chat"],
      language: "en_US",
      
    });

    const InformacinGeneralDisculpas = new wisdom.CfnQuickResponse(this, 'InformacinGeneralDisculpas', {
      knowledgeBaseArn: AmazonConnectQuickResponsesAe9d5df5598b5ba9A84d2697125b2da0.attrKnowledgeBaseArn,
      name: "Información general – Disculpas",
      content: { content: "Le pido disculpas, solo puedo proporcionar información general sobre los programas de impuestos y tarifas que administra el CDTFA. No puedo proporcionar información específica de su cuenta a través del chat en línea." } as any,
      contentType: "application/x.quickresponse;format=markdown",
      
      shortcutKey: "Disculpas",
      isActive: true,
      channels: ["Chat"],
      language: "en_US",
      
    });

    const BusinessComplaints = new wisdom.CfnQuickResponse(this, 'BusinessComplaints', {
      knowledgeBaseArn: AmazonConnectQuickResponsesAe9d5df5598b5ba9A84d2697125b2da0.attrKnowledgeBaseArn,
      name: "Business Complaints",
      content: { content: "If you feel you have been incorrectly charged sales tax, you should contact the vendor to request a refund of the overpaid tax. A disagreement between the customer and retailer involving a refund of sales tax paid is a civil matter between the customer and retailer.\nIf you suspect a retailer is committing tax evasion, you may file a complaint by following the steps below:\n1. Navigate to our \"Online Services\" (https://onlineservices.cdtfa.ca.gov/_/) homepage.\n2. Under the Limited Access Functions section, click on Report Suspected Violations.\n3. Follow the prompts to file a complaint." } as any,
      contentType: "application/x.quickresponse;format=markdown",
      
      shortcutKey: "Complaints",
      isActive: true,
      channels: ["Chat"],
      language: "en_US",
      
    });

    const TranscriptNotAvailable = new wisdom.CfnQuickResponse(this, 'TranscriptNotAvailable', {
      knowledgeBaseArn: AmazonConnectQuickResponsesAe9d5df5598b5ba9A84d2697125b2da0.attrKnowledgeBaseArn,
      name: "Transcript Not Available",
      content: { content: "Unfortunately, we do not currently have a feature to save the transcript of this chat. However, you may copy and paste the contents of this chat into another document to save." } as any,
      contentType: "application/x.quickresponse;format=markdown",
      
      shortcutKey: "Transcript",
      isActive: true,
      channels: ["Chat"],
      language: "en_US",
      
    });

    const GeneralInfoOnlyApologize = new wisdom.CfnQuickResponse(this, 'GeneralInfoOnlyApologize', {
      knowledgeBaseArn: AmazonConnectQuickResponsesAe9d5df5598b5ba9A84d2697125b2da0.attrKnowledgeBaseArn,
      name: "General Info Only – Apologize",
      content: { content: "I apologize, I'm only able to provide general information about the tax and fee programs CDTFA administers. I am unable to provide account-specific information via Online Chat." } as any,
      contentType: "application/x.quickresponse;format=markdown",
      
      shortcutKey: "Apologize",
      isActive: true,
      channels: ["Chat"],
      language: "en_US",
      
    });

    const RegistroSociedadDeResponsabilidadLimitadaCorporacin = new wisdom.CfnQuickResponse(this, 'RegistroSociedadDeResponsabilidadLimitadaCorporacin', {
      knowledgeBaseArn: AmazonConnectQuickResponsesAe9d5df5598b5ba9A84d2697125b2da0.attrKnowledgeBaseArn,
      name: "Registro – Sociedad de Responsabilidad Limitada/Corporación",
      content: { content: "Para la pregunta \"¿Es la solicitud para la persona/entidad a continuación?\", debe seleccionar \"No\"." } as any,
      contentType: "application/x.quickresponse;format=markdown",
      
      shortcutKey: "Reg_Entida",
      isActive: true,
      channels: ["Chat"],
      language: "en_US",
      
    });

    const NoSePudoEncontrarLaTasaImpositiva = new wisdom.CfnQuickResponse(this, 'NoSePudoEncontrarLaTasaImpositiva', {
      knowledgeBaseArn: AmazonConnectQuickResponsesAe9d5df5598b5ba9A84d2697125b2da0.attrKnowledgeBaseArn,
      name: "No se pudo encontrar la tasa impositiva",
      content: { content: "Si nuestro sistema de consulta de tasas impositivas no pudo proporcionarle la tasa actual, envíe una solicitud por correo electrónico con la información de la dirección que proporcionó a CDTFA-AddressLookupQuestions@cdtfa.ca.gov. Las respuestas se envían generalmente en un plazo de 24 horas." } as any,
      contentType: "application/x.quickresponse;format=markdown",
      
      shortcutKey: "Tasanodisp",
      isActive: true,
      channels: ["Chat"],
      language: "en_US",
      
    });

    const PaymentMakeAPaymentViaUsername = new wisdom.CfnQuickResponse(this, 'PaymentMakeAPaymentViaUsername', {
      knowledgeBaseArn: AmazonConnectQuickResponsesAe9d5df5598b5ba9A84d2697125b2da0.attrKnowledgeBaseArn,
      name: "Payment – Make a Payment via Username",
      content: { content: "You can make a payment on our CDTFA Online Services page after logging in with your username and password.\nTo get started, please follow the steps below:\n1. Navigate to our \"Online Services\" (https://onlineservices.cdtfa.ca.gov/_/) page.\n2. Log in with your username and password.\n3. Click on the account for which you want to make a payment.\n4. Click on the period the payment is for.\n5. Click on “Make a Payment.”\n6. Select your preferred payment method.\n7. Complete and submit your request." } as any,
      contentType: "application/x.quickresponse;format=markdown",
      
      shortcutKey: "User Pay",
      isActive: true,
      channels: ["Chat"],
      language: "en_US",
      
    });

    const ReliefFromPenalty = new wisdom.CfnQuickResponse(this, 'ReliefFromPenalty', {
      knowledgeBaseArn: AmazonConnectQuickResponsesAe9d5df5598b5ba9A84d2697125b2da0.attrKnowledgeBaseArn,
      name: "Relief from Penalty",
      content: { content: "You can request for a relief from penalty online by following these steps:\n1. Sign in with your username on our \"Online Services\" (https://onlineservices.cdtfa.ca.gov/_/) page\n2. Click the \"Accounts\" tab\n3. Select the appropriate account\n4. Click \"More\" under \"I Want To\"\n5. Click \"Submit a Relief Request\" and follow the prompts to submit the request\nIf your request is approved, the penalty will be waived, however, interest will still accrue.\nYou can also request a relief by mail using a \"CDTFA-735, Request for Relief from Penalty, Collection Cost Recovery Fee, and/or Interest\" (https://www.cdtfa.ca.gov/formspubs/cdtfa735.pdf)." } as any,
      contentType: "application/x.quickresponse;format=markdown",
      
      shortcutKey: "CDTFA-735",
      isActive: true,
      channels: ["Chat"],
      language: "en_US",
      
    });

    const ServiciosEnLneaHistoria = new wisdom.CfnQuickResponse(this, 'ServiciosEnLneaHistoria', {
      knowledgeBaseArn: AmazonConnectQuickResponsesAe9d5df5598b5ba9A84d2697125b2da0.attrKnowledgeBaseArn,
      name: "Servicios en Línea - Historia",
      content: { content: "Desde su perfil de servicios en línea usted puede revisar el historial de sus declaraciones. Una vez que haya entrado a su perfil con su nombre de usuario y contraseña:\n1. De la pestaña de “Cuentas,” seleccione su cuenta de impuesto sobre las ventas y el uso.\n2. Bajo la pestaña “Períodos Recientes,” seleccione el período que desea revisar.\n3. Bajo el menú “I Want to,” seleccione “File, Amend or Print a Return.”\n4. Haga clic en “Print Return (PDF).”\nUsted solamente podrá ver sus declaraciones del 7 de mayo del 2018, a la fecha actual. Para ver declaraciones previas a esa fecha, por favor llame al 1-800-400-7115, de lunes a viernes, de 7:30 a.m. a 5:00 p.m., hora del Pacifico (menos los días festivos estatales)." } as any,
      contentType: "application/x.quickresponse;format=markdown",
      
      shortcutKey: "Historia",
      isActive: true,
      channels: ["Chat"],
      language: "en_US",
      
    });

    const PaymentPrepaymentUsername = new wisdom.CfnQuickResponse(this, 'PaymentPrepaymentUsername', {
      knowledgeBaseArn: AmazonConnectQuickResponsesAe9d5df5598b5ba9A84d2697125b2da0.attrKnowledgeBaseArn,
      name: "Payment - Prepayment Username",
      content: { content: "To make a prepayment:\n1. Navigate to the \"Online Services\" (https://onlineservices.cdtfa.ca.gov) page.\n2. Log in with your username.\n3. Select the appropriate account.\n4. Click on the period the payment is for.\n5. Under the “I Want To” section, click on the prepayment you want to make.\n6. Follow the prompts to complete the prepayment." } as any,
      contentType: "application/x.quickresponse;format=markdown",
      
      shortcutKey: "PrepayUser",
      isActive: true,
      channels: ["Chat"],
      language: "en_US",
      
    });

    const OnlineServicesRequestReinstatement = new wisdom.CfnQuickResponse(this, 'OnlineServicesRequestReinstatement', {
      knowledgeBaseArn: AmazonConnectQuickResponsesAe9d5df5598b5ba9A84d2697125b2da0.attrKnowledgeBaseArn,
      name: "Online Services – Request Reinstatement",
      content: { content: "Please follow the steps below to request reinstatement:\n1. Sign in with your username on the \"Online Services\" (https://onlineservices.cdtfa.ca.gov/_/) page\n2. Click the Accounts tab\n3. Select the account you wish to reinstate\n4. Click More under I Want To\n5. Click Request Reinstatement under More\nFor additional information, please contact your \"local office\" (https://www.cdtfa.ca.gov/office-locations.htm).\nCDTFA local offices are open weekdays between 8:00 a.m. and 5:00 p.m., Pacific time (except state holidays). To reach a representative, press “0” at the automated greeting." } as any,
      contentType: "application/x.quickresponse;format=markdown",
      
      shortcutKey: "Reinstate",
      isActive: true,
      channels: ["Chat"],
      language: "en_US",
      
    });

    const ReturnAmendment = new wisdom.CfnQuickResponse(this, 'ReturnAmendment', {
      knowledgeBaseArn: AmazonConnectQuickResponsesAe9d5df5598b5ba9A84d2697125b2da0.attrKnowledgeBaseArn,
      name: "Return - Amendment",
      content: { content: "If you discover an error on your return, you can amend the return online by following the steps below:\n1. Navigate to the \"Online Services\" (https://onlineservices.cdtfa.ca.gov/_/) page.\n2. Log in with your username and password.\n3. Click on the \"Accounts\" tab.\n4. Select the appropriate account.\n5. Click on the Period.\n6. Under the \"I Want To\" section, click on \"File or Amend a Return.\"\n7. Click on \"Amend Return.\"\nIf you prefer to file your amended return with paper, or if the original return was filed prior to May 7, 2018, please visit the \"Amend a Return\" (https://www.cdtfa.ca.gov/taxes-and-fees/amend-a-return.htm) page on the CDTFA website for instructions." } as any,
      contentType: "application/x.quickresponse;format=markdown",
      
      shortcutKey: "Amendment",
      isActive: true,
      channels: ["Chat"],
      language: "en_US",
      
    });

    const OnlineServicesReopenAccount = new wisdom.CfnQuickResponse(this, 'OnlineServicesReopenAccount', {
      knowledgeBaseArn: AmazonConnectQuickResponsesAe9d5df5598b5ba9A84d2697125b2da0.attrKnowledgeBaseArn,
      name: "Online Services – Reopen Account",
      content: { content: "If your account has been closed for less than 18 months, you can request to have your account re-opened online with a username and password. To do so, please follow the steps below:\n1. Sign in with your username on the \"Online Services\" (https://onlineservices.cdtfa.ca.gov/_/) page\n2. Click the Accounts tab\n3. Select the account you wish to re-open\n4. Click More under I Want To\n5. Click Account Re-Open under Account Maintenance and follow the prompts to complete and submit your request\nIf your request is approved, the account will be re-opened.\nFor additional information, please contact your \"local office\" (https://www.cdtfa.ca.gov/office-locations.htm).\nCDTFA local offices are open weekdays between 7:30 a.m. and 5:00 p.m., Pacific time (except state holidays). To reach a representative, press “0” at the automated greeting." } as any,
      contentType: "application/x.quickresponse;format=markdown",
      
      shortcutKey: "ReopenAcct",
      isActive: true,
      channels: ["Chat"],
      language: "en_US",
      
    });

    const ReturnReliefFromPenalty = new wisdom.CfnQuickResponse(this, 'ReturnReliefFromPenalty', {
      knowledgeBaseArn: AmazonConnectQuickResponsesAe9d5df5598b5ba9A84d2697125b2da0.attrKnowledgeBaseArn,
      name: "Return - Relief from Penalty",
      content: { content: "You can request for a relief from penalty online by following these steps:\n1. Sign in with your username and password on the \"Online Services\" (https://onlineservices.cdtfa.ca.gov/) page.\n2. Click the \"Accounts\" tab.\n3. Select the appropriate account.\n4. Click \"More\" under \"I Want To.\"\n5. Click \"Submit a Relief Request\" and follow the prompts to submit the request.\nIf your request is approved, the penalty will be waived. However, interest will continue to accrue on any unpaid balance.\nYou can also request a relief by mail using form \"CDTFA-735, Request for Relief from Penalty, Collection Cost Recovery Fee, and/or Interest\" (https://www.cdtfa.ca.gov/formspubs/cdtfa735.pdf)." } as any,
      contentType: "application/x.quickresponse;format=markdown",
      
      shortcutKey: "Penalty Re",
      isActive: true,
      channels: ["Chat"],
      language: "en_US",
      
    });

    const TranscripcinNoDisponible = new wisdom.CfnQuickResponse(this, 'TranscripcinNoDisponible', {
      knowledgeBaseArn: AmazonConnectQuickResponsesAe9d5df5598b5ba9A84d2697125b2da0.attrKnowledgeBaseArn,
      name: "Transcripción no disponible",
      content: { content: "Desafortunadamente, actualmente no disponemos de una función para guardar la transcripción de este chat. Sin embargo, puede copiar y pegar el contenido del chat en otro documento para guardarlo." } as any,
      contentType: "application/x.quickresponse;format=markdown",
      
      shortcutKey: "Transpt_SP",
      isActive: true,
      channels: ["Chat"],
      language: "en_US",
      
    });

    const OnlineServicesHistory = new wisdom.CfnQuickResponse(this, 'OnlineServicesHistory', {
      knowledgeBaseArn: AmazonConnectQuickResponsesAe9d5df5598b5ba9A84d2697125b2da0.attrKnowledgeBaseArn,
      name: "Online Services - History",
      content: { content: "You can review your return history by logging in with your username and password. Once logged in:\n1. Select your account under the \"Accounts” tab.\n2. Select the period you want to view under the \"Recent Periods\" tab.\n3. To print, under \"I Want To,\" select \"File, Amend or Print a Return.\"\n4. Click \"Print Return (PDF).\"\nYou will not be able to view or print returns filed prior to May 7, 2018. To retrieve these returns, please contact us at 1-800-400-7115 weekdays between 7:30 a.m. and 5:00 p.m., Pacific time (except state holidays)." } as any,
      contentType: "application/x.quickresponse;format=markdown",
      
      shortcutKey: "History",
      isActive: true,
      channels: ["Chat"],
      language: "en_US",
      
    });

    // TODO: wisdom/knowledge-base — cdtfa-publications-web-crawler
    // cfnType: AWS::QConnect::KnowledgeBase

    // TODO: wisdom/knowledge-base — cdtfa-s3-agent-resources
    // cfnType: AWS::QConnect::KnowledgeBase

    // TODO: wisdom/knowledge-base — cdtfa-law-guides-web-crawler
    // cfnType: AWS::QConnect::KnowledgeBase

    // TODO: wisdom/knowledge-base — amazon-connect-mycdtfa
    // cfnType: AWS::QConnect::KnowledgeBase

    // TODO: wisdom/knowledge-base — cdtfa-website-forms-pubs-crawler
    // cfnType: AWS::QConnect::KnowledgeBase

    // TODO: wisdom/knowledge-base — amazon-connect-quick-responses-ae9d5df5-598b-5ba9-a84d-2697125b2da0
    // cfnType: AWS::QConnect::KnowledgeBase
  }
}
