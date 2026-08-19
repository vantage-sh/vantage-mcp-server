import z from "zod";
import { nonempty, vantageToken } from "../../utils/zod";

export const budgetAlertBudgetTokens = z.array(vantageToken("budget")).min(1);
export const budgetAlertThreshold = z.number().int().min(0);
export const budgetAlertUserTokens = z.array(vantageToken("user"));
export const budgetAlertRecipientEmails = z.array(z.email());
export const budgetAlertDurationInDays = z
  .string()
  .regex(/^\d*$/, "Must be a whole number of days or an empty string for the full month");
export const budgetAlertPeriodToTrack = z.enum(["start_of_the_month", "end_of_the_month"]);
export const budgetAlertRecipientChannels = z.array(nonempty());
