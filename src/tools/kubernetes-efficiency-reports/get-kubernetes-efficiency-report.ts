import { pathEncode } from "@vantage-sh/vantage-client";
import { vantageToken } from "../../utils/zod";
import MCPUserError from "../structure/MCPUserError";
import registerTool from "../structure/registerTool";

const description = `
Gets a saved Kubernetes Efficiency Report by token.
`.trim();

export default registerTool({
  name: "get-kubernetes-efficiency-report",
  title: "Get Kubernetes Efficiency Report",
  description,
  annotations: {
    destructive: false,
    openWorld: false,
    readOnly: true,
  },
  args: {
    kubernetes_efficiency_report_token: vantageToken("kubernetes_efficiency_report"),
  },
  async execute(args, ctx) {
    const response = await ctx.callVantageApi(
      `/v2/kubernetes_efficiency_reports/${pathEncode(args.kubernetes_efficiency_report_token)}`,
      {},
      "GET"
    );
    if (!response.ok) {
      throw new MCPUserError({ errors: response.errors });
    }
    return response.data;
  },
});
