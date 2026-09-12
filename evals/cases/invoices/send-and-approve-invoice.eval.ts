import { buildToolCases } from "../../_lib/buildCases";

const TARGET = "send-and-approve-invoice";

export default function generateTests() {
  return buildToolCases({
    target: TARGET,
    resource: "invoices",
    distractors: ["send-invoice", "regenerate-invoice", "get-invoice", "create-invoice"],
    directPrompts: [
      {
        input:
          "Use send-and-approve-invoice to approve Vantage invoice msp_inv_abc123 and email it to its configured recipients.",
        expected: [{ toolName: TARGET, input: { invoice_token: "msp_inv_abc123" } }],
      },
    ],
    inferredPrompts: [
      {
        input: "Finalize Vantage invoice msp_inv_customer789 and send it to the customer.",
        expected: [{ toolName: TARGET, input: { invoice_token: "msp_inv_customer789" } }],
      },
    ],
  });
}
