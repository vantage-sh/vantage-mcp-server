import {
  createNonEmptyString,
  isNonEmptyString,
  VANTAGE_FINANCIAL_COMMITMENT_GROUPINGS,
  type VantageFinancialCommitmentGrouping,
} from "@vantage-sh/vantage-client";
import z from "zod";

export const groupingDescription = "Grouping dimensions for the report. Use tag:<tag_key> to group by tag.";

const groupingValueSchema = (description: string) =>
  z.union(
    [
      z.enum(VANTAGE_FINANCIAL_COMMITMENT_GROUPINGS),
      z
        .string()
        .startsWith("tag:", { error: description })
        .refine((value) => isNonEmptyString(value.slice(4)), { error: description })
        .transform((value): VantageFinancialCommitmentGrouping => `tag:${createNonEmptyString(value.slice(4))}`),
    ],
    { error: description }
  );

export const groupingSchema = groupingValueSchema(groupingDescription);

export const costGroupingDescription = "Grouping dimensions for returned costs. Use tag:<tag_key> to group by tag.";

export const costGroupingSchema = groupingValueSchema(costGroupingDescription);
