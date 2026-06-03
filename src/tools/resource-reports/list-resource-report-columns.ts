import z from "zod";
import MCPUserError from "../structure/MCPUserError";
import registerTool from "../structure/registerTool";

const description = `
List available columns for a resource type. The resource_type is a required parameter, and must be a valid VQL resource type name.
`.trim();

const args = {
  resource_type: z
    .string()
    .describe(
      "The resource type to retrieve available columns for. This parameter must be a valid VQL resource type name."
    ),
};

export default registerTool({
  name: "list-resource-report-columns",
  title: "List Resource Report Columns",
  description,
  annotations: {
    destructive: false,
    openWorld: false,
    readOnly: true,
  },
  args,
  async execute(args, ctx) {
    const response = await ctx.callVantageApi(`/v2/resource_reports/columns`, { ...args }, "GET");
    if (!response.ok) {
      throw new MCPUserError({ errors: response.errors });
    }
    return response.data;
  },
});
