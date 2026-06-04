import z from "zod";
import { DEFAULT_LIMIT } from "../structure/constants";
import MCPUserError from "../structure/MCPUserError";
import registerTool from "../structure/registerTool";
import paginationData from "../utils/paginationData";

const description = `
List all saved Canvases available in the Vantage account. Canvases are AI-generated cost analysis views created from natural language prompts.
Use the page value of 1 to start.
The token of a canvas can be used to link the user to the canvas in the Vantage Web UI. Build the link like this: https://console.vantage.sh/go/<CanvasToken>
`.trim();

const args = {
  page: z.number().optional().default(1).describe("The page number to return, defaults to 1"),
};

export default registerTool({
  name: "list-canvases",
  title: "List Canvases",
  description,
  annotations: {
    destructive: false,
    openWorld: false,
    readOnly: true,
  },
  args,
  async execute(args, ctx) {
    const requestParams = { ...args, limit: DEFAULT_LIMIT };
    // Canvas endpoints not yet in vantage-client types
    const response: any = await (ctx.callVantageApi as any)("/v2/canvases", requestParams, "GET");
    if (!response.ok) {
      throw new MCPUserError({ errors: response.errors });
    }
    return {
      canvases: response.data.canvases,
      pagination: paginationData(response.data),
    };
  },
});
