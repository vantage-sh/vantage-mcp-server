import z from "zod";
import paginationData from "../../utils/paginationData";
import { vantageToken } from "../../utils/zod/vantage-token";
import MCPUserError from "../structure/MCPUserError";
import registerTool from "../structure/registerTool";

const ANNOTATIONS_DEFAULT_LIMIT = 100;

const description = `
List report annotations available to the authenticated Vantage access token, ordered from newest to oldest. Optionally filter annotations to a specific Cost Report.
`.trim();

const args = {
  page: z.number().int().min(1).optional().default(1).describe("Page number, defaults to 1"),
  limit: z
    .number()
    .int()
    .min(1)
    .max(5000)
    .optional()
    .default(ANNOTATIONS_DEFAULT_LIMIT)
    .describe(`Number of annotations per page, defaults to ${ANNOTATIONS_DEFAULT_LIMIT} and has a maximum of 5000`),
  report_token: vantageToken("cost_report", {
    description: "When provided, return only annotations associated with this Cost Report.",
  }).optional(),
};

export default registerTool({
  name: "list-annotations",
  title: "List Annotations",
  description,
  annotations: {
    destructive: false,
    openWorld: false,
    readOnly: true,
  },
  args,
  async execute(args, ctx) {
    const response = await ctx.callVantageApi("/v2/annotations", args, "GET");
    if (!response.ok) {
      throw new MCPUserError({ errors: response.errors });
    }
    return {
      annotations: response.data.annotations,
      pagination: paginationData(response.data),
    };
  },
});
