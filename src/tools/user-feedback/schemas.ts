import z from "zod";

// Output schemas mirror the Vantage client response types.
export const userFeedbackResponseSchema = z.object({
  token: z.string().describe("Token of the feedback"),
  message: z.string().describe("User feedback message"),
  created_by_token: z.string().nullable().optional().describe("Token of the creator of the feedback"),
  created_at: z.string().describe("Feedback creation timestamp"),
});

export const userFeedbackOutputSchema = userFeedbackResponseSchema.shape;
