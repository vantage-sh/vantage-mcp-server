import { buildToolCases } from "../../_lib/buildCases";

const TARGET = "download-invoice";

export default function generateTests() {
  return buildToolCases({
    target: TARGET,
    resource: "invoices",
    distractors: ["get-invoice", "get-invoice-cost-report", "send-invoice", "regenerate-invoice"],
    directPrompts: [
      {
        input: "Use download-invoice to get a PDF download URL for Vantage invoice msp_inv_abc123.",
        expected: [
          {
            toolName: TARGET,
            input: {
              invoice_token: "msp_inv_abc123",
              file_type: "pdf",
            },
          },
        ],
      },
    ],
    inferredPrompts: [
      {
        input: "Give me a CSV download link for Vantage invoice msp_inv_customer789.",
        expected: [
          {
            toolName: TARGET,
            input: {
              invoice_token: "msp_inv_customer789",
              file_type: "csv",
            },
          },
        ],
      },
    ],
  });
}
