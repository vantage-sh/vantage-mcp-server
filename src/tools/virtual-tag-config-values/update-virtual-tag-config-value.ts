import { pathEncode, type UpdateVirtualTagConfigValueRequest } from "@vantage-sh/vantage-client";
import MCPUserError from "../structure/MCPUserError";
import registerTool from "../structure/registerTool";
import {
  countDefinedFields,
  valueTypeFields,
  valueUpdateFields,
  virtualTagConfigToken,
  virtualTagConfigValueFilter,
  virtualTagConfigValueOptionalArgs,
  virtualTagConfigValueToken,
} from "./schemas";

const description = `
Edits one value in an existing Virtual Tag Config. Only supplied fields are changed; omitted fields and the value's order are preserved.
`.trim();

export default registerTool({
  name: "update-virtual-tag-config-value",
  title: "Update Virtual Tag Config Value",
  description,
  annotations: {
    destructive: true,
    openWorld: false,
    readOnly: false,
  },
  args: {
    virtual_tag_config_token: virtualTagConfigToken,
    virtual_tag_config_value_token: virtualTagConfigValueToken,
    filter: virtualTagConfigValueFilter.optional(),
    ...virtualTagConfigValueOptionalArgs,
  },
  async execute(args, ctx) {
    if (countDefinedFields(args, valueUpdateFields) === 0) {
      throw new MCPUserError({
        errors: [{ message: "At least one Virtual Tag Config Value field must be provided." }],
      });
    }
    if (countDefinedFields(args, valueTypeFields) > 1) {
      throw new MCPUserError({
        errors: [
          {
            message: "Only one of name, business_metric_token, cost_metric, or percentages may be provided.",
          },
        ],
      });
    }

    const { virtual_tag_config_token, virtual_tag_config_value_token, ...body } = args;
    const response = await ctx.callVantageApi(
      `/v2/virtual_tag_configs/${pathEncode(virtual_tag_config_token)}/values/${pathEncode(
        virtual_tag_config_value_token
      )}`,
      body as UpdateVirtualTagConfigValueRequest,
      "PATCH"
    );
    if (!response.ok) {
      throw new MCPUserError({ errors: response.errors });
    }
    return response.data;
  },
});
