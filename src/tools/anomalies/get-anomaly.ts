import { pathEncode } from "@vantage-sh/vantage-client";
import { vantageToken } from "../../utils/zod";
import MCPUserError from "../structure/MCPUserError";
import registerTool from "../structure/registerTool";

const description = `
Gets a specific anomaly alert by its token.
`.trim();

const args = {
  anomaly_alert_token: vantageToken("anomaly_alert"),
};

export default registerTool({
  name: "get-anomaly",
  title: "Get Anomaly",
  description,
  annotations: {
    destructive: false,
    openWorld: false,
    readOnly: true,
  },
  args,
  async execute(args, ctx) {
    const response = await ctx.callVantageApi(`/v2/anomaly_alerts/${pathEncode(args.anomaly_alert_token)}`, {}, "GET");
    if (!response.ok) {
      throw new MCPUserError({ errors: response.errors });
    }
    return response.data;
  },
});
