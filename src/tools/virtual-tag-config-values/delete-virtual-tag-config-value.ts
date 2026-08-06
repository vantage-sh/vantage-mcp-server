import { pathEncode } from "@vantage-sh/vantage-client";
import MCPUserError from "../structure/MCPUserError";
import registerTool from "../structure/registerTool";
import { virtualTagConfigToken, virtualTagConfigValueToken } from "./schemas";

const description = `
Deletes one value from a Virtual Tag Config without replacing or reordering the remaining values.
`.trim();

export default registerTool({
  name: "delete-virtual-tag-config-value",
  title: "Delete Virtual Tag Config Value",
  description,
  annotations: {
    destructive: true,
    openWorld: false,
    readOnly: false,
  },
  args: {
    virtual_tag_config_token: virtualTagConfigToken,
    virtual_tag_config_value_token: virtualTagConfigValueToken,
  },
  async execute(args, ctx) {
    const response = await ctx.callVantageApi(
      `/v2/virtual_tag_configs/${pathEncode(args.virtual_tag_config_token)}/values/${pathEncode(
        args.virtual_tag_config_value_token
      )}`,
      {},
      "DELETE"
    );
    if (!response.ok) {
      throw new MCPUserError({ errors: response.errors });
    }
    return { token: args.virtual_tag_config_value_token };
  },
});
