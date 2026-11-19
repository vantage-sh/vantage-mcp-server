import { pathEncode } from "@vantage-sh/vantage-client";
import paginationData from "../../utils/paginationData";
import { DEFAULT_LIMIT } from "../structure/constants";
import MCPUserError from "../structure/MCPUserError";
import registerTool from "../structure/registerTool";
import { enrichmentSourceToken, page } from "./schemas";

export default registerTool({
  name: "list-enrichment-source-cost-integrations",
  title: "List Enrichment Source Cost Integrations",
  description: "List associated cost integrations, including those with errors and excluding disabled associations.",
  annotations: { readOnly: true, destructive: false, openWorld: false },
  args: {
    enrichment_source_token: enrichmentSourceToken,
    page,
  },
  async execute(args, ctx) {
    const { enrichment_source_token, ...body } = args;
    const response = await ctx.callVantageApi(
      `/v2/enrichment_sources/${pathEncode(enrichment_source_token)}/cost_integrations`,
      { ...body, limit: DEFAULT_LIMIT },
      "GET"
    );
    if (!response.ok) {
      throw new MCPUserError({ errors: response.errors });
    }
    return { cost_integrations: response.data.cost_integrations, pagination: paginationData(response.data) };
  },
});
