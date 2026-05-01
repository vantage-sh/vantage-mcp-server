import { pathEncode } from "@vantage-sh/vantage-client";
import z from "zod/v4";
import MCPUserError from "../structure/MCPUserError";
import registerTool from "../structure/registerTool";

const description = `
Gets a specific dashboard by its token. The token of a dashboard can be used to generate a link to the dashboard in the Vantage Web UI: https://console.vantage.sh/go/<token>
`.trim();

const args = {
	dashboard_token: z.string().describe("The dashboard token to retrieve"),
};

export default registerTool({
	name: "get-dashboard",
	title: "Get Dashboard",
	description,
	annotations: {
		destructive: false,
		openWorld: false,
		readOnly: true,
	},
	args,
	async execute(args, ctx) {
		const response = await ctx.callVantageApi(
			`/v2/dashboards/${pathEncode(args.dashboard_token)}`,
			{},
			"GET"
		);
		if (!response.ok) {
			throw new MCPUserError({ errors: response.errors });
		}
		return response.data;
	},
});
