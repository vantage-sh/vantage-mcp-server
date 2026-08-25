import type { RequestBodyForPathAndMethod } from "@vantage-sh/vantage-client";
import z from "zod";
import { vantageToken } from "../../utils/zod";
import MCPUserError from "../structure/MCPUserError";
import registerTool from "../structure/registerTool";
import { budgetPeriod, periodCadence } from "./schemas";

const description = `
Creates a budget based on the parameters specified. This is useful if you have been tasked with managing budgets
or you are building a cost report with budgets in mind.
`.trim();

type CreateBudgetRequest = RequestBodyForPathAndMethod<"/v2/budgets", "POST">;

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
        "Interval cadence for budget periods (starts_at, interval_count, interval_unit). Requires flexible_budget_periods. Ignored for hierarchical Budgets."
      ),
    periods: z
      .array(budgetPeriod)
      .optional()
      .describe(
        "The periods for the Budget. The start_at and end_at must be iso8601 formatted e.g. YYYY-MM-DD. Ignored for hierarchical Budgets."
      ),
  },
  async execute(args, ctx) {
    // period_cadence is on the V2 API but not yet in @vantage-sh/vantage-client types.
    const res = await ctx.callVantageApi("/v2/budgets", args as CreateBudgetRequest, "POST");
    if (!res.ok) {
      throw new MCPUserError({ errors: res.errors });
    }
    return res.data;
  },
});
