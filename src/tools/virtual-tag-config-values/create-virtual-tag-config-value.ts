import { type CreateVirtualTagConfigValueRequest, pathEncode } from "@vantage-sh/vantage-client";
import MCPUserError from "../structure/MCPUserError";
import registerTool from "../structure/registerTool";
import {
  countDefinedFields,
  valueTypeFields,
  virtualTagConfigToken,
  virtualTagConfigValueFilter,
  virtualTagConfigValueOptionalArgs,
} from "./schemas";

const description = `
Adds a value to an existing Virtual Tag Config. Use this when editing a Virtual Tag by adding a value without replacing its full values list; new values append after existing values.
`.trim();

export default registerTool({
  name: "create-virtual-tag-config-value",
  title: "Create Virtual Tag Config Value",
  description,
  annotations: {
    destructive: false,
    openWorld: false,
    readOnly: false,
  },
  args: {
    virtual_tag_config_token: virtualTagConfigToken,
    filter: virtualTagConfigValueFilter,
    ...virtualTagConfigValueOptionalArgs,
  },
  async execute(args, ctx) {
    if (countDefinedFields(args, valueTypeFields) !== 1) {
      throw new MCPUserError({
        errors: [
          {
            message: "Exactly one of name, business_metric_token, cost_metric, or percentages must be provided.",
          },
        ],
      });
    }

    const { virtual_tag_config_token, ...body } = args;
    const response = await ctx.callVantageApi(
      `/v2/virtual_tag_configs/${pathEncode(virtual_tag_config_token)}/values`,
      body as CreateVirtualTagConfigValueRequest,
      "POST"
    );
    if (!response.ok) {
      throw new MCPUserError({ errors: response.errors });
    }
    return response.data;
  },
});
