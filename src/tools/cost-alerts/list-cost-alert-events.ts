import { pathEncode } from "@vantage-sh/vantage-client";
import z from "zod";
import { DEFAULT_LIMIT } from "../structure/constants";
import MCPUserError from "../structure/MCPUserError";
import registerTool from "../structure/registerTool";
import paginationData from "../utils/paginationData";
import { PAGINATION_GUIDANCE } from "../utils/paginationGuidance";

const description = `
List events for a Cost Alert. Events are individual alert trigger records and can be filtered by Cost Report token.

${PAGINATION_GUIDANCE}
`.trim();

export default registerTool({
  name: "list-cost-alert-events",
  title: "List Cost Alert Events",
  description,
  annotations: {
    destructive: false,
    openWorld: false,
    readOnly: true,
  },
  args: {
    cost_alert_token: z.string().min(1).describe("The token of the Cost Alert whose events should be listed."),
    report_token: z.string().optional().describe("Filter events by Cost Report token."),
    page: z.number().optional().default(1).describe("The page number to return, defaults to 1."),
    limit: z
      .number()
      .optional()
      .default(DEFAULT_LIMIT)
      .describe(`The maximum number of returned Cost Alert events, defaults to ${DEFAULT_LIMIT}.`),
  },
  async execute(args, ctx) {
    const { cost_alert_token, ...requestParams } = args;
    const response = await ctx.callVantageApi(
      `/v2/cost_alerts/${pathEncode(cost_alert_token)}/events`,
      requestParams,
      "GET"
    );
    if (!response.ok) {
      throw new MCPUserError({ errors: response.errors });
    }
    return {
      cost_alert_events: response.data.cost_alert_events,
      pagination: paginationData(response.data),
    };
  },
});
