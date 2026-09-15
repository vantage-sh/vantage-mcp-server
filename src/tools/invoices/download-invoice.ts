import { pathEncode } from "@vantage-sh/vantage-client";
import z from "zod";
import MCPUserError from "../structure/MCPUserError";
import registerTool from "../structure/registerTool";
import { invoiceToken } from "./schemas";

const description = `
Get a temporary URL for downloading an invoice as a PDF or CSV. This returns a URL rather than the file contents.
`.trim();

export default registerTool({
  name: "download-invoice",
  title: "Download Invoice",
  description,
  annotations: {
    readOnly: true,
    destructive: false,
    openWorld: false,
  },
  args: {
    invoice_token: invoiceToken,
    file_type: z.enum(["pdf", "csv"]).describe("Invoice file format."),
  },
  async execute(args, ctx) {
    const { invoice_token, ...params } = args;
    const response = await ctx.callVantageApi(`/v2/invoices/${pathEncode(invoice_token)}/download`, params, "POST");
    if (!response.ok) {
      throw new MCPUserError({ errors: response.errors });
    }
    return response.data;
  },
});
