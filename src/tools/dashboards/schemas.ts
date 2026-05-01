import z from "zod/v4";
import dateValidator from "../utils/dateValidator";

export const intervalOptions = [
  "this_month",
  "last_7_days",
  "last_30_days",
  "last_month",
  "last_3_months",
  "last_6_months",
  "custom",
  "last_12_months",
  "last_24_months",
  "last_36_months",
  "next_month",
  "next_3_months",
  "next_6_months",
  "next_12_months",
  "year_to_date",
  "last_3_days",
  "last_14_days",
] as const;

export const widgetSchema = z.object({
  widgetable_token: z.string().describe("The token of the represented Resource."),
  title: z.string().describe("The title of the Widget (defaults to the title of the Resource).").optional(),
  settings: z
    .object({
      display_type: z.enum(["table", "chart"]).describe("The display type of the Widget."),
    })
    .optional(),
});

export const dateBinSchema = z
  .enum(["day", "week", "month"])
  .optional()
  .describe("Date binning for returned costs, allowed values: day, week, month");

export const updateDateBinSchema = z
  .enum(["cumulative", "day", "week", "month"])
  .optional()
  .describe("Date binning for returned costs, allowed values: cumulative, day, week, month");

export const startDateSchema = dateValidator(
  "The start date of the dashboard. ISO 8601 Formatted. Incompatible with 'date_interval' parameter."
).optional();

export const endDateSchema = dateValidator(
  "The end date of the dashboard. ISO 8601 Formatted. Incompatible with 'date_interval' parameter, required with 'start_date'."
).optional();

export const dateIntervalSchema = z
  .enum(intervalOptions)
  .optional()
  .describe("The date interval of the dashboard. Incompatible with 'start_date' and 'end_date' parameters.");

export const updateDateIntervalSchema = z
  .enum([...intervalOptions, ""])
  .optional()
  .describe(
    "The date interval of the dashboard. Incompatible with 'start_date' and 'end_date' parameters. Use an empty string to clear the date interval."
  );
