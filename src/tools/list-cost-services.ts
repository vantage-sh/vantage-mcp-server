import z from "zod/v4";
import MCPUserError from "./structure/MCPUserError";
import registerTool from "./structure/registerTool";

const description = `
List of cost services available to query for a given Workspace. Can be used to filter costs down to a specific service in VQL queries.
`.trim();

const args = {
	workspace_token: z.string().describe("Workspace token to list cost services for"),
};

export default registerTool({
	name: "list-cost-services",
	description,
	annotations: {
		destructive: false,
		openWorld: false,
		readOnly: true,
	},
	args,
	async execute(args, ctx) {
		const response = await ctx.callVantageApi("/v2/cost_services", args, "GET");
		if (!response.ok) {
			throw new MCPUserError({ errors: response.errors });
		}
		return {
			cost_services: response.data.cost_services,
		};
	},
});
