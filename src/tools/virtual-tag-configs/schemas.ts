import z from "zod";
import dateValidator from "../../utils/dateValidator";
import { nonempty, vantageToken } from "../../utils/zod";

export const collapsedTagKeySchema = z.object({
  key: nonempty().describe("Tag key whose values should be collapsed."),
  providers: z
    .array(nonempty())
    .optional()
    .describe("Providers this collapsed tag key applies to. Do not combine with filter."),
  filter: nonempty()
    .optional()
    .describe("VQL filter limiting where this collapsed tag key applies. Do not combine with providers."),
});

const labelTransformSchema = z.object({
  type: z.enum(["split", "format"]).describe("Label transform operation."),
  delimiter: nonempty().nullable().optional().describe("Delimiter used by a split transform."),
  index: z.number().int().nullable().optional().describe("Zero-based index used by a split transform."),
  template: nonempty().nullable().optional().describe("Template used by a format transform."),
});

const costMetricSchema = z.object({
  filter: nonempty().describe("VQL filter for the cost metric used to allocate matching costs."),
  aggregation: z.object({
    tag: nonempty().describe("Tag key used to aggregate the cost metric."),
  }),
});

const percentageSchema = z.object({
  value: nonempty().describe("Virtual tag value receiving this percentage of matched costs."),
  pct: z.number().describe("Percentage of matched costs allocated to the value."),
});

const dateRangeSchema = z.object({
  start_date: dateValidator("Inclusive start date, YYYY-MM-DD, or null for no lower bound.").nullable().optional(),
  end_date: dateValidator("Inclusive end date, YYYY-MM-DD, or null for no upper bound.").nullable().optional(),
});

export const virtualTagConfigValueSchema = z.object({
  filter: nonempty().describe("VQL filter that determines which costs match this value."),
  name: nonempty().optional().describe("Name for a simple value."),
  business_metric_token: vantageToken("business_metric", {
    description: "Associates this value with a Business Metric.",
  }).optional(),
  label_key: nonempty().optional().describe("Business Metric label key used by this value."),
  label_values: z
    .array(z.string())
    .optional()
    .describe("Business Metric label values. An empty array includes every value for the label key."),
  display_name: nonempty().optional().describe("Display name for a cost metric or percentage allocation value."),
  label_transforms: z.array(labelTransformSchema).optional().describe("Transforms applied to Business Metric labels."),
  cost_metric: costMetricSchema.optional().describe("Cost metric used for dynamic allocation."),
  percentages: z.array(percentageSchema).optional().describe("Fixed percentage allocations for matching costs."),
  date_ranges: z.array(dateRangeSchema).optional().describe("Date ranges that restrict when this value applies."),
});
