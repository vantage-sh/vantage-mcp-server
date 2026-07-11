import type { GetTagsRequest } from "@vantage-sh/vantage-client";
import z from "zod";
import { DEFAULT_LIMIT } from "./structure/constants";
import MCPUserError from "./structure/MCPUserError";
import registerTool from "./structure/registerTool";
import paginationData from "./utils/paginationData";
import { tagListQueryFields } from "./utils/tagListQuerySchema";

const description = `
List tags that can be used to filter costs and cost reports.
Tags are associated with one or more Cost Providers.
Tags can be edited in the Vantage Web UI, or have further details displayed there. Link a user to the tag page like this: https://console.vantage.sh/settings/tags?search_query=<tag>

Requires integration settings permission; callers without it receive 403 from the API.
Each tag in the response uses the field \`tag_key\` (not \`key\`).
`.trim();

const args = {
  page: z.number().optional().default(1).describe("The page number to return, defaults to 1"),
  ...tagListQueryFields,
};

export default registerTool({
  name: "list-tags",
  title: "List Tags",
  description,
  annotations: {
    destructive: false,
    openWorld: false,
    readOnly: true,
  },
  args,
  async execute(args, ctx) {
    const requestParams = { ...args, limit: DEFAULT_LIMIT };
    const response = await ctx.callVantageApi("/v2/tags", requestParams as GetTagsRequest, "GET");
    if (!response.ok) {
      throw new MCPUserError({ errors: response.errors });
    }
    return {
      tags: response.data.tags,
      pagination: paginationData(response.data),
    };
  },
});
