import { pathEncode } from "@vantage-sh/vantage-client";
import paginationData from "../../utils/paginationData";
import { DEFAULT_LIMIT } from "../structure/constants";
import MCPUserError from "../structure/MCPUserError";
import registerTool from "../structure/registerTool";
import { enrichmentSourceToken, page } from "./schemas";

export default registerTool({
  name: "list-enrichment-source-ingest-tokens",
  title: "List Enrichment Source Ingest Tokens",
  description: "List ingest token metadata for an enrichment source. Secret credentials are never returned.",
  annotations: { readOnly: true, destructive: false, openWorld: false },
  args: {
    enrichment_source_token: enrichmentSourceToken,
    page,
  },
  async execute(args, ctx) {
    const { enrichment_source_token, ...body } = args;
    const response = await ctx.callVantageApi(
      `/v2/enrichment_sources/${pathEncode(enrichment_source_token)}/ingest_tokens`,
      { ...body, limit: DEFAULT_LIMIT },
      "GET"
    );
    if (!response.ok) {
      throw new MCPUserError({ errors: response.errors });
    }
    return { tokens: response.data.tokens, pagination: paginationData(response.data) };
  },
});
