import { pathEncode } from "@vantage-sh/vantage-client";
import { vantageToken } from "../../utils/zod";
import MCPUserError from "../structure/MCPUserError";
import registerTool from "../structure/registerTool";

const description = `
Get a specific scenario-model ReportForecast by token.
Use list-report-forecasts to discover tokens for a Cost Report.
Requires Scenario Models (Enterprise). A 403 means the account is not entitled.
`.trim();

const args = {
  report_forecast_token: vantageToken("report_forecast"),
};

export default registerTool({
  name: "get-report-forecast",
  title: "Get Report Forecast",
  description,
  annotations: {
    destructive: false,
    openWorld: false,
    readOnly: true,
  },
  args,
  async execute(args, ctx) {
    const response = await ctx.callVantageApi(
      `/v2/report_forecasts/${pathEncode(args.report_forecast_token)}`,
      {},
      "GET"
    );
    if (!response.ok) {
      throw new MCPUserError({ errors: response.errors });
    }
    return response.data;
  },
});
