import type { CustomCalculation } from "../../../src/utils/vantage-api-types";

export const filter = { type: "sum" as const, filter: "costs.provider = 'aws'", usage_unit: null };
export const divisionFilter = {
  type: "division" as const,
  filter_numerator: "costs.provider = 'aws'",
  usage_unit_numerator: null,
  filter_denominator: "costs.provider = 'aws'",
  usage_unit_denominator: "Requests",
};
export const calculation: CustomCalculation = {
  token: "cstm_clcltn_123",
  title: "AWS Cost",
  operation: "sum",
  filter,
  display_as: "ratio",
  unit_scale: 1,
  cost_report_tokens: ["rprt_123"],
  is_read_only: false,
  created_at: "2026-11-04T00:00:00Z",
  updated_at: "2026-11-04T00:00:00Z",
};
