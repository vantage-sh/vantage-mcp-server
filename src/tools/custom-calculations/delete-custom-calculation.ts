import { pathEncode } from "@vantage-sh/vantage-client";
import { vantageToken } from "../../utils/zod";
import MCPUserError from "../structure/MCPUserError";
import registerTool from "../structure/registerTool";

const description = `Delete a Custom Calculation (KPI), removing it from every attached Cost Report. Read-only calculations cannot be deleted.`;

export default registerTool({
  name: "delete-custom-calculation",
  title: "Delete Custom Calculation",
  description,
  annotations: { readOnly: false, destructive: true, openWorld: false },
  args: {
    custom_calculation_token: vantageToken("custom_calculation"),
  },
  async execute(args, ctx) {
    const response = await ctx.callVantageApi(
      `/v2/custom_calculations/${pathEncode(args.custom_calculation_token)}`,
      {},
      "DELETE"
    );
    if (!response.ok) {
      throw new MCPUserError({ errors: response.errors });
    }
    return { token: args.custom_calculation_token };
  },
});
