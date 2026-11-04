import { pathEncode } from "@vantage-sh/vantage-client";
import { vantageToken } from "../../utils/zod";
import MCPUserError from "../structure/MCPUserError";
import registerTool from "../structure/registerTool";

const description = `Get a Custom Calculation (KPI), including its definition, read-only status, and visible Cost Report attachment tokens.`;

export default registerTool({
  name: "get-custom-calculation",
  title: "Get Custom Calculation",
  description,
  annotations: { readOnly: true, destructive: false, openWorld: false },
  args: {
    custom_calculation_token: vantageToken("custom_calculation"),
  },
  async execute(args, ctx) {
    const response = await ctx.callVantageApi(
      `/v2/custom_calculations/${pathEncode(args.custom_calculation_token)}`,
      {},
      "GET"
    );
    if (!response.ok) {
      throw new MCPUserError({ errors: response.errors });
    }
    return response.data;
  },
});
