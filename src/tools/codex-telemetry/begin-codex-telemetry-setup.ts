import type { RequestBodyForPathAndMethod } from "@vantage-sh/vantage-client";
import MCPUserError from "../structure/MCPUserError";
import registerTool from "../structure/registerTool";

type SetupResponse = {
  setup_code: string;
  expires_at: string;
};

export default registerTool({
  name: "begin-codex-telemetry-setup",
  title: "Begin Codex Telemetry Setup",
  description:
    "Prepare Codex OpenTelemetry usage export and return a short-lived, single-use code for the Vantage plugin to finish setup on the user's device.",
  annotations: { readOnly: false, destructive: false, openWorld: false },
  args: {},
  async execute(_args, ctx) {
    // Remove these casts after the generated client includes the new Core endpoint.
    const response = await ctx.callVantageApi(
      "/v2/codex_telemetry_setup" as "/v2/ingest_tokens",
      {} as RequestBodyForPathAndMethod<"/v2/ingest_tokens", "POST">,
      "POST"
    );
    if (!response.ok) {
      throw new MCPUserError({ errors: response.errors });
    }
    return response.data as unknown as SetupResponse;
  },
});
