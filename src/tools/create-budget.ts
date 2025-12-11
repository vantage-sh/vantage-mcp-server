import z from "zod";
import MCPUserError from "./structure/MCPUserError";
import registerTool from "./structure/registerTool";
import dateValidator from "./utils/dateValidator";

const description = `
Creates a budget based on the parameters specified. This is useful if you have been tasked with managing budgets
or you are building a cost report with budgets in mind.
`.trim();

const period = z.object({
	start_at: dateValidator("The start date of the period."),
	end_at: dateValidator("The end date of the period.").optional(),
	amount: z.number().min(0).describe("The amount of the period."),
});

export default registerTool({
	name: "create-budget",
	description,
	args: {
		name: z.string().min(1).describe("The name of the Budget."),
		workspace_token: z
			.string()
			.optional()
			.describe("The token of the Workspace to add the Budget to."),
		cost_report_token: z
			.string()
			.optional()
			.describe("The CostReport token. Ignored for hierarchical Budgets."),
		child_budget_tokens: z
			.array(z.string())
			.optional()
			.describe("The tokens of any child Budgets when creating a hierarchical Budget."),
		periods: z
			.array(period)
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
