import z from "zod";
import { nonempty } from "../../utils/zod";
import { paginationSchema } from "../../utils/zod/output";

export const title = nonempty().describe("Saved Filter title.");
export const filter = z.string().describe("VQL filter applied to Cost Reports; see the VQL resource for syntax.");

// Output schemas mirror the Vantage client response types.
export const savedFilterResponseSchema = z.object({
  token: z.string().describe("The token identifying this resource."),
  title: z.string().describe("The title of the SavedFilter."),
  cost_report_tokens: z.array(z.string()).describe("The tokens for any CostReports the SavedFilter is applied to."),
  filter: z
    .string()
    .nullable()
    .describe(
      "The SavedFilter's filter, applied to any relevant CostReports. Additional documentation available at https://docs.vantage.sh/vql."
    ),
  created_at: z.string().describe("The date and time, in UTC, the report was created. ISO 8601 Formatted."),
  created_by: z.string().nullable().describe("The token for the Creator of this SavedFilter."),
  workspace_token: z.string().describe("The token for the Workspace the SavedFilter is a part of."),
});

export const listSavedFiltersResponseSchema = z.object({
  saved_filters: z.array(savedFilterResponseSchema).describe("Saved filters."),
  pagination: paginationSchema.describe("Pagination information for these results."),
});

export const listSavedFiltersOutputSchema = listSavedFiltersResponseSchema.shape;

export const savedFilterOutputSchema = savedFilterResponseSchema.shape;
