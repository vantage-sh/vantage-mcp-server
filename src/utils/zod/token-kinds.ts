/**
 * Vantage token kinds and their API prefixes.
 * Source of truth: public route parameters and request fields in
 * `@vantage-sh/vantage-client`.
 *
 * Kind keys use public API resource names rather than underlying model names.
 */
export const TOKEN_KINDS = {
  access_grant: {
    prefix: "rsrc_accss_grnt",
    label: "Access Grant",
  },
  annotation: {
    prefix: "issue",
    label: "Annotation",
  },
  anomaly_alert: {
    prefix: "anmly_alrt",
    label: "Anomaly Alert",
  },
  anomaly_notification: {
    prefix: "rprt_alrt",
    label: "Anomaly Notification",
  },
  audit_log: {
    prefix: "adt_lg",
    label: "Audit Log",
  },
  billing_profile: {
    prefix: "blng_prfl",
    label: "Billing Profile",
  },
  billing_rule: {
    prefix: "bllng_rule",
    label: "Billing Rule",
  },
  budget: {
    prefix: "bdgt",
    label: "Budget",
  },
  budget_alert: {
    prefix: "bdgt_alrt",
    label: "Budget Alert",
  },
  business_metric: {
    prefix: "bsnss_mtrc",
    label: "Business Metric",
  },
  canvas: {
    prefix: "cnvs",
    label: "Canvas",
  },
  cost_alert: {
    prefix: "cstm_alrt_rl",
    label: "Cost Alert",
  },
  cost_alert_event: {
    prefix: "cstm_alrt_evnt",
    label: "Cost Alert Event",
  },
  cost_report: {
    prefix: "rprt",
    label: "Cost Report",
  },
  dashboard: {
    prefix: "dshbrd",
    label: "Dashboard",
  },
  data_export: {
    prefix: "dta_xprt",
    label: "Data Export",
  },
  financial_commitment_report: {
    prefix: "fncl_cmnt_rprt",
    label: "Financial Commitment Report",
  },
  folder: {
    prefix: "fldr",
    label: "Folder",
  },
  integration: {
    prefix: "accss_crdntl",
    label: "Integration",
  },
  invoice: {
    prefix: "msp_inv",
    label: "Invoice",
  },
  kubernetes_efficiency_report: {
    prefix: "kbnts_eff_rprt",
    label: "Kubernetes Efficiency Report",
  },
  managed_account: {
    prefix: "acct",
    label: "Managed Account",
  },
  network_flow_report: {
    prefix: "ntflw_lg_rprt",
    label: "Network Flow Report",
  },
  provider_resource: {
    prefix: "prvdr_rsrc",
    label: "Provider Resource",
  },
  recommendation: {
    prefix: "rcmmndtn",
    label: "Recommendation",
  },
  recommendation_view: {
    prefix: "rec_vw",
    label: "Recommendation View",
  },
  report_forecast: {
    prefix: "rprt_frcst",
    label: "Report Forecast",
  },
  report_notification: {
    prefix: "rprt_ntfctn",
    label: "Report Notification",
  },
  resource_report: {
    prefix: "prvdr_rsrc_rprt",
    label: "Resource Report",
  },
  saved_filter: {
    prefix: "svd_fltr",
    label: "Saved Filter",
  },
  scenario_model: {
    prefix: "frcst_mdl",
    label: "Scenario Model",
  },
  segment: {
    prefix: "fltr_sgmt",
    label: "Segment",
  },
  team: {
    prefix: "team",
    label: "Team",
  },
  user: {
    prefix: "usr",
    label: "User",
  },
  user_costs_upload: {
    prefix: "usr_csts_upld",
    label: "User Costs Upload",
  },
  virtual_tag_config: {
    prefix: "vtag",
    label: "Virtual Tag Config",
  },
  virtual_tag_config_value: {
    prefix: "vtag_val",
    label: "Virtual Tag Config Value",
  },
  workspace: {
    prefix: "wrkspc",
    label: "Workspace",
  },
} as const;

export type TokenKind = keyof typeof TOKEN_KINDS;
