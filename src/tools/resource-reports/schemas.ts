import z from "zod";
import { paginationSchema } from "../../utils/zod/output";

export const resourceReportColumns = z
  .array(z.string().min(1))
  .optional()
  .describe(
    `Table columns in display order. Names must match list-resource-report-columns for the report's resource type.
    Names that are not one of [provider, label, accruedCosts, resource, type, resource, account] must be formatted as lowercase strictly-alpha strings.
    Remove 'metadata.*' prefixes. Only valid when filter targets a single resource type.
    Important: Always use the column name format from this description when setting columns. Do NOT reuse column names from API responses, as the API may normalize names differently on output (e.g., accruedCosts on input becomes accrued_costs on output)
    `
  );

// Output schemas mirror the Vantage client response types.
export const resourceReportResponseSchema = z.object({
  token: z.string().describe("The token identifying this resource."),
  title: z.string().describe("The title of the ResourceReport."),
  filter: z
    .string()
    .nullable()
    .describe(
      "The filter applied to the ResourceReport. Additional documentation available at https://docs.vantage.sh/vql."
    ),
  created_at: z.string().describe("The date and time, in UTC, the report was created. ISO 8601 Formatted."),
  workspace_token: z.string().describe("The token for the Workspace the ResourceReport is a part of."),
  user_token: z.string().nullable().describe("The token for the User who created this ResourceReport."),
  created_by_token: z.string().nullable().describe("The token for the User or Team who created this ResourceReport."),
  folder_token: z.string().nullable().optional().describe("The token for the Folder the ResourceReport is a part of."),
  columns: z.array(z.string()).describe("Array of column names configured for the ResourceReport table display."),
});

export const resourceReportColumnsResponseSchema = z.object({
  columns: z.array(z.string()).describe("Array of available column names for the specified resource type."),
});

export const listResourceReportsResponseSchema = z.object({
  resource_reports: z.array(resourceReportResponseSchema).describe("Resource reports."),
  pagination: paginationSchema.describe("Pagination information for these results."),
});

export const resourceReportOutputSchema = resourceReportResponseSchema.shape;

export const resourceReportColumnsOutputSchema = resourceReportColumnsResponseSchema.shape;

export const listResourceReportsOutputSchema = listResourceReportsResponseSchema.shape;
