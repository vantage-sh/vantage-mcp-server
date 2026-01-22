import z from "zod/v4";
import MCPUserError from "./structure/MCPUserError";
import registerTool from "./structure/registerTool";
import dateValidator from "./utils/dateValidator";

const description = `
Create a Virtual Tag Config in Vantage.

Virtual Tag Configs define a derived (virtual) tag key and a set of values determined by VQL filters.
This is useful for normalizing cost attribution (e.g., mapping multiple provider tag formats into a
single tag), collapsing noisy tag keys, and optionally overriding provider-supplied tags.

You can optionally:
- backfill_until: backfill the virtual tag values to an earliest month
- collapsed_tag_keys: collapse values for specific underlying tag keys (optionally scoped by provider)
- values: define named values via VQL filters, optionally linked to Business Metrics and/or cost metrics
`.trim();

const collapsedTagKeySchema = z.object({
	key: z.string().describe("The tag key to collapse values for."),
	providers: z
		.array(z.string())
		.describe("The providers this collapsed tag key applies to.")
		.optional(),
});

const valueSchema = z.object({
	filter: z.string().describe("The filter VQL for the Value."),
	name: z.string().describe("The name of the Value.").optional(),
	business_metric_token: z
		.string()
		.describe("The token of the associated BusinessMetric.")
		.optional(),
	cost_metric: z
		.object({
			filter: z.string().describe("The filter VQL for the cost metric."),
			aggregation: z.object({
				tag: z.string().describe("The tag to aggregate on."),
			}),
		})
		.optional(),
});

export default registerTool({
	name: "create-virtual-tag-config",
	description,
	args: {
		key: z.string().min(1).describe("The key of the VirtualTagConfig"),
		overridable: z
			.boolean()
			.describe(
				"Whether the VirtualTagConfig can override a provider-supplied tag on a matching Cost."
			),
		backfill_until: dateValidator(
			"The earliest month the VirtualTagConfig should be backfilled to. ISO 8601 Formatted."
		).optional(),
		collapsed_tag_keys: z.array(collapsedTagKeySchema).optional(),
		values: z.array(valueSchema).optional(),
	},
	annotations: {
		destructive: false,
		openWorld: false,
		readOnly: false,
	},
	async execute(args, ctx) {
		const response = await ctx.callVantageApi("/v2/virtual_tag_configs", args, "POST");
		if (!response.ok) {
			throw new MCPUserError({ errors: response.errors });
		}
		return response.data;
	},
});
