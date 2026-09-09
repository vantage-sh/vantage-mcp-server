import z from "zod";
import paginationData from "../../utils/paginationData";
import { vantageToken } from "../../utils/zod";
import { DEFAULT_LIMIT } from "../structure/constants";
import MCPUserError from "../structure/MCPUserError";
import registerTool from "../structure/registerTool";

const description = `
List invoices available to an MSP invoicing account. Optionally filter the results to one managed account.
`.trim();

export default registerTool({
  name: "list-invoices",
  title: "List Invoices",
  description,
  annotations: {
    readOnly: true,
    destructive: false,
    openWorld: false,
  },
  args: {
    page: z.number().int().min(1).optional().default(1).describe("Page number, defaults to 1."),
    managed_account_token: vantageToken("managed_account", {
      description: "Only return invoices for this managed account.",
    }).optional(),
  },
  async execute(args, ctx) {
    const response = await ctx.callVantageApi("/v2/invoices", { ...args, limit: DEFAULT_LIMIT }, "GET");
    if (!response.ok) {
      throw new MCPUserError({ errors: response.errors });
    }
    return {
      invoices: response.data.invoices,
      pagination: paginationData(response.data),
    };
  },
});
