import { pathEncode } from "@vantage-sh/vantage-client";
import { vantageToken } from "../../utils/zod";
import MCPUserError from "../structure/MCPUserError";
import registerTool from "../structure/registerTool";

export default registerTool({
  name: "revoke-ingest-token",
  title: "Revoke Ingest Token",
  description:
    "Revoke an ingest credential while preserving its metadata. Repeated revocation has no additional effect.",
  annotations: { readOnly: false, destructive: true, openWorld: false },
  args: {
    ingest_token: vantageToken("ingest_token"),
  },
  async execute(args, ctx) {
    const { ingest_token } = args;
    const response = await ctx.callVantageApi(`/v2/ingest_tokens/${pathEncode(ingest_token)}/revoke`, {}, "POST");
    if (!response.ok) {
      throw new MCPUserError({ errors: response.errors });
    }
    return response.data;
  },
});
