import z from "zod/v4";
import { pathEncode } from "../../vantage-ts";
import MCPUserError from "./structure/MCPUserError";
import registerTool from "./structure/registerTool";

const description = `
Get comprehensive details about a specific cost optimization recommendation using its unique token.

This tool provides in-depth information about a single recommendation including:
- Full description of the optimization opportunity
- Exact potential cost savings amount and currency
- Current status (open, resolved, dismissed)
- Category and type of recommendation (e.g., ec2_rightsizing_recommender, unused_financial_commitments)
- Cloud provider and provider account information
- Service being optimized (e.g., EC2, RDS, S3)
- Number of resources that would be affected
- Creation and last updated timestamps
- Additional metadata specific to the recommendation type

Use this tool after getting a recommendation token from list-recommendations to understand exactly what optimization is being suggested and the potential impact.

The recommendation token can also be used with get-recommendation-resources to see the specific infrastructure resources involved.
`.trim();

const args = {
	recommendation_token: z
		.string()
		.min(1)
		.describe("The token of the recommendation to get details for"),
};

export default registerTool({
	name: "get-recommendation-details",
	description,
	annotations: {
		destructive: false,
		openWorld: false,
		readOnly: true,
	},
	args,
	async execute(args, ctx) {
		const response = await ctx.callVantageApi(
			`/v2/recommendations/${pathEncode(args.recommendation_token)}`,
			{},
			"GET"
		);
		if (!response.ok) {
			throw new MCPUserError({ errors: response.errors });
		}
		return response.data;
	},
});
