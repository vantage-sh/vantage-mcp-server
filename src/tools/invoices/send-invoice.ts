import { pathEncode } from "@vantage-sh/vantage-client";
import MCPUserError from "../structure/MCPUserError";
import registerTool from "../structure/registerTool";
import { invoiceToken } from "./schemas";

const description = `
Send an invoice to its configured email recipients.
`.trim();

export default registerTool({
  name: "send-invoice",
  title: "Send Invoice",
  description,
  annotations: {
    readOnly: false,
    destructive: true,
    openWorld: false,
  },
  args: {
    invoice_token: invoiceToken,
  },
  async execute(args, ctx) {
    const response = await ctx.callVantageApi(`/v2/invoices/${pathEncode(args.invoice_token)}/send`, {}, "POST");
    if (!response.ok) {
      throw new MCPUserError({ errors: response.errors });
    }
    return response.data;
  },
});
