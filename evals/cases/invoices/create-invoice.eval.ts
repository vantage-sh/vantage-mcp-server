import { buildToolCases } from "../../_lib/buildCases";

const TARGET = "create-invoice";

export default function generateTests() {
  return buildToolCases({
    target: TARGET,
    resource: "invoices",
    distractors: ["list-invoices", "get-invoice", "regenerate-invoice", "send-and-approve-invoice"],
    directPrompts: [
      {
        input:
          "Use create-invoice to invoice Vantage managed account acct_customer42 from 2026-08-01 through 2026-08-31.",
        expected: [
          {
            toolName: TARGET,
            input: {
              account_token: "acct_customer42",
              billing_period_start: "2026-08-01",
              billing_period_end: "2026-08-31",
            },
          },
        ],
      },
    ],
    inferredPrompts: [
      {
        input: "Bill managed account acct_acme123 for its September 2026 Vantage costs, from 2026-09-01 to 2026-09-30.",
        expected: [
          {
            toolName: TARGET,
            input: {
              account_token: "acct_acme123",
              billing_period_start: "2026-09-01",
              billing_period_end: "2026-09-30",
            },
          },
        ],
      },
    ],
  });
}
