import z from "zod/v4";
import { DEFAULT_LIMIT } from "./structure/constants";
import MCPUserError from "./structure/MCPUserError";
import registerTool from "./structure/registerTool";
import paginationData from "./utils/paginationData";

const description = `
List all financial commitment reports available in the Vantage account. Financial commitment reports show committed-use coverage and discount-related views, such as reserved instances, savings plans, and other provider commitment data.
Use the page value of 1 to start.
The title of a report is a good way to understand what commitment view it represents.
The token of a report is its unique identifier and can be used to link the user to the report in the Vantage Web UI. Build the link like this: https://console.vantage.sh/go/<token>
The filter, date range, date interval, date bucket, groupings, and on-demand cost scope fields provide additional context about what the report includes.
`.trim();

const args = {
  page: z.number().int().min(1).optional().default(1).describe("The page number to return, defaults to 1"),
  limit: z
    .number()
    .int()
    .min(1)
    .max(1000)
    .optional()
    .describe(`The number of results per page. Defaults to ${DEFAULT_LIMIT}. The maximum is 1000.`),
};

export default registerTool({
  name: "list-financial-commitment-reports",
  title: "List Financial Commitment Reports",
  description,
  annotations: {
    destructive: false,
    openWorld: false,
    readOnly: true,
  },
  args,
  async execute(args, ctx) {
    const requestParams = { ...args, limit: args.limit ?? DEFAULT_LIMIT };
    const response = await ctx.callVantageApi("/v2/financial_commitment_reports", requestParams, "GET");
    if (!response.ok) {
      throw new MCPUserError({ errors: response.errors });
    }
    return {
      financial_commitment_reports: response.data.financial_commitment_reports,
      pagination: paginationData(response.data),
    };
  },
});
