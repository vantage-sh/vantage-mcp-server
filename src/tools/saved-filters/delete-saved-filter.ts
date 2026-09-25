import { pathEncode } from "@vantage-sh/vantage-client";
import { vantageToken } from "../../utils/zod";
import MCPUserError from "../structure/MCPUserError";
import registerTool from "../structure/registerTool";

export default registerTool({
  name: "delete-saved-filter",
  title: "Delete Saved Filter",
  description: "Delete a Saved Filter by token.",
  annotations: { readOnly: false, destructive: true, openWorld: false },
  args: { saved_filter_token: vantageToken("saved_filter") },
  async execute(args, ctx) {
    const response = await ctx.callVantageApi(`/v2/saved_filters/${pathEncode(args.saved_filter_token)}`, {}, "DELETE");
    if (!response.ok) {
      throw new MCPUserError({ errors: response.errors });
    }
    return { token: args.saved_filter_token };
  },
});
