import z from "zod";
import { pastDateIntervalOptions } from "../../utils/dateIntervalOptions";
import dateValidator from "../../utils/dateValidator";
import { vantageToken } from "../../utils/zod";
import MCPUserError from "../structure/MCPUserError";
import registerTool from "../structure/registerTool";
import { groupingDescription, groupingSchema } from "./schemas";

const description = `
Creates a saved Financial Commitment Report for analyzing committed spend and on-demand costs.
`.trim();

export default registerTool({
  name: "create-financial-commitment-report",
  title: "Create Financial Commitment Report",
  description,
  annotations: {
    destructive: false,
    openWorld: false,
    readOnly: false,
  },
  args: {
    workspace_token: vantageToken("workspace"),
    title: z.string().min(1).describe("Title for the new Financial Commitment Report"),
    filter: z.string().optional().describe("VQL filter to apply to the Financial Commitment Report"),
    start_date: dateValidator(
      "The start date of the Financial Commitment Report. ISO 8601 Formatted. Incompatible with 'date_interval' parameter."
    ).optional(),
    end_date: dateValidator(
      "The end date of the Financial Commitment Report. ISO 8601 Formatted. Incompatible with 'date_interval' parameter, required with 'start_date'."
    ).optional(),
    date_interval: z
      .enum(pastDateIntervalOptions)
      .optional()
      .describe(
        "The date interval of the Financial Commitment Report. Incompatible with 'start_date' and 'end_date' parameters."
      ),
    date_bucket: z.enum(["hour", "day", "week", "month", "quarter"]).optional().describe("Date aggregation bucket"),
    on_demand_costs_scope: z.enum(["discountable", "all"]).optional().describe("Scope for on-demand costs"),
    groupings: z.array(groupingSchema).optional().describe(groupingDescription),
  },
  async execute(args, ctx) {
    const response = await ctx.callVantageApi("/v2/financial_commitment_reports", args, "POST");
    if (!response.ok) {
      throw new MCPUserError({ errors: response.errors });
    }
    return response.data;
  },
});
