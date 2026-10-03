import z from "zod";
import { paginationSchema } from "../../utils/zod/output";

// Output schemas mirror the Vantage client response types.
export const tagValueResponseSchema = z.object({
  tag_value: z.string().describe("The TagValue."),
  providers: z.array(z.string()).describe("The unique providers that are covered by the TagValue."),
});

export const listTagValuesResponseSchema = z.object({
  tag_values: z.array(tagValueResponseSchema).describe("Tag values."),
  pagination: paginationSchema.describe("Pagination information for these results."),
});

export const tagResponseSchema = z.object({
  tag_key: z.string().describe("The Tag key."),
  hidden: z.boolean().describe("Whether the Tag has been hidden from the Vantage UI."),
  preferred: z.boolean().describe("Whether the Tag has been marked as preferred."),
  providers: z.array(z.string()).describe("The unique providers that are covered by the Tag key."),
});

export const listTagsResponseSchema = z.object({
  tags: z.array(tagResponseSchema).describe("Tags."),
  pagination: paginationSchema.describe("Pagination information for these results."),
});

export const listTagValuesOutputSchema = listTagValuesResponseSchema.shape;

export const listTagsOutputSchema = listTagsResponseSchema.shape;
