import { nonempty } from "../../utils/zod";
import MCPUserError from "../structure/MCPUserError";
import registerTool from "../structure/registerTool";
import { calculationFilter, displayAs, operation, unitScale } from "./schemas";

const description = `Create a reusable Custom Calculation (KPI) from cost or usage data. Use update-custom-calculation or update-cost-report to attach it to Cost Reports.`;

export default registerTool({
  name: "create-custom-calculation",
  title: "Create Custom Calculation",
  description,
  annotations: { readOnly: false, destructive: false, openWorld: false },
  args: {
    title: nonempty().describe("Title of the Custom Calculation."),
    filter: calculationFilter,
    operation: operation.optional(),
    display_as: displayAs.optional(),
    unit_scale: unitScale.optional(),
  },
  async execute(args, ctx) {
    const response = await ctx.callVantageApi("/v2/custom_calculations", args, "POST");
    if (!response.ok) {
      throw new MCPUserError({ errors: response.errors });
    }
    return response.data;
  },
});
