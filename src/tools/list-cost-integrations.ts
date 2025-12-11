import z from "zod";
import { DEFAULT_LIMIT } from "./structure/constants";
import MCPUserError from "./structure/MCPUserError";
import registerTool from "./structure/registerTool";
import paginationData from "./utils/paginationData";

const description = `
List all cost provider integrations available to provide costs data from and their associated accounts.
Integrations are the cost providers that Vantage is configured to connect to and pull cost data from.
If a user wants to see their providers in the Vantage Web UI, they can visit https://console.vantage.sh/settings/integrations

Note that when 'provider' is 'custom_provider', that has a special case. When doing a VQL query for custom provider, use the 'token' you get back. Here is an example, where the token of the custom provider is "accss_crdntl_07171984": 
  (costs.provider = 'custom_provider:accss_crdntl_07171984')
`.trim();

const args = {
	page: z.number().optional().default(1).describe("The page number to return, defaults to 1"),
};

export default registerTool({
	name: "list-cost-integrations",
	description,
	args,
	async execute(args, ctx) {
		const requestParams = { ...args, limit: DEFAULT_LIMIT };
		const response = await ctx.callVantageApi("/v2/integrations", requestParams, "GET");
		if (!response.ok) {
			throw new MCPUserError({ errors: response.errors });
		}
		return {
			integrations: response.data.integrations,
			pagination: paginationData(response.data),
		};
	},
});
