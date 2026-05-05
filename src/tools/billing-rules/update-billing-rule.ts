import { pathEncode } from "@vantage-sh/vantage-client";
import z from "zod/v4";
import MCPUserError from "../structure/MCPUserError";
import registerTool from "../structure/registerTool";
import dateValidator from "../utils/dateValidator";

const description = `
Updates an existing Billing Rule. You can update the title, dates, and type-specific fields.
`.trim();

export default registerTool({
  name: "update-billing-rule",
  title: "Update Billing Rule",
  description,
  annotations: {
    destructive: true,
    openWorld: false,
    readOnly: false,
  },
  args: {
    billing_rule_token: z.string().describe("The token of the Billing Rule to update."),
    title: z.string().min(1).optional().describe("The updated title of the Billing Rule."),
    start_date: dateValidator("The updated start date in ISO 8601 format (YYYY-MM-DD).").optional(),
    end_date: dateValidator("The updated end date in ISO 8601 format (YYYY-MM-DD).").optional(),
    apply_to_all: z.boolean().optional().describe("Whether the rule applies to all cost reports."),
    charge_type: z.string().optional().describe("The charge type."),
    percentage: z.number().optional().describe("The percentage adjustment (e.g. 75.0)."),
    service: z.string().optional().describe("The service."),
    category: z.string().optional().describe("The category."),
    sub_category: z.string().optional().describe("The sub-category."),
    start_period: z.string().optional().describe("The start period."),
    amount: z.number().optional().describe("The amount (e.g. 300)."),
    sql_query: z.string().optional().describe("The SQL query for Custom rules."),
  },
  async execute(args, ctx) {
    const { billing_rule_token, ...body } = args;
    const response = await ctx.callVantageApi(`/v2/billing_rules/${pathEncode(billing_rule_token)}`, body, "PUT");
    if (!response.ok) {
      throw new MCPUserError({ errors: response.errors });
    }
    return response.data;
  },
});
