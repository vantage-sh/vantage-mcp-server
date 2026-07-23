import z from "zod";
import { dateIntervalOptions } from "../../utils/dateIntervalOptions";
import dateValidator from "../../utils/dateValidator";

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
  .enum(dateIntervalOptions)
  .optional()
  .describe("The date interval of the dashboard. Incompatible with 'start_date' and 'end_date' parameters.");

export const updateDateIntervalSchema = z
  .enum([...dateIntervalOptions, ""])
  .optional()
  .describe(
    "The date interval of the dashboard. Incompatible with 'start_date' and 'end_date' parameters. Use an empty string to clear the date interval."
  );
