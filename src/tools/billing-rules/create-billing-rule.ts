import z from "zod";
import MCPUserError from "../structure/MCPUserError";
import registerTool from "../structure/registerTool";
import dateValidator from "../../utils/dateValidator";

const description = `
Creates a new Billing Rule. Billing rules allow you to adjust, exclude, credit, charge, or apply custom modifications to your cost data.
The required fields depend on the rule type:
- Exclusion rules require charge_type.
- Adjustment rules require percentage. Optionally accepts service and category to scope the adjustment.
- Charge and Credit rules require service, category, sub_category, amount, and start_date.
- Custom rules require sql_query.
`.trim();

export default registerTool({
  name: "create-billing-rule",
  title: "Create Billing Rule",
  description,
  annotations: {
    destructive: false,
    openWorld: false,
    readOnly: false,
  },
  args: {
    type: z.enum(["exclusion", "adjustment", "credit", "charge", "custom"]).describe("The type of billing rule."),
    title: z.string().min(1).describe("The title of the Billing Rule."),
    start_date: dateValidator(
      "The start date for the billing rule in ISO 8601 format (YYYY-MM-DD). Required for Charge and Credit rules."
    ).optional(),
    end_date: dateValidator("The end date for the billing rule in ISO 8601 format (YYYY-MM-DD).").optional(),
    apply_to_all: z.boolean().optional().describe("Whether the rule applies to all cost reports."),
    charge_type: z.string().min(1).optional().describe("The charge type. Required for Exclusion rules."),
    percentage: z.number().optional().describe("The percentage adjustment. Required for Adjustment rules (e.g. 75.0)."),
    service: z
      .string()
      .min(1)
      .optional()
      .describe("The service. Required for Charge and Credit rules, optional for Adjustment rules."),
    category: z
      .string()
      .min(1)
      .optional()
      .describe("The category. Required for Charge and Credit rules, optional for Adjustment rules."),
    sub_category: z.string().min(1).optional().describe("The sub-category. Required for Charge and Credit rules."),
    amount: z.number().optional().describe("The amount. Required for Charge and Credit rules (e.g. 300)."),
    sql_query: z.string().min(1).optional().describe("The SQL query. Required for Custom rules."),
  },
  async execute(args, ctx) {
    const res = await ctx.callVantageApi("/v2/billing_rules", args, "POST");
    if (!res.ok) {
      throw new MCPUserError({ errors: res.errors });
    }
    return res.data;
  },
});
