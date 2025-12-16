import z from "zod";
import { DEFAULT_LIMIT } from "./structure/constants";
import MCPUserError from "./structure/MCPUserError";
import registerTool from "./structure/registerTool";
import paginationData from "./utils/paginationData";

const description = `
List audit logs visible to the current auth token.

Audit logs provide an ordered record of actions taken within the workspace.
Use pagination via the "page" parameter. Optional filters are available
to narrow results by user, workspace, action, object, source, or date range.
`.trim();

const args = {
	page: z.number().optional().default(1).describe("The page of results to return, defaults to 1"),
	limit: z
		.number()
		.int()
		.min(1)
		.max(1000)
		.optional()
		.describe("The amount of results to return. The maximum is 1000. Defaults to 100."),
	user: z
		.number()
		.int()
		.optional()
		.describe("Filter by personal or service API token that performed the action (user ID)"),
	workspace_token: z.string().optional().describe("Filter by workspace token"),
	action: z
		.string()
		.optional()
		.describe("Filter by action type (e.g., create, update, delete)"),
	object_name: z.string().optional().describe("Filter by object name"),
	source: z.string().optional().describe("Filter by source (e.g., console, api)"),
	object_type: z.string().optional().describe("Filter by object type (e.g., virtual_tag, cost_report)"),
	token: z.string().optional().describe("Filter by audit log token"),
	object_token: z.string().optional().describe("Filter by object token (auditable_token)"),
	start_date: z
		.string()
		.optional()
		.describe("Filter by start date (ISO 8601 format) for the time period"),
	end_date: z
		.string()
		.optional()
		.describe("Filter by end date (ISO 8601 format) for the time period"),
};

export default registerTool({
	name: "list-audit-logs",
	description,
	args,
	async execute(args, ctx) {
		const requestParams: Record<string, unknown> = {
			...args,
			limit: args.limit ?? DEFAULT_LIMIT,
		};
		const response = await ctx.callVantageApi("/v2/audit_logs", requestParams, "GET");
		if (!response.ok) {
			throw new MCPUserError({ errors: response.errors });
		}
		return {
			audit_logs: response.data.audit_logs,
			pagination: paginationData(response.data),
		};
	},
});
