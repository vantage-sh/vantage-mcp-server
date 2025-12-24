import z from "zod";
import { DEFAULT_LIMIT } from "./structure/constants";
import MCPUserError from "./structure/MCPUserError";
import registerTool from "./structure/registerTool";
import paginationData from "./utils/paginationData";

const description = `
List audit logs for actions taken within the Vantage workspace. Audit logs are a chronological record of all changes and activities that occur in your workspace, providing a complete history of who did what, when, and what changed.

Audit logs track various types of actions including:
- Creating, updating, or deleting cost reports
- Modifying report settings, filters, or configurations
- Creating, updating, or deleting virtual tags
- Commitment actions taken manually or autonomously by the Finops Agent (autonomous cost optimization actions)

Each audit log entry contains:
- The user or service token (Team) that performed the action
- The action type (record_created, record_updated, record_destroyed)
- The object that was affected (cost report, virtual tag, commitment, etc.)
- The timestamp when the action occurred
- What values changed (before and after states)
- The source of the action (console, api, developer, finops_agent)
- A scoutAction boolean field that indicates if the action was taken by the Finops Agent (Scout), which is particularly relevant for commitment actions to distinguish agent-driven actions from human actions
- The workspace where the action took place

Use pagination via the "page" parameter starting with 1. The default limit is 100 results per page, which can be adjusted up to 1000.

Audit logs can be filtered by:
- User ID (to see actions by a specific person or service token (Team))
- Workspace token (to scope to a specific workspace)
- Action type (create, update, delete)
- Object type (cost_report, virtual_tag, recommendation_commitment)
- Object name or token (to track changes to a specific resource)
- Source (console, api, developer, finops_agent) - use "finops_agent" to filter for actions specifically taken by the Finops Agent
- Date range (start_date and end_date in ISO 8601 format)
- Audit log token (to retrieve a specific log entry)

Common use cases for audit logs include:
- Compliance and security auditing (tracking who made changes)
- Debugging issues (seeing what changed before a problem occurred)
- Change management (reviewing modifications to reports or configurations)
- Activity monitoring (understanding workspace usage patterns)
- Distinguishing between human actions and autonomous agent actions (via scoutAction field and finops_agent source filter)
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
	source: z
		.string()
		.optional()
		.describe(
			"Filter by source (e.g., console, api, developer, finops_agent). Use 'finops_agent' to filter for actions specifically taken by the Finops Agent.",
		),
	object_type: z
		.string()
		.optional()
		.describe(
			"Filter by object type (e.g., virtual_tag, cost_report, recommendation_commitment).",
		),
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
	annotations: {
		destructive: false,
		openWorld: false,
		readOnly: true,
	},
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
