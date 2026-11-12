import { buildToolCases } from "../../_lib/buildCases";

const TARGET = "create-custom-calculation";

export default function generateTests() {
  return buildToolCases({
    target: TARGET,
    resource: "custom-calculations",
    distractors: ["update-custom-calculation", "create-cost-report", "create-budget", "query-costs"],
    directPrompts: [
      {
        input:
          'Use create-custom-calculation to create a KPI titled Cost per million tokens with operation division, display_as per-n, unit_scale 1000000, and filter JSON {"filter_numerator":"costs.provider = \'aws\'","usage_unit_numerator":null,"filter_denominator":"costs.provider = \'aws\'","usage_unit_denominator":"Tokens"}.',
        expected: [
          {
            toolName: TARGET,
            input: {
              title: "Cost per million tokens",
              operation: "division",
              display_as: "per-n",
              unit_scale: 1000000,
              filter: {
                filter_numerator: "costs.provider = 'aws'",
                usage_unit_numerator: null,
                filter_denominator: "costs.provider = 'aws'",
                usage_unit_denominator: "Tokens",
              },
            },
          },
        ],
      },
    ],
    inferredPrompts: [
      {
        input:
          "Save a new reusable KPI named AWS tokens with description Total token consumption. Sum usage data using the VQL costs.provider = 'aws', combining the equivalent usage-unit names Tokens and tokens as an array without unit conversion. Set operation to sum, display format to ratio and integer unit scale to 1. Use filter JSON with filter and usage_unit keys. I will attach it to reports later.",
        expected: [
          {
            toolName: TARGET,
            input: {
              title: "AWS tokens",
              description: "Total token consumption",
              operation: "sum",
              display_as: "ratio",
              unit_scale: 1,
              filter: { filter: "costs.provider = 'aws'", usage_unit: ["Tokens", "tokens"] },
            },
          },
        ],
      },
    ],
  });
}
