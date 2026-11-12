import z from "zod";
import { nonempty } from "../../utils/zod";
import MCPUserError from "../structure/MCPUserError";
import registerTool from "../structure/registerTool";
import { feedToken } from "./schemas";

export default registerTool({
  name: "create-ingest-token",
  title: "Create Ingest Token",
  description:
    "Create an ingest credential for an existing telemetry feed. Save plaintext_token securely; it is returned only once.",
  annotations: { readOnly: false, destructive: false, openWorld: false },
  args: {
    feed_token: feedToken,
    name: nonempty().max(100).optional().describe("Optional credential name, up to 100 characters."),
    expires_at: z.iso
      .datetime({ offset: true })
      .optional()
      .describe(
        "ISO 8601 expiration with timezone; must be in the future and at most 18 months away. Defaults to 18 months."
      ),
    retention_days: z.number().int().positive().optional().describe("Optional retention period in days."),
  },
  async execute(args, ctx) {
    const response = await ctx.callVantageApi("/v2/ingest_tokens", args, "POST");
    if (!response.ok) {
      throw new MCPUserError({ errors: response.errors });
    }
    return response.data;
  },
});
