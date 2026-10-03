import z from "zod";
import { paginationSchema } from "../../utils/zod/output";

// Output schemas mirror the Vantage client response types.
export const annotationResponseSchema = z.object({
  token: z.string().describe("The unique token identifying the Annotation."),
  title: z.string().describe("The title of the Annotation."),
  report_tokens: z.array(z.string()).describe("The tokens of the Reports associated with the Annotation."),
  date: z.string().nullable().describe("The date of the Annotation. ISO 8601 formatted."),
  message: z.string().nullable().describe("The message of the Annotation."),
});

export const listAnnotationsResponseSchema = z.object({
  annotations: z.array(annotationResponseSchema).describe("Annotations."),
  pagination: paginationSchema.describe("Pagination information for these results."),
});

export const annotationOutputSchema = annotationResponseSchema.shape;

export const listAnnotationsOutputSchema = listAnnotationsResponseSchema.shape;
