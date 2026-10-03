import z from "zod";

export type ToolOutputSchema = z.ZodRawShape | z.ZodObject;

export type InferOutputInput<Output extends ToolOutputSchema | undefined> = Output extends z.ZodObject
  ? z.input<Output>
  : Output extends z.ZodRawShape
    ? z.input<z.ZodObject<Output>>
    : Record<string, unknown>;

export type InferOutput<Output extends ToolOutputSchema | undefined> = Output extends z.ZodObject
  ? z.output<Output>
  : Output extends z.ZodRawShape
    ? z.output<z.ZodObject<Output>>
    : Record<string, unknown>;

export function outputSchemaAsObject(schema: ToolOutputSchema): z.ZodObject {
  return schema instanceof z.ZodObject ? schema : z.object(schema);
}

export const paginationSchema = z.object({
  hasNextPage: z.boolean().describe("Whether another page of results is available."),
  nextPage: z.number().int().describe("The next page number, or 0 when there is no next page."),
});

export const deletedTokenOutputSchema = {
  token: z.string().describe("The token of the deleted resource."),
};

export const linksSchema = z.object({
  self: z.string().nullable().optional().describe("The URL of the current page of results."),
  first: z.string().nullable().optional().describe("The URL of the first page of results."),
  next: z.string().nullable().optional().describe("The URL of the next page of results, if one exists."),
  last: z.string().nullable().optional().describe("The URL of the last page of results, if one exists."),
  prev: z.string().nullable().optional().describe("The URL of the previous page of results, if one exists."),
});

export const monetaryAmountSchema = z.object({
  amount: z.string().describe("The amount of the cost."),
  currency: z.string().describe("The currency of the cost."),
});

export const costProviderSchema = z.enum([
  "twilio",
  "azure",
  "gcp",
  "custom_provider",
  "aws",
  "snowflake",
  "databricks",
  "mongo",
  "datadog",
  "fastly",
  "new_relic",
  "opencost",
  "open_ai",
  "oracle",
  "confluent",
  "planetscale",
  "coralogix",
  "kubernetes",
  "github",
  "linode",
  "grafana",
  "clickhouse",
  "temporal",
  "azure_csp",
  "kubernetes_agent",
  "anthropic",
  "anyscale",
  "cursor",
  "elastic",
  "vercel",
  "redis_cloud",
  "circle_ci",
  "modal",
  "eleven_labs",
  "baseten",
  "cloudflare",
  "fireworks_ai",
  "cartesia",
  "depot",
  "xai",
  "digital_ocean",
  "together_ai",
  "coreweave",
  "devin",
  "openrouter",
  "deepgram",
  "crusoe",
]);
