import z from "zod";
import dateValidator from "../../utils/dateValidator";
import { nonempty } from "../../utils/zod";
import MCPUserError from "../structure/MCPUserError";
import registerTool from "../structure/registerTool";
import { collapsedTagKeySchema, virtualTagConfigValueSchema } from "./schemas";

const description = `
Creates a new Virtual Tag (Virtual Tag Config) in Vantage.
Do not use this to edit an existing Virtual Tag Config; use update-virtual-tag-config for config settings or value order, and the Virtual Tag Config Value tools for individual values.

Virtual Tag Configs define a derived (virtual) tag key and a set of values determined by VQL filters.
This is useful for normalizing cost attribution (e.g., mapping multiple provider tag formats into a
single tag), collapsing noisy tag keys, and optionally overriding provider-supplied tags.

You can optionally:
- backfill_until: backfill the virtual tag values to an earliest month
- collapsed_tag_keys: collapse values for specific underlying tag keys (optionally scoped by provider)
- values: define named values via VQL filters, optionally linked to Business Metrics and/or cost metrics
`.trim();

export default registerTool({
  name: "create-virtual-tag-config",
  title: "Create Virtual Tag Config",
  description,
  args: {
    key: nonempty().describe("The key of the VirtualTagConfig"),
    overridable: z
      .boolean()
      .describe("Whether the VirtualTagConfig can override a provider-supplied tag on a matching Cost."),
    backfill_until: dateValidator(
      "The earliest month the VirtualTagConfig should be backfilled to. ISO 8601 Formatted."
    ).optional(),
    collapsed_tag_keys: z
      .array(collapsedTagKeySchema)
      .optional()
      .describe("Tag keys whose values should be collapsed."),
    values: z
      .array(virtualTagConfigValueSchema)
      .optional()
      .describe("Ordered values to create for the Virtual Tag Config."),
  },
  annotations: {
    destructive: false,
    openWorld: false,
    readOnly: false,
  },
  async execute(args, ctx) {
    const response = await ctx.callVantageApi("/v2/virtual_tag_configs", args, "POST");
    if (!response.ok) {
      throw new MCPUserError({ errors: response.errors });
    }
    return response.data;
  },
});
