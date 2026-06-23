import z from "zod";
import { DEFAULT_LIMIT } from "../structure/constants";
import MCPUserError from "../structure/MCPUserError";
import registerTool from "../structure/registerTool";
import paginationData from "../utils/paginationData";
import { PAGINATION_GUIDANCE } from "../utils/paginationGuidance";

const description = `
List all resource reports available. Resource reports are already created reports authored by a user in Vantage.

${PAGINATION_GUIDANCE}

The 'Title' of a report is a good way to know what the report is about.
The 'filter' of a report also gives clues to the data it provides.
The 'token' of a report is a unique identifier for the report. It can be used to generate a link to the report in the Vantage Web UI.
If a user wants to see a report, you can link them like this: https://console.vantage.sh/go/<token>
`.trim();

const args = {
  page: z.number().optional().default(1).describe("The page number to return, defaults to 1"),
  limit: z
    .number()
    .optional()
    .default(DEFAULT_LIMIT)
    .describe(`The maximum number of returned resource reports this call, defaults to ${DEFAULT_LIMIT}`),
};

export default registerTool({
  name: "list-resource-reports",
  title: "List Resource Reports",
  description,
  annotations: {
    destructive: false,
    openWorld: false,
    readOnly: true,
  },
  args,
  async execute(args, ctx) {
    const requestParams = args;
    const response = await ctx.callVantageApi("/v2/resource_reports", requestParams, "GET");
    if (!response.ok) {
      throw new MCPUserError({ errors: response.errors });
    }
    return {
      resource_reports: response.data.resource_reports,
      pagination: paginationData(response.data),
    };
  },
});
