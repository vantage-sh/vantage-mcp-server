import type { GetVirtualTagConfigsResponse } from "@vantage-sh/vantage-client";
import z from "zod";
import paginationData from "../../utils/paginationData";
import { nonempty } from "../../utils/zod";
import MCPUserError from "../structure/MCPUserError";
import registerTool from "../structure/registerTool";

// Smaller than the shared DEFAULT_LIMIT (128): accounts default to 50 Virtual Tag Configs, so 128 would return them all on one page.
const LIMIT = 25;

const description = `
Lists or searches the Virtual Tags (Virtual Tag Configs) the current API token can access. Use this to find a config token by key or value name.
Each config is summarized (value count and names only, without filters or allocations); call get-virtual-tag-config for a config's full values.
Results are paginated; start with page 1 and request the next page while pagination.hasNextPage is true.
`.trim();

type VirtualTagConfig = GetVirtualTagConfigsResponse["virtual_tag_configs"][number];

function summarize(config: VirtualTagConfig) {
  return {
    token: config.token,
    key: config.key,
    hidden: config.hidden,
    preferred: config.preferred,
    overridable: config.overridable,
    backfill_until: config.backfill_until,
    value_count: config.values.length,
    value_names: config.values.flatMap((value) => value.name ?? value.display_name ?? []),
  };
}

export default registerTool({
  name: "list-virtual-tag-configs",
  title: "List Virtual Tag Configs",
  description,
  annotations: {
    destructive: false,
    openWorld: false,
    readOnly: true,
  },
  args: {
    page: z.number().int().min(1).optional().default(1).describe("The page number to return, defaults to 1"),
    q: nonempty().optional().describe("Search query that filters Virtual Tag Configs by key."),
  },
  async execute(args, ctx) {
    const response = await ctx.callVantageApi("/v2/virtual_tag_configs", { ...args, limit: LIMIT }, "GET");
    if (!response.ok) {
      throw new MCPUserError({ errors: response.errors });
    }
    return {
      virtual_tag_configs: response.data.virtual_tag_configs.map(summarize),
      // TODO: drop the cast once @vantage-sh/vantage-client types `links` for this endpoint (core#24317).
      pagination: paginationData(response.data as Parameters<typeof paginationData>[0]),
    };
  },
});
