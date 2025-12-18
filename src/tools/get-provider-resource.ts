import z from "zod";
import MCPUserError from "./structure/MCPUserError";
import registerTool from "./structure/registerTool";

const description = `
Get detailed information about a specific provider resource using its token or UUID.

This returns comprehensive details about the resource including:
- Resource metadata (instance type, size, configuration, etc.)
- Account and billing account information
- Provider and region details
- Creation timestamp
- Optional cost breakdown by category

The resource_token can be either a Vantage token (starting with prvdr_rsrc) or the resource's UUID/ARN from the cloud provider.
Set include_cost to true to get cost information broken down by category.
`.trim();

export default registerTool({
	name: "get-provider-resource",
	description,
	annotations: {
		destructive: false,
		openWorld: true,
		readOnly: true,
	},
	args: {
		resource_token: z
			.string()
			.nonempty()
			.describe("The resource token (prvdr_rsrc_*) or UUID/ARN of the resource"),
		include_cost: z
			.boolean()
			.optional()
			.default(false)
			.describe("Include cost information broken down by category"),
	},
	async execute(args, ctx) {
		const response = await ctx.callVantageApi(
			`/v2/resources/${args.resource_token}`,
			{ include_cost: args.include_cost },
			"GET"
		);
		if (!response.ok) {
			throw new MCPUserError({ errors: response.errors });
		}
		return response.data;
	},
});
