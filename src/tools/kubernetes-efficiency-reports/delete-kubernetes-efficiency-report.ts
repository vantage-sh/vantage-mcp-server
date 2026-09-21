import { pathEncode } from "@vantage-sh/vantage-client";
import { vantageToken } from "../../utils/zod";
import MCPUserError from "../structure/MCPUserError";
import registerTool from "../structure/registerTool";

const description = `
Deletes a Kubernetes Efficiency Report by token.
`.trim();

export default registerTool({
  name: "delete-kubernetes-efficiency-report",
  title: "Delete Kubernetes Efficiency Report",
  description,
  annotations: {
    destructive: true,
    openWorld: false,
    readOnly: false,
  },
  args: {
    kubernetes_efficiency_report_token: vantageToken("kubernetes_efficiency_report"),
  },
  async execute(args, ctx) {
    const response = await ctx.callVantageApi(
      `/v2/kubernetes_efficiency_reports/${pathEncode(args.kubernetes_efficiency_report_token)}`,
      {},
      "DELETE"
    );
    if (!response.ok) {
      throw new MCPUserError({ errors: response.errors });
    }
    return { token: args.kubernetes_efficiency_report_token };
  },
});
