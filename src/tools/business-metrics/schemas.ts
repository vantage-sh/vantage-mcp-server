import z from "zod";
import dateValidator from "../../utils/dateValidator";
import { vantageToken } from "../../utils/zod";
import { paginationSchema } from "../../utils/zod/output";

export const BUSINESS_METRICS_LIST_LIMIT = 1000;
export const BUSINESS_METRIC_DATA_LIMIT = 5000;

export const businessMetricValueArgs = {
  business_metric_token: vantageToken("business_metric"),
  page: z.number().optional().default(1).describe("The page number to return, defaults to 1."),
  start_date: dateValidator(
    "Query BusinessMetric values by the first date to filter from. Must be YYYY-MM-DD format."
  ).optional(),
};

export const historicalBusinessMetricValueArgs = {
  ...businessMetricValueArgs,
  date_bin: z
    .enum(["raw", "day", "month"])
    .optional()
    .default("month")
    .describe(
      "Time aggregation. Defaults to month. Day and month sum amounts by UTC bucket and label; raw preserves original timestamps, including hourly values. Use raw for gauges or percentages when summing is not appropriate."
    ),
  label_values: z
    .array(z.string())
    .optional()
    .describe(
      "Return values matching any exact label value. For multi-label metrics, matches values under any label key. If exact values are not confirmed, call list-business-metric-labels first."
    ),
};

// Output schemas mirror the Vantage client response types.
export const attachedCostReportForBusinessMetricResponseSchema = z.object({
  cost_report_token: z.string().nullable().describe("The token of the CostReport the BusinessMetric is attached to."),
  unit_scale: z
    .enum(["per_unit", "per_hundred", "per_thousand", "per_million", "per_billion"])
    .describe("Determines the scale of the BusinessMetric's values within a particular CostReport."),
  calculation_type: z
    .enum(["unit_cost", "gross_margin", "usage_unit_cost", "raw_business_metric"])
    .describe("The calculation type applied when this BusinessMetric is used in the CostReport."),
  label: z
    .string()
    .nullable()
    .optional()
    .describe(
      "Optional custom display name for this BusinessMetric on the CostReport. When omitted, a default is derived from the calculation type."
    ),
  label_filter: z
    .array(z.string())
    .nullable()
    .optional()
    .describe("The labels that the BusinessMetric is filtered by within a particular CostReport."),
  label_filters: z
    .record(z.string(), z.unknown())
    .nullable()
    .optional()
    .describe(
      "The ClickHouse BusinessMetric label filters applied within a CostReport. Each key is required and values within a key are alternatives."
    ),
});

export const cloudwatchDimensionResponseSchema = z.object({
  name: z.string().describe("Name."),
  value: z.string().describe("Value."),
});

export const cloudwatchFieldsResponseSchema = z.object({
  stat: z
    .enum(["Sum", "Average", "Minimum", "Maximum"])
    .describe("The time aggregation function used to import Cloudwatch metrics."),
  region: z.string().describe("The region used to import Cloudwatch metrics."),
  namespace: z.string().describe("The namespace used to import Cloudwatch metrics."),
  metric_name: z.string().describe("The metric name used to import Cloudwatch metrics."),
  dimensions: z
    .array(cloudwatchDimensionResponseSchema)
    .describe("The dimensions used to pull specific statistical data for Cloudwatch metrics."),
  label_dimension: z.string().nullable().describe("The dimension used to aggregate the Cloudwatch metrics."),
});

export const datadogMetricFieldsResponseSchema = z.object({
  query: z.string().describe("The query used to import Datadog metrics."),
});

export const gcpBigqueryMetricFieldsResponseSchema = z.object({
  sql_query: z.string().describe("The SQL query used to import GCP BigQuery metrics."),
  query_project_id: z.string().describe("The GCP project in which the BigQuery job runs."),
});

export const snowflakeMetricFieldsResponseSchema = z.object({
  sql_query: z.string().describe("The SQL query used to import Snowflake metrics."),
});

export const clickhouseMetricFieldsResponseSchema = z.object({
  query_endpoint_id: z.string().describe("The UUID of the ClickHouse query endpoint used to import metrics."),
});

export const businessMetricResponseSchema = z.object({
  token: z.string().describe("The token of the BusinessMetric."),
  title: z.string().describe("The title of the BusinessMetric."),
  created_by_token: z.string().nullable().optional().describe("The token of the Creator of the BusinessMetric."),
  cost_report_tokens_with_metadata: z
    .array(attachedCostReportForBusinessMetricResponseSchema)
    .describe("The tokens for any CostReports that use the BusinessMetric, the unit scale, and label filter."),
  import_type: z
    .enum([
      "datadog_metrics",
      "cloudwatch",
      "clickhouse_metrics",
      "gcp_bigquery_metrics",
      "snowflake_metrics",
      "metronome_metrics",
      "csv",
    ])
    .nullable()
    .describe("The type of import for the BusinessMetric."),
  integration_token: z.string().nullable().describe("The Integration token used to import the BusinessMetric."),
  cloudwatch_fields: cloudwatchFieldsResponseSchema.optional().describe("Cloudwatch fields."),
  datadog_metric_fields: datadogMetricFieldsResponseSchema.optional().describe("Datadog metric fields."),
  gcp_bigquery_metric_fields: gcpBigqueryMetricFieldsResponseSchema.optional().describe("Gcp bigquery metric fields."),
  snowflake_metric_fields: snowflakeMetricFieldsResponseSchema.optional().describe("Snowflake metric fields."),
  clickhouse_metric_fields: clickhouseMetricFieldsResponseSchema.optional().describe("Clickhouse metric fields."),
});

export const businessMetricValueResponseSchema = z.object({
  date: z.string().describe("The date of the Business Metric Value. ISO 8601 formatted."),
  amount: z.string().describe("The amount of the Business Metric Value as a string to ensure precision."),
  label: z.string().nullable().optional().describe("The label of the Business Metric Value."),
});

export const businessMetricValuesResponseSchema = z.object({
  values: z.array(businessMetricValueResponseSchema).describe("Values."),
  pagination: paginationSchema.describe("Pagination information for these results."),
});

export const businessMetricLabelResponseSchema = z.object({
  value: z.string().describe("A label value associated with the BusinessMetric."),
});

export const listBusinessMetricLabelsResponseSchema = z.object({
  labels: z.array(businessMetricLabelResponseSchema).describe("Labels."),
  pagination: paginationSchema.describe("Pagination information for these results."),
});

export const listBusinessMetricsResponseSchema = z.object({
  business_metrics: z.array(businessMetricResponseSchema).describe("Business metrics."),
  pagination: paginationSchema.describe("Pagination information for these results."),
});

export const businessMetricOutputSchema = businessMetricResponseSchema.shape;

export const businessMetricValuesOutputSchema = businessMetricValuesResponseSchema.shape;

export const listBusinessMetricLabelsOutputSchema = listBusinessMetricLabelsResponseSchema.shape;

export const listBusinessMetricsOutputSchema = listBusinessMetricsResponseSchema.shape;
