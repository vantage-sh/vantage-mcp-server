import z from "zod";
import { vantageToken } from "../../utils/zod";
import { paginationSchema } from "../../utils/zod/output";

export const scenarioModelTokens = z
  .array(vantageToken("scenario_model"))
  .optional()
  .describe("ScenarioModel tokens to assign to the forecast. Use list-scenario-models to discover tokens.");

export const nullableBusinessMetricToken = vantageToken("business_metric", {
  description: "Send null to clear.",
})
  .nullable()
  .optional();

export const setAsDefault = z
  .boolean()
  .optional()
  .describe("When true, sets this ReportForecast as the default forecast for its Cost Report.");

// Output schemas mirror the Vantage client response types.
export const reportForecastResponseSchema = z.object({
  token: z.string().describe("The token identifying this resource."),
  title: z.string().describe("Title."),
  cost_report_token: z.string().describe("Cost report token."),
  scenario_model_tokens: z.array(z.string()).describe("Scenario model tokens."),
  business_metric_token: z.string().nullable().describe("Business metric token."),
  is_default: z.boolean().describe("Is default."),
  created_by_token: z.string().nullable().describe("Created by token."),
  created_at: z.string().describe("Created at."),
  updated_at: z.string().describe("Updated at."),
});

export const listReportForecastsResponseSchema = z.object({
  report_forecasts: z.array(reportForecastResponseSchema).describe("Report forecasts."),
  pagination: paginationSchema.describe("Pagination information for these results."),
});

export const reportForecastOutputSchema = reportForecastResponseSchema.shape;

export const listReportForecastsOutputSchema = listReportForecastsResponseSchema.shape;
