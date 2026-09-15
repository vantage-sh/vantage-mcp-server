import z from "zod";
import paginationData from "../../utils/paginationData";
import { DEFAULT_LIMIT } from "../structure/constants";
import MCPUserError from "../structure/MCPUserError";
import registerTool from "../structure/registerTool";

const description = `
List the Access Policies on the account, including the cost filter each one applies and the Teams it is assigned to.
Requires account owner permissions; other callers receive 403 from the API.
`.trim();

export default registerTool({
  name: "list-access-policies",
  title: "List Access Policies",
  description,
  annotations: {
    destructive: false,
    openWorld: false,
    readOnly: true,
  },
  args: {
    page: z.number().optional().default(1).describe("The page number to return, defaults to 1"),
  },
  async execute(args, ctx) {
    const requestParams = { ...args, limit: DEFAULT_LIMIT };
    const response = await ctx.callVantageApi("/v2/access_policies", requestParams, "GET");
    if (!response.ok) {
      throw new MCPUserError({ errors: response.errors });
    }
    return {
      access_policies: response.data.access_policies,
      pagination: paginationData(response.data),
    };
  },
});
