import z from "zod";
import MCPUserError from "../structure/MCPUserError";

const GROUPING_SORT_VALUES =
  "account_id, billing_account_id, charge_type, cost_category, cost_subcategory, provider, region, resource_id, service, tagged, usage_unit, tag:<tag_value>";

export const groupingSortArgs = {
  sort_column: z
    .string()
    .min(1)
    .optional()
    .describe(
      `Column to sort by. A selected grouping (${GROUPING_SORT_VALUES}) sorts by that grouping. amount ranks each grouping by its total cost over the full requested period. usage_amount does the same for usage and requires settings_aggregate_by=usage. amount and usage_amount are rejected when settings_aggregate_by is count. Rows for one grouping stay in date order, so a row is one date bin, not the grouping total. Omit to sort by date.`
    ),
  sort_direction: z
    .enum(["asc", "desc"])
    .optional()
    .describe(
      "Sort direction for sort_column. Defaults to asc. Requires sort_column. Use desc with sort_column=amount or usage_amount for the highest totals first."
    ),
};

type CostsSortArgs = {
  sort_column?: string;
  sort_direction?: "asc" | "desc";
  settings_aggregate_by?: "cost" | "usage" | "count";
};

export function assertCostsSort(args: CostsSortArgs): void {
  if (args.sort_direction !== undefined && args.sort_column === undefined) {
    throw new MCPUserError({ errors: [{ message: "sort_direction requires sort_column" }] });
  }

  if (args.sort_column !== "amount" && args.sort_column !== "usage_amount") return;

  if (args.settings_aggregate_by === "count") {
    throw new MCPUserError({
      errors: [
        {
          message: "sort_column amount and usage_amount are not supported when settings_aggregate_by is count.",
        },
      ],
    });
  }

  if (args.sort_column === "usage_amount" && args.settings_aggregate_by !== "usage") {
    throw new MCPUserError({
      errors: [{ message: "sort_column usage_amount requires settings_aggregate_by=usage." }],
    });
  }
}

export function costsMetricSortNote(sort_column?: string, sort_direction?: "asc" | "desc"): string | undefined {
  if (sort_column !== "amount" && sort_column !== "usage_amount") return undefined;

  const direction = sort_direction ?? "asc";
  const metric = sort_column === "usage_amount" ? "usage" : "cost";
  const order = direction === "desc" ? "highest total first" : "lowest total first";
  const ascHint =
    direction === "asc"
      ? ` This page starts with the lowest totals. For the ${sort_column === "usage_amount" ? "highest usage" : "most expensive groupings"}, call again with sort_direction=desc.`
      : "";

  return `Results are ordered by each grouping's total ${metric} over the full requested period, ${order}. Rows for the same grouping stay together in date order, so one row is a single date bin, not that total. Rank groupings, not individual rows. Later pages continue this ranking.${ascHint}`;
}
