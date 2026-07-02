import { pathEncode } from "@vantage-sh/vantage-client";
import z from "zod";
import MCPUserError from "../structure/MCPUserError";
import registerTool from "../structure/registerTool";

const description = `
Updates an existing Canvas. You can update the title, the prompt, or both. Updating the prompt triggers an asynchronous refresh to regenerate the canvas data.
`.trim();

export default registerTool({
  name: "update-canvas",
  title: "Update Canvas",
  description,
  annotations: {
    destructive: false,
    openWorld: false,
    readOnly: false,
  },
  args: {
    canvas_token: z.string().describe("The token of the Canvas to update."),
    title: z.string().min(1).optional().describe("The updated title of the Canvas."),
    prompt: z.string().min(1).optional().describe("The updated prompt used to generate the Canvas."),
  },
  async execute(args, ctx) {
    const { canvas_token, ...body } = args;
    const response = await ctx.callVantageApi(`/v2/canvases/${pathEncode(canvas_token)}`, body, "PUT");
    if (!response.ok) {
      throw new MCPUserError({ errors: response.errors });
    }
    return response.data;
  },
});
