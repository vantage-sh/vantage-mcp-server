import { buildToolCases } from "../../_lib/buildCases";

const TARGET = "get-invoice";

export default function generateTests() {
  return buildToolCases({
    target: TARGET,
    resource: "invoices",
    distractors: ["list-invoices", "download-invoice", "get-invoice-cost-report", "regenerate-invoice"],
    directPrompts: [
      {
        input: "Use get-invoice to retrieve Vantage invoice msp_inv_abc123.",
        expected: [{ toolName: TARGET, input: { invoice_token: "msp_inv_abc123" } }],
      },
    ],
    inferredPrompts: [
      {
        input: "Show me the billing period, total, and status for Vantage invoice msp_inv_customer789.",
        expected: [{ toolName: TARGET, input: { invoice_token: "msp_inv_customer789" } }],
      },
    ],
  });
}
