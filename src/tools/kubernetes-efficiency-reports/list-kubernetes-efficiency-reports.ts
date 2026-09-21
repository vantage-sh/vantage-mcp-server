import z from "zod";
import paginationData from "../../utils/paginationData";
import { nonempty, vantageToken } from "../../utils/zod";
import { DEFAULT_LIMIT } from "../structure/constants";
import MCPUserError from "../structure/MCPUserError";
import registerTool from "../structure/registerTool";

const description = `
Lists saved Kubernetes Efficiency Reports.
`.trim();

export default registerTool({
  name: "list-kubernetes-efficiency-reports",
  title: "List Kubernetes Efficiency Reports",
  description,
  annotations: {
    destructive: false,
    openWorld: false,
    readOnly: true,
  },
  args: {
    q: nonempty().optional().describe("Search Kubernetes Efficiency Reports by title."),
    workspace_token: vantageToken("workspace", {
      description: "Only return Kubernetes Efficiency Reports in this Workspace.",
    }).optional(),
    page: z.number().int().min(1).optional().default(1).describe("Page number, defaults to 1"),
    limit: z.number().int().min(1).max(1000).optional().default(DEFAULT_LIMIT).describe("Number of reports per page"),
  },
  async execute(args, ctx) {
    const response = await ctx.callVantageApi("/v2/kubernetes_efficiency_reports", args, "GET");
    if (!response.ok) {
      throw new MCPUserError({ errors: response.errors });
    }
    return {
      kubernetes_efficiency_reports: response.data.kubernetes_efficiency_reports,
      pagination: paginationData(response.data),
    };
  },
});
