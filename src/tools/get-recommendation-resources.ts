import z from "zod/v4";
import { pathEncode } from "@vantage-sh/vantage-client";
import { DEFAULT_LIMIT } from "./structure/constants";
import MCPUserError from "./structure/MCPUserError";
import registerTool from "./structure/registerTool";
import paginationData from "./utils/paginationData";

const description = `
Get a paginated list of all infrastructure resources affected by a specific cost optimization recommendation.

This tool returns the actual cloud resources (instances, volumes, load balancers, etc.) that are involved in a recommendation. Each resource entry includes:
- Resource token (unique identifier for the specific resource)
- Resource type (e.g., EC2 instance, EBS volume, RDS instance)
- Resource identifier (instance ID, volume ID, etc.)
- Current configuration details
- Resource-specific metadata

Use this tool after getting recommendation details to see exactly which resources need attention. For example:
- For EC2 rightsizing recommendations: shows the specific instances that are over-provisioned
- For unused resource recommendations: shows the idle instances, volumes, or load balancers
- For Reserved Instance recommendations: shows the usage patterns and instance families
- For storage optimization: shows the volumes that could be optimized

Each resource has its own token that can be used with get-recommendation-resource-details to get comprehensive information about that specific resource and what actions are recommended.

Use pagination (page parameter) to navigate through large numbers of affected resources.
`.trim();

const args = {
	recommendation_token: z
		.string()
		.min(1)
		.describe("The token of the recommendation to get resources for"),
	page: z.number().optional().default(1).describe("The page number to return, defaults to 1"),
};

export default registerTool({
	name: "get-recommendation-resources",
	description,
	annotations: {
		destructive: false,
		openWorld: false,
		readOnly: true,
	},
	args,
	async execute(args, ctx) {
		const requestParams = { page: args.page, limit: DEFAULT_LIMIT };
		const response = await ctx.callVantageApi(
			`/v2/recommendations/${pathEncode(args.recommendation_token)}/resources`,
			requestParams,
			"GET"
		);
		if (!response.ok) {
			throw new MCPUserError({ errors: response.errors });
		}
		return {
			resources: response.data.resources,
			pagination: paginationData(response.data),
		};
	},
});
