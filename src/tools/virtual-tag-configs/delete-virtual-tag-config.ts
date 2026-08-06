import { pathEncode } from "@vantage-sh/vantage-client";
import { vantageToken } from "../../utils/zod";
import MCPUserError from "../structure/MCPUserError";
import registerTool from "../structure/registerTool";

const description = `
Deletes an entire Virtual Tag Config and all of its values. To remove only one value, use delete-virtual-tag-config-value instead.
`.trim();

export default registerTool({
  name: "delete-virtual-tag-config",
  title: "Delete Virtual Tag Config",
  description,
  annotations: {
    destructive: true,
    openWorld: false,
    readOnly: false,
  },
  args: {
    virtual_tag_config_token: vantageToken("virtual_tag_config"),
  },
  async execute(args, ctx) {
    const response = await ctx.callVantageApi(
      `/v2/virtual_tag_configs/${pathEncode(args.virtual_tag_config_token)}`,
      {},
      "DELETE"
    );
    if (!response.ok) {
      throw new MCPUserError({ errors: response.errors });
    }
    return { token: args.virtual_tag_config_token };
  },
});
