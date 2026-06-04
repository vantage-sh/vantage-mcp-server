import z from "zod";
import MCPUserError from "../structure/MCPUserError";
import registerTool from "../structure/registerTool";

const description = `
Creates a Canvas based on the parameters specified. A Canvas is an AI-generated cost analysis view created from a natural language prompt.
The prompt describes what cost data to analyze (e.g. "Show me monthly costs by provider"). Creating a canvas triggers an asynchronous refresh to generate the data.
`.trim();

export default registerTool({
  name: "create-canvas",
  title: "Create Canvas",
  description,
  annotations: {
    destructive: true,
    openWorld: false,
    readOnly: false,
  },
  args: {
    title: z.string().min(1).describe("The title of the Canvas."),
    prompt: z.string().min(1).describe("The prompt used to generate the Canvas."),
    workspace_token: z
      .string()
      .optional()
      .describe(
        "The token of the Workspace to add the Canvas to. Required if the API token is associated with multiple Workspaces."
      ),
  },
  async execute(args, ctx) {
    // Canvas endpoints not yet in vantage-client types
    const res: any = await (ctx.callVantageApi as any)("/v2/canvases", args, "POST");
    if (!res.ok) {
      throw new MCPUserError({ errors: res.errors });
    }
    return res.data;
  },
});
