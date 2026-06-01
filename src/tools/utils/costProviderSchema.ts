import z from "zod";

/** Provider slugs from @vantage-sh/vantage-client (getTags / getIntegrations query). */
export const costProviderIds = [
  "aws",
  "azure",
  "gcp",
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
  "custom_provider",
  "github",
  "linode",
  "grafana",
  "clickhouse",
  "temporal",
  "twilio",
  "azure_csp",
  "kubernetes_agent",
  "anthropic",
  "anyscale",
  "cursor",
  "elastic",
  "vercel",
  "redis_cloud",
  "circle_ci",
] as const;

export const costProviderSchema = z.enum(costProviderIds);

export const costProvidersSchema = z.array(costProviderSchema);
