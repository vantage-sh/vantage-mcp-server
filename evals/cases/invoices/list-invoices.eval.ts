import { buildToolCases } from "../../_lib/buildCases";

const TARGET = "list-invoices";

export default function generateTests() {
  return buildToolCases({
    target: TARGET,
    resource: "invoices",
    distractors: ["get-invoice", "create-invoice", "get-invoice-cost-report", "list-cost-reports"],
    directPrompts: [
      {
        input: "Use list-invoices to show page 1 of the invoices in my Vantage MSP account.",
        expected: [{ toolName: TARGET, input: { page: 1 } }],
      },
    ],
    inferredPrompts: [
      {
        input: "Show page 2 of the invoices for Vantage managed account acct_customer42.",
        expected: [
          {
            toolName: TARGET,
            input: {
              page: 2,
              managed_account_token: "acct_customer42",
            },
          },
        ],
      },
    ],
  });
}
