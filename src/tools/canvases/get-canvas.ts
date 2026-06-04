import { pathEncode } from "@vantage-sh/vantage-client";
import z from "zod";
import MCPUserError from "../structure/MCPUserError";
import registerTool from "../structure/registerTool";

const description = `
Gets a specific Canvas by its token. Returns the canvas details including its title, prompt, status, and structured table data.
The token of a canvas can be used to link the user to the canvas in the Vantage Web UI. Build the link like this: https://console.vantage.sh/go/<CanvasToken>
`.trim();

export default registerTool({
  name: "get-canvas",
  title: "Get Canvas",
  description,
  annotations: {
    destructive: false,
    openWorld: false,
    readOnly: true,
  },
  args: {
    canvas_token: z.string().describe("The token of the Canvas to retrieve."),
  },
  async execute(args, ctx) {
    // Canvas endpoints not yet in vantage-client types
    const response: any = await (ctx.callVantageApi as any)(`/v2/canvases/${pathEncode(args.canvas_token)}`, {}, "GET");
    if (!response.ok) {
      throw new MCPUserError({ errors: response.errors });
    }
    return response.data;
  },
});
