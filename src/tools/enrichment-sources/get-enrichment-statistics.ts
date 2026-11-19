import { pathEncode, VANTAGE_PROVIDERS } from "@vantage-sh/vantage-client";
import z from "zod";
import paginationData from "../../utils/paginationData";
import { DEFAULT_LIMIT } from "../structure/constants";
import MCPUserError from "../structure/MCPUserError";
import registerTool from "../structure/registerTool";
import { enrichmentSourceToken, page } from "./schemas";

export default registerTool({
  name: "get-enrichment-statistics",
  title: "Get Enrichment Statistics",
  description: "Get paginated enrichment statistics for an enrichment source, optionally filtered by cost provider.",
  annotations: { readOnly: true, destructive: false, openWorld: false },
  args: {
    enrichment_source_token: enrichmentSourceToken,
    page,
    provider: z.enum(VANTAGE_PROVIDERS).optional().describe("Filter statistics by cost provider."),
  },
  async execute(args, ctx) {
    const { enrichment_source_token, ...body } = args;
    const response = await ctx.callVantageApi(
      `/v2/enrichment_sources/${pathEncode(enrichment_source_token)}/statistics`,
      { ...body, limit: DEFAULT_LIMIT },
      "GET"
    );
    if (!response.ok) {
      throw new MCPUserError({ errors: response.errors });
    }
    return { enrichment_statistics: response.data.enrichment_statistics, pagination: paginationData(response.data) };
  },
});
