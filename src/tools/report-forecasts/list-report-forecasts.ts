import z from "zod";
import paginationData from "../../utils/paginationData";
import { DEFAULT_LIMIT } from "../structure/constants";
import MCPUserError from "../structure/MCPUserError";
import registerTool from "../structure/registerTool";

const description = `
List scenario-model ReportForecasts for a Cost Report.
ReportForecasts assign ScenarioModels (and optionally a BusinessMetric) to a Cost Report for planning views.
Use page 1 when calling this tool for the first time. Keep calling with pagination.nextPage until pagination.hasNextPage is false when listing all forecasts.
The token of a ReportForecast can be used with get-report-forecast, update-report-forecast, and delete-report-forecast.
Requires Scenario Models (Enterprise). A 403 means the account is not entitled.
`.trim();

const args = {
  cost_report_token: z
    .string()
    .min(1)
    .describe("Cost Report token to list forecasts for. Use list-cost-reports to discover tokens."),
  page: z.number().optional().default(1).describe("The page number to return, defaults to 1."),
};

export default registerTool({
  name: "list-report-forecasts",
  title: "List Report Forecasts",
  description,
  annotations: {
    destructive: false,
    openWorld: false,
    readOnly: true,
  },
  args,
  async execute(args, ctx) {
    const requestParams = { ...args, limit: DEFAULT_LIMIT };
    const response = await ctx.callVantageApi("/v2/report_forecasts", requestParams, "GET");
    if (!response.ok) {
      throw new MCPUserError({ errors: response.errors });
    }
    return {
      report_forecasts: response.data.report_forecasts,
      pagination: paginationData(response.data),
    };
  },
});
