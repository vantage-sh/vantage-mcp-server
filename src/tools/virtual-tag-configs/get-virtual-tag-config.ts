import { pathEncode } from "@vantage-sh/vantage-client";
import { vantageToken } from "../../utils/zod";
import MCPUserError from "../structure/MCPUserError";
import registerTool from "../structure/registerTool";

const description = `
Returns one existing Virtual Tag (Virtual Tag Config) with its complete ordered mappings/values. Use this to show all values on a tag and discover value tokens before editing or reordering.
`.trim();

export default registerTool({
  name: "get-virtual-tag-config",
  title: "Get Virtual Tag Config",
  description,
  annotations: {
    destructive: false,
    openWorld: false,
    readOnly: true,
  },
  args: {
    virtual_tag_config_token: vantageToken("virtual_tag_config"),
  },
  async execute(args, ctx) {
    const response = await ctx.callVantageApi(
      `/v2/virtual_tag_configs/${pathEncode(args.virtual_tag_config_token)}`,
      {},
      "GET"
    );
    if (!response.ok) {
      throw new MCPUserError({ errors: response.errors });
    }
    return response.data;
  },
});
