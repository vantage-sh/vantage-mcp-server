import { pathEncode } from "@vantage-sh/vantage-client";
import { vantageToken } from "../../utils/zod";
import MCPUserError from "../structure/MCPUserError";
import registerTool from "../structure/registerTool";

const description = `
Gets a specific Folder by its token.
`.trim();

export default registerTool({
  name: "get-folder",
  title: "Get Folder",
  description,
  annotations: {
    destructive: false,
    openWorld: false,
    readOnly: true,
  },
  args: {
    folder_token: vantageToken("folder"),
  },
  async execute(args, ctx) {
    const response = await ctx.callVantageApi(`/v2/folders/${pathEncode(args.folder_token)}`, {}, "GET");
    if (!response.ok) {
      throw new MCPUserError({ errors: response.errors });
    }
    return response.data;
  },
});
