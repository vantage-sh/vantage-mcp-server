import { pathEncode } from "@vantage-sh/vantage-client";
import z from "zod";
import { DEFAULT_LIMIT } from "./structure/constants";
import MCPUserError from "./structure/MCPUserError";
import registerTool from "./structure/registerTool";
import paginationData from "./utils/paginationData";
import { PAGINATION_GUIDANCE } from "./utils/paginationGuidance";

const description = `
Tags can have many values. Use this tool to find the values and service providers that are associated with a tag.

${PAGINATION_GUIDANCE}
`.trim();

const args = {
  page: z.number().optional().default(1).describe("The page number to return, defaults to 1"),
  key: z.string().min(1).describe("Tag key to list values for"),
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
    const response = await ctx.callVantageApi(`/v2/tags/${pathEncode(args.key)}/values`, requestParams, "GET");
    if (!response.ok) {
      throw new MCPUserError({ errors: response.errors });
    }
    return {
      tag_values: response.data.tag_values,
      pagination: paginationData(response.data),
    };
  },
});
