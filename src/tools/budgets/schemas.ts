import z from "zod";
import dateValidator from "../utils/dateValidator";

export const budgetPeriod = z.object({
  start_at: dateValidator("The start date of the period."),
  end_at: dateValidator("The end date of the period.").optional(),
  amount: z.number().min(0).describe("The amount of the period."),
});
