import { pathEncode } from "@vantage-sh/vantage-client";
import { vantageToken } from "../../utils/zod";
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
    canvas_token: vantageToken("canvas"),
  },
  async execute(args, ctx) {
    const response = await ctx.callVantageApi(`/v2/canvases/${pathEncode(args.canvas_token)}`, {}, "DELETE");
    if (!response.ok) {
      throw new MCPUserError({ errors: response.errors });
    }
    return { token: args.canvas_token };
  },
});
