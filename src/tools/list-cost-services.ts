import z from "zod";
import MCPUserError from "./structure/MCPUserError";
import registerTool from "./structure/registerTool";

const description = `
List cost service display names for a workspace. These names may NOT match VQL costs.service identifiers used in query-costs filters.
Do not copy names from this tool directly into VQL. Use vql_info (Scout) or costs.service values from a broad query-costs probe instead.
`.trim();

const args = {
  workspace_token: z.string().describe("Workspace token to list cost services for"),
};

export default registerTool({
  name: "list-cost-services",
  title: "List Cost Services",
  description,
  annotations: {
    destructive: false,
    openWorld: false,
    readOnly: true,
  },
  args,
  async execute(args, ctx) {
    const response = await ctx.callVantageApi("/v2/cost_services", args, "GET");
    if (!response.ok) {
      throw new MCPUserError({ errors: response.errors });
    }
    return {
      cost_services: response.data.cost_services,
    };
  },
});
