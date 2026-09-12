import { pathEncode } from "@vantage-sh/vantage-client";
import MCPUserError from "../structure/MCPUserError";
import registerTool from "../structure/registerTool";
import { invoiceToken } from "./schemas";

const description = `
Regenerate an existing invoice from its source costs. Requires an MSP account.
`.trim();

export default registerTool({
  name: "regenerate-invoice",
  title: "Regenerate Invoice",
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
    const response = await ctx.callVantageApi(`/v2/invoices/${pathEncode(args.invoice_token)}/regenerate`, {}, "POST");
    if (!response.ok) {
      throw new MCPUserError({ errors: response.errors });
    }
    return response.data;
  },
});
