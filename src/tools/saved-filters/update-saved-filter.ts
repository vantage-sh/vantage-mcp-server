import { pathEncode } from "@vantage-sh/vantage-client";
import { vantageToken } from "../../utils/zod";
import MCPUserError from "../structure/MCPUserError";
import registerTool from "../structure/registerTool";
import { filter, title } from "./schemas";

export default registerTool({
  name: "update-saved-filter",
  title: "Update Saved Filter",
  description: "Update a Saved Filter's title or VQL filter applied to Cost Reports.",
  annotations: { readOnly: false, destructive: true, openWorld: false },
  args: {
    saved_filter_token: vantageToken("saved_filter"),
    title: title.optional(),
    filter: filter.optional(),
  },
  async execute(args, ctx) {
    const { saved_filter_token, ...body } = args;
    const response = await ctx.callVantageApi(`/v2/saved_filters/${pathEncode(saved_filter_token)}`, body, "PUT");
    if (!response.ok) {
      throw new MCPUserError({ errors: response.errors });
    }
    return response.data;
  },
});
