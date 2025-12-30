import z from "zod/v4";
import { pathEncode } from "../../vantage-ts";
import MCPUserError from "./structure/MCPUserError";
import registerTool from "./structure/registerTool";

const description = `
Get comprehensive details about a specific infrastructure resource within a cost optimization recommendation, including the exact actions recommended for that resource.

This tool provides the deepest level of detail about a single resource that's part of a recommendation. The response includes:
- Complete resource identification (resource ID, type, region, account)
- Current configuration and specifications
- Resource utilization metrics and patterns
- Specific recommendation actions for this resource
- Estimated cost savings for implementing the recommendations
- CLI command for remediating the recommendation
- Implementation complexity and effort estimates
- Detailed metadata specific to the resource type and recommendation category

Use this tool when you need to understand exactly what should be done with a specific resource. For example:
- For rightsizing recommendations: shows current vs. recommended instance types, CPU/memory utilization data
- For unused resources: shows usage patterns, last activity, and safe termination recommendations
- For storage optimization: shows current vs. recommended volume types, IOPS usage, throughput patterns
- For Reserved Instance recommendations: shows usage patterns, recommended commitment levels

This is the most granular level of recommendation data available and is essential for making informed decisions about implementing specific optimizations.

You must have both the recommendation token (from list-recommendations) and the resource token (from get-recommendation-resources) to use this tool.
`.trim();

const args = {
	recommendation_token: z.string().min(1).describe("The token of the recommendation"),
	resource_token: z
		.string()
		.min(1)
		.describe("The token of the specific resource to get details for"),
};

export default registerTool({
	name: "get-recommendation-resource-details",
	description,
	annotations: {
		destructive: false,
		openWorld: false,
		readOnly: true,
	},
	args,
	async execute(args, ctx) {
		const response = await ctx.callVantageApi(
			`/v2/recommendations/${pathEncode(args.recommendation_token)}/resources/${pathEncode(args.resource_token)}`,
			{},
			"GET"
		);
		if (!response.ok) {
			throw new MCPUserError({ errors: response.errors });
		}
		return response.data;
	},
});
