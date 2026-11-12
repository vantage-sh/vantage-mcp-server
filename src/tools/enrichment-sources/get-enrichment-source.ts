import { pathEncode } from "@vantage-sh/vantage-client";
import MCPUserError from "../structure/MCPUserError";
import registerTool from "../structure/registerTool";
import { enrichmentSourceToken } from "./schemas";

export default registerTool({
  name: "get-enrichment-source",
  title: "Get Enrichment Source",
  description: "Get an enrichment source by its token.",
  annotations: { readOnly: true, destructive: false, openWorld: false },
  args: {
    enrichment_source_token: enrichmentSourceToken,
  },
  async execute(args, ctx) {
    const { enrichment_source_token } = args;
    const response = await ctx.callVantageApi(
      `/v2/enrichment_sources/${pathEncode(enrichment_source_token)}`,
      {},
      "GET"
    );
    if (!response.ok) {
      throw new MCPUserError({ errors: response.errors });
    }
    return response.data;
  },
});
