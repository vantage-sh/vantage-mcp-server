import { pathEncode } from "@vantage-sh/vantage-client";
import MCPUserError from "../structure/MCPUserError";
import registerTool from "../structure/registerTool";
import { invoiceToken } from "./schemas";

const description = `
Get an invoice by token, including its billing period, total, status, and managed account.
`.trim();

export default registerTool({
  name: "get-invoice",
  title: "Get Invoice",
  description,
  annotations: {
    readOnly: true,
    destructive: false,
    openWorld: false,
  },
  args: {
    invoice_token: invoiceToken,
  },
  async execute(args, ctx) {
    const response = await ctx.callVantageApi(`/v2/invoices/${pathEncode(args.invoice_token)}`, {}, "GET");
    if (!response.ok) {
      throw new MCPUserError({ errors: response.errors });
    }
    return response.data;
  },
});
