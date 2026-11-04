import z from "zod";

export const operation = z
  .enum(["sum", "average", "division", "min", "max"])
  .describe("Operation applied to the filtered cost or usage data. Defaults to sum on create.");
export const displayAs = z.enum(["ratio", "percent", "per-n"]).describe("Display format. Defaults to ratio on create.");
export const unitScale = z.number().int().nullable().describe("Integer unit scale. Defaults to 1 on create.");

const usageUnit = z.string().nullable().optional();
export const calculationFilter = z
  .union([
    z.object({
      type: z
        .enum(["sum", "average", "min", "max"])
        .optional()
        .describe("Optional filter type matching the calculation operation."),
      filter: z.string().describe("VQL selecting the input cost or usage data."),
      usage_unit: usageUnit.describe("Usage unit to measure; omit or send null to use cost data."),
    }),
    z.object({
      type: z.literal("division").optional().describe("Optional filter type for division."),
      filter_numerator: z.string().describe("VQL selecting the numerator data."),
      usage_unit_numerator: usageUnit.describe("Numerator usage unit; omit or send null to use cost data."),
      filter_denominator: z.string().describe("VQL selecting the denominator data."),
      usage_unit_denominator: usageUnit.describe("Denominator usage unit; omit or send null to use cost data."),
    }),
  ])
  .describe(
    "Calculation filter JSON. If type is provided, match it to operation. On update, replaces the entire filter object."
  );
