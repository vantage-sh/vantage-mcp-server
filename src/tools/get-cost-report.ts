import { pathEncode } from "@vantage-sh/vantage-client";
import z from "zod/v4";
import MCPUserError from "./structure/MCPUserError";
import registerTool from "./structure/registerTool";

const description = `
Gets a specific cost report by its token. The token of a report can be used to generate a link to the report in the Vantage Web UI: https://console.vantage.sh/go/<token>
The same token can be used with the get-cost-report-forecast tool to retrieve forecasted future costs for the report.
`.trim();

const args = {
	cost_report_token: z.string().describe("The cost report token to retrieve"),
};

export default registerTool({
	name: "get-cost-report",
	description,
	annotations: {
		destructive: false,
		openWorld: false,
		readOnly: true,
	},
	args,
	async execute(args, ctx) {
		const response = await ctx.callVantageApi(
			`/v2/cost_reports/${pathEncode(args.cost_report_token)}`,
			{},
			"GET"
		);
		if (!response.ok) {
			throw new MCPUserError({ errors: response.errors });
		}
		return response.data;
	},
});
