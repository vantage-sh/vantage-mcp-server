import { pathEncode } from "@vantage-sh/vantage-client";
import MCPUserError from "../structure/MCPUserError";
import registerTool from "../structure/registerTool";
import { invoiceToken } from "./schemas";

const description = `
Get the Vantage cost report URL for an invoice's billing period.
`.trim();

export default registerTool({
  name: "get-invoice-cost-report",
  title: "Get Invoice Cost Report",
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
    const response = await ctx.callVantageApi(`/v2/invoices/${pathEncode(args.invoice_token)}/cost_report`, {}, "GET");
    if (!response.ok) {
      throw new MCPUserError({ errors: response.errors });
    }
    return response.data;
  },
});
