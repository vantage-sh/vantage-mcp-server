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

export const virtualTagConfigValueCreateOptionalArgs = {
  name: nonempty().optional().describe("Name for a simple Virtual Tag Config Value."),
  business_metric_token: vantageToken("business_metric", {
    description: "Associates this value with a Business Metric.",
  }).optional(),
  label_key: nonempty().optional().describe("Business Metric label key used by this value."),
  label_values: z
    .array(z.string())
    .optional()
    .describe("Business Metric label values. An empty array includes every value for the label key."),
  display_name: nonempty().optional().describe("Display name for a cost metric or percentage allocation value."),
  label_transforms: z.array(labelTransform).optional().describe("Transforms applied to Business Metric labels."),
  cost_metric: costMetric.optional().describe("Cost metric used for dynamic allocation."),
  percentages: z.array(percentage).optional().describe("Fixed percentage allocations for matching costs."),
  date_ranges: z.array(dateRange).optional().describe("Date ranges that restrict when this value applies."),
};

export const virtualTagConfigValueUpdateOptionalArgs = {
  ...virtualTagConfigValueCreateOptionalArgs,
  display_name: nonempty()
    .nullable()
    .optional()
    .describe("Display name for a cost metric or percentage allocation value. Use null to clear it."),
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

// Output schemas mirror the Vantage client response types.
export const virtualTagConfigValueCostMetricAggregationResponseSchema = z.object({
  tag: z.string().nullable().optional().describe("The tag to aggregate on."),
});

export const virtualTagConfigValueCostMetricResponseSchema = z.object({
  filter: z.string().nullable().describe("The filter VQL for the cost metric."),
  aggregation: virtualTagConfigValueCostMetricAggregationResponseSchema.describe("Aggregation."),
});

export const virtualTagConfigValueLabelTransformResponseSchema = z.object({
  type: z.enum(["format", "split"]).describe("The label transform type."),
  delimiter: z.string().nullable().optional().describe("Delimiter used by split transforms."),
  index: z.number().nullable().optional().describe("Zero-based index used by split transforms."),
  template: z.string().nullable().optional().describe("Template used by format transforms."),
});

export const virtualTagConfigValuePercentageResponseSchema = z.object({
  value: z.string().describe("The tag value associated with a percentage of matched costs."),
  pct: z.number().describe("The percentage of matched costs associated with the value."),
});

export const virtualTagConfigValueDateRangeResponseSchema = z.object({
  start_date: z.string().nullable().describe("The start date of the range (inclusive), or null for unbounded."),
  end_date: z.string().nullable().describe("The end date of the range (inclusive), or null for unbounded."),
});

export const virtualTagConfigValueResponseSchema = z.object({
  token: z.string().describe("The token of the Value."),
  filter: z.string().nullable().describe("The filter VQL for the Value."),
  name: z.string().nullable().optional().describe("The name of the Value."),
  business_metric_token: z.string().nullable().optional().describe("The token of the associated BusinessMetric."),
  label_key: z
    .string()
    .nullable()
    .optional()
    .describe("The business metric label key used for this virtual tag value."),
  label_values: z
    .array(z.string())
    .nullable()
    .optional()
    .describe("Optional business metric label values. An empty array includes every value for the label key."),
  cost_metric: virtualTagConfigValueCostMetricResponseSchema.optional().describe("Cost metric."),
  display_name: z.string().nullable().optional().describe("The display name for this allocation value."),
  label_transforms: z
    .array(virtualTagConfigValueLabelTransformResponseSchema)
    .describe("Label transforms applied to business metric labels."),
  percentages: z
    .array(virtualTagConfigValuePercentageResponseSchema)
    .describe("Labeled percentage allocations for matching costs."),
  date_ranges: z
    .array(virtualTagConfigValueDateRangeResponseSchema)
    .describe("Date ranges restricting when this value applies."),
});

export const virtualTagConfigValueOutputSchema = virtualTagConfigValueResponseSchema.shape;
