import { pathEncode, type UpdateReportForecastRequest } from "@vantage-sh/vantage-client";
import z from "zod";
import { vantageToken } from "../../utils/zod";
import MCPUserError from "../structure/MCPUserError";
import registerTool from "../structure/registerTool";
import { nullableBusinessMetricToken, scenarioModelTokens, setAsDefault } from "./schemas";

const description = `
Update a scenario-model ReportForecast. Providing scenario_model_tokens replaces the assigned models.
Send business_metric_token as null to clear the BusinessMetric. Use set_as_default to make this the Cost Report default forecast.
Requires Scenario Models (Enterprise). A 403 means the account is not entitled or the caller cannot update the Cost Report.
`.trim();

export default registerTool({
  name: "update-report-forecast",
  title: "Update Report Forecast",
  description,
  annotations: {
    destructive: true,
    openWorld: false,
    readOnly: false,
  },
  args: {
    report_forecast_token: vantageToken("report_forecast"),
    title: z.string().min(1).optional().describe("Updated title for the ReportForecast."),
    scenario_model_tokens: scenarioModelTokens,
    business_metric_token: nullableBusinessMetricToken,
    set_as_default: setAsDefault,
  },
  async execute(args, ctx) {
    const { report_forecast_token, ...body } = args;

    if (
      body.title === undefined &&
      body.scenario_model_tokens === undefined &&
      body.business_metric_token === undefined &&
      body.set_as_default === undefined
    ) {
      throw new MCPUserError({
        errors: [
          {
            message:
              "At least one of title, scenario_model_tokens, business_metric_token, or set_as_default must be provided",
          },
        ],
      });
    }

    const response = await ctx.callVantageApi(
      `/v2/report_forecasts/${pathEncode(report_forecast_token)}`,
      body as UpdateReportForecastRequest,
      "PUT"
    );
    if (!response.ok) {
      throw new MCPUserError({ errors: response.errors });
    }
    return response.data;
  },
});
