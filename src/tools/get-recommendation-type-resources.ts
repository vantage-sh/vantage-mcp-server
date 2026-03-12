import { pathEncode } from "@vantage-sh/vantage-client";
import z from "zod/v4";
import { normalizeRecommendationType } from "./list-recommendations";
import { DEFAULT_LIMIT } from "./structure/constants";
import MCPUserError from "./structure/MCPUserError";
import registerTool from "./structure/registerTool";
import paginationData from "./utils/paginationData";

const description = `
Get a paginated list of all active resources associated with recommendations of a specified type.

This tool returns resources across all recommendations of a given type (e.g., all aws:ec2:rightsizing resources) without needing to list individual recommendations first.

Each resource entry includes:
- Resource token (unique identifier for the specific resource)
- Resource type (e.g., EC2 instance, EBS volume, RDS instance)
- Resource identifier (instance ID, volume ID, etc.)
- Current configuration details
- Resource-specific metadata

Use this tool when you want to see all resources affected by a particular recommendation type across a workspace. For example:
- All EC2 instances flagged for rightsizing: type=aws:ec2:rightsizing
- All unattached EBS volumes: type=aws:ebs:unattached-volume
- All idle resources: type=idle-resource

Natural language type values like "EC2 rightsizing" or "ebs unattached volume" are automatically normalized to the correct API type.

Use pagination (page parameter) to navigate through large numbers of affected resources.
`.trim();

const args = {
	type: z
		.preprocess(normalizeRecommendationType, z.string().min(1).max(255))
		.describe(
			"The recommendation type, e.g. aws:ec2:rightsizing. Natural language values like 'EC2 rightsizing' are normalized."
		),
	workspace_token: z
		.string()
		.min(1)
		.describe("The workspace token to filter by"),
	page: z.number().optional().default(1).describe("The page number to return, defaults to 1"),
	status: z
		.enum(["active", "archived"])
		.optional()
		.describe("Filter resources by status: active or archived"),
};

export default registerTool({
	name: "get-recommendation-type-resources",
	description,
	annotations: {
		destructive: false,
		openWorld: false,
		readOnly: true,
	},
	args,
	async execute(args, ctx) {
		const requestParams = {
			workspace_token: args.workspace_token,
			page: args.page,
			limit: DEFAULT_LIMIT,
			...(args.status ? { status: args.status } : {}),
		};
		const response = await ctx.callVantageApi(
			`/v2/recommendations/by_type/${pathEncode(args.type)}/resources`,
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
