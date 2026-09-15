import { buildToolCases } from "../../_lib/buildCases";

const TARGET = "get-invoice-cost-report";

export default function generateTests() {
  return buildToolCases({
    target: TARGET,
    resource: "invoices",
    distractors: ["get-invoice", "download-invoice", "get-cost-report", "list-cost-reports"],
    directPrompts: [
      {
        input: "Use get-invoice-cost-report for Vantage invoice msp_inv_abc123.",
        expected: [{ toolName: TARGET, input: { invoice_token: "msp_inv_abc123" } }],
      },
    ],
    inferredPrompts: [
      {
        input: "Open the Vantage cost report covering the billing period for invoice msp_inv_customer789.",
        expected: [{ toolName: TARGET, input: { invoice_token: "msp_inv_customer789" } }],
      },
    ],
  });
}
