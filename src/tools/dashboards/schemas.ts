import z from "zod";
import { dateIntervalOptions } from "../../utils/dateIntervalOptions";
import dateValidator from "../../utils/dateValidator";
import MCPUserError from "../structure/MCPUserError";

const displayTypeSchema = z
  .enum(["table", "chart", "kpi"])
  .describe(
    "How the Widget renders. kpi shows a single headline number and only works for Cost Report Widgets (rprt_*)."
  );

const widgetSettingsFields = {
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
};

const widgetGridSchema = z.object({
  x: z.number().int().describe("The zero-based horizontal position in the 12-column grid."),
  y: z.number().int().describe("The zero-based vertical position in the grid."),
  w: z.number().int().describe("The widget width in grid columns."),
  h: z.number().int().describe("The widget height in grid rows."),
});

const widgetContentSchema = z.object({
  type: z.literal("doc").describe("The rich-text document root type."),
  content: z.array(z.record(z.string(), z.any())).optional().describe("Rich-text document nodes."),
});

export const widgetSettingsSchema = z.object({
  display_type: displayTypeSchema,
  ...widgetSettingsFields,
  grid: widgetGridSchema.optional().describe("The widget's size and position in the dashboard's 12-column grid."),
});

export const widgetSettingsUpdateSchema = z.object({
  display_type: displayTypeSchema.optional(),
  ...widgetSettingsFields,
});

export const widgetSchema = z.object({
  widgetable_token: z
    .string()
    .optional()
    .describe("The token of the represented Resource. Required for report-backed widgets."),
  widgetable_type: z
    .enum(["free_text"])
    .optional()
    .describe("Use free_text for a free text widget. Omit for report-backed widgets."),
  title: z
    .string()
    .describe("The title of the Widget (defaults to the Resource title, or Free Text for a free text widget).")
    .optional(),
  content: widgetContentSchema
    .optional()
    .describe("Rich-text document for a free text widget. Required when widgetable_type is free_text."),
  settings: widgetSettingsSchema.optional(),
});

type DashboardWidgetInput = z.infer<typeof widgetSchema>;

export function validateDashboardWidgets(widgets: DashboardWidgetInput[] | undefined) {
  if (widgets === undefined) {
    return;
  }

  for (const [index, widget] of widgets.entries()) {
    const label = `widgets[${index}]`;
    if (widget.widgetable_type === "free_text") {
      if (widget.content === undefined) {
        throw new MCPUserError({
          errors: [{ message: `${label} requires content when widgetable_type is free_text.` }],
        });
      }
      if (widget.widgetable_token !== undefined) {
        throw new MCPUserError({
          errors: [{ message: `${label} must not include widgetable_token when widgetable_type is free_text.` }],
        });
      }
      continue;
    }

    if (widget.widgetable_token === undefined) {
      throw new MCPUserError({
        errors: [{ message: `${label} requires widgetable_token.` }],
      });
    }
    if (widget.content !== undefined) {
      throw new MCPUserError({
        errors: [{ message: `${label} content is only valid when widgetable_type is free_text.` }],
      });
    }
  }
}

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
