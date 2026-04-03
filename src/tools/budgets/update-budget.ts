import { pathEncode } from "@vantage-sh/vantage-client";
import z from "zod/v4";
import MCPUserError from "../structure/MCPUserError";
import registerTool from "../structure/registerTool";
import { budgetPeriod } from "./schemas";

const description = `
Updates an existing Budget. You can update the name, linked Cost Report, child Budget tokens for hierarchical budgets, or budget periods.
`.trim();

export default registerTool({
	name: "update-budget",
	description,
	annotations: {
		destructive: false,
		openWorld: false,
		readOnly: false,
	},
	args: {
		budget_token: z.string().describe("The token of the Budget to update."),
		name: z.string().min(1).optional().describe("The updated name of the Budget."),
		cost_report_token: z
			.string()
			.optional()
			.describe("The updated CostReport token. Ignored for hierarchical Budgets."),
		child_budget_tokens: z
			.array(z.string())
			.optional()
			.describe("The updated tokens of child Budgets for a hierarchical Budget."),
		periods: z
			.array(budgetPeriod)
			.optional()
			.describe(
				"The updated periods for the Budget. The start_at and end_at must be iso8601 formatted e.g. YYYY-MM-DD. Ignored for hierarchical Budgets."
			),
	},
	async execute(args, ctx) {
		const { budget_token, ...body } = args;
		const response = await ctx.callVantageApi(
			`/v2/budgets/${pathEncode(budget_token)}`,
			body,
			"PUT"
		);
		if (!response.ok) {
			throw new MCPUserError({ errors: response.errors });
		}
		return response.data;
	},
});
