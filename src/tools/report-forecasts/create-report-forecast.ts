import type { CreateReportForecastRequest } from "@vantage-sh/vantage-client";
import z from "zod";
import MCPUserError from "../structure/MCPUserError";
import registerTool from "../structure/registerTool";
import { nullableBusinessMetricToken, scenarioModelTokens, setAsDefault } from "./schemas";

const description = `
Create a scenario-model ReportForecast for a Cost Report.
Provide at least one of scenario_model_tokens or business_metric_token. Use list-scenario-models and list-business-metrics to discover tokens.
Requires Scenario Models (Enterprise). A 403 means the account is not entitled or the caller cannot update the Cost Report.
`.trim();

export default registerTool({
  name: "create-report-forecast",
  title: "Create Report Forecast",
  description,
  annotations: {
    destructive: false,
    openWorld: false,
    readOnly: false,
  },
  args: {
    cost_report_token: z
      .string()
      .min(1)
      .describe("Cost Report token to attach the forecast to. Use list-cost-reports to discover tokens."),
    title: z.string().min(1).describe("Title for the new ReportForecast."),
    scenario_model_tokens: scenarioModelTokens,
    business_metric_token: nullableBusinessMetricToken,
    set_as_default: setAsDefault,
  },
  async execute(args, ctx) {
    const hasScenarioModels = args.scenario_model_tokens !== undefined && args.scenario_model_tokens.length > 0;
    const hasBusinessMetric = args.business_metric_token !== undefined && args.business_metric_token !== null;

    if (!hasScenarioModels && !hasBusinessMetric) {
      throw new MCPUserError({
        errors: [
          {
            message: "At least one of scenario_model_tokens or business_metric_token must be provided",
          },
        ],
      });
    }

    const response = await ctx.callVantageApi("/v2/report_forecasts", args as CreateReportForecastRequest, "POST");
    if (!response.ok) {
      throw new MCPUserError({ errors: response.errors });
    }
    return response.data;
  },
});
