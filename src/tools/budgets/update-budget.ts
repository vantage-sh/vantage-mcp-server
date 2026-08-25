import { type NoSlashString, pathEncode, type RequestBodyForPathAndMethod } from "@vantage-sh/vantage-client";
import z from "zod";
import { vantageToken } from "../../utils/zod";
import MCPUserError from "../structure/MCPUserError";
import registerTool from "../structure/registerTool";
import { budgetPeriod, periodCadence } from "./schemas";

const description = `
Updates an existing Budget. You can update the name, linked Cost Report, child Budget tokens for hierarchical budgets, period cadence, or budget periods.
`.trim();

type UpdateBudgetRequest = RequestBodyForPathAndMethod<`/v2/budgets/${NoSlashString}`, "PUT">;

export default registerTool({
  name: "update-budget",
  title: "Update Budget",
  description,
  annotations: {
    destructive: true,
    openWorld: false,
    readOnly: false,
  },
  args: {
    budget_token: vantageToken("budget"),
    name: z.string().min(1).optional().describe("The updated name of the Budget."),
    cost_report_token: vantageToken("cost_report", {
      description: "Ignored for hierarchical Budgets.",
    }).optional(),
    child_budget_tokens: z
      .array(vantageToken("budget"))
      .optional()
      .describe("The updated tokens of child Budgets for a hierarchical Budget."),
    period_cadence: periodCadence
      .optional()
      .describe(
        "Updated interval cadence for budget periods (starts_at, interval_count, interval_unit). Requires flexible_budget_periods. Ignored for hierarchical Budgets."
      ),
    periods: z
      .array(budgetPeriod)
      .optional()
      .describe(
        "The updated periods for the Budget. The start_at and end_at must be iso8601 formatted e.g. YYYY-MM-DD. Ignored for hierarchical Budgets."
      ),
  },
  async execute(args, ctx) {
    const { budget_token, ...body } = args;
    // period_cadence is on the V2 API but not yet in @vantage-sh/vantage-client types.
    const response = await ctx.callVantageApi(
      `/v2/budgets/${pathEncode(budget_token)}`,
      body as UpdateBudgetRequest,
      "PUT"
    );
    if (!response.ok) {
      throw new MCPUserError({ errors: response.errors });
    }
    return response.data;
  },
});
