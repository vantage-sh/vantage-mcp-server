import z from "zod";
import dateValidator from "../utils/dateValidator";

export const budgetPeriod = z.object({
  start_at: dateValidator("The start date of the period."),
  end_at: dateValidator("The end date of the period.").optional(),
  amount: z.number().min(0).describe("The amount of the period."),
});

export const periodCadence = z.object({
  starts_at: dateValidator("The anchor date for budget period intervals (YYYY-MM-DD). Send null to clear.").nullable(),
  interval_count: z.number().int().min(1).describe("The number of interval units per budget period."),
  interval_unit: z
    .enum(["day", "week", "month", "year"])
    .describe("The unit for budget period intervals. One of: day, week, month, year."),
});
