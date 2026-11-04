import z from "zod";
import paginationData from "../../utils/paginationData";
import { DEFAULT_LIMIT } from "../structure/constants";
import MCPUserError from "../structure/MCPUserError";
import registerTool from "../structure/registerTool";

const description = `List accessible Custom Calculations (KPIs), including reusable read-only calculations and their visible Cost Report attachment tokens.`;

export default registerTool({
  name: "list-custom-calculations",
  title: "List Custom Calculations",
  description,
  annotations: { readOnly: true, destructive: false, openWorld: false },
  args: {
    page: z.number().int().min(1).optional().default(1).describe("Page number, defaults to 1."),
  },
  async execute(args, ctx) {
    const response = await ctx.callVantageApi("/v2/custom_calculations", { ...args, limit: DEFAULT_LIMIT }, "GET");
    if (!response.ok) {
      throw new MCPUserError({ errors: response.errors });
    }
    return { custom_calculations: response.data.custom_calculations, pagination: paginationData(response.data) };
  },
});
