import { pathEncode } from "@vantage-sh/vantage-client";
import z from "zod";
import MCPUserError from "../structure/MCPUserError";
import registerTool from "../structure/registerTool";

const description = `
Gets a specific Cost Alert event by its token. Use after list-cost-alert-events when you need the full trigger record.
`.trim();

export default registerTool({
  name: "get-cost-alert-event",
  title: "Get Cost Alert Event",
  description,
  annotations: {
    destructive: false,
    openWorld: false,
    readOnly: true,
  },
  args: {
    cost_alert_token: z.string().min(1).describe("The token of the Cost Alert that owns the event."),
    event_token: z.string().min(1).describe("The token of the Cost Alert event to retrieve."),
  },
  async execute(args, ctx) {
    const response = await ctx.callVantageApi(
      `/v2/cost_alerts/${pathEncode(args.cost_alert_token)}/events/${pathEncode(args.event_token)}`,
      {},
      "GET"
    );
    if (!response.ok) {
      throw new MCPUserError({ errors: response.errors });
    }
    return response.data;
  },
});
