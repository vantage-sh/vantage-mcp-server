import { pathEncode } from "@vantage-sh/vantage-client";
import MCPUserError from "../structure/MCPUserError";
import registerTool from "../structure/registerTool";
import { virtualTagConfigToken, virtualTagConfigValueToken } from "./schemas";

const description = `
Returns one mapping/value from an existing Virtual Tag Config, including its filter and allocation settings. Use this to inspect one mapping before editing it.
`.trim();

export default registerTool({
  name: "get-virtual-tag-config-value",
  title: "Get Virtual Tag Config Value",
  description,
  annotations: {
    destructive: false,
    openWorld: false,
    readOnly: true,
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
      "GET"
    );
    if (!response.ok) {
      throw new MCPUserError({ errors: response.errors });
    }
    return response.data;
  },
});
