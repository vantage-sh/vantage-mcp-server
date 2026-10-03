import z from "zod";
import dateValidator from "../../utils/dateValidator";
import { nonempty, vantageToken } from "../../utils/zod";
import { virtualTagConfigValueResponseSchema } from "../virtual-tag-config-values/schemas";

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

// Output schemas mirror the Vantage client response types.
export const virtualTagConfigCollapsedTagKeyResponseSchema = z.object({
  key: z.string().describe("The tag key to collapse values for."),
  providers: z
    .array(z.string())
    .describe("The providers this collapsed tag key applies to. Empty when it applies to all providers."),
  filter: z
    .string()
    .nullable()
    .describe("The VQL filter this collapsed tag key applies to. Null when the key is provider-scoped or unset."),
});

export const virtualTagConfigResponseSchema = z.object({
  token: z.string().describe("The token of the VirtualTagConfig."),
  created_by_token: z.string().nullable().describe("The token of the Creator of the VirtualTagConfig."),
  key: z.string().describe("The key of the VirtualTagConfig."),
  hidden: z.boolean().describe("Whether the VirtualTagConfig key is hidden from the Vantage UI."),
  preferred: z.boolean().describe("Whether the VirtualTagConfig key is marked as preferred in the Vantage UI."),
  overridable: z
    .boolean()
    .describe("Whether the VirtualTagConfig can override a provider-supplied tag on a matching Cost."),
  backfill_until: z.string().describe("The earliest month VirtualTagConfig should be backfilled to."),
  collapsed_tag_keys: z
    .array(virtualTagConfigCollapsedTagKeyResponseSchema)
    .describe("Tag keys to collapse values for."),
  values: z
    .array(virtualTagConfigValueResponseSchema)
    .describe("Values for the VirtualTagConfig, with match precedence determined by their relative order in the list."),
});

export const virtualTagConfigsResponseSchema = z.object({
  virtual_tag_configs: z.array(virtualTagConfigResponseSchema).describe("Virtual tag configs."),
});

export const asyncVirtualTagConfigUpdateResponseSchema = z.object({
  request_id: z.string().describe("The request ID of the async virtual tag config update."),
  status_url: z.string().describe("The status path of the async virtual tag config update."),
});

export const virtualTagConfigOutputSchema = virtualTagConfigResponseSchema.shape;

export const virtualTagConfigsOutputSchema = virtualTagConfigsResponseSchema.shape;

// Updates return either the complete config or an asynchronous job. Keep the
// existing top-level response shape, and expose both alternatives to MCP clients.
export const updateVirtualTagConfigOutputSchema = z
  .object({
    ...virtualTagConfigResponseSchema.partial().shape,
    ...asyncVirtualTagConfigUpdateResponseSchema.partial().shape,
  })
  .refine(
    (value) =>
      virtualTagConfigResponseSchema.safeParse(value).success ||
      asyncVirtualTagConfigUpdateResponseSchema.safeParse(value).success,
    { message: "Expected a complete Virtual Tag Config or an asynchronous job." }
  )
  .meta({
    anyOf: [
      {
        required: Object.keys(virtualTagConfigResponseSchema.shape),
      },
      { required: Object.keys(asyncVirtualTagConfigUpdateResponseSchema.shape) },
    ],
  });
