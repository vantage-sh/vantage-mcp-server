import { pathEncode } from "@vantage-sh/vantage-client";
import { vantageToken } from "../../utils/zod";
import MCPUserError from "../structure/MCPUserError";
import registerTool from "../structure/registerTool";

export default registerTool({
  name: "get-audit-log",
  title: "Get Audit Log",
  description:
    "Get one audit log entry by its token from list-audit-logs, including changed and unchanged field values.",
  annotations: { readOnly: true, destructive: false, openWorld: false },
  args: { audit_log_token: vantageToken("audit_log") },
  async execute({ audit_log_token }, ctx) {
    const response = await ctx.callVantageApi(`/v2/audit_logs/${pathEncode(audit_log_token)}`, {}, "GET");
    if (!response.ok) {
      throw new MCPUserError({ errors: response.errors });
    }
    return response.data;
  },
});
