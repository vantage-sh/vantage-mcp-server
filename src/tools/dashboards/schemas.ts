import z from "zod";
import { dateIntervalOptions } from "../../utils/dateIntervalOptions";
import dateValidator from "../../utils/dateValidator";

export const widgetSchema = z.object({
  widgetable_token: z.string().describe("The token of the represented Resource."),
  title: z.string().describe("The title of the Widget (defaults to the title of the Resource).").optional(),
  settings: z
    .object({
      display_type: z
        .enum(["table", "chart", "kpi"])
        .describe(
          "How the Widget renders. kpi shows a single headline number and only works for Cost Report Widgets (rprt_*)."
        ),
      kpi_calculation: z
        .enum(["sum", "average"])
        .optional()
        .describe(
          "For kpi Widgets: total the values across the date range (sum) or average them per date bin (average). Defaults to sum. With kpi_type business_metric only average is supported; set average or omit."
        ),
      kpi_type: z
        .enum(["cost", "usage", "count", "business_metric"])
        .optional()
        .describe(
          "For kpi Widgets: which value to show. Defaults to whatever the Cost Report displays (cost, usage, or count)."
        ),
      kpi_usage_unit: z
        .string()
        .optional()
        .describe(
          "For kpi Widgets with kpi_type usage: the usage unit to show, matching a unit in the report's data. Ignored otherwise."
        ),
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

// Response widgets always include title/settings, and KPI settings may be null.
const widgetSettingsSchema = widgetSchema.shape.settings.unwrap();
const dashboardWidgetSchema = widgetSchema.extend({
  title: widgetSchema.shape.title.unwrap().describe("The title of the Widget."),
  settings: widgetSettingsSchema
    .extend({
      kpi_calculation: widgetSettingsSchema.shape.kpi_calculation
        .nullable()
        .describe("The aggregation used when the Widget displays a KPI."),
      kpi_type: widgetSettingsSchema.shape.kpi_type.nullable().describe("The metric represented by the KPI."),
      kpi_usage_unit: widgetSettingsSchema.shape.kpi_usage_unit
        .nullable()
        .describe("The usage unit represented by the KPI."),
    })
    .describe("The display and KPI settings of the Widget."),
});

export const dashboardOutputSchema = {
  token: z.string().describe("The token of the Dashboard."),
  title: z.string().describe("The title of the Dashboard."),
  widgets: z.array(dashboardWidgetSchema).describe("The widgets in the Dashboard."),
  saved_filter_tokens: z.array(z.string()).describe("The tokens of the Saved Filters used in the Dashboard."),
  date_bin: z
    .enum(["cumulative", "day", "week", "month"])
    .nullable()
    .describe("How costs are grouped in the Dashboard."),
  date_interval: z.enum(dateIntervalOptions).nullable().describe("The date range for Reports in the Dashboard."),
  start_date: z.string().nullish().describe("The start date of the Dashboard's custom date range, in ISO 8601 format."),
  end_date: z.string().nullish().describe("The end date of the Dashboard's custom date range, in ISO 8601 format."),
  created_at: z.string().describe("When the Dashboard was created, in UTC ISO 8601 format."),
  updated_at: z.string().describe("When the Dashboard was last updated, in UTC ISO 8601 format."),
  workspace_token: z.string().describe("The token of the Workspace containing the Dashboard."),
};
