import { pathEncode, type UpdateVirtualTagConfigRequest } from "@vantage-sh/vantage-client";
import z from "zod";
import dateValidator from "../../utils/dateValidator";
import { nonempty, vantageToken } from "../../utils/zod";
import MCPUserError from "../structure/MCPUserError";
import registerTool from "../structure/registerTool";
import { collapsedTagKeySchema, virtualTagConfigValueSchema } from "./schemas";

const description = `
Updates an existing Virtual Tag Config's key, settings, collapsed tags, or complete ordered values list. Use the individual Virtual Tag Config Value tools for single-value edits; supplying values here replaces the full list and determines its order.
`.trim();

const mutableFields = ["key", "overridable", "backfill_until", "collapsed_tag_keys", "values"] as const;

export default registerTool({
  name: "update-virtual-tag-config",
  title: "Update Virtual Tag Config",
  description,
  annotations: {
    destructive: true,
    openWorld: false,
    readOnly: false,
  },
  args: {
    virtual_tag_config_token: vantageToken("virtual_tag_config"),
    key: nonempty().optional().describe("New key for the Virtual Tag Config."),
    overridable: z
      .boolean()
      .nullable()
      .optional()
      .describe("Whether the config can override a matching provider-supplied tag."),
    backfill_until: dateValidator("Earliest backfill month, YYYY-MM-DD. Use null to clear.").nullable().optional(),
    collapsed_tag_keys: z
      .array(collapsedTagKeySchema)
      .optional()
      .describe("Complete replacement list of tag keys whose values should be collapsed."),
    values: z
      .array(virtualTagConfigValueSchema)
      .optional()
      .describe(
        "Complete ordered replacement list of values. Use get-virtual-tag-config first and include every value that should remain."
      ),
  },
  async execute(args, ctx) {
    if (!mutableFields.some((field) => args[field] !== undefined)) {
      throw new MCPUserError({
        errors: [{ message: "At least one Virtual Tag Config field must be provided." }],
      });
    }

    const { virtual_tag_config_token, ...body } = args;
    const response = await ctx.callVantageApi(
      `/v2/virtual_tag_configs/${pathEncode(virtual_tag_config_token)}`,
      body as UpdateVirtualTagConfigRequest,
      "PUT"
    );
    if (!response.ok) {
      throw new MCPUserError({ errors: response.errors });
    }
    return response.data;
  },
});
