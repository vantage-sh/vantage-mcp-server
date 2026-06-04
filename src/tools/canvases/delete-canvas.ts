import { pathEncode } from "@vantage-sh/vantage-client";
import z from "zod";
import MCPUserError from "../structure/MCPUserError";
import registerTool from "../structure/registerTool";

const description = `
Deletes a Canvas by its token. This action is irreversible.
`.trim();

export default registerTool({
  name: "delete-canvas",
  title: "Delete Canvas",
  description,
  annotations: {
    destructive: true,
    openWorld: false,
    readOnly: false,
  },
  args: {
    canvas_token: z.string().describe("The token of the Canvas to delete."),
  },
  async execute(args, ctx) {
    // Canvas endpoints not yet in vantage-client types
    const response: any = await (ctx.callVantageApi as any)(
      `/v2/canvases/${pathEncode(args.canvas_token)}`,
      {},
      "DELETE"
    );
    if (!response.ok) {
      throw new MCPUserError({ errors: response.errors });
    }
    return { token: args.canvas_token };
  },
});
