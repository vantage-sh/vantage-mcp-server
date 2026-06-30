import z from "zod";
import { DEFAULT_LIMIT } from "./structure/constants";
import MCPUserError from "./structure/MCPUserError";
import registerTool from "./structure/registerTool";
import dateValidator from "./utils/dateValidator";
import paginationData from "./utils/paginationData";

const AUDIT_LOG_ACTIONS = ["create", "update", "delete"] as const;
const AUDIT_LOG_SOURCES = ["console", "api", "finops_agent"] as const;
const AUDIT_LOG_OBJECT_TYPES = ["virtual_tag", "cost_report", "recommendation_commitment", "segment"] as const;

const description = `
List audit logs visible to the authenticated Vantage access token. Audit logs provide a chronological history of supported changes to user-facing resources in Vantage, such as cost reports, virtual tags, segments, recommendation commitments, and other workspace-related objects.

Results are returned in reverse chronological order (newest first).

Each audit log entry can include:
- The audit log token
- The affected object's token, type, and title
- The event (\`record_created\`, \`record_updated\`, or \`record_destroyed\`)
- The source of the action (\`console\`, \`api\`, or \`finops_agent\`)
- The user display name, when available
- The workspace title and workspace token, when available
- The timestamp when the audit log was created
- Field-level change data in \`changed_values\` and \`unchanged_values\`

Audit logs commonly include actions such as:
- Creating, updating, or deleting cost reports
- Modifying report filters or related configuration
- Creating, updating, or deleting virtual tags
- Updating recommendation commitments
- Creating, updating, or deleting segments

You can pass \`limit\`; if omitted, the API defaults to 100 results per page.

Audit logs can be filtered by:
- \`user\`: numeric user ID associated with the action
- \`workspace_token\`: workspace token
- \`action\`: \`create\`, \`update\`, or \`delete\`
- \`object_type\`: \`cost_report\`, \`virtual_tag\`, \`recommendation_commitment\`, or \`segment\`
- \`object_name\`: exact object title
- \`object_token\`: audited object token
- \`source\`: \`console\`, \`api\`, or \`finops_agent\`
- \`start_date\` and \`end_date\`: YYYY-MM-DD dates such as \`2024-06-01\`
- \`token\`: audit log token

Use cases for audit logs include:
- Compliance and security review
- Debugging change history
- Change management for reports and configuration
- Monitoring actions taken through the API or the Finops Agent
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
    .describe("Filter by numeric user ID (the user's database id). Do not pass email addresses or user tokens."),
  workspace_token: z.string().optional().describe("Filter by workspace token"),
  action: z.enum(AUDIT_LOG_ACTIONS).optional().describe("Filter by action type: create, update, or delete."),
  object_name: z.string().optional().describe("Filter by object name"),
  source: z
    .enum(AUDIT_LOG_SOURCES)
    .optional()
    .describe(
      "Filter by source: console, api, or finops_agent. Use finops_agent for actions taken by the FinOps Agent."
    ),
  object_type: z
    .enum(AUDIT_LOG_OBJECT_TYPES)
    .optional()
    .describe(
      "Filter by object type: cost_report, virtual_tag, recommendation_commitment, or segment. Other types (e.g. dashboard, budget) are not supported."
    ),
  token: z.string().optional().describe("Filter by audit log token"),
  object_token: z.string().optional().describe("Filter by object token (auditable_token)"),
  start_date: dateValidator("Filter by start date (YYYY-MM-DD, inclusive).").optional(),
  end_date: dateValidator("Filter by end date (YYYY-MM-DD, inclusive).").optional(),
};

export default registerTool({
  name: "list-audit-logs",
  title: "List Audit Logs",
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
