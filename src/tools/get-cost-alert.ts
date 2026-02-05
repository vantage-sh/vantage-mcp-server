import z from "zod/v4";
import MCPUserError from "./structure/MCPUserError";
import registerTool from "./structure/registerTool";

const description = `
Gets a specific cost alert by its token.
`.trim();

const args = {
	cost_alert_token: z.string().describe("The cost alert token to retrieve"),
};

export default registerTool({
	name: "get-cost-alert",
	description,
	annotations: {
		destructive: false,
		openWorld: false,
		readOnly: true,
	},
	args,
	async execute(args, ctx) {
		const response = await ctx.callVantageApi(
			`/v2/cost_alerts/${encodeURIComponent(args.cost_alert_token)}`,
			{},
			"GET"
		);
		if (!response.ok) {
			throw new MCPUserError({ errors: response.errors });
		}
		return response.data;
	},
});
