import type { CreateInvoiceRequest } from "@vantage-sh/vantage-client";
import dateValidator from "../../utils/dateValidator";
import { vantageToken } from "../../utils/zod";
import MCPUserError from "../structure/MCPUserError";
import registerTool from "../structure/registerTool";

const description = `
Create an invoice for a managed account and billing period. Requires an MSP account with invoicing enabled.
`.trim();

export default registerTool({
  name: "create-invoice",
  title: "Create Invoice",
  description,
  annotations: {
    readOnly: false,
    destructive: false,
    openWorld: false,
  },
  args: {
    billing_period_start: dateValidator("Start date of the billing period, YYYY-MM-DD."),
    billing_period_end: dateValidator("End date of the billing period, YYYY-MM-DD."),
    account_token: vantageToken("managed_account", {
      description: "Managed account to invoice.",
    }),
  },
  async execute(args, ctx) {
    if (args.billing_period_start > args.billing_period_end) {
      throw new MCPUserError({
        errors: [{ message: "billing_period_start must be on or before billing_period_end" }],
      });
    }

    const response = await ctx.callVantageApi("/v2/invoices", args as CreateInvoiceRequest, "POST");
    if (!response.ok) {
      throw new MCPUserError({ errors: response.errors });
    }
    return response.data;
  },
});
