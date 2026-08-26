import z from "zod";
import { vantageToken } from "../../utils/zod";
import MCPUserError from "../structure/MCPUserError";
import registerTool from "../structure/registerTool";
import { budgetPeriod, periodCadence } from "./schemas";

const description = `
Creates a budget based on the parameters specified. This is useful if you have been tasked with managing budgets
or you are building a cost report with budgets in mind.
`.trim();

export default registerTool({
  name: "create-budget",
  title: "Create Budget",
  description,
  annotations: {
    destructive: false,
    openWorld: false,
    readOnly: false,
  },
  args: {
    name: z.string().min(1).describe("The name of the Budget."),
    workspace_token: vantageToken("workspace", {
      description: "Workspace to add the Budget to.",
    }).optional(),
    cost_report_token: vantageToken("cost_report", {
      description: "Ignored for hierarchical Budgets.",
    }).optional(),
    child_budget_tokens: z
      .array(vantageToken("budget"))
      .optional()
      .describe("The tokens of any child Budgets when creating a hierarchical Budget."),
    period_cadence: periodCadence
      .optional()
      .describe(
        "Interval cadence for budget periods. When set, starts_at is required (YYYY-MM-DD, or null to clear). interval_count and interval_unit may be omitted on updates. Rejected for hierarchical Budgets."
      ),
    periods: z
      .array(budgetPeriod)
      .optional()
      .describe(
        "The periods for the Budget. The start_at and end_at must be iso8601 formatted e.g. YYYY-MM-DD. Ignored for hierarchical Budgets."
      ),
  },
  async execute(args, ctx) {
    const res = await ctx.callVantageApi("/v2/budgets", args, "POST");
    if (!res.ok) {
      throw new MCPUserError({ errors: res.errors });
    }
    return res.data;
  },
});
