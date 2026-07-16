import z from "zod";
import { DEFAULT_LIMIT } from "../structure/constants";
import MCPUserError from "../structure/MCPUserError";
import registerTool from "../structure/registerTool";
import paginationData from "../utils/paginationData";

const description = `
Lists saved Network Flow Reports, which analyze ingress and egress cloud network traffic by cost or bytes. Use the returned token with get-network-flow-report or https://console.vantage.sh/go/<token>.
`.trim();

export default registerTool({
  name: "list-network-flow-reports",
  title: "List Network Flow Reports",
  description,
  annotations: {
    destructive: false,
    openWorld: false,
    readOnly: true,
  },
  args: {
    q: z.string().min(1).optional().describe("Search report titles for this text."),
    page: z.number().int().min(1).optional().default(1).describe("Page number, defaults to 1."),
    limit: z
      .number()
      .int()
      .min(1)
      .max(1000)
      .optional()
      .default(DEFAULT_LIMIT)
      .describe(`Number of reports per page, defaults to ${DEFAULT_LIMIT} and cannot exceed 1000.`),
  },
  async execute(args, ctx) {
    const response = await ctx.callVantageApi("/v2/network_flow_reports", args, "GET");
    if (!response.ok) {
      throw new MCPUserError({ errors: response.errors });
    }
    return {
      network_flow_reports: response.data.network_flow_reports,
      pagination: paginationData(response.data),
    };
  },
});
