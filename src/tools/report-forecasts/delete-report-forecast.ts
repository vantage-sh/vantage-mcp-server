import { pathEncode } from "@vantage-sh/vantage-client";
import { vantageToken } from "../../utils/zod";
import MCPUserError from "../structure/MCPUserError";
import registerTool from "../structure/registerTool";

const description = `
Delete a scenario-model ReportForecast by token. This action is irreversible.
Requires Scenario Models (Enterprise). A 403 means the account is not entitled or the caller cannot update the Cost Report.
`.trim();

export default registerTool({
  name: "delete-report-forecast",
  title: "Delete Report Forecast",
  description,
  annotations: {
    destructive: true,
    openWorld: false,
    readOnly: false,
  },
  args: {
    report_forecast_token: vantageToken("report_forecast"),
  },
  async execute(args, ctx) {
    const response = await ctx.callVantageApi(
      `/v2/report_forecasts/${pathEncode(args.report_forecast_token)}`,
      {},
      "DELETE"
    );
    if (!response.ok) {
      throw new MCPUserError({ errors: response.errors });
    }
    return { token: args.report_forecast_token };
  },
});
