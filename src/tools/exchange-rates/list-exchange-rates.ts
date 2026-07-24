import z from "zod";
import paginationData from "../../utils/paginationData";
import { DEFAULT_LIMIT } from "../structure/constants";
import MCPUserError from "../structure/MCPUserError";
import registerTool from "../structure/registerTool";

const description = `
List custom exchange rates uploaded for MSP currency management (base currency, target currency, rate, effective month).
MSP (partner) accounts only. Do not call for standard Vantage customer accounts. 
The API returns "This feature is not available for this account."
 Do not use for workspace display-currency settings, built-in cost-report FX conversion, or general currency questions unless the user is explicitly managing MSP custom rates for managed accounts.
`.trim();

const args = {
  page: z.number().optional().default(1).describe("The page number to return, defaults to 1"),
  limit: z
    .number()
    .optional()
    .default(DEFAULT_LIMIT)
    .describe(`The maximum number of returned exchange rates this call, defaults to ${DEFAULT_LIMIT}`),
};

export default registerTool({
  name: "list-exchange-rates",
  title: "List Exchange Rates",
  description,
  annotations: {
    destructive: false,
    openWorld: false,
    readOnly: true,
  },
  args,
  requires: { msp: true },
  async execute(args, ctx) {
    const requestParams = args;
    const response = await ctx.callVantageApi("/v2/exchange_rates", requestParams, "GET");
    if (!response.ok) {
      throw new MCPUserError({ errors: response.errors });
    }
    return {
      exchange_rates: response.data.exchange_rates,
      pagination: paginationData(response.data),
    };
  },
});
