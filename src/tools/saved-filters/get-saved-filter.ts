import { pathEncode } from "@vantage-sh/vantage-client";
import { vantageToken } from "../../utils/zod";
import MCPUserError from "../structure/MCPUserError";
import registerTool from "../structure/registerTool";

export default registerTool({
  name: "get-saved-filter",
  title: "Get Saved Filter",
  description: "Get a Saved Filter by token, including its VQL filter and associated Cost Report tokens.",
  annotations: { readOnly: true, destructive: false, openWorld: false },
  args: { saved_filter_token: vantageToken("saved_filter") },
  async execute(args, ctx) {
    const response = await ctx.callVantageApi(`/v2/saved_filters/${pathEncode(args.saved_filter_token)}`, {}, "GET");
    if (!response.ok) {
      throw new MCPUserError({ errors: response.errors });
    }
    return response.data;
  },
});
