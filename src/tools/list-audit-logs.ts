import z from "zod";
import { DEFAULT_LIMIT } from "./structure/constants";
import MCPUserError from "./structure/MCPUserError";
import registerTool from "./structure/registerTool";
import paginationData from "./utils/paginationData";

const description = `
List audit logs visible to the current auth token.

Audit logs provide an ordered record of actions taken within the workspace.
Use pagination via the "page" parameter. Optional filters are available
to narrow results by actor, action, or date range.
`.trim();

const args = {
	page: z.number().optional().default(1).describe("The page number to return, defaults to 1"),
	actor: z.string().optional().describe("Optional: filter by actor (id or email)"),
	action: z
		.string()
		.optional()
		.describe("Optional: filter by action type (e.g., workspace.create)"),
	since: z.string().optional().describe("Optional: ISO-8601 start date (inclusive)"),
	until: z.string().optional().describe("Optional: ISO-8601 end date (inclusive)"),
};

export default registerTool({
	name: "list-audit-logs",
	description,
	args,
	async execute(args, ctx) {
		const requestParams = { ...args, limit: DEFAULT_LIMIT };
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

