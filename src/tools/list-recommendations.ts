import z from "zod/v4";
import { DEFAULT_LIMIT } from "./structure/constants";
import MCPUserError from "./structure/MCPUserError";
import registerTool from "./structure/registerTool";
import paginationData from "./utils/paginationData";

const description = `
List all cost optimization recommendations available in the Vantage account. Recommendations are AI-powered suggestions that help identify opportunities to reduce costs and optimize cloud spending across your infrastructure.

Use the page value of 1 to start pagination.

Recommendations include various types such as:
- EC2 rightsizing (resize overprovisioned instances)
- Unused financial commitments (unused Reserved Instances or Savings Plans)
- Idle resources (running but unused instances, volumes, load balancers)
- Storage optimization (EBS volume type recommendations)
- Reserved Instance and Savings Plan purchase recommendations

Each recommendation includes:
- Potential cost savings amount
- Description of what can be optimized
- Category and provider information
- Number of resources affected
- Current status (open, resolved, dismissed)

Recommendations can be filtered by status (open shows active recommendations, resolved shows implemented ones, dismissed shows ignored ones), cloud provider (aws, azure, gcp), specific workspace, provider account ID, recommendation category, and recommendation type. Prefer the type parameter when users ask for broad families (e.g. "AWS recommendations" -> type=aws; "EC2 rightsizing" -> type=aws:ec2:rightsizing). The type filter uses case-insensitive fuzzy matching on the recommendation type. If both type and category are provided, the API uses type.

The token of each recommendation can be used with other recommendation tools to get detailed information and see specific resources affected.

For users to view and manage recommendations in the Vantage Web UI, they can visit https://console.vantage.sh/recommendations
`.trim();

const args = {
	page: z.number().optional().default(1).describe("The page number to return, defaults to 1"),
	workspace_token: z
		.string()
		.optional()
		.describe("Filter recommendations to a specific workspace"),
	provider: z
		.string()
		.optional()
		.describe("Filter recommendations by cloud provider (e.g., aws, azure, gcp)"),
	provider_account_id: z
		.string()
		.optional()
		.describe("Filter recommendations by provider account ID"),
	category: z
		.string()
		.optional()
		.describe(
			"Filter recommendations by category (e.g., ec2_rightsizing_recommender, unused_financial_commitments). Ignored when type is also provided."
		),
	type: z
		.string()
		.max(255)
		.optional()
		.describe(
			"Filter recommendations by type with case-insensitive fuzzy matching (e.g., aws, aws:ec2, aws:ec2:rightsizing). Prefer this for broad queries like 'AWS recommendations'."
		),
	filter: z
		.enum(["open", "resolved", "dismissed"])
		.optional()
		.describe("Filter recommendations by status: open (default), resolved, or dismissed"),
};

export default registerTool({
	name: "list-recommendations",
	description,
	annotations: {
		destructive: false,
		openWorld: false,
		readOnly: true,
	},
	args,
	async execute(args, ctx) {
		const requestParams = {
			...args,
			limit: DEFAULT_LIMIT,
			provider: args.provider as any,
			category: args.category as any,
		};
		const response = await ctx.callVantageApi("/v2/recommendations", requestParams, "GET");
		if (!response.ok) {
			throw new MCPUserError({ errors: response.errors });
		}
		return {
			recommendations: response.data.recommendations,
			pagination: paginationData(response.data),
		};
	},
});
