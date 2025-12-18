import z from "zod";
import MCPUserError from "./structure/MCPUserError";
import registerTool from "./structure/registerTool";
import paginationData from "./utils/paginationData";

const description = `
List all dashboards available in the Vantage account. Dashboards provide visualizations of cost data.
Use the page value of 1 to start.
The token of a dashboard can be used to link the user to the dashboard in the Vantage Web UI. Build the link like this: https://console.vantage.sh/go/<token>
`.trim();

const args = {
	page: z.number().optional().default(1).describe("The page number to return, defaults to 1"),
};

export default registerTool({
	name: "list-dashboards",
	description,
	annotations: {
		destructive: false,
		openWorld: true,
		readOnly: true,
	},
	args,
	async execute(args, ctx) {
		const requestParams = { ...args, limit: 64 };
		const response = await ctx.callVantageApi("/v2/dashboards", requestParams, "GET");
		if (!response.ok) {
			throw new MCPUserError({ errors: response.errors });
		}
		return {
			dashboards: response.data.dashboards,
			pagination: paginationData(response.data),
		};
	},
});
