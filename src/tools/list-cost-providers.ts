import z from "zod";
import MCPUserError from "./structure/MCPUserError";
import registerTool from "./structure/registerTool";
import paginationData from "./utils/paginationData";

const description = `
List of cost providers available to query for a given Workspace. Can be used to filter costs down to a specific provider in VQL queries.
`.trim();

const args = {
	workspace_token: z.string().describe("Workspace token to list cost providers for"),
};

export default registerTool({
	name: "list-cost-providers",
	description,
	annotations: {
		destructive: false,
		openWorld: false,
		readOnly: true,
	},
	args,
	async execute(args, ctx) {
		const response = await ctx.callVantageApi("/v2/cost_providers", args, "GET");
		if (!response.ok) {
			throw new MCPUserError({ errors: response.errors });
		}
		return {
			providers: response.data.cost_providers,
			pagination: paginationData(response.data),
		};
	},
});
