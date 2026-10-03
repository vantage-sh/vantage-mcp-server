import z from "zod";
import { paginationSchema } from "../../utils/zod/output";

// Output schemas mirror the Vantage client response types.
export const canvasDataResponseSchema = z.object({
  table: z.record(z.string(), z.unknown()).optional().describe("Table."),
  error: z.string().nullable().optional().describe("Error message if the refresh workflow failed. Read-only."),
});

export const canvasResponseSchema = z.object({
  token: z.string().describe("The token identifying this resource."),
  title: z.string().describe("The title of the Canvas."),
  prompt: z.string().describe("The prompt used to generate the Canvas."),
  data: canvasDataResponseSchema.optional().describe("Data."),
  workspace_token: z.string().describe("The token for the Workspace the Canvas belongs to."),
  created_at: z.string().describe("The date and time, in UTC, the Canvas was created. ISO 8601 Formatted."),
  updated_at: z.string().describe("The date and time, in UTC, the Canvas was last updated. ISO 8601 Formatted."),
});

export const listCanvasesResponseSchema = z.object({
  canvases: z.array(canvasResponseSchema).describe("Canvases."),
  pagination: paginationSchema.describe("Pagination information for these results."),
});

export const canvasOutputSchema = canvasResponseSchema.shape;

export const listCanvasesOutputSchema = listCanvasesResponseSchema.shape;
