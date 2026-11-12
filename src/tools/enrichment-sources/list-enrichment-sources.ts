import paginationData from "../../utils/paginationData";
import { DEFAULT_LIMIT } from "../structure/constants";
import MCPUserError from "../structure/MCPUserError";
import registerTool from "../structure/registerTool";
import { page } from "./schemas";

export default registerTool({
  name: "list-enrichment-sources",
  title: "List Enrichment Sources",
  description: "List enrichment sources and their tokens for inspecting enrichment.",
  annotations: { readOnly: true, destructive: false, openWorld: false },
  args: {
    page,
  },
  async execute(args, ctx) {
    const response = await ctx.callVantageApi("/v2/enrichment_sources", { ...args, limit: DEFAULT_LIMIT }, "GET");
    if (!response.ok) {
      throw new MCPUserError({ errors: response.errors });
    }
    return { enrichment_sources: response.data.enrichment_sources, pagination: paginationData(response.data) };
  },
});
