const groupingDimensions = [
  "account_id",
  "billing_account_id",
  "charge_type",
  "cost_category",
  "cost_subcategory",
  "provider",
  "region",
  "resource_id",
  "service",
  "tag",
  "tagged",
  "usage_unit",
];

export function telemetryGroupings(groupings: string[]) {
  const requested = new Set(groupings.map((value) => (value.startsWith("tag:") ? "tag" : value)));
  return groupingDimensions.filter((dimension) => requested.has(dimension)).join(",");
}
