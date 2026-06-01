import { type GetTagValuesRequest, pathEncode } from "@vantage-sh/vantage-client";
import z from "zod";
import { tagListQueryFields } from "./utils/tagListQuerySchema";
import { DEFAULT_LIMIT } from "./structure/constants";
import MCPUserError from "./structure/MCPUserError";
import registerTool from "./structure/registerTool";
import paginationData from "./utils/paginationData";

const description = `
List values for a tag key. The argument is \`key\` (the tag key name); the API response fields use \`tag_value\`.

Requires integration settings permission; callers without it receive 403 from the API.
`.trim();

const args = {
  page: z.number().optional().default(1).describe("The page number to return, defaults to 1"),
  key: z.string().min(1).describe("Tag key name to list values for (matches API path parameter `key`)"),
  ...tagListQueryFields,
};

export default registerTool({
  name: "list-tag-values",
  title: "List Tag Values",
  description,
  annotations: {
    destructive: false,
    openWorld: false,
    readOnly: true,
  },
  args,
  async execute(args, ctx) {
    const requestParams = { ...args, limit: DEFAULT_LIMIT };
    const response = await ctx.callVantageApi(
      `/v2/tags/${pathEncode(args.key)}/values`,
      requestParams as GetTagValuesRequest,
      "GET"
    );
    if (!response.ok) {
      throw new MCPUserError({ errors: response.errors });
    }
    return {
      tag_values: response.data.tag_values,
      pagination: paginationData(response.data),
    };
  },
});
