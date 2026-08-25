import paginationData from "../../utils/paginationData";
import { vantageToken } from "../../utils/zod";
import MCPUserError from "../structure/MCPUserError";
import registerTool from "../structure/registerTool";

const description = `
List of cost providers available to query for a given Workspace. Can be used to filter costs down to a specific provider in VQL queries.
`.trim();

const args = {
  workspace_token: vantageToken("workspace"),
};

export default registerTool({
  name: "list-cost-providers",
  title: "List Cost Providers",
  description,
  annotations: {
    destructive: false,
    openWorld: false,
    readOnly: true,
  },
  args,
  async execute(args, ctx) {
    const response = await ctx.callVantageApi("/v2/cost_providers", args, "GET");
    if (!response.ok) {
      throw new MCPUserError({ errors: response.errors });
    }
    return {
      providers: response.data.cost_providers,
      pagination: paginationData(response.data),
    };
  },
});
