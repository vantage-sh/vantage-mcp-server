import z from "zod";

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
