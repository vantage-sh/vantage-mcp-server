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
  x: z.number().int().describe("Column where the widget starts. 0 is the left edge of the 12-column grid."),
  y: z.number().int().describe("Row where the widget starts. 0 is the top."),
  w: z.number().int().describe("Width in columns."),
  h: z.number().int().describe("Height in rows."),
});

const widgetContentSchema = z.object({
  type: z.literal("doc").describe("Document root. Use doc."),
  content: z
    .array(z.record(z.string(), z.any()))
    .optional()
    .describe("Document body. Each item is a node, such as a paragraph containing text."),
});

export const widgetSettingsSchema = z.object({
  display_type: displayTypeSchema,
  ...widgetSettingsFields,
  grid: widgetGridSchema.optional().describe("Where this widget sits on the dashboard's 12-column grid."),
});

export const widgetSettingsUpdateSchema = z.object({
  display_type: displayTypeSchema.optional(),
  ...widgetSettingsFields,
});

export const widgetSchema = z.object({
  widgetable_token: z
    .string()
    .optional()
    .describe(
      "Token of the report or saved view this widget shows. Required unless widgetable_type is free_text. Use a Cost Report (rprt_*), resource report (prvdr_rsrc_rprt_*), Kubernetes efficiency report (kbnts_eff_rprt_*), financial commitment report (fncl_cmnt_rprt_*), or recommendation saved view (rec_vw_*)."
    ),
  widgetable_type: z
    .enum(["free_text"])
    .optional()
    .describe(
      "Set free_text for a text widget. Leave unset for a report or saved view. Requires content and must omit widgetable_token."
    ),
  title: z
    .string()
    .describe("Widget title. Defaults to the linked resource's title, or Free Text for a free_text widget.")
    .optional(),
  content: widgetContentSchema
    .optional()
    .describe(
      'Rich-text document. Required when widgetable_type is free_text. Example: {"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Note"}]}]}.'
    ),
  settings: widgetSettingsSchema
    .optional()
    .describe("How the widget is drawn and where it sits. Include display_type when settings is set."),
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
