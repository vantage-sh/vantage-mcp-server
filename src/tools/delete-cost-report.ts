import { pathEncode } from "@vantage-sh/vantage-client";
import z from "zod/v4";
import MCPUserError from "./structure/MCPUserError";
import registerTool from "./structure/registerTool";

const description = `
Deletes a cost report by its token. This action is irreversible.
`.trim();

const args = {
	cost_report_token: z.string().describe("Token of the cost report to delete"),
};

export default registerTool({
	name: "delete-cost-report",
	description,
	annotations: {
		destructive: true,
		openWorld: false,
		readOnly: false,
	},
	args,
	async execute(args, ctx) {
		const response = await ctx.callVantageApi(
			`/v2/cost_reports/${pathEncode(args.cost_report_token)}`,
			{},
			"DELETE"
		);
		if (!response.ok) {
			throw new MCPUserError({ errors: response.errors });
		}
		return { token: args.cost_report_token };
	},
});
