import z from "zod";

export const groupingSortArgs = {
  sort_column: z
    .string()
    .min(1)
    .optional()
    .describe(
      "Sort results by one of the fields in groupings. Valid groupings: account_id, billing_account_id, charge_type, cost_category, cost_subcategory, provider, region, resource_id, service, tagged, usage_unit, tag:<tag_value>. Segment reports also support segment (sorted by ID). Defaults to sorting by date."
    ),
  sort_direction: z
    .enum(["asc", "desc"])
    .optional()
    .describe("Grouping sort direction. Defaults to asc when sort_column is supplied; requires sort_column."),
};
