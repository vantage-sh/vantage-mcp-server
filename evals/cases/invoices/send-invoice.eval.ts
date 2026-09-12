import { buildToolCases } from "../../_lib/buildCases";

const TARGET = "send-invoice";

export default function generateTests() {
  return buildToolCases({
    target: TARGET,
    resource: "invoices",
    distractors: ["send-and-approve-invoice", "download-invoice", "get-invoice", "regenerate-invoice"],
    directPrompts: [
      {
        input: "Use send-invoice to email Vantage invoice msp_inv_abc123 to its configured recipients.",
        expected: [{ toolName: TARGET, input: { invoice_token: "msp_inv_abc123" } }],
      },
    ],
    inferredPrompts: [
      {
        input: "Email the already-approved Vantage invoice msp_inv_customer789 to its recipients.",
        expected: [{ toolName: TARGET, input: { invoice_token: "msp_inv_customer789" } }],
      },
    ],
  });
}
