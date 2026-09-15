import { buildToolCases } from "../../_lib/buildCases";

const TARGET = "regenerate-invoice";

export default function generateTests() {
  return buildToolCases({
    target: TARGET,
    resource: "invoices",
    distractors: ["create-invoice", "get-invoice", "send-and-approve-invoice", "download-invoice"],
    directPrompts: [
      {
        input: "Use regenerate-invoice to rebuild Vantage invoice msp_inv_abc123 from its source costs.",
        expected: [{ toolName: TARGET, input: { invoice_token: "msp_inv_abc123" } }],
      },
    ],
    inferredPrompts: [
      {
        input: "The costs changed, so recalculate the existing Vantage invoice msp_inv_customer789.",
        expected: [{ toolName: TARGET, input: { invoice_token: "msp_inv_customer789" } }],
      },
    ],
  });
}
