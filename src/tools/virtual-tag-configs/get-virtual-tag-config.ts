import { pathEncode } from "@vantage-sh/vantage-client";
import { vantageToken } from "../../utils/zod";
import MCPUserError from "../structure/MCPUserError";
import registerTool from "../structure/registerTool";

const description = `
Returns an existing Virtual Tag Config with all of its values. Use this to inspect the tag and discover value tokens before adding, editing, or removing individual values.
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
