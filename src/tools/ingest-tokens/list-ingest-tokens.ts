import z from "zod";
import paginationData from "../../utils/paginationData";
import { DEFAULT_LIMIT } from "../structure/constants";
import MCPUserError from "../structure/MCPUserError";
import registerTool from "../structure/registerTool";
import { feedToken } from "./schemas";

export default registerTool({
  name: "list-ingest-tokens",
  title: "List Ingest Tokens",
  description: "List ingest token metadata for a telemetry feed. Secret credentials are never returned.",
  annotations: { readOnly: true, destructive: false, openWorld: false },
  args: {
    feed_token: feedToken,
    page: z.number().int().min(1).default(1).describe("Page number, defaults to 1."),
  },
  async execute(args, ctx) {
    const response = await ctx.callVantageApi("/v2/ingest_tokens", { ...args, limit: DEFAULT_LIMIT }, "GET");
    if (!response.ok) {
      throw new MCPUserError({ errors: response.errors });
    }
    return { tokens: response.data.tokens, pagination: paginationData(response.data) };
  },
});
