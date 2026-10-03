import z from "zod";
import { paginationSchema } from "../../utils/zod/output";

export const folderType = z.enum(["CostFolder", "ProviderResourceFolder"]);

// Output schemas mirror the Vantage client response types.
export const folderResponseSchema = z.object({
  token: z.string().describe("The token identifying this resource."),
  title: z.string().nullable().describe("The title of the Folder."),
  type: z.string().describe("The type of the Folder."),
  parent_folder_token: z.string().nullable().optional().describe("The token for the parent Folder, if any."),
  saved_filter_tokens: z.array(z.string()).describe("The tokens for the SavedFilters assigned to the Folder."),
  created_at: z.string().describe("The date and time, in UTC, the Folder was created. ISO 8601 Formatted."),
  updated_at: z.string().describe("The date and time, in UTC, the Folder was last updated at. ISO 8601 Formatted."),
  workspace_token: z.string().describe("The token for the Workspace the Folder is a part of."),
});

export const listFoldersResponseSchema = z.object({
  folders: z.array(folderResponseSchema).describe("Folders."),
  pagination: paginationSchema.describe("Pagination information for these results."),
});

export const folderOutputSchema = folderResponseSchema.shape;

export const listFoldersOutputSchema = listFoldersResponseSchema.shape;
