import z from "zod";

const financialCommitmentGroupings = [
  "provider",
  "service",
  "resource_account_id",
  "provider_account_id",
  "commitment_type",
  "commitment_id",
  "cost_type",
  "cost_category",
  "cost_sub_category",
  "instance_type",
  "region",
] as const;

export const groupingDescription =
  "Grouping dimensions for aggregating financial commitments on the report. Valid groupings: provider, service, resource_account_id, provider_account_id, commitment_type, commitment_id, cost_type, cost_category, cost_sub_category, instance_type, region, and tag:<tag_key>.";

export const groupingSchema = z
  .string()
  .min(1)
  .refine(
    (value) =>
      financialCommitmentGroupings.includes(value as (typeof financialCommitmentGroupings)[number]) ||
      value.startsWith("tag:"),
    {
      error: groupingDescription,
      when(payload) {
        return z.string().min(1).safeParse(payload.value).success;
      },
    }
  );
