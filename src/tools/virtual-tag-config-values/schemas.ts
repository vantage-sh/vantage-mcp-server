import z from "zod";
import dateValidator from "../../utils/dateValidator";
import { nonempty, vantageToken } from "../../utils/zod";

export const virtualTagConfigToken = vantageToken("virtual_tag_config", {
  description: "Parent Virtual Tag Config.",
});

export const virtualTagConfigValueToken = vantageToken("virtual_tag_config_value");

export const virtualTagConfigValueFilter = nonempty().describe(
  "VQL filter that determines which costs match this Virtual Tag Config Value."
);

const labelTransform = z.object({
  type: z.enum(["split", "format"]).describe("Label transform operation."),
  delimiter: nonempty().nullable().optional().describe("Delimiter used by a split transform."),
  index: z.number().int().nullable().optional().describe("Zero-based index used by a split transform."),
  template: nonempty().nullable().optional().describe("Template used by a format transform."),
});

const costMetric = z.object({
  filter: nonempty().describe("VQL filter for the cost metric used to allocate matching costs."),
  aggregation: z.object({
    tag: nonempty().describe("Tag key used to aggregate the cost metric."),
  }),
});

const percentage = z.object({
  value: nonempty().describe("Virtual tag value receiving this percentage of matched costs."),
  pct: z.number().describe("Percentage of matched costs allocated to the value."),
});

const dateRange = z.object({
  start_date: dateValidator("Inclusive start date, YYYY-MM-DD, or null for no lower bound.").nullable().optional(),
  end_date: dateValidator("Inclusive end date, YYYY-MM-DD, or null for no upper bound.").nullable().optional(),
});

export const virtualTagConfigValueOptionalArgs = {
  name: nonempty().optional().describe("Name for a simple Virtual Tag Config Value."),
  business_metric_token: vantageToken("business_metric", {
    description: "Associates this value with a Business Metric.",
  }).optional(),
  label_key: nonempty().optional().describe("Business Metric label key used by this value."),
  label_values: z
    .array(z.string())
    .optional()
    .describe("Business Metric label values. An empty array includes every value for the label key."),
  display_name: nonempty()
    .nullable()
    .optional()
    .describe("Display name for a cost metric or percentage allocation value. Use null to clear it."),
  label_transforms: z.array(labelTransform).optional().describe("Transforms applied to Business Metric labels."),
  cost_metric: costMetric.optional().describe("Cost metric used for dynamic allocation."),
  percentages: z.array(percentage).optional().describe("Fixed percentage allocations for matching costs."),
  date_ranges: z.array(dateRange).optional().describe("Date ranges that restrict when this value applies."),
};

export const valueTypeFields = ["name", "business_metric_token", "cost_metric", "percentages"] as const;

export const valueUpdateFields = [
  "filter",
  ...valueTypeFields,
  "label_key",
  "label_values",
  "display_name",
  "label_transforms",
  "date_ranges",
] as const;

export function countDefinedFields(args: Record<string, unknown>, fields: readonly string[]): number {
  return fields.filter((field) => args[field] !== undefined).length;
}

export function countProvidedValueTypes(args: Record<string, unknown>): number {
  return valueTypeFields.filter((field) => {
    const value = args[field];
    return field === "percentages" ? Array.isArray(value) && value.length > 0 : value !== undefined;
  }).length;
}
