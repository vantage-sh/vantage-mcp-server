import { pathEncode } from "@vantage-sh/vantage-client";
import MCPUserError from "../structure/MCPUserError";
import registerTool from "../structure/registerTool";
import { invoiceToken } from "./schemas";

const description = `
Approve an invoice and send it to its configured email recipients. Requires an MSP account.
`.trim();

export default registerTool({
  name: "send-and-approve-invoice",
  title: "Send and Approve Invoice",
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
    const response = await ctx.callVantageApi(
      `/v2/invoices/${pathEncode(args.invoice_token)}/send_and_approve`,
      {},
      "POST"
    );
    if (!response.ok) {
      throw new MCPUserError({ errors: response.errors });
    }
    return response.data;
  },
});
