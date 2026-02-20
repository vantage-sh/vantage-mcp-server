import { pathEncode } from "@vantage-sh/vantage-client";
import z from "zod/v4";
import MCPUserError from "./structure/MCPUserError";
import registerTool from "./structure/registerTool";

const description = `
Gets a specific anomaly alert by its token.
`.trim();

const args = {
	anomaly_alert_token: z.string().describe("The anomaly alert token to retrieve"),
};

export default registerTool({
	name: "get-anomaly",
	description,
	annotations: {
		destructive: false,
		openWorld: false,
		readOnly: true,
	},
	args,
	async execute(args, ctx) {
		const response = await ctx.callVantageApi(
			`/v2/anomaly_alerts/${pathEncode(args.anomaly_alert_token)}`,
			{},
			"GET"
		);
		if (!response.ok) {
			throw new MCPUserError({ errors: response.errors });
		}
		return response.data;
	},
});
