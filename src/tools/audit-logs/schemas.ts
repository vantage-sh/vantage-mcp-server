import z from "zod";
import { paginationSchema } from "../../utils/zod/output";

// Output schemas mirror the Vantage client response types.
export const auditLogResponseSchema = z.object({
  token: z.string().describe("The unique token identifying the audit log."),
  object_token: z.string().nullable().describe("The token of the audited object."),
  object_type: z.string().describe("The type of the audited object."),
  object_title: z.string().nullable().describe("The title of the audited object."),
  event: z.string().describe("The event type of the audit log."),
  source: z.string().describe("The source of the action (console, api, developer)."),
  user: z.string().nullable().optional().describe("The name of the user who performed the action."),
  workspace_title: z
    .string()
    .nullable()
    .optional()
    .describe("The name of the workspace associated with the audit log."),
  workspace_token: z
    .string()
    .nullable()
    .optional()
    .describe("The token of the workspace associated with the audit log."),
  created_at: z.string().describe("The date and time, in UTC, the audit log was created. ISO 8601 Formatted."),
  changed_values: z.record(z.string(), z.unknown()).describe("The changed values of the object."),
  unchanged_values: z.record(z.string(), z.unknown()).describe("The unchanged values of the object."),
});

export const listAuditLogsResponseSchema = z.object({
  audit_logs: z.array(auditLogResponseSchema).describe("Audit logs."),
  pagination: paginationSchema.describe("Pagination information for these results."),
});

export const listAuditLogsOutputSchema = listAuditLogsResponseSchema.shape;
