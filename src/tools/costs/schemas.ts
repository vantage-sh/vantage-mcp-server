import z from "zod";

export const groupingSortArgs = {
  sort_column: z
    .string()
    .min(1)
    .optional()
    .describe(
      "A selected logical grouping (including tag:<key> or segment) to sort by raw value across all matching records before pagination. Segment values sort by ID, not title. Ties use date descending, then remaining groupings ascending. Pages contain date × grouping records, not whole groups. Omit to keep existing date-first ordering."
    ),
  sort_direction: z
    .enum(["asc", "desc"])
    .optional()
    .describe("Grouping sort direction. Defaults to asc when sort_column is supplied; requires sort_column."),
};
