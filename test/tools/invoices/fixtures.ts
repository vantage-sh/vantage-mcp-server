import type { GetInvoiceResponse } from "@vantage-sh/vantage-client";

export const INVOICE_TOKEN = "msp_inv_123";

export const invoice: GetInvoiceResponse = {
  token: INVOICE_TOKEN,
  invoice_number: "INV-2026-001",
  total: "1250.50",
  billing_period_start: "2026-08-01",
  billing_period_end: "2026-08-31",
  status: "draft",
  created_at: "2026-09-01T12:00:00Z",
  updated_at: "2026-09-01T12:00:00Z",
  account_token: "acct_123",
  account_name: "Managed Account",
  msp_account_token: "acct_msp",
};
